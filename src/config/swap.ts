/**
 * Arc-only swap integration.
 *
 * Same-chain swaps on Arc Mainnet via Circle App Kit (keyless browser flow).
 * Only tokens confirmed deployed on Arc Mainnet (chain ID 5042) are listed.
 * USDC and NATIVE are the same asset on Arc — NATIVE is excluded.
 * erc20Address is null for USDC because its balance is read from the native
 * balance (Arc native gas IS USDC); all other tokens use balanceOf.
 * Decimals: USDC = 6, EURC = 6, WETH = 18, USYC = 6.
 */

export type SwapToken = {
  symbol: string
  label: string
  /** App Kit token alias */
  appKitAlias: string
  /**
   * ERC-20 contract address on Arc Mainnet, or null for USDC which is
   * read from the native balance instead.
   */
  erc20Address: `0x${string}` | null
  decimals: number
}

export const ARC_SWAP_TOKENS: readonly SwapToken[] = [
  {
    symbol: 'USDC',
    label: 'USDC',
    appKitAlias: 'USDC',
    // USDC on Arc IS the native asset — balance read via useBalance, not ERC-20
    erc20Address: null,
    decimals: 6,
  },
  {
    symbol: 'EURC',
    label: 'EURC',
    appKitAlias: 'EURC',
    erc20Address: '0xbEf5f6d51CB62b58e6A8f77868681825C6fe21c1',
    decimals: 6,
  },
  {
    symbol: 'WETH',
    label: 'WETH',
    appKitAlias: 'WETH',
    erc20Address: '0x128cC466B61f542da60c70e3aA11c10e19B84EDB',
    decimals: 18,
  },
  {
    symbol: 'USYC',
    label: 'USYC',
    appKitAlias: 'USYC',
    erc20Address: '0x8a5D989Bbb96929F689B0200f435f53dA42bF490',
    decimals: 6,
  },
]

/** App Kit chain string for Arc Mainnet. */
export const ARC_MAINNET_CHAIN = 'Arc' as const

/** Default slippage: 100 bps (1%). */
export const DEFAULT_SLIPPAGE_BPS = 100

export const arcSwapConfig = {
  chain: 'Arc Mainnet',
  enabled: true,
  provider: 'Circle App Kit Stablecoin Service (quote-gated)',
  assets: ARC_SWAP_TOKENS.map((t) => t.symbol),
  unavailableReason: '',
} as const
