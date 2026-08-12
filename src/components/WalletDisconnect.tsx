type WalletDisconnectProps = {
  onDisconnect: () => void
}

function WalletDisconnect({ onDisconnect }: WalletDisconnectProps) {
  return (
    <button onClick={onDisconnect} className="mt-3 w-full text-xs text-slate-500 transition-colors hover:text-slate-300">
      Disconnect
    </button>
  )
}

export default WalletDisconnect
