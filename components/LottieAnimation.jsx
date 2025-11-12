import { useEffect, useRef } from 'react'
import Lottie from 'lottie-react'

export default function LottieAnimation({
  animationPath,
  width = 80,
  height = 80,
  loop = true,
  autoplay = true,
  className = ''
}) {
  const lottieRef = useRef()

  return (
    <div className={`inline-flex items-center justify-center ${className}`}>
      <Lottie
        lottieRef={lottieRef}
        animationData={animationPath}
        loop={loop}
        autoplay={autoplay}
        style={{ width, height }}
      />
    </div>
  )
}

// Fallback component ถ้ายังไม่มี animation file
export function AnimationPlaceholder({ emoji, size = 'lg' }) {
  const sizeClasses = {
    sm: 'text-2xl',
    md: 'text-4xl',
    lg: 'text-5xl',
    xl: 'text-6xl'
  }

  return (
    <div className="inline-flex items-center justify-center">
      <span className={sizeClasses[size]}>{emoji}</span>
    </div>
  )
}
