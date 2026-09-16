import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import { activeBridgeConfig, bridgeEnvironment } from '../config/bridge'
import { arcSwapConfig } from '../config/swap'
import { productionDeveloperFees } from '../config/fees'

type DocsPageProps = { isConnected: boolean; address?: string; onConnect: () => void }

const sections = [
  ['Overview', 'ArcBridge bridges USDC between Arc Mainnet and the supported EVM networks shown below.'],
  ['How It Works', 'Connect an EVM-compatible wallet → choose source and destination → enter a USDC amount → approve any network switch and wallet prompts → track the submitted bridge transaction.'],
  ['Bridge', 'Production bridges use Circle App Kit and CCTP with Arc Mainnet. Only the runtime-verified EVM routes displayed in this application are available.'],
  ['Swap', 'Coming soon. App Kit recognizes Arc as a swap chain and can run keyless browser-wallet swap calls, but it does not provide a discoverable Arc asset-pair registry. ArcBridge will not display or execute a pair until a live App Kit estimate verifies it. Swap will remain same-chain on Arc only.'],
  ['Supported Networks', 'Networks are generated from the active bridge configuration.'],
  ['Supported Assets', 'Bridge is USDC-only. No swap assets are configured.'],
  ['Fees', `Testnet mode retains its existing 3% application fee. ${productionDeveloperFees.bridge.enabled ? `Mainnet bridge developer fee is ${productionDeveloperFees.bridge.basisPoints / 100}% and is calculated from the USDC bridge input amount using App Kit’s bridge fee policy.` : 'Mainnet developer fees are disabled until both VITE_ARCBRIDGE_PRODUCTION_BRIDGE_FEE_BPS and VITE_ARCBRIDGE_FEE_RECIPIENT are configured.'} Swap has a separate production fee setting and is not charged while Swap is unavailable. Wallet and protocol costs are shown by the wallet or App Kit flow when applicable.`],
  ['Transactions', 'A submitted source transaction can require CCTP attestation and destination minting before completion. Use the transaction link shown after submission and do not resend until you have reviewed its status.'],
  ['Wallets', 'Connect an EVM-compatible wallet and approve any required network switch and transaction in the wallet.'],
  ['Mainnet', 'Arc Mainnet is live. ArcBridge derives its production EVM bridge routes from the installed Circle App Kit runtime registry.'],
  ['Security', 'ArcBridge does not custody user funds. Review wallet prompts and transaction details before confirming. Blockchain transactions can be irreversible.'],
  ['FAQ', 'What can I bridge? USDC only on the configured Circle-supported routes. Which networks are supported? Only those shown in the active configuration. Is Swap live? No, it is Coming Soon. What happens if a bridge fails or is delayed? Review the error and transaction link before taking further action.'],
  ['Roadmap', 'Current: production USDC bridging. Next: verify a separate Arc Mainnet swap provider and assets before enabling any swap experience.'],
] as const

function DocsPage({ isConnected, address, onConnect }: DocsPageProps) {
  const networks = activeBridgeConfig.chains.map((chain) => chain.label)
  return <div className="min-h-screen bg-slate-900 flex flex-col">
    <Navbar isConnected={isConnected} address={address} onConnect={onConnect} activePage="docs" />
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-12 sm:px-6 lg:px-8">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-violet-300">ArcBridge</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-[-0.05em] text-white sm:text-4xl">Documentation</h1>
      <p className="mt-3 text-sm leading-6 text-slate-400">Product guidance for the active {bridgeEnvironment} environment.</p>
      <div className="mt-8 space-y-6">{sections.map(([title, text]) => <section key={title} className="border border-white/[0.08] bg-slate-800/70 p-5"><h2 className="text-lg font-semibold text-white">{title}</h2><p className="mt-3 text-sm leading-6 text-slate-400">{text}</p>{title === 'Supported Networks' && <p className="mt-3 text-sm text-slate-200">{networks.length ? networks.join(', ') : 'No bridge routes are enabled for this environment.'}</p>}{title === 'Supported Assets' && <p className="mt-3 text-sm text-slate-200">Bridge: USDC only. Swap: {arcSwapConfig.enabled ? 'configured Arc assets only.' : 'Coming Soon — no assets are configured.'}</p>}</section>)}</div>
    </main>
    <Footer />
  </div>
}

export default DocsPage
