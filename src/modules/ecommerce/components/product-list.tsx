'use client';

import React, { useEffect, useState } from 'react';
import { ProductCard } from './product-card';
import { SearchBar } from './search-bar';
import { FilterPanel } from './filter-panel';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState, emptyIcon } from '@/components/ui/empty-state';
import { useProductStore } from '@/store/product-store';
import { useCartStore } from '@/store/cart-store';

interface Product {
  id: string;
  name: string;
  price: number;
  image?: string;
  description?: string;
  category?: string;
  badge?: string;
  stockQuantity?: number;
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
    enableFiltering?: boolean;
    showFavoritesOnly?: boolean;
    showCategoryFilter?: boolean;
    onProductClick?: string | ((productId: string) => void);
  };
  limit?: number;
  columns?: 1 | 2 | 3;
  loading?: boolean;
  onProductClick?: (productId: string) => void;
  onAddToCart?: (productId: string) => void;
  className?: string;
  emptyMessage?: string;
  enableFiltering?: boolean;
  showFavoritesOnly?: boolean;
  showCategoryFilter?: boolean;
  onNavigate?: (pageId: string) => void;
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
  enableFiltering: directEnableFiltering = false,
  showFavoritesOnly: directShowFavoritesOnly = false,
  showCategoryFilter: directShowCategoryFilter = true,
  onNavigate,
}: ProductListProps) {
  // Support both direct props and nested props from schema
  const enableFiltering = props?.enableFiltering ?? directEnableFiltering;
  const showFavoritesOnly = props?.showFavoritesOnly ?? directShowFavoritesOnly;
  const showCategoryFilter = props?.showCategoryFilter ?? directShowCategoryFilter;

  // Use data from props.data or direct data
  const data = React.useMemo(() => props?.data || directData || [], [props?.data, directData]);
  const pageLimit = props?.limit || limit;
  const pageColumns = (props?.columns as 1 | 2 | 3) || columns;
  const pageTitle = props?.title || title;
  const pageDescription = props?.description || description;

  // Local category filter state
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  // Preselect category from CategoryGrid navigation
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const preselect = sessionStorage.getItem('catalog_preselect_category');
    if (preselect) {
      sessionStorage.removeItem('catalog_preselect_category');
      setActiveCategory(preselect);
    }
  }, []);

  // Derive unique categories from data
  const categories = React.useMemo(() => {
    const cats = data
      .map(p => p.category)
      .filter((c): c is string => Boolean(c));
    return Array.from(new Set(cats));
  }, [data]);

  // Subscribe to store for advanced filtering
  const setAllProducts = useProductStore((state) => state.setAllProducts);
  const setSelectedProduct = useProductStore((state) => state.setSelectedProduct);
  const searchQuery = useProductStore((state) => state.searchQuery);
  const selectedCategories = useProductStore((state) => state.selectedCategories);
  const priceRange = useProductStore((state) => state.priceRange);
  const allProducts = useProductStore((state) => state.allProducts);

  // Favorites
  const favorites = useCartStore((state) => state.favorites);

  // Always populate product store so ProductDetails can find products by ID
  useEffect(() => {
    if (data.length > 0) {
      setAllProducts(data);
    }
  }, [data, setAllProducts]);

  // Filter products based on category chip + search/store filters
  const displayData = React.useMemo(() => {
    if (showFavoritesOnly) {
      return data.filter(product => favorites.includes(product.id));
    }

    let base = enableFiltering ? [...allProducts] : [...data];

    // Category chip filter (local)
    if (activeCategory) {
      base = base.filter(p => p.category === activeCategory);
    }

    if (enableFiltering) {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        base = base.filter((product) =>
          product.name.toLowerCase().includes(query) ||
          product.description?.toLowerCase().includes(query) ||
          product.category?.toLowerCase().includes(query)
        );
      }

      // Store-based category filter (from filter panel)
      if (selectedCategories.length > 0) {
        base = base.filter((product) => {
          if (!product.category) return false;
          return selectedCategories.some(
            (catId) => catId.toLowerCase() === product.category?.toLowerCase()
          );
        });
      }

      // Price filter
      base = base.filter(
        (product) => product.price >= priceRange[0] && product.price <= priceRange[1]
      );
    }

    return pageLimit ? base.slice(0, pageLimit) : base;
  }, [enableFiltering, showFavoritesOnly, allProducts, searchQuery, selectedCategories, priceRange, data, pageLimit, favorites, activeCategory]);

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

  if (displayData.length === 0 && !activeCategory) {
    return (
      <EmptyState
        icon={emptyIcon('search')}
        title={emptyMessage}
        className={cn(className)}
      />
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

      {/* Search bar */}
      {enableFiltering && (
        <SearchBar placeholder="Search products..." />
      )}

      {/* Advanced filter panel (categories + price range) */}
      {enableFiltering && categories.length > 0 && (
        <FilterPanel
          categories={categories.map((c) => ({ id: c, label: c }))}
          priceRange={{
            min: 0,
            max: Math.ceil(Math.max(...data.map((p) => p.price), 100) / 10) * 10,
          }}
        />
      )}

      {/* Category chip filter bar */}
      {showCategoryFilter && categories.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none -mx-1 px-1">
          <button
            onClick={() => setActiveCategory(null)}
            className={cn(
              "flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium border transition-colors",
              activeCategory === null
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background text-muted-foreground border-border hover:border-primary hover:text-primary"
            )}
          >
            All
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
              className={cn(
                "flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium border transition-colors",
                activeCategory === cat
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background text-muted-foreground border-border hover:border-primary hover:text-primary"
              )}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {displayData.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-muted-foreground">No products in this category</p>
        </div>
      ) : (
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
              stockQuantity={product.stockQuantity}
              onClick={() => {
                setSelectedProduct(product);

                const navigateString = typeof onProductClick === 'string' ? onProductClick : props?.onProductClick;
                const customHandler = typeof onProductClick === 'function' ? onProductClick : undefined;

                if (typeof navigateString === 'string' && navigateString.startsWith('navigate:')) {
                  const pageId = navigateString.split(':')[1];
                  window.location.hash = `${pageId}?productId=${product.id}`;
                  onNavigate?.(pageId);
                } else if (customHandler) {
                  customHandler(product.id);
                } else {
                  window.location.hash = `product-details?productId=${product.id}`;
                  onNavigate?.('product-details');
                }
              }}
              onAddToCart={() => onAddToCart?.(product.id)}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      )}
    </div>
  );
}
