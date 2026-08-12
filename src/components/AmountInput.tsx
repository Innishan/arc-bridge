type AmountInputProps = {
  amount: string
  feePercent: number
  onChange: (amount: string) => void
}

function AmountInput({ amount, feePercent, onChange }: AmountInputProps) {
  return (
    <>
      <label className="text-xs text-slate-400 block mb-1">Amount (USDC)</label>
      <input
        type="text"
        value={amount}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-slate-700 text-white text-sm px-3 py-2 rounded-lg mb-1 outline-none"
      />
      <p className="text-xs text-slate-500 mb-4">
        + {(parseFloat(amount || '0') * feePercent).toFixed(2)} USDC fee (3%) · Total debit:{' '}
        {(parseFloat(amount || '0') * (1 + feePercent)).toFixed(2)} USDC
      </p>
    </>
  )
}

export default AmountInput
