type StatsProps = {
  totalVolume: number | null
}

function Stats({ totalVolume }: StatsProps) {
  if (totalVolume === null) return null

  return (
    <p className="text-xs text-slate-500 mb-6">
      Total bridged to Arc: <span className="text-white font-medium">{totalVolume.toFixed(2)} USDC</span>
    </p>
  )
}

export default Stats
