'use client';

import React from 'react';
import { ProductCard } from './product-card';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

interface Product {
  id: string;
  name: string;
  price: number;
  image?: string;
  description?: string;
  category?: string;
}

interface ProductListProps {
  id?: string;
  title?: string;
  description?: string;
  data?: Product[];
  limit?: number;
  columns?: 1 | 2 | 3;
  loading?: boolean;
  onProductClick?: (productId: string) => void;
  onAddToCart?: (productId: string) => void;
  className?: string;
  emptyMessage?: string;
}

/**
 * ProductList - Grid of product cards
 * Supports loading state and custom column count
 */
export function ProductList({
  id,
  title,
  description,
  data = [],
  limit,
  columns = 2,
  loading = false,
  onProductClick,
  onAddToCart,
  className,
  emptyMessage = "No products found",
}: ProductListProps) {
  const limitedData = limit ? data.slice(0, limit) : data;

  const gridCols = {
    1: "grid-cols-1",
    2: "grid-cols-2",
    3: "grid-cols-3",
  };

  if (loading) {
    return (
      <div className={cn("space-y-4", className)}>
        {title && (
          <div>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-64" />
          </div>
        )}
        <div className={cn("grid gap-4", gridCols[columns])}>
          {Array.from({ length: limit || 6 }).map((_, i) => (
            <Skeleton key={i} className="aspect-[3/4] rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (limitedData.length === 0) {
    return (
      <div className={cn("text-center py-12", className)}>
        <p className="text-muted-foreground">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)} id={id}>
      {(title || description) && (
        <div>
          {title && <h2 className="text-xl font-bold">{title}</h2>}
          {description && <p className="text-muted-foreground">{description}</p>}
        </div>
      )}
      
      <div className={cn("grid gap-4", gridCols[columns])}>
        {limitedData.map((product) => (
          <ProductCard
            key={product.id}
            productId={product.id}
            name={product.name}
            price={product.price}
            image={product.image}
            description={product.description}
            category={product.category}
            onClick={() => onProductClick?.(product.id)}
            onAddToCart={() => onAddToCart?.(product.id)}
          />
        ))}
      </div>
    </div>
  );
}
