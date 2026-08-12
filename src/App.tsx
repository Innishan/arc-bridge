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
import Navbar from './components/Navbar'
import BridgeCard from './components/BridgeCard'
import Stats from './components/Stats'

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
  const [selectedEvmChainId, setSelectedEvmChainId] = useState<number>(baseSepolia.id)
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

      const adapter = await createAdapterFromProvider({
        provider: provider as any,
      })
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
    <div className="min-h-screen bg-slate-900 flex flex-col p-0">
      <Navbar isConnected={isConnected} address={address} onConnect={() => connect({ connector: connectors[0] })} />
      <main id="bridge" className="bridge-main flex flex-1 items-center justify-center p-4">
        <div className="bg-slate-800 rounded-2xl p-6 w-full max-w-sm shadow-xl">
          <Stats totalVolume={totalVolume} />
          <BridgeCard
            isConnected={isConnected}
            chains={EVM_CHAINS}
            direction={direction}
            selectedEvmChainId={selectedEvmChainId}
            amount={amount}
            feePercent={FEE_PERCENT}
            status={status}
            explorerUrl={explorerUrl}
            errorMsg={errorMsg}
            fromLabel={fromLabel}
            toLabel={toLabel}
            evmBalanceDisplay={evmBalanceDisplay}
            arcBalanceDisplay={arcBalanceDisplay}
            onConnect={() => connect({ connector: connectors[0] })}
            onEvmChainChange={direction === 'toArc' ? handleEvmChainChange : setSelectedEvmChainId}
            onDirectionToggle={handleDirectionToggle}
            onAmountChange={setAmount}
            onBridge={handleBridge}
            onDisconnect={() => disconnect()}
          />
        </div>
      </main>
    </div>
  )
}

export default App
