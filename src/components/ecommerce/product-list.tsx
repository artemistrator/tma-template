'use client';

import React, { useEffect } from 'react';
import { ProductCard } from './product-card';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { useProductStore } from '@/store/product-store';

interface Product {
  id: string;
  name: string;
  price: number;
  image?: string;
  description?: string;
  category?: string;
  badge?: string;
}

interface ProductListProps {
  id?: string;
  title?: string;
  description?: string;
  data?: Product[];
  props?: {
    data?: Product[];
    title?: string;
    description?: string;
    limit?: number;
    columns?: 1 | 2 | 3;
  };
  limit?: number;
  columns?: 1 | 2 | 3;
  loading?: boolean;
  onProductClick?: (productId: string) => void;
  onAddToCart?: (productId: string) => void;
  className?: string;
  emptyMessage?: string;
  enableFiltering?: boolean;
}

/**
 * ProductList - Grid of product cards
 * Supports loading state and custom column count
 */
export function ProductList({
  id,
  title,
  description,
  data: directData,
  props,
  limit,
  columns = 2,
  loading = false,
  onProductClick,
  onAddToCart,
  className,
  emptyMessage = "No products found",
  enableFiltering = false,
}: ProductListProps) {
  // Use data from props.data or direct data
  const data = React.useMemo(() => props?.data || directData || [], [props?.data, directData]);
  const pageLimit = props?.limit || limit;
  const pageColumns = (props?.columns as 1 | 2 | 3) || columns;
  const pageTitle = props?.title || title;
  const pageDescription = props?.description || description;

  // Subscribe to store for filtering
  const setAllProducts = useProductStore((state) => state.setAllProducts);
  const searchQuery = useProductStore((state) => state.searchQuery);
  const selectedCategories = useProductStore((state) => state.selectedCategories);
  const priceRange = useProductStore((state) => state.priceRange);
  const allProducts = useProductStore((state) => state.allProducts);

  // Initialize products in store if enableFiltering is true
  useEffect(() => {
    if (enableFiltering && data.length > 0) {
      setAllProducts(data);
    }
  }, [enableFiltering, data, setAllProducts]);

  // Filter products based on search and filters
  const displayData = React.useMemo(() => {
    if (!enableFiltering) {
      return pageLimit ? data.slice(0, pageLimit) : data;
    }

    // Filter allProducts based on current filters
    let filtered = [...allProducts];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((product) =>
        product.name.toLowerCase().includes(query) ||
        product.description?.toLowerCase().includes(query) ||
        product.category?.toLowerCase().includes(query)
      );
    }

    // Category filter
    if (selectedCategories.length > 0) {
      const categoryMap: Record<string, string[]> = {
        'audio': ['audio'],
        'wearables': ['wearables'],
        'accessories': ['accessories'],
        'peripherals': ['peripherals'],
      };
      filtered = filtered.filter((product) => {
        if (!product.category) return false;
        const categoryKey = product.category.toLowerCase();
        return selectedCategories.some((catId) =>
          categoryMap[catId]?.includes(categoryKey)
        );
      });
    }

    // Price filter
    filtered = filtered.filter(
      (product) => product.price >= priceRange[0] && product.price <= priceRange[1]
    );

    return pageLimit ? filtered.slice(0, pageLimit) : filtered;
  }, [enableFiltering, allProducts, searchQuery, selectedCategories, priceRange, data, pageLimit]);

  const gridCols = {
    1: "grid-cols-1",
    2: "grid-cols-2",
    3: "grid-cols-3",
  };

  if (loading) {
    return (
      <div className={cn("space-y-4", className)}>
        {pageTitle && (
          <div>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-64" />
          </div>
        )}
        <div className={cn("grid gap-4", gridCols[pageColumns])}>
          {Array.from({ length: pageLimit || 6 }).map((_, i) => (
            <Skeleton key={i} className="aspect-[3/4] rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (displayData.length === 0) {
    return (
      <div className={cn("text-center py-12", className)} id={id}>
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
          <svg className="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <p className="text-muted-foreground">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)} id={id}>
      {(pageTitle || pageDescription) && (
        <div>
          {pageTitle && <h2 className="text-xl font-bold">{pageTitle}</h2>}
          {pageDescription && <p className="text-muted-foreground">{pageDescription}</p>}
        </div>
      )}

      <div className={cn("grid gap-4", gridCols[pageColumns])}>
        {displayData.map((product) => (
          <ProductCard
            key={product.id}
            productId={product.id}
            name={product.name}
            price={product.price}
            image={product.image}
            description={product.description}
            category={product.category}
            badge={product.badge}
            onClick={() => onProductClick?.(product.id)}
            onAddToCart={() => onAddToCart?.(product.id)}
          />
        ))}
      </div>
    </div>
  );
}
