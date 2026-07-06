import { useState, useEffect } from 'react'

const vv = typeof window !== 'undefined' ? window.visualViewport : null

export function useKeyboardHeight(): number {
  const [height, setHeight] = useState(0)

  useEffect(() => {
    if (!vv) return

    const handleChange = () => {
      const diff = window.innerHeight - vv!.height
      const kb = diff > 0 ? diff : 0
      setHeight((prev) => (prev !== kb ? kb : prev))

      if (kb === 0 && vv!.offsetTop > 0) {
        window.scrollTo(0, 0)
      }
    }

    vv.addEventListener('resize', handleChange)
    vv.addEventListener('scroll', handleChange)
    return () => {
      vv.removeEventListener('resize', handleChange)
      vv.removeEventListener('scroll', handleChange)
    }
  }, [])

  return height
}
