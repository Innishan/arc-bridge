const supportedNetworks = ['Arc Testnet', 'Base Sepolia', 'Arbitrum Sepolia', 'Ethereum Sepolia']

function Hero() {
  return (
    <section className="arc-hero" aria-labelledby="hero-title">
      <div className="arc-hero__copy">
        <p className="arc-hero__eyebrow">Arc ecosystem</p>
        <h1 id="hero-title" className="arc-hero__title">
          Move USDC across the <span>Arc ecosystem.</span>
        </h1>
        <p className="arc-hero__description">
          Cross-chain USDC infrastructure connecting Arc with supported EVM testnets.
        </p>
        <a href="#bridge" className="arc-hero__cta">
          Start Bridging
          <svg viewBox="0 0 20 20" aria-hidden="true" className="size-4 fill-none stroke-current" strokeWidth="1.8">
            <path d="M4 10h11M11 6l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </a>
      </div>

      <div className="arc-hero__network-panel">
        <div className="arc-hero__orb" aria-hidden="true">
          <span className="arc-hero__orb-core">USDC</span>
        </div>
        <div className="arc-hero__network-content">
          <p className="arc-hero__network-label">Supported testnets</p>
          <ul className="arc-hero__network-list" aria-label="Supported networks">
            {supportedNetworks.map((network) => (
              <li key={network}>{network}</li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}

export default Hero
