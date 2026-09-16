import { AppKit, type EVMChainDefinition } from '@circle-fin/app-kit'
import { Arc } from '@circle-fin/app-kit/chains'
import { defineChain, type Chain } from 'viem'
import { arbitrumSepolia, baseSepolia, sepolia } from 'viem/chains'
import { formatFeeFromInputAmount, productionDeveloperFees } from './fees'

export type BridgeEnvironment = 'mainnet' | 'testnet'

type AppKitEvmChain = EVMChainDefinition

export type SupportedEvmChain = { id: number; label: string; bridgeKitName: string; usdcAddress: `0x${string}` }
export type MainnetSupportedEvmChain = SupportedEvmChain & { appKitChain: AppKitEvmChain }

export const bridgeEnvironment: BridgeEnvironment = import.meta.env.VITE_ARCBRIDGE_ENV === 'testnet' ? 'testnet' : 'mainnet'

export const TESTNET_ARC = { id: 5042002, label: 'Arc Testnet', bridgeKitName: 'Arc_Testnet', usdcAddress: '0x3600000000000000000000000000000000000000' as const }
export const TESTNET_EVM_CHAINS: readonly SupportedEvmChain[] = [
  { id: baseSepolia.id, label: 'Base Sepolia', bridgeKitName: 'Base_Sepolia', usdcAddress: '0x036CbD53842c5426634e7929541eC2318f3dCF7e' },
  { id: arbitrumSepolia.id, label: 'Arbitrum Sepolia', bridgeKitName: 'Arbitrum_Sepolia', usdcAddress: '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d' },
  { id: sepolia.id, label: 'Ethereum Sepolia', bridgeKitName: 'Ethereum_Sepolia', usdcAddress: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238' },
]
export const TESTNET_BRIDGE = {
  arc: TESTNET_ARC,
  chains: TESTNET_EVM_CHAINS,
  analyticsNamespace: 'arcbridge-testnet',
  customFee: { percent: 0.03, recipient: '0x3fa6CD6A58D9A3F2f0159f1BCA3b5f6cB9b9a7c9' as const },
} as const

// Keyless CCTP bridge instance. App Kit is the production source of truth.
export const productionAppKit = new AppKit()
if (productionDeveloperFees.bridge.enabled && productionDeveloperFees.recipient) {
  productionAppKit.setCustomFeePolicy({
    bridge: {
      // App Kit supplies the human-readable USDC bridge input amount.
      computeFee: ({ amount }) => formatFeeFromInputAmount(amount, productionDeveloperFees.bridge.basisPoints),
      resolveFeeRecipientAddress: () => productionDeveloperFees.recipient!,
    },
  })
}
const installedBridgeChains = productionAppKit.getSupportedChains('bridge')
if (Arc.chainId !== 5042 || !installedBridgeChains.some((chain) => chain.chain === Arc.chain)) {
  throw new Error('Installed App Kit does not expose the verified Arc Mainnet bridge configuration.')
}

const appKitEvmChains = installedBridgeChains.filter(
  (chain): chain is AppKitEvmChain => chain.type === 'evm' && !chain.isTestnet && chain.usdcAddress !== null,
)

export const MAINNET_EVM_CHAINS: readonly MainnetSupportedEvmChain[] = appKitEvmChains
  .filter((chain) => chain.chain !== Arc.chain)
  .map((chain) => ({ id: chain.chainId, label: chain.name, bridgeKitName: chain.chain, usdcAddress: chain.usdcAddress as `0x${string}`, appKitChain: chain }))

export const MAINNET_ARC = {
  id: Arc.chainId,
  label: Arc.title,
  bridgeKitName: Arc.chain,
  usdcAddress: Arc.usdcAddress,
  eurcAddress: Arc.eurcAddress,
  appKitChain: Arc,
  cctpRouteEnabled: true,
  analyticsNamespace: 'arcbridge-mainnet',
} as const

const asWagmiChain = (chain: AppKitEvmChain): Chain => {
  return defineChain({
    id: chain.chainId,
    name: chain.name,
    nativeCurrency: chain.nativeCurrency,
    rpcUrls: { default: { http: [...chain.rpcEndpoints] } },
    blockExplorers: { default: { name: `${chain.name} Explorer`, url: chain.explorerUrl.replace('/tx/{hash}', '') } },
    testnet: chain.isTestnet,
  })
}

// Wallet switching uses the installed App Kit bridge registry directly.
export const MAINNET_WAGMI_CHAINS = appKitEvmChains.map(asWagmiChain)

export const activeBridgeConfig = bridgeEnvironment === 'testnet'
  ? TESTNET_BRIDGE
  : { arc: MAINNET_ARC, chains: MAINNET_EVM_CHAINS, customFee: null, analyticsNamespace: 'arcbridge-mainnet' }
