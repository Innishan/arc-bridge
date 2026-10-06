import { useState } from 'react'
import type { ArcToken } from '../config/uniswap'

type Props = {
  token: ArcToken
  size?: number   // px, default 28
  className?: string
}

export function TokenLogo({ token, size = 28, className = '' }: Props) {
  const [imgFailed, setImgFailed] = useState(false)

  if (token.logoUrl && !imgFailed) {
    return (
      <img
        src={token.logoUrl}
        alt={token.symbol}
        width={size}
        height={size}
        className={`rounded-full object-cover flex-shrink-0 ${className}`}
        style={{ width: size, height: size }}
        onError={() => setImgFailed(true)}
      />
    )
  }

  // Fallback: colored circle with first letter
  return (
    <div
      className={`rounded-full flex items-center justify-center flex-shrink-0 text-white font-bold ${token.logoColor} ${className}`}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.4) }}
    >
      {token.symbol[0]}
    </div>
  )
}
