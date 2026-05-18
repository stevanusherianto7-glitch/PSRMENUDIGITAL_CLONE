import React, { useCallback } from 'react';
import { FixedSizeList as List } from 'react-window';
import { OrderCard } from './OrderCard';
import type { Order } from '../types';

interface VirtualizedOrderListProps {
  orders: Order[];
  height?: number;
  itemSize?: number;
  onItemClick?: (order: Order) => void;
}

export const VirtualizedOrderList = React.memo(function VirtualizedOrderList({
  orders,
  height = 600,
  itemSize = 200,
  onItemClick
}: VirtualizedOrderListProps) {
  const Row = useCallback(({ index, style }: { index: number; style: React.CSSProperties }) => {
    const order = orders[index];
    return (
      <div style={style}>
        <OrderCard 
          order={order} 
          onClick={onItemClick}
        />
      </div>
    );
  }, [orders, onItemClick]);

  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3 bg-card border border-border rounded-xl">
        <div className="w-12 h-12 bg-muted/20 rounded-full flex items-center justify-center">
          <svg className="w-6 h-6 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        </div>
        <p className="text-sm font-bold uppercase tracking-widest">Tidak ada pesanan</p>
      </div>
    );
  }

  return (
    <List
      height={height}
      itemCount={orders.length}
      itemSize={itemSize}
      width="100%"
      className="scrollbar-thin scrollbar-thumb-rounded scrollbar-thumb-muted-foreground/20 hover:scrollbar-thumb-muted-foreground/40"
    >
      {Row}
    </List>
  );
});
