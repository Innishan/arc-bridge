import { isAddress } from 'viem'

type FeePolicyConfig = {
  basisPoints: number
  enabled: boolean
}

const parseBasisPoints = (value: string | undefined, variable: string): number => {
  if (value === undefined || value.trim() === '') return 0
  if (!/^\d+$/.test(value) || Number(value) > 10_000) {
    throw new Error(`${variable} must be an integer from 0 to 10000.`)
  }
  return Number(value)
}

const recipient = import.meta.env.VITE_ARCBRIDGE_FEE_RECIPIENT?.trim() || undefined
if (recipient !== undefined && !isAddress(recipient)) {
  throw new Error('VITE_ARCBRIDGE_FEE_RECIPIENT must be a valid EVM address.')
}

const bridgeBasisPoints = parseBasisPoints(import.meta.env.VITE_ARCBRIDGE_PRODUCTION_BRIDGE_FEE_BPS, 'VITE_ARCBRIDGE_PRODUCTION_BRIDGE_FEE_BPS')
const swapBasisPoints = parseBasisPoints(import.meta.env.VITE_ARCBRIDGE_PRODUCTION_SWAP_FEE_BPS, 'VITE_ARCBRIDGE_PRODUCTION_SWAP_FEE_BPS')

const makePolicy = (basisPoints: number): FeePolicyConfig => ({
  basisPoints,
  enabled: basisPoints > 0 && recipient !== undefined,
})

/**
 * Public production fee settings. Recipient addresses and percentages are not
 * secrets, but remain centralized so bridge and swap policies cannot drift.
 * Fees stay disabled until both a recipient and an explicit percentage are set.
 */
export const productionDeveloperFees = {
  recipient,
  bridge: makePolicy(bridgeBasisPoints),
  swap: makePolicy(swapBasisPoints),
} as const

export const formatFeeFromInputAmount = (amount: string, basisPoints: number): string => {
  if (!/^\d+(?:\.\d{1,6})?$/.test(amount) || basisPoints === 0) return '0'
  const [whole, fraction = ''] = amount.split('.')
  const atomic = BigInt(whole) * 1_000_000n + BigInt((fraction + '000000').slice(0, 6))
  const feeAtomic = atomic * BigInt(basisPoints) / 10_000n
  const feeWhole = feeAtomic / 1_000_000n
  const feeFraction = (feeAtomic % 1_000_000n).toString().padStart(6, '0').replace(/0+$/, '')
  return feeFraction ? `${feeWhole}.${feeFraction}` : feeWhole.toString()
}
