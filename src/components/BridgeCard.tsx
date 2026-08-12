import AmountInput from './AmountInput'
import ChainSelector from './ChainSelector'
import Footer from './Footer'
import TransactionStatus from './TransactionStatus'

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
  return (
    <>
      <a
        href="https://faucet.circle.com/"
        target="_blank"
        rel="noreferrer"
        className="text-xs text-purple-400 hover:text-purple-300 underline block mb-4"
      >
        Need testnet USDC? Get some from Circle's faucet →
      </a>

      {!isConnected ? (
        <button
          onClick={onConnect}
          className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-lg font-medium"
        >
          Connect Wallet
        </button>
      ) : (
        <>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs text-slate-400 block">From</label>
            {direction === 'toArc' && evmBalanceDisplay && (
              <span className="text-xs text-slate-500">Balance: {parseFloat(evmBalanceDisplay).toFixed(2)} USDC</span>
            )}
            {direction === 'fromArc' && arcBalanceDisplay && (
              <span className="text-xs text-slate-500">Balance: {parseFloat(arcBalanceDisplay).toFixed(2)} USDC</span>
            )}
          </div>
          {direction === 'toArc' ? (
            <ChainSelector chains={chains} value={selectedEvmChainId} onChange={onEvmChainChange} />
          ) : (
            <ChainSelector label="Arc Testnet" />
          )}

          <div className="flex justify-center my-1">
            <button
              onClick={onDirectionToggle}
              title="Swap direction"
              className="bg-slate-700 hover:bg-slate-600 text-white w-9 h-9 rounded-full flex items-center justify-center text-lg"
            >
              ⇅
            </button>
          </div>

          <label className="text-xs text-slate-400 block mb-1 mt-2">To</label>
          {direction === 'fromArc' ? (
            <ChainSelector chains={chains} value={selectedEvmChainId} onChange={onEvmChainChange} className="mb-4" />
          ) : (
            <ChainSelector label="Arc Testnet (your wallet)" className="mb-4" />
          )}

          <AmountInput amount={amount} feePercent={feePercent} onChange={onAmountChange} />

          <button
            onClick={onBridge}
            disabled={status === 'bridging' || status === 'switching'}
            className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white py-3 rounded-lg font-medium mb-3"
          >
            {status === 'bridging'
              ? 'Bridging...'
              : status === 'switching'
              ? 'Switching network...'
              : `Bridge ${fromLabel} → ${toLabel}`}
          </button>

          <TransactionStatus status={status} explorerUrl={explorerUrl} errorMsg={errorMsg} />
          <Footer onDisconnect={onDisconnect} />
        </>
      )}
    </>
  )
}

export default BridgeCard
