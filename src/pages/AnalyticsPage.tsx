import { useEffect, useState } from 'react'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import { bridgeEnvironment } from '../config/bridge'
import { getAnalytics, type AnalyticsSnapshot, type RecentTransfer } from '../services/analytics'

type AnalyticsPageProps = {
  isConnected: boolean
  address?: string
  onConnect: () => void
}

function NetworkChart({ data }: { data: AnalyticsSnapshot['networkActivity'] }) {
  if (!data.length) return null
  const maxVol = Math.max(...data.map((n) => n.volume), 1)
  return (
    <div className="mt-4 space-y-3">
      {data.map((network) => {
        const pct = Math.max(2, (network.volume / maxVol) * 100)
        return (
          <div key={`${network.chainId}-${network.chain}`}>
            <div className="mb-1 flex items-center justify-between gap-2 text-sm">
              <span className="text-slate-200">{network.chain ?? 'Unknown'}</span>
              <span className="text-slate-500 text-xs tabular-nums">
                {network.count.toLocaleString()} tx · {Number(network.volume).toLocaleString(undefined, { maximumFractionDigits: 2 })} USDC
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-white/[0.06]">
              <div
                className="h-full rounded-full bg-violet-500 transition-all duration-700"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}

function AnalyticsPage({ isConnected, address, onConnect }: AnalyticsPageProps) {
  const [analytics, setAnalytics] = useState<AnalyticsSnapshot | null>(null)
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'error'>('loading')
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    let mounted = true

    const load = async () => {
      try {
        const snapshot = await getAnalytics(bridgeEnvironment, controller.signal)
        if (!mounted) return
        setAnalytics(snapshot)
        setLoadState('ready')
        setLastUpdated(new Date())
      } catch (error: unknown) {
        if (!mounted) return
        if (error instanceof DOMException && error.name === 'AbortError') return
        setLoadState('error')
      }
    }

    load()
    const interval = setInterval(load, 30_000)
    return () => {
      mounted = false
      controller.abort()
      clearInterval(interval)
    }
  }, [])

  const formatUsdc = (value: string | number | null | undefined) => {
    const n = Number(value)
    return Number.isFinite(n) ? `${n.toLocaleString('en-US', { maximumFractionDigits: 2 })} USDC` : '—'
  }
  const formatTimestamp = (ts: number) => {
    const d = new Date(ts)
    return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString()
  }

  const environmentLabel = bridgeEnvironment === 'mainnet' ? 'Mainnet' : 'Testnet'
  const emptyMessage = `No verified ${environmentLabel.toLowerCase()} bridge activity yet.`

  const metrics = [
    { label: 'Total Volume', value: analytics ? formatUsdc(analytics.total) : '—' },
    { label: 'Total Transfers', value: analytics ? analytics.count.toLocaleString() : '—' },
    { label: 'Average Transfer', value: analytics ? formatUsdc(analytics.average) : '—' },
    { label: 'Environment', value: environmentLabel },
  ]

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col">
      <Navbar isConnected={isConnected} address={address} onConnect={onConnect} activePage="analytics" />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-12 sm:px-6 lg:px-8">

        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-violet-300">ArcBridge</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-[-0.05em] text-white sm:text-4xl">Analytics</h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-slate-400">
              Verified {environmentLabel.toLowerCase()} bridge activity across the Arc ecosystem.
            </p>
          </div>
          {lastUpdated && (
            <p className="text-xs text-slate-600 tabular-nums">
              Updated {lastUpdated.toLocaleTimeString()} · refreshes every 30s
            </p>
          )}
        </div>

        {/* Metric cards */}
        <section className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label="Bridge metrics">
          {metrics.map(({ label, value }) => (
            <div key={label} className="rounded-xl border border-white/[0.08] bg-slate-800/70 p-4">
              <p className="text-xs uppercase tracking-[0.12em] text-slate-500">{label}</p>
              <p className="mt-3 text-xl font-semibold text-white">
                {loadState === 'loading' ? <span className="animate-pulse text-slate-600">—</span> : value}
              </p>
            </div>
          ))}
        </section>

        {loadState === 'error' && (
          <p className="mt-4 rounded-xl border border-red-300/15 bg-red-300/[0.07] px-4 py-3 text-sm text-red-200">
            Analytics are temporarily unavailable. Bridge execution is unaffected.
          </p>
        )}

        {/* Network activity bar chart */}
        <section className="mt-8 rounded-xl border border-white/[0.08] bg-slate-800/70 p-5">
          <h2 className="text-lg font-semibold text-white">Network activity</h2>
          {loadState === 'loading' ? (
            <div className="mt-4 space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-8 animate-pulse rounded-lg bg-white/[0.04]" />
              ))}
            </div>
          ) : !analytics?.networkActivity.length ? (
            <p className="mt-4 text-sm text-slate-400">{emptyMessage}</p>
          ) : (
            <NetworkChart data={analytics.networkActivity} />
          )}
        </section>

        {/* Recent activity table */}
        <section className="mt-8 rounded-xl border border-white/[0.08] bg-slate-800/70 p-5">
          <h2 className="text-lg font-semibold text-white">Recent activity</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[44rem] text-left text-sm">
              <thead className="border-b border-white/[0.08] text-xs uppercase tracking-[0.1em] text-slate-500">
                <tr>
                  {['Source', 'Destination', 'Asset', 'Amount', 'Timestamp', 'Status', 'Transaction'].map((col) => (
                    <th key={col} className="px-2 py-3 font-medium">{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loadState === 'loading' && (
                  <tr><td colSpan={7} className="px-2 py-8 text-center text-slate-400">Loading verified transfers…</td></tr>
                )}
                {loadState !== 'loading' && !analytics?.recentTransfers.length && (
                  <tr><td colSpan={7} className="px-2 py-8 text-center text-slate-400">{emptyMessage}</td></tr>
                )}
                {analytics?.recentTransfers.map((transfer: RecentTransfer) => (
                  <tr key={transfer.txHash} className="border-b border-white/[0.05] text-slate-300">
                    <td className="px-2 py-3">{transfer.sourceChain ?? '—'}</td>
                    <td className="px-2 py-3">{transfer.destinationChain ?? '—'}</td>
                    <td className="px-2 py-3">USDC</td>
                    <td className="px-2 py-3">{formatUsdc(transfer.amount)}</td>
                    <td className="px-2 py-3 whitespace-nowrap">{formatTimestamp(transfer.timestamp)}</td>
                    <td className="px-2 py-3 text-emerald-200">Verified</td>
                    <td className="px-2 py-3">
                      {transfer.explorerUrl
                        ? <a href={transfer.explorerUrl} target="_blank" rel="noreferrer" className="text-violet-300 underline decoration-violet-300/40 underline-offset-2 hover:text-violet-100">View</a>
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

      </main>
      <Footer />
    </div>
  )
}

export default AnalyticsPage
