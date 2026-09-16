/**
 * Arc-only swap integration boundary.
 *
 * App Kit 1.15.0 includes Arc in getSupportedChains('swap') and supports its
 * keyless browser-wallet swap API. It does not expose an Arc asset-pair or
 * liquidity registry, however: a live estimateSwap quote is the only route
 * verification. Do not present inferred token aliases as executable assets.
 */
export const arcSwapConfig = {
  chain: 'Arc Mainnet',
  enabled: false,
  provider: 'Circle App Kit Stablecoin Service (quote-gated)',
  assets: [],
  unavailableReason: 'Arc swap assets and liquidity pairs are not discoverable from the installed runtime. Swap remains unavailable until each displayed Arc pair is verified by a live App Kit estimate.',
} as const
