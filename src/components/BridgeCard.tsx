import AmountInput from './AmountInput'
import ChainSelector from './ChainSelector'
import TransactionStatus from './TransactionStatus'
import WalletDisconnect from './WalletDisconnect'

type Status = 'idle' | 'switching' | 'bridging' | 'success' | 'error'
type Direction = 'toArc' | 'fromArc'

type Chain = {
  id: number
  label: string
}

type BridgeCardProps = {
  isConnected: boolean
  chains: Chain[]
  direction: Direction
  selectedEvmChainId: number
  amount: string
  feePercent: number
  status: Status
  explorerUrl: string
  errorMsg: string
  fromLabel: string
  toLabel: string
  evmBalanceDisplay: string | null
  arcBalanceDisplay: string | null
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
  fromLabel,
  toLabel,
  evmBalanceDisplay,
  arcBalanceDisplay,
  onConnect,
  onEvmChainChange,
  onDirectionToggle,
  onAmountChange,
  onBridge,
  onDisconnect,
}: BridgeCardProps) {
  const sourceBalance = direction === 'toArc' ? evmBalanceDisplay : arcBalanceDisplay

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

      <a
        href="https://faucet.circle.com/"
        target="_blank"
        rel="noreferrer"
        className="mb-4 block text-xs text-violet-300 underline decoration-violet-300/35 underline-offset-3 transition-colors hover:text-violet-100"
      >
        Need testnet USDC? Get some from Circle's faucet →
      </a>

      {!isConnected ? (
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
              <ChainSelector label="Arc Testnet" className="mb-3 rounded-xl" />
            )}
            <AmountInput amount={amount} feePercent={feePercent} onChange={onAmountChange} />
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
              <ChainSelector label="Arc Testnet (your wallet)" className="rounded-xl" />
            )}
          </section>

          <div className="mt-3 flex items-center justify-between border-t border-white/[0.08] pt-3 text-xs">
            <span className="text-slate-400">3% bridge fee</span>
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

          <TransactionStatus status={status} explorerUrl={explorerUrl} errorMsg={errorMsg} />
          <WalletDisconnect onDisconnect={onDisconnect} />
        </>
      )}
    </div>
  )
}

export default BridgeCard
