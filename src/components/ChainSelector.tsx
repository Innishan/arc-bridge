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
  const selectedChain = chains?.find((chain) => chain.id === value)
  const displayLabel = selectedChain?.label || label || ''
  const initial = displayLabel.charAt(0)

  if (!chains) {
    return (
      <div className={`relative flex items-center gap-3 border border-white/[0.09] bg-white/[0.035] px-3.5 py-3.5 text-sm text-slate-100 ${className}`}>
        <span className="flex size-7 shrink-0 items-center justify-center rounded-full border border-violet-200/15 bg-violet-400/[0.12] text-[0.7rem] font-bold text-violet-100">
          {initial}
        </span>
        <span className="font-medium">{label}</span>
      </div>
    )
  }

  return (
    <div className={`relative flex items-center border border-white/[0.09] bg-white/[0.035] transition-colors hover:border-violet-200/20 ${className}`}>
      <span className="pointer-events-none ml-3.5 flex size-7 shrink-0 items-center justify-center rounded-full border border-violet-200/15 bg-violet-400/[0.12] text-[0.7rem] font-bold text-violet-100">
        {initial}
      </span>
      <select
        value={value}
        onChange={(e) => onChange?.(Number(e.target.value))}
        aria-label="Select network"
        className="w-full appearance-none bg-transparent py-3.5 pl-3 pr-10 text-sm font-medium text-white outline-none"
      >
        {chains.map((chain) => (
          <option key={chain.id} value={chain.id}>
            {chain.label}
          </option>
        ))}
      </select>
      <svg viewBox="0 0 20 20" aria-hidden="true" className="pointer-events-none absolute right-3.5 size-4 fill-none stroke-slate-400" strokeWidth="1.8">
        <path d="m5 7.5 5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  )
}

export default ChainSelector
