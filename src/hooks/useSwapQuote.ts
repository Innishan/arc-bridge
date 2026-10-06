/**
 * useSwapQuote — Uniswap v3 quote via a direct viem publicClient.
 *
 * Wagmi's useReadContracts silently skips reads when the wallet isn't connected
 * to Arc (chainId gating). We bypass that entirely: a standalone viem
 * createPublicClient points at /arc-rpc (proxied through Vite dev server to
 * https://rpc.mainnet.arc.io to avoid CORS), so quotes work regardless of
 * which chain the wallet is on.
 *
 * Strategy: probe all three Uniswap v3 fee tiers in parallel via factory.getPool,
 * read slot0 + liquidity for each existing pool, pick highest liquidity, compute
 * spot price via sqrtPriceX96 math.
 */
import { useState, useEffect, useRef, useCallback } from 'react'
import { createPublicClient, http, formatUnits, parseUnits } from 'viem'
import {
  UNISWAP_V3, V3_FACTORY_ABI, V3_POOL_ABI,
  ARC_CHAIN_ID, FEE_TIERS, FEE_LABEL, type FeeTier, type ArcToken,
} from '../config/uniswap'

// In development the Vite proxy forwards /arc-rpc → https://rpc.mainnet.arc.io
// avoiding CORS. In production (arcbridge.online) the real URL is used directly
// since it is a registered allowed origin for the Arc RPC.
const IS_DEV = import.meta.env.DEV
const ARC_RPC_URL = IS_DEV ? '/arc-rpc' : 'https://rpc.mainnet.arc.io/'

const arcClient = createPublicClient({
  chain: {
    id: ARC_CHAIN_ID,
    name: 'Arc',
    nativeCurrency: { name: 'USDC', symbol: 'USDC', decimals: 18 },
    rpcUrls: { default: { http: [ARC_RPC_URL] } },
  },
  transport: http(ARC_RPC_URL),
})

export type QuoteResult = {
  amountOut: string
  amountOutRaw: bigint
  amountOutMin: bigint
  feeTier: FeeTier
  feeTierLabel: string
  priceImpactPct: number
  warning: string | null
}

function spotAmountOut(
  sqrtPriceX96: bigint,
  amountIn: bigint,
  tokenInIsToken0: boolean,
  decimalsIn: number,
  decimalsOut: number,
): bigint {
  if (sqrtPriceX96 === 0n || amountIn === 0n) return 0n
  const Q96 = BigInt(2) ** BigInt(96)
  const priceNum = sqrtPriceX96 * sqrtPriceX96
  const priceDen = Q96 * Q96
  const decimalAdj = decimalsOut - decimalsIn
  const adjScale = decimalAdj >= 0 ? BigInt(10) ** BigInt(decimalAdj) : undefined
  const adjDiv   = decimalAdj < 0  ? BigInt(10) ** BigInt(-decimalAdj) : undefined
  let out: bigint
  if (tokenInIsToken0) {
    out = (amountIn * priceNum) / priceDen
    if (adjScale) out = out * adjScale
    if (adjDiv)   out = out / adjDiv
  } else {
    out = (amountIn * priceDen) / priceNum
    if (adjDiv)   out = out * adjDiv
    if (adjScale) out = out / adjScale
  }
  return out > 0n ? out : 0n
}

export function useSwapQuote(
  tokenIn:     ArcToken | undefined,
  tokenOut:    ArcToken | undefined,
  amountInStr: string,
  slippageBps: number,
): { quote: QuoteResult | null; loading: boolean; error: string } {

  const [quote,   setQuote]   = useState<QuoteResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')
  const generation = useRef(0)

  const fetchQuote = useCallback(async (gen: number) => {
    if (!tokenIn || !tokenOut) return
    if (tokenIn.erc20.toLowerCase() === tokenOut.erc20.toLowerCase()) {
      setError('Select two different tokens.'); setQuote(null); return
    }
    const amt = parseFloat(amountInStr)
    if (!amountInStr || isNaN(amt) || amt <= 0) {
      setError(''); setQuote(null); return
    }

    setLoading(true)
    setError('')
    setQuote(null)

    try {
      // 1. Get pool addresses for all fee tiers
      const poolAddrs = await Promise.all(
        FEE_TIERS.map((fee) =>
          arcClient.readContract({
            address: UNISWAP_V3.factory,
            abi: V3_FACTORY_ABI,
            functionName: 'getPool',
            args: [tokenIn.erc20, tokenOut.erc20, fee],
          })
        )
      )
      if (gen !== generation.current) return

      const existingPools = poolAddrs
        .map((addr, i) => ({ fee: FEE_TIERS[i], addr: addr as `0x${string}` }))
        .filter(({ addr }) => addr && addr !== '0x0000000000000000000000000000000000000000')

      if (existingPools.length === 0) {
        setError(`No liquidity pool found for ${tokenIn.symbol} → ${tokenOut.symbol} on Arc.`)
        setLoading(false)
        return
      }

      // 2. Read slot0 + liquidity + token0 for each pool
      type PoolData = { fee: FeeTier; sqrtPriceX96: bigint; liquidity: bigint; token0: string }
      const poolData = (
        await Promise.all(
          existingPools.map(async ({ fee, addr }) => {
            try {
              const [slot0, liq, tok0] = await Promise.all([
                arcClient.readContract({ address: addr, abi: V3_POOL_ABI, functionName: 'slot0' }),
                arcClient.readContract({ address: addr, abi: V3_POOL_ABI, functionName: 'liquidity' }),
                arcClient.readContract({ address: addr, abi: V3_POOL_ABI, functionName: 'token0' }),
              ])
              const sqrtPriceX96 = (slot0 as readonly [bigint, ...unknown[]])[0]
              if (!sqrtPriceX96 || sqrtPriceX96 === 0n) return null
              return { fee, sqrtPriceX96, liquidity: liq as bigint, token0: (tok0 as string).toLowerCase() } as PoolData
            } catch { return null }
          })
        )
      ).filter((p): p is PoolData => p !== null)

      if (gen !== generation.current) return

      if (poolData.length === 0) {
        setError(`No active pool for ${tokenIn.symbol} → ${tokenOut.symbol} on Arc.`)
        setLoading(false)
        return
      }

      // 3. Pick best pool and compute quote
      const best = poolData.reduce((a, b) => b.liquidity > a.liquidity ? b : a)
      const tokenInIsToken0 = tokenIn.erc20.toLowerCase() === best.token0
      const amountIn = parseUnits(amountInStr, tokenIn.decimals)

      const amountOutRaw = spotAmountOut(best.sqrtPriceX96, amountIn, tokenInIsToken0, tokenIn.decimals, tokenOut.decimals)
      if (amountOutRaw === 0n) {
        setError('Quote returned zero — pool may have no active liquidity at this tick.')
        setLoading(false)
        return
      }

      const amountOutMin = (amountOutRaw * BigInt(10000 - slippageBps)) / 10000n

      const oneUnit = parseUnits('1', tokenIn.decimals)
      const refOut  = spotAmountOut(best.sqrtPriceX96, oneUnit, tokenInIsToken0, tokenIn.decimals, tokenOut.decimals)
      const expectedOut = refOut > 0n ? (refOut * amountIn) / oneUnit : amountOutRaw
      const impactNum = expectedOut > amountOutRaw ? expectedOut - amountOutRaw : 0n
      const priceImpactPct = expectedOut > 0n ? Number(impactNum * 10000n / expectedOut) / 100 : 0

      const warning = priceImpactPct > 5
        ? `High price impact (${priceImpactPct.toFixed(1)}%). Consider a smaller amount.`
        : priceImpactPct > 1
        ? `Price impact ${priceImpactPct.toFixed(1)}%.`
        : null

      if (gen !== generation.current) return
      setQuote({ amountOut: formatUnits(amountOutRaw, tokenOut.decimals), amountOutRaw, amountOutMin, feeTier: best.fee, feeTierLabel: FEE_LABEL[best.fee], priceImpactPct, warning })
      setError('')
    } catch (e) {
      if (gen !== generation.current) return
      console.error('[useSwapQuote]', e)
      setError('Failed to get quote. Check your connection or try again.')
    } finally {
      if (gen === generation.current) setLoading(false)
    }
  }, [tokenIn, tokenOut, amountInStr, slippageBps])

  useEffect(() => {
    if (!tokenIn || !tokenOut || !amountInStr || parseFloat(amountInStr) <= 0) {
      const t = setTimeout(() => { setQuote(null); setError(''); setLoading(false) }, 0)
      return () => clearTimeout(t)
    }
    const gen = ++generation.current
    const timer = setTimeout(() => fetchQuote(gen), 600)
    return () => clearTimeout(timer)
  }, [tokenIn, tokenOut, amountInStr, slippageBps, fetchQuote])

  return { quote, loading, error }
}

export type { FeeTier }
