type NavbarProps = {
  isConnected: boolean
  address?: string
}

function Navbar({ isConnected, address }: NavbarProps) {
  return (
    <div className="flex items-center justify-between mb-2">
      <h1 className="text-lg font-medium text-white">ArcBridge</h1>
      {isConnected && (
        <span className="text-xs text-slate-400 bg-slate-700 px-3 py-1 rounded-lg">
          {address?.slice(0, 6)}...{address?.slice(-4)}
        </span>
      )}
    </div>
  )
}

export default Navbar
