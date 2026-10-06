import { useEffect, useRef } from 'react'
// Inline SVG icons
const Search = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
)
const X = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
)
const Loader2 = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
)
const AlertCircle = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>
)
import { useTokenSearch } from '../hooks/useTokenSearch'
import type { ArcToken } from '../config/uniswap'
import { TokenLogo } from './TokenLogo'

type Props = {
  open: boolean
  onClose: () => void
  onSelect: (token: ArcToken) => void
  excluded?: string   // erc20 address to gray out (the other side of the pair)
}

export default function TokenSelectModal({ open, onClose, onSelect, excluded }: Props) {
  const { query, setQuery, filteredTokens, searching, searchError, clearQuery } = useTokenSearch()
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      clearQuery()
      setTimeout(() => inputRef.current?.focus(), 80)
    }
  }, [open, clearQuery])

  // Close on Escape
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#13111C] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <span className="text-sm font-semibold text-slate-100">Select token</span>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:text-slate-200">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Search */}
        <div className="px-4 py-3">
          <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2">
            <Search className="h-4 w-4 shrink-0 text-slate-400" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search name or paste address"
              className="min-w-0 flex-1 bg-transparent text-sm text-slate-100 placeholder-slate-500 outline-none"
            />
            {searching && <Loader2 className="h-4 w-4 shrink-0 animate-spin text-violet-400" />}
            {query && !searching && (
              <button onClick={clearQuery} className="text-slate-500 hover:text-slate-300">
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
          {searchError && (
            <div className="mt-2 flex items-center gap-1.5 text-xs text-red-400">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              {searchError}
            </div>
          )}
        </div>

        {/* Token list */}
        <ul className="max-h-72 overflow-y-auto px-2 pb-3">
          {filteredTokens.length === 0 && !searching && (
            <li className="py-8 text-center text-sm text-slate-500">No tokens found</li>
          )}
          {filteredTokens.map((token) => {
            const isExcluded = excluded && token.erc20.toLowerCase() === excluded.toLowerCase()
            return (
              <li key={token.erc20}>
                <button
                  onClick={() => { if (!isExcluded) { onSelect(token); onClose() } }}
                  disabled={!!isExcluded}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 transition-colors ${
                    isExcluded
                      ? 'cursor-not-allowed opacity-40'
                      : 'hover:bg-white/5 active:bg-white/10'
                  }`}
                >
                  <TokenLogo token={token} size={32} />
                  <div className="min-w-0 flex-1 text-left">
                    <div className="text-sm font-semibold text-slate-100">{token.symbol}</div>
                    <div className="truncate text-xs text-slate-400">{token.name}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-slate-500 font-mono">
                      {token.erc20.slice(0, 6)}…{token.erc20.slice(-4)}
                    </div>
                  </div>
                </button>
              </li>
            )
          })}
        </ul>

        {/* Footer note */}
        <div className="border-t border-white/10 px-5 py-3 text-center text-xs text-slate-500">
          Paste any Arc ERC-20 address to add a custom token
        </div>
      </div>
    </div>
  )
}
