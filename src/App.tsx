import { useState, useEffect } from 'react'
import {
  useAccount,
  useConnect,
  useDisconnect,
  useConnectorClient,
  useSwitchChain,
  useBalance,
  useReadContract,
} from 'wagmi'
import { formatUnits } from 'viem'
import { baseSepolia, arbitrumSepolia, sepolia } from 'wagmi/chains'
import { arcTestnet } from './wagmi'
import { BridgeKit } from '@circle-fin/bridge-kit'
import { createAdapterFromProvider } from '@circle-fin/adapter-viem-v2'

type Status = 'idle' | 'switching' | 'bridging' | 'success' | 'error'
type Direction = 'toArc' | 'fromArc'

const BACKEND_URL = 'https://arc-bridge-backend.onrender.com'
const FEE_PERCENT = 0.03
const FEE_RECIPIENT = '0x3fa6CD6A58D9A3F2f0159f1BCA3b5f6cB9b9a7c9'

const EVM_CHAINS = [
  { id: baseSepolia.id, label: 'Base Sepolia', bridgeKitName: 'Base_Sepolia' },
  { id: arbitrumSepolia.id, label: 'Arbitrum Sepolia', bridgeKitName: 'Arbitrum_Sepolia' },
  { id: sepolia.id, label: 'Ethereum Sepolia', bridgeKitName: 'Ethereum_Sepolia' },
]
const USDC_ADDRESSES: Record<number, `0x${string}`> = {
  [baseSepolia.id]: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
  [arbitrumSepolia.id]: '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d',
  [sepolia.id]: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
  [arcTestnet.id]: '0x3600000000000000000000000000000000000000',
}
const ERC20_ABI = [
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const

function App() {
  const { address, isConnected, chainId, connector } = useAccount()
  const { connect, connectors } = useConnect()
  const { disconnect } = useDisconnect()
  const { data: client } = useConnectorClient()
  const { switchChainAsync } = useSwitchChain()

  const [direction, setDirection] = useState<Direction>('toArc')
  const [selectedEvmChainId, setSelectedEvmChainId] = useState(baseSepolia.id)
  const [amount, setAmount] = useState('1.00')
  const [status, setStatus] = useState<Status>('idle')
  const [explorerUrl, setExplorerUrl] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [totalVolume, setTotalVolume] = useState<number | null>(null)

  const selectedEvmChain = EVM_CHAINS.find((c) => c.id === selectedEvmChainId)!

  // Which chain the wallet needs to be connected to, based on direction
  const requiredChainId = direction === 'toArc' ? selectedEvmChainId : arcTestnet.id
  const { data: evmBalanceRaw } = useReadContract({
    address: USDC_ADDRESSES[selectedEvmChainId],
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    chainId: selectedEvmChainId,
    query: { enabled: !!address },
  })

  // Arc's native gas currency IS USDC, so its normal wallet balance already is the USDC balance
  const { data: arcNativeBalance } = useBalance({
    address,
    chainId: arcTestnet.id,
  })

  const evmBalanceDisplay = evmBalanceRaw !== undefined ? formatUnits(evmBalanceRaw as bigint, 6) : null
  const arcBalanceDisplay = arcNativeBalance ? formatUnits(arcNativeBalance.value, arcNativeBalance.decimals) : null

  const sourceBridgeKitName = direction === 'toArc' ? selectedEvmChain.bridgeKitName : 'Arc_Testnet'
  const destBridgeKitName = direction === 'toArc' ? 'Arc_Testnet' : selectedEvmChain.bridgeKitName
  
  useEffect(() => {
    fetch(`${BACKEND_URL}/api/volume`)
      .then((r) => r.json())
      .then((data) => setTotalVolume(data.total))
      .catch(() => setTotalVolume(null))
  }, [])

  const ensureCorrectChain = async () => {
    if (isConnected && chainId !== requiredChainId) {
      setStatus('switching')
      await switchChainAsync({ chainId: requiredChainId })
      setStatus('idle')
    }
  }

  const handleDirectionToggle = async () => {
    const newDirection: Direction = direction === 'toArc' ? 'fromArc' : 'toArc'
    setDirection(newDirection)
    const newRequiredChainId = newDirection === 'toArc' ? selectedEvmChainId : arcTestnet.id
    if (isConnected && chainId !== newRequiredChainId) {
      try {
        setStatus('switching')
        await switchChainAsync({ chainId: newRequiredChainId })
        setStatus('idle')
      } catch {
        setStatus('error')
        setErrorMsg('Chain switch was rejected in your wallet.')
      }
    }
  }

  const handleEvmChainChange = async (newChainId: number) => {
    setSelectedEvmChainId(newChainId)
    if (direction === 'toArc' && isConnected && chainId !== newChainId) {
      try {
        setStatus('switching')
        await switchChainAsync({ chainId: newChainId })
        setStatus('idle')
      } catch {
        setStatus('error')
        setErrorMsg('Chain switch was rejected in your wallet.')
      }
    }
  }

  const handleBridge = async () => {
    if (!client || !address) return
    setStatus('bridging')
    setErrorMsg('')

    try {
      await ensureCorrectChain()

      const provider = await connector?.getProvider()
      if (!provider) throw new Error('Could not get wallet provider')
      const adapter = await createAdapterFromProvider({ provider })
      const kit = new BridgeKit()

      const feeAmount = (parseFloat(amount) * FEE_PERCENT).toFixed(2)

      const result = await kit.bridge({
        from: { adapter, chain: sourceBridgeKitName as any },
        to: { adapter, chain: destBridgeKitName as any },
        amount,
        config: {
          customFee: {
            value: feeAmount,
            recipientAddress: FEE_RECIPIENT,
          },
        },
      })

      if (result.state === 'error') {
        setStatus('error')
        setErrorMsg('Bridge failed. Check console for details.')
        console.error(result)
        return
      }

      const steps = (result as any).steps || []
      const burnStep = steps.find((s: any) => s.name === 'burn')
      const mintStep = steps.find((s: any) => s.name === 'mint')

      setExplorerUrl(mintStep?.explorerUrl || burnStep?.explorerUrl || '')
      setStatus('success')

      const txHash = burnStep?.txHash
      if (txHash) {
        fetch(`${BACKEND_URL}/api/bridges`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chain: sourceBridgeKitName, txHash, amount }),
        })
          .then((r) => r.json())
          .then((data) => {
            if (data.total !== undefined) setTotalVolume(data.total)
          })
          .catch(() => {})
      }
    } catch (err: any) {
      setStatus('error')
      const msg = err?.message || ''
      if (msg.includes('max fee per gas') || msg.includes('base fee')) {
        setErrorMsg('Network gas price shifted — just click Bridge USDC again.')
      } else {
        setErrorMsg(msg || 'Something went wrong')
      }
      console.error(err)
    }
  }

  const fromLabel = direction === 'toArc' ? selectedEvmChain.label : 'Arc Testnet'
  const toLabel = direction === 'toArc' ? 'Arc Testnet' : selectedEvmChain.label

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-slate-800 rounded-2xl p-6 w-full max-w-sm shadow-xl">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-lg font-medium text-white">ArcBridge</h1>
          {isConnected && (
            <span className="text-xs text-slate-400 bg-slate-700 px-3 py-1 rounded-lg">
              {address?.slice(0, 6)}...{address?.slice(-4)}
            </span>
          )}
        </div>

        {totalVolume !== null && (
          <p className="text-xs text-slate-500 mb-6">
            Total bridged to Arc: <span className="text-white font-medium">{totalVolume.toFixed(2)} USDC</span>
          </p>
        )}
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
            onClick={() => connect({ connector: connectors[0] })}
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
              <select
                value={selectedEvmChainId}
                onChange={(e) => handleEvmChainChange(Number(e.target.value))}
                className="w-full bg-slate-700 text-white text-sm px-3 py-2 rounded-lg mb-2 outline-none"
              >
                {EVM_CHAINS.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            ) : (
              <div className="bg-slate-700 text-slate-200 text-sm px-3 py-2 rounded-lg mb-2">
                Arc Testnet
              </div>
            )}

            <div className="flex justify-center my-1">
              <button
                onClick={handleDirectionToggle}
                title="Swap direction"
                className="bg-slate-700 hover:bg-slate-600 text-white w-9 h-9 rounded-full flex items-center justify-center text-lg"
              >
                ⇅
              </button>
            </div>

            <label className="text-xs text-slate-400 block mb-1 mt-2">To</label>
            {direction === 'fromArc' ? (
              <select
                value={selectedEvmChainId}
                onChange={(e) => setSelectedEvmChainId(Number(e.target.value))}
                className="w-full bg-slate-700 text-white text-sm px-3 py-2 rounded-lg mb-4 outline-none"
              >
                {EVM_CHAINS.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            ) : (
              <div className="bg-slate-700 text-slate-200 text-sm px-3 py-2 rounded-lg mb-4">
                Arc Testnet (your wallet)
              </div>
            )}

            <label className="text-xs text-slate-400 block mb-1">Amount (USDC)</label>
            <input
              type="text"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full bg-slate-700 text-white text-sm px-3 py-2 rounded-lg mb-1 outline-none"
            />
            <p className="text-xs text-slate-500 mb-4">
              + {(parseFloat(amount || '0') * FEE_PERCENT).toFixed(2)} USDC fee (3%) · Total debit:{' '}
              {(parseFloat(amount || '0') * (1 + FEE_PERCENT)).toFixed(2)} USDC
            </p>

            <button
              onClick={handleBridge}
              disabled={status === 'bridging' || status === 'switching'}
              className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white py-3 rounded-lg font-medium mb-3"
            >
              {status === 'bridging'
                ? 'Bridging...'
                : status === 'switching'
                ? 'Switching network...'
                : `Bridge ${fromLabel} → ${toLabel}`}
            </button>

            {status === 'success' && (
              <div className="text-green-400 text-sm text-center">
                Bridge submitted!{' '}
                {explorerUrl && (
                  <a href={explorerUrl} target="_blank" rel="noreferrer" className="underline">
                    View transaction
                  </a>
                )}
              </div>
            )}
            {status === 'error' && (
              <div className="text-red-400 text-sm text-center">{errorMsg}</div>
            )}

            <button onClick={() => disconnect()} className="w-full text-slate-500 text-xs mt-4">
              Disconnect
            </button>
          </>
        )}
      </div>
    </div>
  )
}

export default App
