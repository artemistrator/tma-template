'use client';

import React from 'react';

interface ProductRow {
  id: string;
  name: string;
  units: number;
  revenue: number;
}

interface LowStockItem {
  id: string;
  name: string;
  stock_quantity: number;
}

interface TopProductsTableProps {
  products: ProductRow[];
  lowStock?: LowStockItem[];
  currency?: string;
  label?: string;
}

export function TopProductsTable({ products, lowStock = [], currency = '', label = 'Top Products' }: TopProductsTableProps) {
  const maxRevenue = products[0]?.revenue || 1;

  return (
    <div className="space-y-4">
      {/* Top products */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
        <h2 className="text-sm font-medium mb-3">{label}</h2>

        {products.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No data for this period</p>
        ) : (
          <div className="space-y-3">
            {products.map((product, i) => (
              <div key={product.id}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs text-muted-foreground w-4 shrink-0">{i + 1}</span>
                    <span className="font-medium truncate">{product.name}</span>
                  </div>
                  <div className="flex items-center gap-3 ml-2 shrink-0">
                    <span className="text-xs text-muted-foreground">{product.units} sold</span>
                    <span className="font-semibold text-sm">{currency}{product.revenue.toLocaleString()}</span>
                  </div>
                </div>
                {/* Revenue bar */}
                <div className="h-1 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary/60 rounded-full transition-all"
                    style={{ width: `${Math.round((product.revenue / maxRevenue) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Low stock alerts */}
      {lowStock.length > 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
          <div className="flex items-center gap-2 mb-3">
            <h2 className="text-sm font-medium">Low Stock Alerts</h2>
            <span className="text-xs bg-warning-bg text-warning-foreground px-2 py-0.5 rounded-full font-medium">
              {lowStock.length}
            </span>
          </div>
          <div className="space-y-2">
            {lowStock.map(item => (
              <div key={item.id} className="flex items-center justify-between">
                <span className="text-sm truncate">{item.name}</span>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                  item.stock_quantity === 0
                    ? 'bg-error-bg text-error-foreground'
                    : 'bg-warning-bg text-warning-foreground'
                }`}>
                  {item.stock_quantity === 0 ? 'Out of stock' : `${item.stock_quantity} left`}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
