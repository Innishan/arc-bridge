/**
 * useTokenSearch
 *
 * Returns the curated ARC_DEFAULT_TOKENS plus any tokens the user has
 * previously found and saved to localStorage. When the user types a
 * 0x… address, it reads name/symbol/decimals on-chain and auto-adds it.
 */
import { useState, useEffect, useCallback } from 'react'
import { createPublicClient, http, isAddress } from 'viem'
import { ARC_DEFAULT_TOKENS, ERC20_ABI, ARC_CHAIN_ID, type ArcToken } from '../config/uniswap'

const STORAGE_KEY = 'arcbridge:custom_tokens'

const arcClient = createPublicClient({
  transport: http('https://rpc.mainnet.arc.io'),
  chain: { id: ARC_CHAIN_ID, name: 'Arc', nativeCurrency: { name: 'USDC', symbol: 'USDC', decimals: 18 }, rpcUrls: { default: { http: ['https://rpc.mainnet.arc.io'] } } },
})

function loadCustomTokens(): ArcToken[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as ArcToken[]) : []
  } catch {
    return []
  }
}

function saveCustomToken(token: ArcToken) {
  const existing = loadCustomTokens()
  const deduped = existing.filter((t) => t.erc20.toLowerCase() !== token.erc20.toLowerCase())
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...deduped, token]))
}

export function useTokenSearch() {
  const [query, setQuery]           = useState('')
  const [customTokens, setCustom]   = useState<ArcToken[]>(loadCustomTokens)
  const [searching, setSearching]   = useState(false)
  const [searchError, setSearchError] = useState('')

  // All known tokens = curated + user-saved custom tokens
  const allTokens: ArcToken[] = [
    ...ARC_DEFAULT_TOKENS,
    ...customTokens.filter(
      (c) => !ARC_DEFAULT_TOKENS.some((d) => d.erc20.toLowerCase() === c.erc20.toLowerCase())
    ),
  ]

  // Filtered list based on query
  const filteredTokens = query.trim()
    ? allTokens.filter(
        (t) =>
          t.symbol.toLowerCase().includes(query.toLowerCase()) ||
          t.name.toLowerCase().includes(query.toLowerCase()) ||
          t.erc20.toLowerCase().includes(query.toLowerCase())
      )
    : allTokens

  // When the query looks like an address and isn't already known, probe on-chain
  useEffect(() => {
    const trimmed = query.trim()
    if (!isAddress(trimmed)) { setTimeout(() => setSearchError(''), 0); return }
    const already = allTokens.find((t) => t.erc20.toLowerCase() === trimmed.toLowerCase())
    if (already) { setTimeout(() => setSearchError(''), 0); return }

    let cancelled = false
    setTimeout(() => { if (!cancelled) { setSearching(true); setSearchError('') } }, 0)

    ;(async () => {
      try {
        const addr = trimmed as `0x${string}`
        const [symbol, name, decimals] = await Promise.all([
          arcClient.readContract({ address: addr, abi: ERC20_ABI, functionName: 'symbol' }),
          arcClient.readContract({ address: addr, abi: ERC20_ABI, functionName: 'name' }),
          arcClient.readContract({ address: addr, abi: ERC20_ABI, functionName: 'decimals' }),
        ])
        if (cancelled) return
        const token: ArcToken = {
          symbol: symbol as string,
          name: name as string,
          address: addr,
          erc20: addr,
          decimals: Number(decimals),
          logoColor: 'bg-slate-500',
        }
        saveCustomToken(token)
        setCustom(loadCustomTokens())
      } catch {
        if (!cancelled) setSearchError('Token not found at this address on Arc.')
      } finally {
        if (!cancelled) setSearching(false)
      }
    })()

    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query])

  const clearQuery = useCallback(() => { setQuery(''); setSearchError('') }, [])

  return { query, setQuery, filteredTokens, allTokens, searching, searchError, clearQuery }
}
