import type { PointsSnapshot } from '../services/analytics'

type PointsPanelProps = {
  address?: string
  points: PointsSnapshot | null
}

const formatPoints = (value: number) => value.toLocaleString(undefined, { maximumFractionDigits: 6 })

function PointsPanel({ address, points }: PointsPanelProps) {
  const referralLink = address ? `https://arcbridge.online/?ref=${address}` : ''
  const progress = points ? Math.min(100, points.totalDistributed / points.maxPoints * 100) : 0

  return (
    <section className="mt-5 rounded-xl border border-violet-200/15 bg-violet-400/[0.06] p-4" aria-label="ArcBridge points">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[0.68rem] font-bold uppercase tracking-[0.16em] text-violet-300">Arc Points</p>
          <p className="mt-1 text-2xl font-semibold tracking-[-0.04em] text-white">{points ? formatPoints(points.points) : '—'}</p>
        </div>
        {points && <p className="text-right text-xs leading-5 text-slate-400">{formatPoints(points.totalDistributed)} / 1,000,000<br />distributed</p>}
      </div>

      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/[0.08]"><div className="h-full rounded-full bg-violet-400" style={{ width: `${progress}%` }} /></div>
      {points?.programComplete ? (
        <p className="mt-3 text-sm leading-5 text-amber-100">Points program complete — 1,000,000 points distributed.</p>
      ) : !address ? (
        <p className="mt-3 text-sm text-slate-400">Connect your wallet to view points and invite friends.</p>
      ) : points?.points === 0 ? (
        <p className="mt-3 text-sm text-slate-400">Start bridging to earn points.</p>
      ) : (
        <p className="mt-3 text-sm text-slate-300">{points?.successfulReferrals ?? 0} successful referral{points?.successfulReferrals === 1 ? '' : 's'}</p>
      )}

      <div className="mt-3 border-t border-white/[0.08] pt-3 text-xs leading-5 text-slate-400">
        <p><span className="font-medium text-slate-200">+1 point</span> / $1 bridged · <span className="font-medium text-slate-200">+50 points</span> / successful referral</p>
        <p className="mt-1">Points are program credits only; they have no monetary value and do not guarantee future rewards.</p>
      </div>
      {referralLink && (
        <div className="mt-3">
          <p className="mb-1 text-xs font-medium text-slate-300">Referral link</p>
          <div className="flex gap-2">
            <input readOnly value={referralLink} aria-label="Referral link" className="min-w-0 flex-1 rounded-md border border-white/[0.1] bg-slate-950/30 px-2 py-1.5 text-xs text-slate-300 outline-none" />
            <button type="button" onClick={() => navigator.clipboard?.writeText(referralLink)} className="rounded-md border border-violet-200/20 px-2.5 text-xs font-semibold text-violet-200 hover:bg-violet-400/[0.12]">Invite Friends</button>
          </div>
        </div>
      )}
    </section>
  )
}

export default PointsPanel
