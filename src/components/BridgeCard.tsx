import AmountInput from './AmountInput'
import ChainSelector from './ChainSelector'
import TransactionStatus from './TransactionStatus'
import WalletDisconnect from './WalletDisconnect'
import SwapCard from './SwapCard'

type Status = 'idle' | 'switching' | 'bridging' | 'success' | 'error'
type Direction = 'toArc' | 'fromArc'
type Mode = 'bridge' | 'swap'

type Chain = {
  id: number
  label: string
}

const USDC_ATOMIC_UNITS = 1_000_000n

const parseUsdcAtomic = (value: string | null): bigint | null => {
  if (!value) return null
  const match = value.trim().match(/^(\d+)(?:\.(\d+))?$/)
  if (!match) return null
  const fraction = (match[2] ?? '').slice(0, 6).padEnd(6, '0')
  return BigInt(match[1]) * USDC_ATOMIC_UNITS + BigInt(fraction)
}

const formatUsdcAtomic = (value: bigint): string => {
  const whole = value / USDC_ATOMIC_UNITS
  const fraction = (value % USDC_ATOMIC_UNITS).toString().padStart(6, '0').replace(/0+$/, '')
  return fraction ? `${whole}.${fraction}` : whole.toString()
}

const calculateMaxBridgeAmount = (sourceBalance: string | null, feePercent: number): string | null => {
  const balanceAtomic = parseUsdcAtomic(sourceBalance)
  const basisPoints = Math.round(feePercent * 10_000)
  if (balanceAtomic === null || !Number.isInteger(basisPoints) || basisPoints < 0) return null
  if (basisPoints === 0) return formatUsdcAtomic(balanceAtomic)

  const feeBasisPoints = BigInt(basisPoints)
  let low = 0n
  let high = balanceAtomic
  while (low < high) {
    const candidate = (low + high + 1n) / 2n
    const totalDebit = candidate + candidate * feeBasisPoints / 10_000n
    if (totalDebit <= balanceAtomic) low = candidate
    else high = candidate - 1n
  }
  return formatUsdcAtomic(low)
}

type BridgeCardProps = {
  isConnected: boolean
  chains: readonly Chain[]
  direction: Direction
  selectedEvmChainId: number
  amount: string
  feePercent: number
  status: Status
  explorerUrl: string
  errorMsg: string
  analyticsWarning: string
  fromLabel: string
  toLabel: string
  evmBalanceDisplay: string | null
  arcBalanceDisplay: string | null
  bridgeEnabled: boolean
  showTestnetFaucet: boolean
  unavailableReason: string
  arcLabel: string
  mode: Mode
  onModeChange: (mode: Mode) => void
  onConnect: () => void
  onEvmChainChange: (chainId: number) => void
  onDirectionToggle: () => void
  onAmountChange: (amount: string) => void
  onBridge: () => void
  onDisconnect: () => void
}

function BridgeCard({
  isConnected,
  chains,
  direction,
  selectedEvmChainId,
  amount,
  feePercent,
  status,
  explorerUrl,
  errorMsg,
  analyticsWarning,
  fromLabel,
  toLabel,
  evmBalanceDisplay,
  arcBalanceDisplay,
  bridgeEnabled,
  showTestnetFaucet,
  unavailableReason,
  arcLabel,
  mode,
  onModeChange,
  onConnect,
  onEvmChainChange,
  onDirectionToggle,
  onAmountChange,
  onBridge,
  onDisconnect,
}: BridgeCardProps) {
  if (mode === 'swap') {
    return <SwapCard onBridgeMode={() => onModeChange('bridge')} />
  }

  const sourceBalance = direction === 'toArc' ? evmBalanceDisplay : arcBalanceDisplay
  const maxAmount = calculateMaxBridgeAmount(sourceBalance, feePercent)

  return (
    <div className="arc-bridge-card">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <p className="text-[0.68rem] font-bold uppercase tracking-[0.16em] text-violet-300">ArcBridge</p>
          <h2 className="mt-1 text-xl font-semibold tracking-[-0.04em] text-white">Bridge</h2>
          <p className="mt-1 text-sm leading-5 text-slate-400">Move USDC across supported networks.</p>
        </div>
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full border border-violet-200/15 bg-violet-400/[0.08] text-violet-200">
          <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4 fill-none stroke-current" strokeWidth="1.7">
            <path d="M5 8.5h10.5M12.5 5.5l3 3-3 3M19 15.5H8.5M11.5 18.5l-3-3 3-3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </div>

      <div className="mb-4 grid grid-cols-2 rounded-lg border border-white/[0.09] bg-white/[0.025] p-1 text-xs font-medium">
        <button onClick={() => onModeChange('bridge')} className="rounded-md bg-violet-400/[0.16] px-3 py-2 text-violet-100">Bridge</button>
        <button onClick={() => onModeChange('swap')} className="rounded-md px-3 py-2 text-slate-400 hover:text-slate-100">Swap</button>
      </div>

      {!bridgeEnabled && (
        <div className="mb-4 border border-amber-200/15 bg-amber-300/[0.07] px-3.5 py-3 text-sm leading-5 text-amber-100">
          <span className="font-medium">Mainnet route unavailable.</span> {unavailableReason}
        </div>
      )}

      {showTestnetFaucet && (
        <a href="https://faucet.circle.com/" target="_blank" rel="noreferrer" className="mb-4 block text-xs text-violet-300 underline decoration-violet-300/35 underline-offset-3 transition-colors hover:text-violet-100">
          Need testnet USDC? Get some from Circle's faucet →
        </a>
      )}

      {!bridgeEnabled ? (
        <div className="border border-white/[0.09] bg-white/[0.025] px-3.5 py-3 text-sm leading-5 text-slate-400">
          {arcLabel} is the intended destination. No wallet transaction can be started from this screen yet.
        </div>
      ) : !isConnected ? (
        <button
          onClick={onConnect}
          className="w-full border border-violet-200/30 bg-violet-500 px-4 py-3.5 text-sm font-semibold text-white shadow-[0_12px_28px_rgba(77,68,204,0.22)] transition-colors hover:bg-violet-400"
        >
          Connect Wallet
        </button>
      ) : (
        <>
          <section className="arc-bridge-card__section">
            <div className="mb-2 flex items-center justify-between gap-3">
              <p className="text-xs font-medium uppercase tracking-[0.13em] text-slate-400">From</p>
              {sourceBalance && <span className="text-xs text-slate-400">Balance: {parseFloat(sourceBalance).toFixed(2)} USDC</span>}
            </div>
            {direction === 'toArc' ? (
              <ChainSelector chains={chains} value={selectedEvmChainId} onChange={onEvmChainChange} className="mb-3 rounded-xl" />
            ) : (
              <ChainSelector label={arcLabel} className="mb-3 rounded-xl" />
            )}
            <AmountInput amount={amount} feePercent={feePercent} maxAmount={maxAmount} onChange={onAmountChange} />
          </section>

          <div className="relative z-10 -my-3 flex justify-center">
            <button
              onClick={onDirectionToggle}
              title="Swap direction"
              className="flex size-11 items-center justify-center rounded-full border border-violet-200/20 bg-[#171e3a] text-violet-100 shadow-[0_8px_18px_rgba(0,0,0,0.22)] transition-colors hover:border-violet-200/40 hover:bg-[#202950]"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5 fill-none stroke-current" strokeWidth="1.8">
                <path d="M7 8h11M15 4l4 4-4 4M17 16H6M9 12l-4 4 4 4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>

          <section className="arc-bridge-card__section pt-6">
            <p className="mb-2 text-xs font-medium uppercase tracking-[0.13em] text-slate-400">To</p>
            {direction === 'fromArc' ? (
              <ChainSelector chains={chains} value={selectedEvmChainId} onChange={onEvmChainChange} className="rounded-xl" />
            ) : (
              <ChainSelector label={`${arcLabel} (your wallet)`} className="rounded-xl" />
            )}
          </section>

          <div className="mt-3 flex items-center justify-between border-t border-white/[0.08] pt-3 text-xs">
            <span className="text-slate-400">{feePercent > 0 ? `${feePercent * 100}% bridge fee` : 'No ArcBridge developer fee'}</span>
            <span className="font-medium text-slate-300">{fromLabel} → {toLabel}</span>
          </div>

          <button
            onClick={onBridge}
            disabled={status === 'bridging' || status === 'switching'}
            className="mt-4 w-full border border-violet-200/30 bg-violet-500 px-4 py-3 text-sm font-semibold text-white shadow-[0_12px_28px_rgba(77,68,204,0.22)] transition-colors hover:bg-violet-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {status === 'bridging'
              ? 'Bridging...'
              : status === 'switching'
              ? 'Switching network...'
              : 'Bridge USDC'}
          </button>

          <TransactionStatus status={status} explorerUrl={explorerUrl} errorMsg={errorMsg} analyticsWarning={analyticsWarning} />
          <WalletDisconnect onDisconnect={onDisconnect} />
        </>
      )}
    </div>
  )
}

export default BridgeCard
