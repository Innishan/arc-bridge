import type { BridgeEnvironment } from '../config/bridge'

const configuredApiUrl = import.meta.env.VITE_ARCBRIDGE_API_URL?.trim()
export const analyticsApiUrl = (configuredApiUrl || 'https://arc-bridge-backend.onrender.com').replace(/\/$/, '')

export type NetworkActivity = {
  chainId: number | null
  chain: string | null
  count: number
  volume: number
}

export type RecentTransfer = {
  environment: BridgeEnvironment
  sourceChainId: number | null
  destinationChainId: number | null
  sourceChain: string | null
  destinationChain: string | null
  amount: string | number | null
  amountAtomic?: string
  txHash: string
  timestamp: number
  explorerUrl: string | null
}

export type AnalyticsSnapshot = {
  environment: BridgeEnvironment
  total: number
  count: number
  average: number
  networkActivity: NetworkActivity[]
  recentTransfers: RecentTransfer[]
}

type MainnetSubmission = {
  environment: 'mainnet'
  sourceChainId: number
  destinationChainId: number
  txHash: string
}

type TestnetSubmission = {
  environment: 'testnet'
  chain: string
  txHash: string
}

async function parseResponse(response: Response) {
  const payload: unknown = await response.json().catch(() => null)
  if (!response.ok) {
    const message = payload && typeof payload === 'object' && 'error' in payload && typeof payload.error === 'string'
      ? payload.error
      : 'Analytics service rejected the bridge record.'
    throw new Error(message)
  }
  return payload
}

export async function getAnalytics(environment: BridgeEnvironment, signal?: AbortSignal): Promise<AnalyticsSnapshot> {
  // Keep the original no-query testnet request compatible with the legacy API.
  const suffix = environment === 'mainnet' ? '?environment=mainnet' : ''
  const payload = await parseResponse(await fetch(`${analyticsApiUrl}/api/volume${suffix}`, { signal }))
  return payload as AnalyticsSnapshot
}

export async function submitBridgeAnalytics(submission: MainnetSubmission | TestnetSubmission): Promise<AnalyticsSnapshot> {
  const payload = await parseResponse(await fetch(`${analyticsApiUrl}/api/bridges`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(submission),
  }))
  return payload as AnalyticsSnapshot
}
