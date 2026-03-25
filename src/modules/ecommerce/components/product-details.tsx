'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { useCartStore } from '@/store/cart-store';
import { useTelegramContext } from '@/lib/telegram/telegram-provider';
import { useProductStore } from '@/store/product-store';
import { ReviewSummary } from '@/modules/shared/components/ReviewSummary';
import { ReviewsList } from '@/modules/shared/components/ReviewsList';
import { useAppConfig } from '@/context/app-config-context';

interface ProductVariant {
  id: string;
  name: string;
  type: string;
  price_modifier: number;
  stock_quantity: number;
}

interface ProductDetailsProps {
  productId?: string;
  product?: {
    id: string;
    name: string;
    price: number;
    image?: string;
    description?: string;
    category?: string;
  };
  onBack?: () => void;
  onAddToCart?: () => void;
  onNavigate?: (pageId: string) => void;
}

/**
 * ProductDetails - Detailed product view with variant selection
 */
export function ProductDetails({ productId: propProductId, product: productProp, onBack, onAddToCart, onNavigate }: Omit<ProductDetailsProps, 'productId'> & { productId?: string }) {
  const { hapticFeedback } = useTelegramContext();
  const addItem = useCartStore((state) => state.addItem);
  const allProducts = useProductStore((state) => state.allProducts);
  const selectedProduct = useProductStore((state) => state.selectedProduct);
  const { config } = useAppConfig();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const reviewsCfg = (config as any)?.features?.reviews;
  const reviewsEnabled = !!reviewsCfg?.enabled && !!reviewsCfg?.productReviews;

  const getProductIdFromHash = () => {
    if (typeof window === 'undefined') return undefined;
    const hash = window.location.hash;
    const match = hash.match(/product-details\?productId=([^&]+)/);
    return match ? match[1] : undefined;
  };

  const [productId, setProductId] = useState<string | undefined>(
    () => propProductId || getProductIdFromHash()
  );

  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [variantsLoading, setVariantsLoading] = useState(false);

  useEffect(() => {
    const handleHashChange = () => {
      const newProductId = getProductIdFromHash();
      if (newProductId) setProductId(newProductId);
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  useEffect(() => {
    if (!productId) return;
    setVariants([]);
    setSelectedVariant(null);
    setVariantsLoading(true);
    fetch(`/api/products/${productId}/variants`)
      .then(r => r.json())
      .then(data => {
        if (data.success && data.variants?.length > 0) {
          setVariants(data.variants);
        }
      })
      .catch(() => {})
      .finally(() => setVariantsLoading(false));
  }, [productId]);

  const productFromStore = selectedProduct?.id === productId
    ? selectedProduct
    : allProducts.find(p => p.id === productId);

  // Fallback: if product not in store (e.g. hard refresh), try to find it in config data
  const productFromConfig = React.useMemo(() => {
    if (productFromStore || !productId || !config) return null;
    // Products are embedded in page components' props.data
    for (const page of (config as { pages?: Array<{ components?: Array<{ props?: Record<string, unknown> }> }> }).pages || []) {
      for (const comp of page.components || []) {
        const data = comp.props?.data as Array<{ id: string; name: string; price: number; image?: string; description?: string; category?: string }> | undefined;
        if (Array.isArray(data)) {
          const found = data.find(item => String(item.id) === String(productId));
          if (found) return found;
        }
      }
    }
    return null;
  }, [productFromStore, productId, config]);

  const product = productProp || productFromStore || productFromConfig;

  if (!product) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Product not found</p>
      </div>
    );
  }

  const handleBack = () => {
    hapticFeedback.impact('light');
    if (onBack) {
      onBack();
    } else {
      onNavigate?.('catalog');
      window.location.hash = 'catalog';
    }
  };

  const effectivePrice = product.price + (selectedVariant?.price_modifier ?? 0);
  const isOutOfStock = selectedVariant ? selectedVariant.stock_quantity === 0 : false;

  const handleAddToCart = () => {
    if (isOutOfStock) return;
    hapticFeedback.impact('light');
    addItem({
      ...product,
      price: effectivePrice,
      variantId: selectedVariant?.id,
      variantName: selectedVariant
        ? `${selectedVariant.type}: ${selectedVariant.name}`
        : undefined,
    }, 1);
    onAddToCart?.();
  };

  const formattedPrice = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(effectivePrice);

  const variantGroups = variants.reduce<Record<string, ProductVariant[]>>((acc, v) => {
    if (!acc[v.type]) acc[v.type] = [];
    acc[v.type].push(v);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="container mx-auto px-4 py-3 flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={handleBack}>
            ← Back
          </Button>
          <h1 className="text-xl font-semibold">Product Details</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <div className="max-w-2xl mx-auto space-y-6">
          {product.image && (
            <div className="bg-muted rounded-lg relative overflow-hidden" style={{ height: 300 }}>
              <Image
                src={product.image}
                alt={product.name}
                fill
                unoptimized
                className="object-cover"
              />
            </div>
          )}

          <Card>
            <CardHeader>
              {product.category && (
                <Badge variant="secondary" className="w-fit mb-2">
                  {product.category}
                </Badge>
              )}
              <CardTitle className="text-2xl">{product.name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {product.description && (
                <p className="text-muted-foreground">{product.description}</p>
              )}

              {/* Variant selectors */}
              {!variantsLoading && Object.keys(variantGroups).length > 0 && (
                <div className="space-y-3">
                  {Object.entries(variantGroups).map(([type, groupVariants]) => (
                    <div key={type}>
                      <p className="text-sm font-medium capitalize mb-2">{type}</p>
                      <div className="flex flex-wrap gap-2">
                        {groupVariants.map((v) => {
                          const outOfStock = v.stock_quantity === 0;
                          return (
                            <button
                              key={v.id}
                              onClick={() => setSelectedVariant(
                                selectedVariant?.id === v.id ? null : v
                              )}
                              disabled={outOfStock}
                              className={cn(
                                "px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors",
                                selectedVariant?.id === v.id
                                  ? "bg-primary text-primary-foreground border-primary"
                                  : outOfStock
                                    ? "opacity-40 cursor-not-allowed border-border"
                                    : "border-border hover:border-primary"
                              )}
                            >
                              {v.name}
                              {v.price_modifier !== 0 && (
                                <span className="ml-1 text-xs opacity-75">
                                  {v.price_modifier > 0
                                    ? `+$${v.price_modifier}`
                                    : `-$${Math.abs(v.price_modifier)}`}
                                </span>
                              )}
                              {outOfStock && (
                                <span className="ml-1 text-xs">(sold out)</span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-between pt-4 border-t">
                <span className="text-3xl font-bold">{formattedPrice}</span>
                <Button
                  size="lg"
                  onClick={handleAddToCart}
                  className="flex-1 ml-4"
                  disabled={isOutOfStock}
                >
                  {isOutOfStock ? 'Out of Stock' : 'Add to Cart'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Product Reviews */}
          {reviewsEnabled && productId && (
            <div className="space-y-2">
              <ReviewSummary props={{ targetType: 'product', targetId: productId, showDistribution: true }} />
              <ReviewsList props={{ targetType: 'product', targetId: productId, title: 'Reviews', showForm: true, compact: true, limit: 5 }} />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
