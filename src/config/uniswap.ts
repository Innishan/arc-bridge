/**
 * Uniswap v3 contract addresses on Arc Mainnet (chain ID 5042).
 * Verified on-chain via eth_getCode and factory() reads against
 * https://rpc.mainnet.arc.io on 2026-10-06.
 */

export const ARC_CHAIN_ID = 5042

export const UNISWAP_V3 = {
  /** v3 Core Factory — confirmed via SwapRouter02.factory() call */
  factory:    '0xf0db7b58379503491d857dB50AC9ece64c653918' as `0x${string}`,
  /** SwapRouter02 — confirmed 24KB bytecode on Arc Mainnet */
  router:     '0x53BF6B0684Ec7eF91e1387Da3D1a1769bC5A6F77' as `0x${string}`,
  /** Universal Router (v3+v4) — confirmed 24KB bytecode on Arc Mainnet */
  universalRouter: '0x4fcA4a51Ab4F23A7447b3284fBd7D73289A89Fb1' as `0x${string}`,
} as const

/** Pool fee tiers in bps (Uniswap v3) */
export const FEE_TIERS = [500, 3000, 10000] as const
export type FeeTier = typeof FEE_TIERS[number]
export const FEE_LABEL: Record<FeeTier, string> = {
  500:   '0.05%',
  3000:  '0.3%',
  10000: '1%',
}

export type ArcToken = {
  symbol: string
  name: string
  address: `0x${string}` | null   // null = USDC native (use ERC-20 sentinel below)
  erc20: `0x${string}`            // always the ERC-20 address, even for USDC
  decimals: number
  logoColor: string               // tailwind bg class for fallback icon
  logoUrl?: string                // remote logo URL (optional, falls back to colored initial)
}

/**
 * USDC ERC-20 sentinel on Arc — the native balance and this share the same pool.
 * 6 decimals. Do NOT use this as msg.value; use native balance for gas.
 */
export const USDC_ERC20 = '0x3600000000000000000000000000000000000000' as `0x${string}`

/**
 * Curated token list — tokens confirmed deployed on Arc Mainnet.
 * Users can also search and add any ERC-20 by address.
 */
export const ARC_DEFAULT_TOKENS: ArcToken[] = [
  {
    symbol: 'USDC',
    name: 'USD Coin',
    address: null,
    erc20: USDC_ERC20,
    decimals: 6,
    logoColor: 'bg-blue-500',
    logoUrl: 'https://assets.coingecko.com/coins/images/6319/small/usdc.png',
  },
  {
    symbol: 'EURC',
    name: 'Euro Coin',
    address: '0xbEf5f6d51CB62b58e6A8f77868681825C6fe21c1',
    erc20: '0xbEf5f6d51CB62b58e6A8f77868681825C6fe21c1',
    decimals: 6,
    logoColor: 'bg-yellow-400',
    logoUrl: 'https://assets.coingecko.com/coins/images/26045/small/euro-coin.png',
  },
  {
    symbol: 'WETH',
    name: 'Wrapped Ether',
    address: '0x128cC466B61f542da60c70e3aA11c10e19B84EDB',
    erc20: '0x128cC466B61f542da60c70e3aA11c10e19B84EDB',
    decimals: 18,
    logoColor: 'bg-indigo-500',
    logoUrl: 'https://assets.coingecko.com/coins/images/2518/small/weth.png',
  },
  {
    symbol: 'USYC',
    name: 'US Yield Coin',
    address: '0x8a5D989Bbb96929F689B0200f435f53dA42bF490',
    erc20: '0x8a5D989Bbb96929F689B0200f435f53dA42bF490',
    decimals: 6,
    logoColor: 'bg-green-500',
    logoUrl: 'https://assets.coingecko.com/coins/images/33702/small/hashnote.png',
  },
  {
    symbol: 'cirBTC',
    name: 'Circle BTC',
    address: '0x171A4217b86A807A64eB94757Db6849fb4bDbAA0',
    erc20: '0x171A4217b86A807A64eB94757Db6849fb4bDbAA0',
    decimals: 8,
    logoColor: 'bg-orange-400',
    logoUrl: 'https://assets.coingecko.com/coins/images/1/small/bitcoin.png',
  },
]

// ── Uniswap v3 ABIs (minimal) ─────────────────────────────────────────────────

export const V3_FACTORY_ABI = [
  {
    name: 'getPool',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'tokenA', type: 'address' },
      { name: 'tokenB', type: 'address' },
      { name: 'fee',    type: 'uint24'  },
    ],
    outputs: [{ name: 'pool', type: 'address' }],
  },
] as const

export const V3_POOL_ABI = [
  {
    name: 'slot0',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [
      { name: 'sqrtPriceX96',          type: 'uint160' },
      { name: 'tick',                   type: 'int24'   },
      { name: 'observationIndex',       type: 'uint16'  },
      { name: 'observationCardinality', type: 'uint16'  },
      { name: 'observationCardinalityNext', type: 'uint16' },
      { name: 'feeProtocol',            type: 'uint8'   },
      { name: 'unlocked',               type: 'bool'    },
    ],
  },
  {
    name: 'liquidity',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint128' }],
  },
  {
    name: 'token0',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
  },
  {
    name: 'token1',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
  },
  {
    name: 'fee',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint24' }],
  },
] as const

export const ERC20_ABI = [
  { name: 'symbol',   type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'string' }] },
  { name: 'name',     type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'string' }] },
  { name: 'decimals', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'uint8'  }] },
  { name: 'balanceOf', type: 'function', stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }] },
  { name: 'allowance', type: 'function', stateMutability: 'view',
    inputs: [{ name: 'owner', type: 'address' }, { name: 'spender', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }] },
  { name: 'approve', type: 'function', stateMutability: 'nonpayable',
    inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }],
    outputs: [{ name: '', type: 'bool' }] },
] as const

export const SWAP_ROUTER02_ABI = [
  {
    name: 'exactInputSingle',
    type: 'function',
    stateMutability: 'payable',
    inputs: [{
      name: 'params',
      type: 'tuple',
      components: [
        { name: 'tokenIn',           type: 'address' },
        { name: 'tokenOut',          type: 'address' },
        { name: 'fee',               type: 'uint24'  },
        { name: 'recipient',         type: 'address' },
        { name: 'amountIn',          type: 'uint256' },
        { name: 'amountOutMinimum',  type: 'uint256' },
        { name: 'sqrtPriceLimitX96', type: 'uint160' },
      ],
    }],
    outputs: [{ name: 'amountOut', type: 'uint256' }],
  },
  {
    name: 'exactOutputSingle',
    type: 'function',
    stateMutability: 'payable',
    inputs: [{
      name: 'params',
      type: 'tuple',
      components: [
        { name: 'tokenIn',          type: 'address' },
        { name: 'tokenOut',         type: 'address' },
        { name: 'fee',              type: 'uint24'  },
        { name: 'recipient',        type: 'address' },
        { name: 'amountOut',        type: 'uint256' },
        { name: 'amountInMaximum',  type: 'uint256' },
        { name: 'sqrtPriceLimitX96',type: 'uint160' },
      ],
    }],
    outputs: [{ name: 'amountIn', type: 'uint256' }],
  },
] as const
