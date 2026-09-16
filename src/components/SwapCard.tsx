import { arcSwapConfig } from '../config/swap'

type SwapCardProps = {
  onBridgeMode: () => void
}

function SwapCard({ onBridgeMode }: SwapCardProps) {
  return (
    <div className="arc-bridge-card">
      <div className="mb-4">
        <p className="text-[0.68rem] font-bold uppercase tracking-[0.16em] text-violet-300">ArcBridge</p>
        <h2 className="mt-1 text-xl font-semibold tracking-[-0.04em] text-white">Swap on Arc</h2>
        <p className="mt-1 text-sm leading-5 text-slate-400">Swaps are limited to assets on Arc Mainnet.</p>
      </div>
      <div className="mb-4 grid grid-cols-2 rounded-lg border border-white/[0.09] bg-white/[0.025] p-1 text-xs font-medium">
        <button onClick={onBridgeMode} className="rounded-md px-3 py-2 text-slate-400 hover:text-slate-100">Bridge</button>
        <button className="rounded-md bg-violet-400/[0.16] px-3 py-2 text-violet-100">Swap</button>
      </div>
      <div className="border border-amber-200/15 bg-amber-300/[0.07] px-3.5 py-3 text-sm leading-5 text-amber-100">
        <span className="font-medium">Swap coming soon.</span> {arcSwapConfig.unavailableReason}
      </div>
      <div className="mt-4 space-y-3 opacity-60" aria-disabled="true">
        <div className="border border-white/[0.09] bg-white/[0.035] px-3.5 py-3 text-sm text-slate-400">From — Arc asset</div>
        <div className="border border-white/[0.09] bg-white/[0.035] px-3.5 py-3 text-sm text-slate-400">To — Arc asset</div>
        <div className="border border-white/[0.09] bg-white/[0.035] px-3.5 py-3 text-sm text-slate-400">Quote, slippage, and minimum received will appear here.</div>
      </div>
      <p className="mt-4 text-xs text-slate-500">Configured network: {arcSwapConfig.chain}</p>
    </div>
  )
}

export default SwapCard
