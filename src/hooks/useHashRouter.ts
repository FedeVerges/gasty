import { useState, useEffect, useCallback } from 'react'

interface RouterState {
  /** The current route name extracted from the hash */
  route: string
  /** Parsed query parameters from the hash */
  params: Record<string, string>
  /** Navigate to a hash route (e.g. '#/dashboard' or '#/balance?month=2026-07') */
  navigate: (hash: string) => void
}

function parseHash(hash: string): { route: string; params: Record<string, string> } {
  // Strip leading '#/' and split on '?'
  const raw = hash.replace(/^#\/?/, '')
  const [path, queryString] = raw.split('?')
  const route = path || 'dashboard'

  const params: Record<string, string> = {}
  if (queryString) {
    for (const pair of queryString.split('&')) {
      const [key, value] = pair.split('=')
      if (key) params[decodeURIComponent(key)] = decodeURIComponent(value ?? '')
    }
  }

  return { route, params }
}

export function useHashRouter(): RouterState {
  const [state, setState] = useState(() => parseHash(window.location.hash))

  useEffect(() => {
    const onHashChange = () => {
      setState(parseHash(window.location.hash))
    }
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  const navigate = useCallback((hash: string) => {
    window.location.hash = hash
  }, [])

  return { route: state.route, params: state.params, navigate }
}
