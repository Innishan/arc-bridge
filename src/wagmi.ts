import { http, createConfig } from 'wagmi'
import { baseSepolia, arbitrumSepolia, sepolia } from 'wagmi/chains'
import { injected } from 'wagmi/connectors'
import { defineChain, type Chain } from 'viem'
import { MAINNET_WAGMI_CHAINS } from './config/bridge'

export const arcTestnet = defineChain({
  id: 5042002,
  name: 'Arc Testnet',
  nativeCurrency: { name: 'USDC', symbol: 'USDC', decimals: 18 },
  rpcUrls: { default: { http: ['https://rpc.testnet.arc.network'] } },
  blockExplorers: { default: { name: 'ArcScan', url: 'https://testnet.arcscan.app' } },
  testnet: true,
})

// Mainnet chains come from App Kit's installed bridge registry. Testnet
// remains the explicit legacy Bridge Kit set below.
const configuredChains = [arcTestnet, baseSepolia, arbitrumSepolia, sepolia, ...MAINNET_WAGMI_CHAINS] as [Chain, ...Chain[]]

// Arc mainnet needs an explicit RPC URL so useReadContracts can query it
// even when the user's wallet is on a different chain.
const ARC_MAINNET_ID = 5042

export const config = createConfig({
  chains: configuredChains,
  connectors: [injected()],
  transports: Object.fromEntries(
    configuredChains.map((chain) => [
      chain.id,
      chain.id === ARC_MAINNET_ID
        ? http('https://rpc.mainnet.arc.io/')
        : http(chain.rpcUrls?.default?.http?.[0]),
    ])
  ),
})
