type FooterProps = {
  onDisconnect: () => void
}

function Footer({ onDisconnect }: FooterProps) {
  return (
    <button onClick={onDisconnect} className="w-full text-slate-500 text-xs mt-4">
      Disconnect
    </button>
  )
}

export default Footer
