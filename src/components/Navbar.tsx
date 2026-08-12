type NavbarProps = {
  isConnected: boolean
  address?: string
  onConnect: () => void
}

function Navbar({ isConnected, address, onConnect }: NavbarProps) {
  return (
    <header className="arc-navbar w-full border-b border-white/[0.09] bg-slate-950/20 backdrop-blur-xl">
      <div className="mx-auto flex min-h-18 w-full max-w-6xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <a href="#bridge" className="group flex shrink-0 items-center gap-2.5 rounded-lg py-2 focus-visible:outline-none">
          <span className="flex size-8 items-center justify-center rounded-[10px] border border-violet-300/20 bg-violet-400/[0.11] text-violet-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]">
            <svg viewBox="0 0 28 28" aria-hidden="true" className="size-4.5 fill-none stroke-current" strokeWidth="2.4">
              <path d="M6 9.5 14 5l8 4.5v9L14 23l-8-4.5v-9Z" />
              <path d="m10 14 2.5 2.5L18 11" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <span className="text-[0.98rem] font-semibold tracking-[-0.04em] text-white">ArcBridge</span>
        </a>

        <nav aria-label="Primary navigation" className="hidden items-center gap-1 md:flex">
          <a
            href="#bridge"
            aria-current="page"
            className="rounded-lg bg-violet-300/[0.1] px-3 py-2 text-sm font-medium text-violet-100 transition-colors hover:bg-violet-300/[0.14]"
          >
            Bridge
          </a>
          <a href="#analytics" className="rounded-lg px-3 py-2 text-sm font-medium text-slate-400 hover:bg-white/[0.05] hover:text-slate-100">
            Analytics
          </a>
          <a href="#docs" className="rounded-lg px-3 py-2 text-sm font-medium text-slate-400 hover:bg-white/[0.05] hover:text-slate-100">
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
              <a href="#bridge" aria-current="page" className="block rounded-lg bg-violet-300/[0.1] px-3 py-2 text-sm font-medium text-violet-100">
                Bridge
              </a>
              <a href="#analytics" className="block rounded-lg px-3 py-2 text-sm font-medium text-slate-300 hover:bg-white/[0.06]">
                Analytics
              </a>
              <a href="#docs" className="block rounded-lg px-3 py-2 text-sm font-medium text-slate-300 hover:bg-white/[0.06]">
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
