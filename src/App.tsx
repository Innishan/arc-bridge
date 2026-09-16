import { useState, useEffect } from 'react'
import {
  useAccount,
  useConnect,
  useDisconnect,
  useSwitchChain,
  useBalance,
  useReadContract,
} from 'wagmi'
import { formatUnits, type EIP1193Provider } from 'viem'
import { BridgeKit } from '@circle-fin/bridge-kit'
import { createAdapterFromProvider } from '@circle-fin/adapter-viem-v2'
import {
  activeBridgeConfig,
  bridgeEnvironment,
  productionAppKit,
  TESTNET_BRIDGE,
  type SupportedEvmChain,
} from './config/bridge'
import { productionDeveloperFees } from './config/fees'
import { BridgeChain } from '@circle-fin/app-kit'
import Navbar from './components/Navbar'
import BridgeCard from './components/BridgeCard'
import Stats from './components/Stats'
import Hero from './components/Hero'
import Footer from './components/Footer'
import AnalyticsPage from './pages/AnalyticsPage'
import DocsPage from './pages/DocsPage'
import { getAnalytics, submitBridgeAnalytics } from './services/analytics'

type Status = 'idle' | 'switching' | 'bridging' | 'success' | 'error'
type Direction = 'toArc' | 'fromArc'
type Mode = 'bridge' | 'swap'

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
  const { switchChainAsync } = useSwitchChain()

  const page = window.location.pathname === '/analytics' ? 'analytics' : window.location.pathname === '/docs' ? 'docs' : 'bridge'

  const [direction, setDirection] = useState<Direction>('toArc')
  const [mode, setMode] = useState<Mode>('bridge')
  const [selectedEvmChainId, setSelectedEvmChainId] = useState<number>(() => activeBridgeConfig.chains[0]?.id ?? 0)
  const [amount, setAmount] = useState('1.00')
  const [status, setStatus] = useState<Status>('idle')
  const [explorerUrl, setExplorerUrl] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [totalVolume, setTotalVolume] = useState<number | null>(null)
  const [analyticsWarning, setAnalyticsWarning] = useState('')

  const bridgeEnabled = true
  const evmChains = activeBridgeConfig.chains as readonly SupportedEvmChain[]
  const selectedEvmChain = evmChains.find((c) => c.id === selectedEvmChainId)
  const arcChainId = activeBridgeConfig.arc.id

  // Which chain the wallet needs to be connected to, based on direction
  const requiredChainId = direction === 'toArc' ? selectedEvmChainId : arcChainId
  const { data: evmBalanceRaw } = useReadContract({
    address: selectedEvmChain?.usdcAddress,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    chainId: selectedEvmChainId,
    query: { enabled: !!address && !!selectedEvmChain },
  })

  // Arc's native gas currency IS USDC, so its normal wallet balance already is the USDC balance
  const { data: arcNativeBalance } = useBalance({
    address,
    chainId: arcChainId,
    query: { enabled: !!address },
  })

  const evmBalanceDisplay = evmBalanceRaw !== undefined ? formatUnits(evmBalanceRaw as bigint, 6) : null
  const arcBalanceDisplay = arcNativeBalance ? formatUnits(arcNativeBalance.value, arcNativeBalance.decimals) : null

  const sourceBridgeKitName = direction === 'toArc' ? selectedEvmChain?.bridgeKitName : activeBridgeConfig.arc.bridgeKitName
  const destBridgeKitName = direction === 'toArc' ? activeBridgeConfig.arc.bridgeKitName : selectedEvmChain?.bridgeKitName
  
  useEffect(() => {
    getAnalytics(bridgeEnvironment)
      .then((data) => setTotalVolume(data.total))
      .catch(() => setTotalVolume(null))
  }, [])

  useEffect(() => {
    if (!selectedEvmChain && evmChains[0]) setSelectedEvmChainId(evmChains[0].id)
  }, [evmChains, selectedEvmChain])

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
    const newRequiredChainId = newDirection === 'toArc' ? selectedEvmChainId : arcChainId
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
    if (!selectedEvmChain || !address) return
    setStatus('bridging')
    setErrorMsg('')
    setAnalyticsWarning('')

    try {
      await ensureCorrectChain()

      const provider = await connector?.getProvider()

      if (!provider) {
        throw new Error('Could not get wallet provider')
      }

      const walletProvider = provider as EIP1193Provider

      const accounts = await walletProvider.request({
        method: 'eth_requestAccounts',
      }) as string[]

      if (!accounts.length) {
        throw new Error('Please unlock MetaMask and connect your wallet.')
      }

      if (address && accounts[0].toLowerCase() !== address.toLowerCase()) {
        throw new Error('The connected wallet account changed. Please reconnect your wallet.')
      }

      const adapter = await createAdapterFromProvider({
        provider: walletProvider,
      })

      const result = bridgeEnvironment === 'testnet'
        ? await new BridgeKit().bridge({
            from: { adapter, chain: sourceBridgeKitName as any },
            to: { adapter, chain: destBridgeKitName as any },
            amount,
            config: {
              customFee: {
                value: (parseFloat(amount) * TESTNET_BRIDGE.customFee.percent).toFixed(2),
                recipientAddress: TESTNET_BRIDGE.customFee.recipient,
              },
            },
          })
        : await productionAppKit.bridge({
            from: { adapter, chain: sourceBridgeKitName as BridgeChain },
            to: { adapter, chain: destBridgeKitName as BridgeChain },
            amount,
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
        const analyticsSubmission = bridgeEnvironment === 'mainnet'
          ? {
              environment: 'mainnet' as const,
              sourceChainId: direction === 'toArc' ? selectedEvmChain.id : arcChainId,
              destinationChainId: direction === 'toArc' ? arcChainId : selectedEvmChain.id,
              txHash,
            }
          : { environment: 'testnet' as const, chain: sourceBridgeKitName!, txHash }

        submitBridgeAnalytics(analyticsSubmission)
          .then((data) => {
            setTotalVolume(data.total)
          })
          .catch(() => setAnalyticsWarning('Your bridge was submitted, but analytics could not verify it yet.'))
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

  const arcLabel = activeBridgeConfig.arc.label
  const fromLabel = direction === 'toArc' ? selectedEvmChain?.label ?? arcLabel : arcLabel
  const toLabel = direction === 'toArc' ? arcLabel : selectedEvmChain?.label ?? arcLabel

  if (page === 'analytics') return <AnalyticsPage isConnected={isConnected} address={address} onConnect={() => connect({ connector: connectors[0] })} />
  if (page === 'docs') return <DocsPage isConnected={isConnected} address={address} onConnect={() => connect({ connector: connectors[0] })} />

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col p-0">
      <Navbar isConnected={isConnected} address={address} onConnect={() => connect({ connector: connectors[0] })} activePage="bridge" />
      <main className="flex flex-1 flex-col">
        <Hero environment={bridgeEnvironment} networks={bridgeEnabled ? [arcLabel, ...evmChains.map((chain) => chain.label)] : []} />
        <section id="bridge" className="bridge-main flex items-center justify-center p-4">
          <div className="bg-slate-800 rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <Stats totalVolume={totalVolume} />
            <BridgeCard
              isConnected={isConnected}
              chains={evmChains}
              direction={direction}
              selectedEvmChainId={selectedEvmChainId}
              amount={amount}
              feePercent={bridgeEnvironment === 'testnet' ? TESTNET_BRIDGE.customFee.percent : productionDeveloperFees.bridge.basisPoints / 10_000}
              status={status}
              explorerUrl={explorerUrl}
              errorMsg={errorMsg}
              analyticsWarning={analyticsWarning}
              fromLabel={fromLabel}
              toLabel={toLabel}
              evmBalanceDisplay={evmBalanceDisplay}
              arcBalanceDisplay={arcBalanceDisplay}
              bridgeEnabled={bridgeEnabled}
              showTestnetFaucet={bridgeEnvironment === 'testnet'}
              unavailableReason=""
              arcLabel={arcLabel}
              mode={mode}
              onModeChange={setMode}
              onConnect={() => connect({ connector: connectors[0] })}
              onEvmChainChange={direction === 'toArc' ? handleEvmChainChange : setSelectedEvmChainId}
              onDirectionToggle={handleDirectionToggle}
              onAmountChange={setAmount}
              onBridge={handleBridge}
              onDisconnect={() => disconnect()}
            />
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}

export default App
