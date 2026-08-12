import arcBridgeLogo from '../assets/ArcBridge-navbar.png'

function Footer() {
  return (
    <footer className="arc-site-footer border-t border-white/[0.08]">
      <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-8 sm:px-6 md:grid-cols-[1fr_auto] md:items-start lg:px-8">
        <div className="max-w-xs">
          <a href="#bridge" className="inline-flex items-center gap-2.5 rounded-lg focus-visible:outline-none">
            <img src={arcBridgeLogo} alt="" className="h-7 w-auto object-contain" />
            <span className="text-sm font-semibold tracking-[-0.04em] text-white">ArcBridge</span>
          </a>
          <p className="mt-3 text-sm leading-6 text-slate-500">Cross-chain USDC bridging across the Arc ecosystem.</p>
        </div>

        <nav aria-label="Footer navigation" className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-400 md:justify-end">
          <a href="#bridge" className="transition-colors hover:text-slate-100">Bridge</a>
          <a href="#analytics" className="transition-colors hover:text-slate-100">Analytics</a>
          <a href="#docs" className="transition-colors hover:text-slate-100">Docs</a>
        </nav>
      </div>
      <div className="mx-auto flex w-full max-w-6xl border-t border-white/[0.06] px-4 py-4 sm:px-6 lg:px-8">
        <p className="text-xs text-slate-600">Built for the Arc ecosystem</p>
      </div>
    </footer>
  )
}

export default Footer
