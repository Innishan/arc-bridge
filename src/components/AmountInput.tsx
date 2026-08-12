type AmountInputProps = {
  amount: string
  feePercent: number
  onChange: (amount: string) => void
}

function AmountInput({ amount, feePercent, onChange }: AmountInputProps) {
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
      <p className="mt-2 text-xs leading-5 text-slate-400">
        + {(parseFloat(amount || '0') * feePercent).toFixed(2)} USDC fee (3%) · Total debit:{' '}
        <span className="font-medium text-slate-200">{(parseFloat(amount || '0') * (1 + feePercent)).toFixed(2)} USDC</span>
      </p>
    </div>
  )
}

export default AmountInput
