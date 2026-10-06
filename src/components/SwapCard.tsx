/**
 * SwapCard — Full Uniswap v3 DEX on Arc Mainnet.
 *
 * - Curated token list + search any ERC-20 by address
 * - Auto-quotes via Uniswap v3 pool slot0 (debounced 600ms)
 * - Auto-picks best fee tier (highest liquidity)
 * - Approve + exactInputSingle via SwapRouter02
 * - Slippage selector (default 1%), transaction history logging
 */
import React, { useState, useCallback, useEffect, useRef } from 'react'
// Inline SVG icons — no external icon library required
const ArrowDownUp = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 16 4 4 4-4"/><path d="M7 20V4"/><path d="m21 8-4-4-4 4"/><path d="M17 4v16"/></svg>
)
const ChevronDown = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
)
const Settings2 = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 7h-9"/><path d="M14 17H5"/><circle cx="17" cy="17" r="3"/><circle cx="7" cy="7" r="3"/></svg>
)
const Loader2 = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
)
const CheckCircle2 = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>
)
const AlertTriangle = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
)
const RefreshCw = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/></svg>
)
import { parseUnits, formatUnits } from 'viem'
import {
  useAccount, useSwitchChain, useBalance, useDisconnect,
  useReadContract, useWriteContract, useWaitForTransactionReceipt,
} from 'wagmi'
import { ARC_DEFAULT_TOKENS, ERC20_ABI, SWAP_ROUTER02_ABI, UNISWAP_V3, USDC_ERC20, type ArcToken } from '../config/uniswap'
import { useSwapQuote } from '../hooks/useSwapQuote'
import TokenSelectModal from './TokenSelectModal'
import { TokenLogo } from './TokenLogo'
import { appendHistory } from '../utils/txHistory'

const ARC_CHAIN_ID = 5042
const SLIPPAGE_OPTIONS = [50, 100, 200, 300] // bps
const SLIPPAGE_LABELS  = ['0.5%', '1%', '2%', '3%']

const EXPLORER = 'https://explorer.arc.io/tx/'

type SwapPhase = 'idle' | 'quoting' | 'approving' | 'swapping' | 'success' | 'error'

type Props = {
  onBridgeMode: () => void
  isConnected: boolean
  onConnect: () => void
}

// ── Token button ──────────────────────────────────────────────────────────────
function TokenButton({ token, onClick }: { token: ArcToken; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-sm font-semibold text-slate-100 transition-colors hover:bg-white/10"
    >
      <TokenLogo token={token} size={22} />
      {token.symbol}
      <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
    </button>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function SwapCard({ onBridgeMode, isConnected, onConnect }: Props) {
  const { address, chainId } = useAccount()
  const { switchChainAsync }            = useSwitchChain()
  const { disconnect }                  = useDisconnect()

  const [tokenIn,  setTokenIn]  = useState<ArcToken>(ARC_DEFAULT_TOKENS[0])   // USDC
  const [tokenOut, setTokenOut] = useState<ArcToken>(ARC_DEFAULT_TOKENS[1])   // EURC
  const [amountIn, setAmountIn] = useState('')
  const [debouncedAmount, setDebouncedAmount] = useState('')

  const [slippageBps,   setSlippageBps]   = useState(100)
  const [showSlippage,  setShowSlippage]  = useState(false)
  const [phase,         setPhase]         = useState<SwapPhase>('idle')
  const [errorMsg,      setErrorMsg]      = useState('')
  const [txHash,        setTxHash]        = useState<`0x${string}` | ''>('')
  const [showTokenIn,   setShowTokenIn]   = useState(false)
  const [showTokenOut,  setShowTokenOut]  = useState(false)

  // Debounce amount input for quote
  const debounceRef = useRef<ReturnType<typeof setTimeout>>()
  useEffect(() => {
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => setDebouncedAmount(amountIn), 600)
    return () => clearTimeout(debounceRef.current)
  }, [amountIn])

  // Reset when tokens change — wrap in setTimeout so it runs outside render
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedAmount('')
      setAmountIn('')
      setPhase('idle')
      setErrorMsg('')
      setTxHash('')
    }, 0)
    return () => clearTimeout(t)
  }, [tokenIn.erc20, tokenOut.erc20])

  // ── Quote ──────────────────────────────────────────────────────────────────
  const { quote, loading: quoteLoading, error: quoteError } = useSwapQuote(
    tokenIn, tokenOut, debouncedAmount, slippageBps
  )

  // ── Balance ────────────────────────────────────────────────────────────────
  // USDC: use native balance on Arc (same pool)
  const isUsdcIn = tokenIn.erc20.toLowerCase() === USDC_ERC20.toLowerCase()

  const { data: nativeBal } = useBalance({
    address,
    chainId: ARC_CHAIN_ID,
    query: { enabled: !!address && isUsdcIn },
  })

  const { data: erc20BalRaw } = useReadContract({
    address: tokenIn.erc20,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    chainId: ARC_CHAIN_ID,
    query: { enabled: !!address && !isUsdcIn },
  })

  const balanceDisplay: string | null = (() => {
    if (!address) return null
    if (isUsdcIn && nativeBal) {
      return parseFloat(formatUnits(nativeBal.value, nativeBal.decimals)).toFixed(4)
    }
    if (!isUsdcIn && erc20BalRaw !== undefined) {
      return parseFloat(formatUnits(erc20BalRaw as bigint, tokenIn.decimals)).toFixed(4)
    }
    return null
  })()

  // ── Allowance ──────────────────────────────────────────────────────────────
  const { data: allowanceRaw } = useReadContract({
    address: tokenIn.erc20,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: address ? [address, UNISWAP_V3.router] : undefined,
    chainId: ARC_CHAIN_ID,
    query: { enabled: !!address && !!amountIn },
  })

  const needsApproval = (() => {
    if (!amountIn || !quote) return false
    const needed = parseUnits(amountIn, tokenIn.decimals)
    return (allowanceRaw as bigint ?? 0n) < needed
  })()

  // ── Write hooks ────────────────────────────────────────────────────────────
  const { writeContractAsync } = useWriteContract()
  const { data: txReceipt, isLoading: txPending } = useWaitForTransactionReceipt({
    hash: txHash || undefined,
    chainId: ARC_CHAIN_ID,
  })

  useEffect(() => {
    if (txReceipt && phase === 'swapping') {
      const hash = txHash
      const ai = amountIn
      const ao = quote?.amountOut ?? ''
      const ts = tokenIn.symbol
      const to = tokenOut.symbol
      setTimeout(() => {
        setPhase('success')
        appendHistory({
          type: 'swap',
          amountIn: ai,
          amountOut: ao,
          tokenIn: ts,
          tokenOut: to,
          txHash: hash as string,
          explorerUrl: EXPLORER + hash,
          timestamp: Date.now(),
        })
      }, 0)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [txReceipt])

  // ── Helpers ────────────────────────────────────────────────────────────────
  const ensureArc = useCallback(async () => {
    if (chainId !== ARC_CHAIN_ID) await switchChainAsync({ chainId: ARC_CHAIN_ID })
  }, [chainId, switchChainAsync])

  const handleFlip = () => {
    setTokenIn(tokenOut)
    setTokenOut(tokenIn)
    setAmountIn('')
    setDebouncedAmount('')
  }

  const handleMax = () => {
    if (balanceDisplay) setAmountIn(balanceDisplay)
  }

  const handleReset = () => {
    setPhase('idle')
    setErrorMsg('')
    setTxHash('')
    setAmountIn('')
    setDebouncedAmount('')
  }

  // ── Approve ────────────────────────────────────────────────────────────────
  const handleApprove = async () => {
    if (!address || !amountIn) return
    try {
      setPhase('approving')
      await ensureArc()
      const amount = parseUnits(amountIn, tokenIn.decimals)
      await writeContractAsync({
        address: tokenIn.erc20,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [UNISWAP_V3.router, amount],
        chainId: ARC_CHAIN_ID,
      })
      setPhase('idle')
    } catch (e: unknown) {
      setPhase('error')
      setErrorMsg(e instanceof Error ? e.message : 'Approval failed.')
    }
  }

  // ── Swap ───────────────────────────────────────────────────────────────────
  const handleSwap = async () => {
    if (!address || !quote || !amountIn) return
    try {
      setPhase('swapping')
      await ensureArc()

      const amountInRaw = parseUnits(amountIn, tokenIn.decimals)
      const amountOutMin = quote.amountOutMin
      const hash = await writeContractAsync({
        address: UNISWAP_V3.router,
        abi: SWAP_ROUTER02_ABI,
        functionName: 'exactInputSingle',
        args: [{
          tokenIn:           tokenIn.erc20,
          tokenOut:          tokenOut.erc20,
          fee:               quote.feeTier,
          recipient:         address,
          amountIn:          amountInRaw,
          amountOutMinimum:  amountOutMin,
          sqrtPriceLimitX96: 0n,
        }],
        chainId: ARC_CHAIN_ID,
      })
      setTxHash(hash)
    } catch (e: unknown) {
      setPhase('error')
      const msg = e instanceof Error ? e.message : 'Swap failed.'
      setErrorMsg(msg.includes('user rejected') ? 'Transaction rejected.' : msg)
    }
  }

  // ── Render helpers ─────────────────────────────────────────────────────────
  const isLoading = phase === 'approving' || phase === 'swapping' || txPending
  const onArc     = chainId === ARC_CHAIN_ID

  // ── Not connected ──────────────────────────────────────────────────────────
  if (!isConnected) {
    return (
      <div className="arc-bridge-card">
        <TabBar onBridge={onBridgeMode} />
        <div className="flex flex-col items-center gap-4 py-10 px-6">
          <p className="text-center text-sm text-slate-400">Connect your wallet to swap on Arc Mainnet.</p>
          <button
            onClick={onConnect}
            className="w-full rounded-xl bg-violet-600 py-3 text-sm font-semibold text-white hover:bg-violet-500 transition-colors"
          >
            Connect Wallet
          </button>
        </div>
      </div>
    )
  }

  // ── Success ────────────────────────────────────────────────────────────────
  if (phase === 'success') {
    return (
      <div className="arc-bridge-card">
        <TabBar onBridge={onBridgeMode} />
        <div className="flex flex-col items-center gap-5 px-6 py-10">
          <CheckCircle2 className="h-12 w-12 text-emerald-400" />
          <div className="text-center">
            <p className="text-lg font-semibold text-slate-100">Swap submitted!</p>
            <p className="mt-1 text-sm text-slate-400">
              {amountIn} {tokenIn.symbol} → {parseFloat(quote?.amountOut ?? '0').toFixed(6)} {tokenOut.symbol}
            </p>
          </div>
          {txHash && (
            <a
              href={EXPLORER + txHash}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-violet-400 underline hover:text-violet-300"
            >
              View on explorer ↗
            </a>
          )}
          <div className="flex w-full gap-3">
            <button
              onClick={handleReset}
              className="flex-1 rounded-xl border border-white/10 py-2.5 text-sm font-medium text-slate-300 hover:bg-white/5 transition-colors"
            >
              Swap again
            </button>
            <button
              onClick={() => disconnect()}
              className="rounded-xl border border-white/10 px-4 py-2.5 text-sm text-slate-400 hover:bg-white/5 transition-colors"
            >
              Disconnect
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Main swap UI ───────────────────────────────────────────────────────────
  return (
    <>
      <div className="arc-bridge-card">
        <TabBar onBridge={onBridgeMode} />

        <div className="px-5 pb-5 pt-4 space-y-3">

          {/* Header row */}
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">Swap on Arc</span>
            <div className="flex items-center gap-2">
              {/* Slippage */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowSlippage((s) => !s)}
                  className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-slate-300 hover:bg-white/10 transition-colors"
                >
                  <Settings2 className="h-3 w-3" />
                  {SLIPPAGE_LABELS[SLIPPAGE_OPTIONS.indexOf(slippageBps)] ?? `${slippageBps / 100}%`}
                </button>
                {showSlippage && (
                  <div className="absolute right-0 top-8 z-20 rounded-xl border border-white/10 bg-[#1a1726] p-3 shadow-xl">
                    <p className="mb-2 text-[0.65rem] font-semibold uppercase tracking-widest text-slate-400">Slippage</p>
                    <div className="flex gap-1.5">
                      {SLIPPAGE_OPTIONS.map((bps, i) => (
                        <button
                          key={bps}
                          onClick={() => { setSlippageBps(bps); setShowSlippage(false) }}
                          className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors ${
                            slippageBps === bps
                              ? 'bg-violet-600 text-white'
                              : 'border border-white/10 text-slate-300 hover:bg-white/10'
                          }`}
                        >
                          {SLIPPAGE_LABELS[i]}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <button
                onClick={() => disconnect()}
                className="rounded-lg border border-white/10 px-2 py-1 text-xs text-slate-400 hover:text-slate-200 transition-colors"
              >
                Disconnect
              </button>
            </div>
          </div>

          {/* From */}
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">From</span>
              {balanceDisplay && (
                <span className="text-xs text-slate-500">
                  Balance: <span className="text-slate-300">{balanceDisplay} {tokenIn.symbol}</span>
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <TokenButton token={tokenIn} onClick={() => setShowTokenIn(true)} />
              <input
                type="number"
                min="0"
                value={amountIn}
                onChange={(e) => setAmountIn(e.target.value)}
                placeholder="0.00"
                disabled={isLoading}
                className="min-w-0 flex-1 bg-transparent text-right text-xl font-semibold text-slate-100 placeholder-slate-600 outline-none disabled:opacity-50"
              />
            </div>
            {balanceDisplay && (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleMax}
                  className="rounded-md border border-violet-400/20 bg-violet-400/10 px-2 py-0.5 text-[0.65rem] font-bold tracking-wide text-violet-300 hover:bg-violet-400/20 transition-colors"
                >
                  MAX
                </button>
              </div>
            )}
          </div>

          {/* Flip button */}
          <div className="flex justify-center">
            <button
              type="button"
              onClick={handleFlip}
              disabled={isLoading}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-[#1a1726] text-slate-400 transition-colors hover:border-violet-400/30 hover:text-violet-300 disabled:opacity-40"
            >
              <ArrowDownUp className="h-4 w-4" />
            </button>
          </div>

          {/* To */}
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 space-y-2">
            <span className="text-xs text-slate-400">To (estimated)</span>
            <div className="flex items-center gap-3">
              <TokenButton token={tokenOut} onClick={() => setShowTokenOut(true)} />
              <div className="min-w-0 flex-1 text-right">
                {quoteLoading ? (
                  <div className="flex items-center justify-end gap-1.5 text-slate-500 text-sm">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Quoting…
                  </div>
                ) : quote ? (
                  <span className="text-xl font-semibold text-slate-100">
                    {parseFloat(quote.amountOut).toFixed(6)}
                  </span>
                ) : (
                  <span className="text-xl font-semibold text-slate-600">0.00</span>
                )}
              </div>
            </div>
          </div>

          {/* Quote details */}
          {quote && !quoteLoading && (
            <div className="rounded-xl border border-white/8 bg-white/[0.025] px-4 py-3 space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-400">
                <span>Fee tier</span>
                <span className="text-slate-200">{quote.feeTierLabel}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Price impact</span>
                <span className={quote.priceImpactPct > 5 ? 'text-red-400' : quote.priceImpactPct > 1 ? 'text-yellow-400' : 'text-emerald-400'}>
                  ~{quote.priceImpactPct.toFixed(2)}%
                </span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Min received</span>
                <span className="text-slate-200">
                  {formatUnits(
                    quote.amountOutRaw * BigInt(10000 - slippageBps) / 10000n,
                    tokenOut.decimals,
                  ).slice(0, 10)} {tokenOut.symbol}
                </span>
              </div>
              {quote.warning && (
                <div className="flex items-start gap-1.5 rounded-lg bg-yellow-400/10 px-2.5 py-2 text-yellow-300 mt-1">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                  <span>{quote.warning}</span>
                </div>
              )}
            </div>
          )}

          {/* Quote error */}
          {(quoteError || errorMsg) && (
            <div className="flex items-start gap-2 rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-xs text-red-300">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              <span>{quoteError || errorMsg}</span>
            </div>
          )}

          {/* Wrong chain warning */}
          {isConnected && !onArc && (
            <div className="flex items-center gap-2 rounded-xl border border-yellow-400/20 bg-yellow-400/10 px-4 py-3 text-xs text-yellow-300">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              <span>Swaps run on Arc Mainnet. You'll be prompted to switch.</span>
            </div>
          )}

          {/* CTA */}
          {phase === 'error' ? (
            <button
              onClick={handleReset}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 py-3 text-sm font-medium text-slate-300 hover:bg-white/5 transition-colors"
            >
              <RefreshCw className="h-4 w-4" /> Try again
            </button>
          ) : needsApproval ? (
            <button
              onClick={handleApprove}
              disabled={isLoading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 py-3 text-sm font-semibold text-white hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {phase === 'approving' ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Approving…</>
              ) : (
                `Approve ${tokenIn.symbol}`
              )}
            </button>
          ) : (
            <button
              onClick={handleSwap}
              disabled={isLoading || !quote || !amountIn || !!quoteError}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 py-3 text-sm font-semibold text-white hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {phase === 'swapping' || txPending ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> {txPending ? 'Confirming…' : 'Swapping…'}</>
              ) : !amountIn || parseFloat(amountIn) <= 0 ? (
                'Enter an amount'
              ) : quoteLoading ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Getting quote…</>
              ) : !quote ? (
                'No route found'
              ) : (
                `Swap ${tokenIn.symbol} → ${tokenOut.symbol}`
              )}
            </button>
          )}

        </div>
      </div>

      {/* Token select modals */}
      <TokenSelectModal
        open={showTokenIn}
        onClose={() => setShowTokenIn(false)}
        onSelect={(t) => { setTokenIn(t); setAmountIn('') }}
        excluded={tokenOut.erc20}
      />
      <TokenSelectModal
        open={showTokenOut}
        onClose={() => setShowTokenOut(false)}
        onSelect={setTokenOut}
        excluded={tokenIn.erc20}
      />
    </>
  )
}

// ── Shared tab bar ────────────────────────────────────────────────────────────
function TabBar({ onBridge }: { onBridge: () => void }) {
  return (
    <div className="flex border-b border-white/10">
      <button
        type="button"
        onClick={onBridge}
        className="flex-1 py-3 text-sm font-semibold text-slate-400 transition-colors hover:text-slate-200"
      >
        Bridge
      </button>
      <button
        type="button"
        className="flex-1 border-b-2 border-violet-500 py-3 text-sm font-semibold text-violet-300"
      >
        Swap
      </button>
    </div>
  )
}
