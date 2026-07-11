import { useState, useEffect } from 'react'

const DESKTOP_BREAKPOINT = 768
const WIDE_BREAKPOINT = 2000

function getIsDesktop(): boolean {
  if (typeof window === 'undefined') return false
  return window.innerWidth >= DESKTOP_BREAKPOINT
}

function getIsWide(): boolean {
  if (typeof window === 'undefined') return false
  return window.innerWidth >= WIDE_BREAKPOINT
}

export function useViewport() {
  const [isDesktop, setIsDesktop] = useState(getIsDesktop)
  const [isWide, setIsWide] = useState(getIsWide)

  useEffect(() => {
    const mqlDesktop = window.matchMedia(`(min-width: ${DESKTOP_BREAKPOINT}px)`)
    const mqlWide = window.matchMedia(`(min-width: ${WIDE_BREAKPOINT}px)`)

    const handlerDesktop = (e: MediaQueryListEvent) => setIsDesktop(e.matches)
    const handlerWide = (e: MediaQueryListEvent) => setIsWide(e.matches)
    mqlDesktop.addEventListener('change', handlerDesktop)
    mqlWide.addEventListener('change', handlerWide)

    return () => {
      mqlDesktop.removeEventListener('change', handlerDesktop)
      mqlWide.removeEventListener('change', handlerWide)
    }
  }, [])

  return { isDesktop, isWide }
}
