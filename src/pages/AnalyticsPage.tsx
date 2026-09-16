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

function AnalyticsPage({ isConnected, address, onConnect }: AnalyticsPageProps) {
  const [analytics, setAnalytics] = useState<AnalyticsSnapshot | null>(null)
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'error'>('loading')

  useEffect(() => {
    const controller = new AbortController()
    setLoadState('loading')
    getAnalytics(bridgeEnvironment, controller.signal)
      .then((snapshot) => {
        setAnalytics(snapshot)
        setLoadState('ready')
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') return
        setLoadState('error')
      })
    return () => controller.abort()
  }, [])

  const formatUsdc = (value: string | number | null | undefined) => {
    const numericValue = Number(value)
    return Number.isFinite(numericValue)
      ? `${new Intl.NumberFormat('en-US', { maximumFractionDigits: 6 }).format(numericValue)} USDC`
      : '—'
  }
  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp)
    return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString()
  }
  const environmentLabel = bridgeEnvironment === 'mainnet' ? 'Mainnet' : 'Testnet'
  const emptyMessage = bridgeEnvironment === 'mainnet' ? 'No verified mainnet bridge activity yet.' : 'No verified testnet bridge activity yet.'
  const metrics = [
    ['Total Volume', analytics ? formatUsdc(analytics.total) : '—'],
    ['Total Transfers', analytics ? analytics.count.toLocaleString() : '—'],
    ['Average Transfer', analytics ? formatUsdc(analytics.average) : '—'],
    ['Environment', environmentLabel],
  ]

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col">
      <Navbar isConnected={isConnected} address={address} onConnect={onConnect} activePage="analytics" />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-12 sm:px-6 lg:px-8">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-violet-300">ArcBridge</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-[-0.05em] text-white sm:text-4xl">ArcBridge Analytics</h1>
        <p className="mt-3 max-w-xl text-sm leading-6 text-slate-400">Verified {environmentLabel.toLowerCase()} bridge activity across the Arc ecosystem.</p>

        <section className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label="Bridge metrics">
          {metrics.map(([label, value]) => (
            <div key={label} className="border border-white/[0.08] bg-slate-800/70 p-4">
              <p className="text-xs uppercase tracking-[0.12em] text-slate-500">{label}</p>
              <p className="mt-3 text-xl font-semibold text-white">{loadState === 'loading' ? 'Loading…' : value}</p>
            </div>
          ))}
        </section>

        {loadState === 'error' && <p className="mt-4 border border-red-300/15 bg-red-300/[0.07] px-4 py-3 text-sm text-red-200">Analytics are temporarily unavailable. Bridge execution is unaffected.</p>}

        <section className="mt-8 border border-white/[0.08] bg-slate-800/70 p-5">
          <h2 className="text-lg font-semibold text-white">Network activity</h2>
          {loadState === 'loading' ? (
            <p className="mt-4 text-sm text-slate-400">Loading verified network activity…</p>
          ) : !analytics?.networkActivity.length ? (
            <p className="mt-4 text-sm text-slate-400">{emptyMessage}</p>
          ) : (
            <div className="mt-4 divide-y divide-white/[0.08]">
              {analytics.networkActivity.map((network) => <div key={`${network.chainId}-${network.chain}`} className="flex justify-between py-3 text-sm"><span className="text-slate-200">{network.chain ?? 'Unknown network'}</span><span className="text-slate-500">{network.count.toLocaleString()} transfers · {formatUsdc(network.volume)}</span></div>)}
            </div>
          )}
        </section>

        <section className="mt-8 border border-white/[0.08] bg-slate-800/70 p-5">
          <h2 className="text-lg font-semibold text-white">Recent activity</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-175 text-left text-sm">
              <thead className="border-b border-white/[0.08] text-xs uppercase tracking-[0.1em] text-slate-500"><tr>{['Source', 'Destination', 'Asset', 'Amount', 'Timestamp', 'Status', 'Transaction'].map((label) => <th key={label} className="px-2 py-3 font-medium">{label}</th>)}</tr></thead>
              <tbody>
                {loadState === 'loading' && <tr><td colSpan={7} className="px-2 py-8 text-center text-slate-400">Loading verified transfers…</td></tr>}
                {loadState !== 'loading' && !analytics?.recentTransfers.length && <tr><td colSpan={7} className="px-2 py-8 text-center text-slate-400">{emptyMessage}</td></tr>}
                {analytics?.recentTransfers.map((transfer: RecentTransfer) => <tr key={transfer.txHash} className="border-b border-white/[0.05] text-slate-300"><td className="px-2 py-3">{transfer.sourceChain ?? '—'}</td><td className="px-2 py-3">{transfer.destinationChain ?? '—'}</td><td className="px-2 py-3">USDC</td><td className="px-2 py-3">{formatUsdc(transfer.amount)}</td><td className="px-2 py-3 whitespace-nowrap">{formatTimestamp(transfer.timestamp)}</td><td className="px-2 py-3 text-emerald-200">Verified</td><td className="px-2 py-3">{transfer.explorerUrl ? <a href={transfer.explorerUrl} target="_blank" rel="noreferrer" className="text-violet-300 underline decoration-violet-300/40 underline-offset-2 hover:text-violet-100">View</a> : '—'}</td></tr>)}
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
