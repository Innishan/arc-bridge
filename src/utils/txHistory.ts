/**
 * Shared transaction history utilities — separate from the React component
 * so Fast Refresh can work cleanly on TxHistory.tsx.
 */

export type TxRecord = {
  id: string
  type: 'bridge' | 'swap'
  timestamp: number
  fromLabel: string
  toLabel: string
  amount: string
  asset: string
  explorerUrl: string
  status: 'success' | 'error'
  // swap-specific optional fields
  amountIn?: string
  amountOut?: string
  tokenIn?: string
  tokenOut?: string
  txHash?: string
}

const STORAGE_KEY = 'arcbridge_tx_history'
const MAX_RECORDS = 20

export function loadHistory(): TxRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed as TxRecord[]
  } catch {
    return []
  }
}

export function appendHistory(record: Partial<TxRecord> & Pick<TxRecord, 'type' | 'timestamp'>): void {
  const full: TxRecord = {
    id: record.txHash ?? String(record.timestamp),
    fromLabel: record.fromLabel ?? '',
    toLabel: record.toLabel ?? '',
    amount: record.amount ?? record.amountIn ?? '',
    asset: record.asset ?? record.tokenIn ?? '',
    explorerUrl: record.explorerUrl ?? '',
    status: 'success',
    ...record,
  }
  const existing = loadHistory()
  const updated = [full, ...existing].slice(0, MAX_RECORDS)
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  } catch {
    // storage full — fail silently
  }
}
