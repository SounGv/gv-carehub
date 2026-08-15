'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

interface UseAsyncState<T> {
  data: T | null;
  error: string | null;
  isLoading: boolean;
  lastUpdatedAt: Date | null;
}

/**
 * Generic data-fetching hook used by every page that talks to the API.
 * Centralizes loading / error / empty / "last fetched at" handling so each
 * page doesn't reimplement it.
 */
export function useAsync<T>(fetcher: () => Promise<T>, deps: unknown[]): UseAsyncState<T> & { refetch: () => void } {
  const [state, setState] = useState<UseAsyncState<T>>({ data: null, error: null, isLoading: true, lastUpdatedAt: null });
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;
  const [tick, setTick] = useState(0);

  const refetch = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    let cancelled = false;
    setState((s) => ({ ...s, isLoading: true, error: null }));
    fetcherRef
      .current()
      .then((data) => {
        if (cancelled) return;
        setState({ data, error: null, isLoading: false, lastUpdatedAt: new Date() });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : 'เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ';
        setState((s) => ({ ...s, error: message, isLoading: false }));
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);

  return { ...state, refetch };
}
