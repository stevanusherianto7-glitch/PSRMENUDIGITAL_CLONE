import React, { useEffect, useRef } from 'react';

interface InfiniteScrollProps {
  onLoadMore: () => void;
  hasMore: boolean;
  loading: boolean;
  children: React.ReactNode;
  threshold?: number;
}

export function InfiniteScroll({ 
  onLoadMore, 
  hasMore, 
  loading, 
  children, 
  threshold = 100 
}: InfiniteScrollProps) {
  const observer = useRef<IntersectionObserver>();
  const lastElementRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (loading) return;
    
    if (observer.current) {
      observer.current.disconnect();
    }
    
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore && !loading) {
        onLoadMore();
      }
    }, {
      rootMargin: `${threshold}px`
    });
    
    if (lastElementRef.current) {
      observer.current.observe(lastElementRef.current);
    }
    
    return () => {
      if (observer.current) {
        observer.current.disconnect();
      }
    };
  }, [loading, hasMore, onLoadMore, threshold]);
  
  return (
    <>
      {children}
      {(hasMore || loading) && (
        <div ref={lastElementRef} className="flex justify-center py-4">
          {loading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <span>Loading more...</span>
            </div>
          )}
        </div>
      )}
    </>
  );
}
