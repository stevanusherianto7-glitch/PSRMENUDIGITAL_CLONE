import { useState, useCallback } from 'react';

interface PaginatedDataOptions {
  limit?: number;
  refetchInterval?: number;
}

interface PaginatedDataResult<T> {
  data: T[];
  loading: boolean;
  total: number;
  page: number;
  hasMore: boolean;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
}

export function usePaginatedData<T>(
  fetchData: (page: number, limit: number) => Promise<{ data: T[]; total: number }>,
  options: PaginatedDataOptions = {}
): PaginatedDataResult<T> {
  const [data, setData] = useState<T[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  
  const { limit = 20, refetchInterval } = options;
  
  const loadPage = useCallback(async (pageNum: number) => {
    if (loading) return;
    
    setLoading(true);
    try {
      const result = await fetchData(pageNum, limit);
      
      setData(prev => pageNum === 1 ? result.data : [...prev, ...result.data]);
      setTotal(result.total);
      setPage(pageNum);
    } catch (error) {
      console.error('Failed to load paginated data:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [fetchData, limit, loading]);
  
  const loadMore = useCallback(async () => {
    const totalPages = Math.ceil(total / limit);
    if (page < totalPages && !loading) {
      await loadPage(page + 1);
    }
  }, [page, total, limit, loading, loadPage]);
  
  const refresh = useCallback(async () => {
    await loadPage(1);
  }, [loadPage]);
  
  return {
    data,
    loading,
    total,
    page,
    hasMore: page * limit < total,
    loadMore,
    refresh
  };
}
