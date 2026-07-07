import { useState, useEffect } from 'react'

const DESKTOP_BREAKPOINT = 768

function getIsDesktop(): boolean {
  if (typeof window === 'undefined') return false
  return window.innerWidth >= DESKTOP_BREAKPOINT
}

export function useViewport() {
  const [isDesktop, setIsDesktop] = useState(getIsDesktop)

  useEffect(() => {
    const mql = window.matchMedia(`(min-width: ${DESKTOP_BREAKPOINT}px)`)

    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches)
    mql.addEventListener('change', handler)

    return () => mql.removeEventListener('change', handler)
  }, [])

  return { isDesktop }
}
