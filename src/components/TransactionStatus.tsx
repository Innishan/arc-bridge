type TransactionStatusProps = {
  status: 'idle' | 'switching' | 'bridging' | 'success' | 'error'
  explorerUrl: string
  errorMsg: string
  analyticsWarning: string
}

function TransactionStatus({ status, explorerUrl, errorMsg, analyticsWarning }: TransactionStatusProps) {
  return (
    <>
      {status === 'success' && (
        <div className="mt-4 border border-emerald-300/15 bg-emerald-300/[0.07] px-3.5 py-3 text-sm text-emerald-200">
          <p className="font-medium">Bridge submitted!</p>
          {explorerUrl && (
            <a
              href={explorerUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-1 inline-block underline decoration-emerald-200/50 underline-offset-2 hover:text-emerald-100"
            >
              View transaction →
            </a>
          )}
          <p className="mt-2 text-xs leading-5 text-emerald-300/70">
            CCTP bridging involves a burn on the source chain, a Circle attestation (typically 1–2 minutes), and a mint on the destination chain. Your funds will appear once the mint is confirmed. Do not resend until you have checked the transaction above.
          </p>
        </div>
      )}
      {status === 'error' && (
        <div className="mt-4 border border-red-300/15 bg-red-300/[0.07] px-3.5 py-3 text-sm leading-5 text-red-200">
          {errorMsg}
        </div>
      )}
      {status === 'success' && analyticsWarning && (
        <div className="mt-3 border border-amber-200/15 bg-amber-300/[0.07] px-3.5 py-3 text-sm leading-5 text-amber-100">
          {analyticsWarning}
        </div>
      )}
    </>
  )
}

export default TransactionStatus
