import { useState, useEffect, useCallback } from 'react'
import { loadHistory, type TxRecord } from '../utils/txHistory'

export type { TxRecord }

function formatRelativeTime(ts: number): string {
  const diff = Math.floor((Date.now() - ts) / 1000)
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return new Date(ts).toLocaleDateString()
}

type TxHistoryProps = {
  address?: string
  /** Bump this to force a re-read from localStorage after a new tx is appended */
  refreshKey?: number
}

function TxHistory({ address, refreshKey }: TxHistoryProps) {
  const [open, setOpen] = useState(false)
  const [records, setRecords] = useState<TxRecord[]>([])

  const refresh = useCallback(() => {
    const data = loadHistory()
    setRecords(data)
  }, [])

  useEffect(() => {
    // Use setTimeout to avoid setState-in-effect lint error
    const t = setTimeout(refresh, 0)
    return () => clearTimeout(t)
  }, [refresh, refreshKey])

  if (!address || records.length === 0) return null

  return (
    <section className="mt-4 rounded-xl border border-white/[0.08] bg-white/[0.025]" aria-label="Transaction history">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 text-xs font-medium text-slate-400 hover:text-slate-200 transition-colors"
      >
        <span className="flex items-center gap-2">
          <svg viewBox="0 0 24 24" aria-hidden="true" className="size-3.5 fill-none stroke-current" strokeWidth="1.8">
            <path d="M12 8v4l3 3m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Recent transactions ({records.length})
        </span>
        <span>{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="divide-y divide-white/[0.06] border-t border-white/[0.06]">
          {records.map((tx) => (
            <div key={tx.id} className="px-4 py-3 text-xs">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className={`rounded px-1.5 py-0.5 text-[0.6rem] font-bold uppercase tracking-wider ${
                      tx.type === 'bridge'
                        ? 'bg-violet-400/[0.15] text-violet-300'
                        : 'bg-sky-400/[0.15] text-sky-300'
                    }`}>
                      {tx.type}
                    </span>
                    <span className="truncate font-medium text-slate-200">
                      {tx.amount} {tx.asset}
                    </span>
                  </div>
                  <p className="mt-1 text-slate-500">
                    {tx.fromLabel && tx.toLabel
                      ? `${tx.fromLabel} → ${tx.toLabel}`
                      : tx.tokenIn && tx.tokenOut
                      ? `${tx.tokenIn} → ${tx.tokenOut}`
                      : ''}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <span className={`font-semibold ${tx.status === 'success' ? 'text-emerald-400' : 'text-red-400'}`}>
                    {tx.status === 'success' ? '✓' : '✗'}
                  </span>
                  {tx.explorerUrl ? (
                    <a
                      href={tx.explorerUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-violet-400 hover:text-violet-200 underline-offset-2 hover:underline"
                    >
                      View
                    </a>
                  ) : null}
                </div>
              </div>
              <p className="mt-1 text-slate-600">{formatRelativeTime(tx.timestamp)}</p>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

export default TxHistory
