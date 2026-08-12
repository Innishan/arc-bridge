type TransactionStatusProps = {
  status: 'idle' | 'switching' | 'bridging' | 'success' | 'error'
  explorerUrl: string
  errorMsg: string
}

function TransactionStatus({ status, explorerUrl, errorMsg }: TransactionStatusProps) {
  return (
    <>
      {status === 'success' && (
        <div className="text-green-400 text-sm text-center">
          Bridge submitted!{' '}
          {explorerUrl && (
            <a href={explorerUrl} target="_blank" rel="noreferrer" className="underline">
              View transaction
            </a>
          )}
        </div>
      )}
      {status === 'error' && <div className="text-red-400 text-sm text-center">{errorMsg}</div>}
    </>
  )
}

export default TransactionStatus
