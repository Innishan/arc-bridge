type StatsProps = {
  totalVolume: number | null
  totalCount?: number | null
}

function Stats({ totalVolume, totalCount }: StatsProps) {
  if (totalVolume === null) return null

  return (
    <div className="mb-6 grid grid-cols-2 gap-2">
      <div className="rounded-lg border border-white/[0.07] bg-white/[0.025] px-3 py-2.5">
        <p className="text-[0.62rem] font-bold uppercase tracking-[0.13em] text-slate-500">Total bridged</p>
        <p className="mt-1 text-sm font-semibold text-white">{totalVolume.toLocaleString(undefined, { maximumFractionDigits: 2 })} USDC</p>
      </div>
      {totalCount != null && (
        <div className="rounded-lg border border-white/[0.07] bg-white/[0.025] px-3 py-2.5">
          <p className="text-[0.62rem] font-bold uppercase tracking-[0.13em] text-slate-500">Transfers</p>
          <p className="mt-1 text-sm font-semibold text-white">{totalCount.toLocaleString()}</p>
        </div>
      )}
    </div>
  )
}

export default Stats
