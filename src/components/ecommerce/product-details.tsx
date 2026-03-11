'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';
import { useCartStore } from '@/store/cart-store';
import { useTelegramContext } from '@/lib/telegram/telegram-provider';
import { useProductStore } from '@/store/product-store';

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
 * ProductDetails - Detailed product view
 */
export function ProductDetails({ productId: propProductId, product: productProp, onBack, onAddToCart, onNavigate }: Omit<ProductDetailsProps, 'productId'> & { productId?: string }) {
 const { hapticFeedback } = useTelegramContext();
 const addItem = useCartStore((state) => state.addItem);
 const allProducts = useProductStore((state) => state.allProducts);
 const [productId, setProductId] = useState<string | undefined>(propProductId);

 // Extract productId from URL hash if not provided as prop
 useEffect(() => {
  const getProductIdFromHash = () => {
    const hash = window.location.hash;
    const match = hash.match(/product-details\?productId=([^&]+)/);
    if (match) {
      return match[1];
    }
    return undefined;
  };

  // Set initial value
  const hashProductId = getProductIdFromHash();
  if (hashProductId) {
    setProductId(hashProductId);
  }

  // Listen for hash changes
  const handleHashChange = () => {
    const newProductId = getProductIdFromHash();
    if (newProductId) {
      setProductId(newProductId);
    }
  };

  window.addEventListener('hashchange', handleHashChange);
  return () => window.removeEventListener('hashchange', handleHashChange);
 }, []);

 // Find product from props, URL, or store
 const productFromStore = allProducts.find(p => p.id === productId);
 const product = productProp || productFromStore || {
  id: '1',
  name: 'Wireless Earbuds Pro',
  price: 149.99,
  image: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=400',
  description: 'Premium wireless earbuds with active noise cancellation and long battery life.',
  category: 'Audio'
 };

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
    } else if (onNavigate) {
      onNavigate('catalog');
      window.location.hash = 'catalog';
    } else {
      window.location.hash = 'catalog';
    }
  };

  const handleAddToCart = () => {
    hapticFeedback.impact('light');
    addItem(product, 1);
    onAddToCart?.();
  };

  const formattedPrice = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(product.price);

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
          {/* Product Image */}
          {product.image && (
            <div className="aspect-square bg-muted rounded-lg relative overflow-hidden">
              <Image
                src={product.image}
                alt={product.name}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 50vw"
              />
            </div>
          )}

          {/* Product Info */}
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
              
              <div className="flex items-center justify-between pt-4 border-t">
                <span className="text-3xl font-bold">{formattedPrice}</span>
                <Button 
                  size="lg" 
                  onClick={handleAddToCart}
                  className="flex-1 ml-4"
                >
                  Add to Cart
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
