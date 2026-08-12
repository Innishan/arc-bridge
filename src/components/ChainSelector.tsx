type Chain = {
  id: number
  label: string
}

type ChainSelectorProps = {
  chains?: Chain[]
  value?: number
  onChange?: (chainId: number) => void
  label?: string
  className?: string
}

function ChainSelector({ chains, value, onChange, label, className = 'mb-2' }: ChainSelectorProps) {
  if (!chains) {
    return <div className={`bg-slate-700 text-slate-200 text-sm px-3 py-2 rounded-lg ${className}`}>{label}</div>
  }

  return (
    <select
      value={value}
      onChange={(e) => onChange?.(Number(e.target.value))}
      className={`w-full bg-slate-700 text-white text-sm px-3 py-2 rounded-lg ${className} outline-none`}
    >
      {chains.map((chain) => (
        <option key={chain.id} value={chain.id}>
          {chain.label}
        </option>
      ))}
    </select>
  )
}

export default ChainSelector
