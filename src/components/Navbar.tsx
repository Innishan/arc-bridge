import { useEffect, useRef, useState } from 'react'
import arcBridgeLogo from '../assets/ArcBridge-navbar.png'

type NavbarProps = {
  isConnected: boolean
  address?: string
  onConnect: () => void
  activePage?: 'bridge' | 'analytics' | 'docs'
}

function Navbar({ isConnected, address, onConnect, activePage = 'bridge' }: NavbarProps) {
  const [liquidityOpen, setLiquidityOpen] = useState(false)
  const desktopLiquidityRef = useRef<HTMLDivElement>(null)
  const mobileLiquidityRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const closeLiquidity = (event: MouseEvent) => {
      const target = event.target as Node
      if (!desktopLiquidityRef.current?.contains(target) && !mobileLiquidityRef.current?.contains(target)) setLiquidityOpen(false)
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setLiquidityOpen(false)
    }
    document.addEventListener('mousedown', closeLiquidity)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('mousedown', closeLiquidity)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [])

  const liquidityPopover = (position: string) => (
    <div className={`${position} z-30 w-72 rounded-xl border border-violet-300/20 bg-[#121a31]/95 p-4 shadow-2xl shadow-violet-950/30 backdrop-blur-xl`} role="dialog" aria-label="Liquidity coming soon">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-white">Liquidity</h2>
            <span className="rounded-full border border-violet-300/20 bg-violet-300/[0.12] px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-violet-100">Coming Soon</span>
          </div>
          <p className="mt-2 text-sm leading-5 text-slate-400">Provide liquidity and earn rewards to help power the Arc ecosystem.</p>
        </div>
        <button type="button" onClick={() => setLiquidityOpen(false)} className="-mr-1 -mt-1 rounded-md px-2 py-1 text-lg leading-none text-slate-400 transition-colors hover:bg-white/[0.06] hover:text-white" aria-label="Close liquidity notice">×</button>
      </div>
    </div>
  )

  return (
    <header className="arc-navbar w-full border-b border-white/[0.09] bg-slate-950/20 backdrop-blur-xl">
      <div className="mx-auto flex min-h-18 w-full max-w-6xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <a href="#bridge" className="group flex shrink-0 items-center gap-2.5 rounded-lg py-2 focus-visible:outline-none">
          <img src={arcBridgeLogo} alt="" className="h-7 w-auto object-contain sm:h-8" />
          <span className="text-[0.98rem] font-semibold tracking-[-0.04em] text-white">ArcBridge</span>
        </a>

        <nav aria-label="Primary navigation" className="hidden items-center gap-1 md:flex">
          <a
            href="#bridge"
            aria-current={activePage === 'bridge' ? 'page' : undefined}
            className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-violet-300/[0.14] ${activePage === 'bridge' ? 'bg-violet-300/[0.1] text-violet-100' : 'text-slate-400'}`}
          >
            Bridge
          </a>
          <div className="relative" ref={desktopLiquidityRef}>
            <button
              type="button"
              onClick={() => setLiquidityOpen((open) => !open)}
              aria-expanded={liquidityOpen}
              aria-haspopup="dialog"
              className="rounded-lg px-3 py-2 text-sm font-medium text-slate-400 transition-colors hover:bg-white/[0.05] hover:text-slate-100"
            >
              Liquidity
            </button>
            {liquidityOpen && liquidityPopover('absolute left-0 top-[calc(100%+0.6rem)]')}
          </div>
          <a href="#analytics" aria-current={activePage === 'analytics' ? 'page' : undefined} className={`rounded-lg px-3 py-2 text-sm font-medium hover:bg-white/[0.05] hover:text-slate-100 ${activePage === 'analytics' ? 'bg-violet-300/[0.1] text-violet-100' : 'text-slate-400'}`}>
            Analytics
          </a>
          <a href="#docs" aria-current={activePage === 'docs' ? 'page' : undefined} className={`rounded-lg px-3 py-2 text-sm font-medium hover:bg-white/[0.05] hover:text-slate-100 ${activePage === 'docs' ? 'bg-violet-300/[0.1] text-violet-100' : 'text-slate-400'}`}>
            Docs
          </a>
        </nav>

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-3">
          <details className="relative md:hidden">
            <summary className="flex size-9 cursor-pointer list-none items-center justify-center rounded-lg border border-white/[0.09] bg-white/[0.04] text-slate-200 transition-colors hover:border-violet-300/25 hover:bg-white/[0.08] [&::-webkit-details-marker]:hidden">
              <span className="sr-only">Open navigation menu</span>
              <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4.5 fill-none stroke-current" strokeWidth="1.8">
                <path d="M5 8h14M5 12h14M5 16h14" strokeLinecap="round" />
              </svg>
            </summary>
            <nav aria-label="Mobile navigation" className="absolute right-0 top-[calc(100%+0.6rem)] z-20 w-40 rounded-xl border border-white/10 bg-[#121a31]/95 p-1.5 shadow-2xl backdrop-blur-xl">
              <a href="#bridge" aria-current={activePage === 'bridge' ? 'page' : undefined} className="block rounded-lg px-3 py-2 text-sm font-medium text-slate-300 hover:bg-white/[0.06]">
                Bridge
              </a>
              <div className="relative" ref={mobileLiquidityRef}>
                <button type="button" onClick={() => setLiquidityOpen((open) => !open)} aria-expanded={liquidityOpen} aria-haspopup="dialog" className="block w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-300 hover:bg-white/[0.06]">
                  Liquidity
                </button>
                {liquidityOpen && liquidityPopover('absolute right-0 top-[calc(100%+0.4rem)]')}
              </div>
              <a href="#analytics" aria-current={activePage === 'analytics' ? 'page' : undefined} className="block rounded-lg px-3 py-2 text-sm font-medium text-slate-300 hover:bg-white/[0.06]">
                Analytics
              </a>
              <a href="#docs" aria-current={activePage === 'docs' ? 'page' : undefined} className="block rounded-lg px-3 py-2 text-sm font-medium text-slate-300 hover:bg-white/[0.06]">
                Docs
              </a>
            </nav>
          </details>

          {isConnected ? (
            <span className="max-w-28 truncate rounded-lg border border-white/[0.1] bg-white/[0.045] px-2.5 py-2 text-xs font-medium tabular-nums text-slate-200 sm:max-w-none sm:px-3">
              {address?.slice(0, 6)}...{address?.slice(-4)}
            </span>
          ) : (
            <button
              onClick={onConnect}
              className="rounded-lg border border-violet-300/25 bg-violet-400/[0.12] px-2.5 py-2 text-xs font-semibold text-violet-50 shadow-none transition-colors hover:border-violet-200/40 hover:bg-violet-400/[0.2] sm:px-3.5 sm:text-sm"
            >
              <span className="sm:hidden">Connect</span>
              <span className="hidden sm:inline">Connect Wallet</span>
            </button>
          )}
        </div>
      </div>
    </header>
  )
}

export default Navbar
