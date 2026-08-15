'use client';

import { useAsync } from './use-async';
import { gvApi } from '@/lib/api';

/** Filter/form option lists sourced from the API (Config + Products sheets) — never hardcoded. */
export function useMeta() {
  return useAsync(() => gvApi.meta(), []);
}
