import { useCallback, useEffect, useRef, useState } from 'react'

interface FetchState<T> {
  data?: T
  error?: Error
  loading: boolean
}

export function useFetch<T>(fetcher: () => Promise<T>, deps: unknown[] = [], intervalMs?: number) {
  const [state, setState] = useState<FetchState<T>>({ loading: true })
  const [tick, setTick] = useState(0)
  const fetcherRef = useRef(fetcher)
  fetcherRef.current = fetcher

  useEffect(() => {
    let alive = true
    setState((s) => (s.data === undefined ? { loading: true } : { ...s, loading: false }))
    fetcherRef
      .current()
      .then((data) => alive && setState({ data, loading: false }))
      .catch((error: Error) => alive && setState((s) => ({ data: s.data, error, loading: false })))
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick])

  useEffect(() => {
    if (!intervalMs) return
    const id = setInterval(() => setTick((t) => t + 1), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])

  const reload = useCallback(() => setTick((t) => t + 1), [])
  const mutate = useCallback(
    (update: (data: T) => T) => setState((s) => (s.data === undefined ? s : { ...s, data: update(s.data) })),
    [],
  )

  return { ...state, reload, mutate }
}
