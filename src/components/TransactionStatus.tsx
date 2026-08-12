type TransactionStatusProps = {
  status: 'idle' | 'switching' | 'bridging' | 'success' | 'error'
  explorerUrl: string
  errorMsg: string
}

function TransactionStatus({ status, explorerUrl, errorMsg }: TransactionStatusProps) {
  return (
    <>
      {status === 'success' && (
        <div className="mt-4 border border-emerald-300/15 bg-emerald-300/[0.07] px-3.5 py-3 text-sm text-emerald-200">
          <span className="font-medium">Bridge submitted!</span>{' '}
          {explorerUrl && (
            <a href={explorerUrl} target="_blank" rel="noreferrer" className="underline decoration-emerald-200/50 underline-offset-2 hover:text-emerald-100">
              View transaction
            </a>
          )}
        </div>
      )}
      {status === 'error' && <div className="mt-4 border border-red-300/15 bg-red-300/[0.07] px-3.5 py-3 text-sm leading-5 text-red-200">{errorMsg}</div>}
    </>
  )
}

export default TransactionStatus
