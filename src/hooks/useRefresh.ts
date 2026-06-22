/**
 * useRefresh — simple pull-to-refresh / refetch helper.
 * Returns { refreshing, refresh }.
 */

import { useState, useCallback } from 'react';

export function useRefresh(fn: () => Promise<any>) {
  const [refreshing, setRefreshing] = useState(false);
  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await fn();
    } finally {
      setRefreshing(false);
    }
  }, [fn]);
  return { refreshing, refresh };
}
