import { useNavigate, useSearch } from '@tanstack/react-router'
import { useMemo, useCallback } from 'react'

export function useSearchParams() {
  const navigate = useNavigate()
  const searchObj = useSearch({ strict: false })
  
  const searchParams = useMemo(() => {
    const params = new URLSearchParams()
    Object.entries(searchObj || {}).forEach(([k, v]) => {
      if (v !== undefined && v !== null) params.set(k, String(v))
    })
    return params
  }, [searchObj])
  
  const setSearchParams = useCallback((updater: any) => {
    navigate({
      search: (old: any) => {
        let newParams = new URLSearchParams()
        Object.entries(old || {}).forEach(([k, v]) => {
          if (v !== undefined && v !== null) newParams.set(k, String(v))
        })
        if (typeof updater === 'function') {
          newParams = updater(newParams)
        } else {
          // Si pasan un objeto u otro URLSearchParams
          newParams = new URLSearchParams(updater)
        }
        return Object.fromEntries(newParams.entries())
      },
      replace: true
    })
  }, [navigate])
  
  return [searchParams, setSearchParams] as const
}
