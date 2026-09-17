import { formatFeeFromInputAmount } from '../config/fees'

type AmountInputProps = {
  amount: string
  feePercent: number
  onChange: (amount: string) => void
}

function AmountInput({ amount, feePercent, onChange }: AmountInputProps) {
  const basisPoints = Math.round(feePercent * 10_000)
  const isValidAmount = /^\d+(?:\.\d{1,6})?$/.test(amount)
  const bridgeAmount = isValidAmount ? amount : '0'
  const developerFee = formatFeeFromInputAmount(bridgeAmount, basisPoints)
  const totalDebit = (() => {
    const [whole, fraction = ''] = bridgeAmount.split('.')
    const amountAtomic = BigInt(whole) * 1_000_000n + BigInt((fraction + '000000').slice(0, 6))
    const feeAtomic = BigInt(developerFee.split('.')[0]) * 1_000_000n + BigInt(((developerFee.split('.')[1] ?? '') + '000000').slice(0, 6))
    const totalAtomic = amountAtomic + feeAtomic
    const totalWhole = totalAtomic / 1_000_000n
    const totalFraction = (totalAtomic % 1_000_000n).toString().padStart(6, '0').replace(/0+$/, '')
    return totalFraction ? `${totalWhole}.${totalFraction}` : totalWhole.toString()
  })()

  return (
    <div className="border-t border-white/[0.08] pt-4">
      <div className="flex items-center justify-between gap-3">
        <label className="text-xs font-medium uppercase tracking-[0.13em] text-slate-400">Amount</label>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-200/15 bg-sky-300/[0.08] px-2 py-1 text-[0.68rem] font-bold tracking-wide text-sky-100">
          <span className="flex size-3.5 items-center justify-center rounded-full bg-sky-300 text-[0.55rem] text-slate-950">$</span>
          USDC
        </span>
      </div>
      <div className="mt-2 flex items-center gap-2">
        <input
          type="text"
          value={amount}
          onChange={(e) => onChange(e.target.value)}
          aria-label="Amount in USDC"
          className="min-w-0 flex-1 bg-transparent py-0.5 text-2xl font-medium tracking-[-0.05em] text-white outline-none placeholder:text-slate-600 sm:text-3xl"
        />
        <span className="text-sm font-semibold text-slate-300">USDC</span>
      </div>
      <div className="mt-2 space-y-0.5 text-xs leading-5 text-slate-400">
        <p>Bridge amount: <span className="font-medium text-slate-200">{bridgeAmount} USDC</span></p>
        <p>{feePercent > 0 ? <>Developer fee: <span className="font-medium text-slate-200">{developerFee} USDC ({feePercent * 100}%)</span></> : 'No ArcBridge developer fee configured'}</p>
        <p>Total debit: <span className="font-medium text-slate-200">{totalDebit} USDC</span></p>
      </div>
    </div>
  )
}

export default AmountInput
