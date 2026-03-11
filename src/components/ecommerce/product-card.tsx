'use client';

import React from 'react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useCartStore } from '@/store/cart-store';
import { useTelegramContext } from '@/lib/telegram/telegram-provider';
import Image from 'next/image';
import { Heart } from 'lucide-react';

export interface ProductCardProps {
  id?: string;
  productId: string;
  name: string;
  price: number;
  image?: string;
  description?: string;
  category?: string;
  badge?: string;
  onAddToCart?: () => void;
  onClick?: () => void;
  className?: string;
  props?: {
    productId?: string;
    name?: string;
    price?: number;
    image?: string;
    description?: string;
    category?: string;
    badge?: string;
    onClick?: string | (() => void);
  };
  onNavigate?: (pageId: string) => void;
}

/**
 * ProductCard - E-commerce product card component
 * Displays product info with add to cart functionality
 */
export function ProductCard({
  productId: propProductId,
  name: propName,
  price: propPrice,
  image: propImage,
  description: propDescription,
  category: propCategory,
  badge: propBadge,
  onAddToCart,
  onClick,
  className,
  props,
  onNavigate,
}: ProductCardProps) {
  // Support both direct props and props object
  const productId = props?.productId || propProductId;
  const name = props?.name || propName;
  const price = props?.price || propPrice;
  const image = props?.image || propImage;
  const description = props?.description || propDescription;
  const category = props?.category || propCategory;
  const badge = props?.badge || propBadge;

  const addItem = useCartStore((state) => state.addItem);
  const { hapticFeedback } = useTelegramContext();

  // Favorites
  const addToFavorites = useCartStore((state) => state.addToFavorites);
  const removeFromFavorites = useCartStore((state) => state.removeFromFavorites);
  const isFavorite = useCartStore((state) => state.isFavorite);

  const favorite = isFavorite(productId);

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation();
    hapticFeedback.impact('light');

    addItem({
      id: productId,
      name,
      price,
      image,
      description,
      category,
    }, 1);

    onAddToCart?.();
  };

  const handleClick = () => {
    hapticFeedback.selection();
    // Check if onClick is a navigate string from props
    const navigateString = typeof onClick === 'string' ? onClick : props?.onClick;
    const customHandler = typeof onClick === 'function' ? onClick : undefined;
    
    if (typeof navigateString === 'string' && navigateString.startsWith('navigate:')) {
      const pageId = navigateString.split(':')[1];
      window.location.hash = `${pageId}?productId=${productId}`;
      onNavigate?.(pageId);
    } else if (customHandler) {
      customHandler();
    } else {
      // Default: navigate to product-details
      window.location.hash = `product-details?productId=${productId}`;
      onNavigate?.('product-details');
    }
  };

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    hapticFeedback.impact('light');
    
    if (favorite) {
     removeFromFavorites(productId);
    } else {
      addToFavorites(productId);
    }
  };

  const formattedPrice = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(price);

  return (
    <Card
      className={cn(
        "overflow-hidden cursor-pointer transition-all hover:shadow-lg active:scale-[0.98]",
        className
      )}
      onClick={handleClick}
    >
      {image && (
        <div className="aspect-square bg-muted relative overflow-hidden">
          <Image
            src={image}
            alt={name}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
          />
          {badge && (
            <Badge className="absolute top-2 left-2" variant="secondary">
              {badge}
            </Badge>
          )}
          <button
            onClick={handleFavoriteClick}
            className="absolute top-2 right-2 p-2 rounded-full bg-background/80 hover:bg-background transition-all"
          >
            <Heart
              className={cn(
                "w-5 h-5",
                favorite ? "fill-red-500 text-red-500" : "text-muted-foreground"
              )}
            />
          </button>
        </div>
      )}
      
      <CardContent className="p-4">
        {category && (
          <p className="text-xs text-muted-foreground mb-1">{category}</p>
        )}
        <h3 className="font-semibold text-base line-clamp-2">{name}</h3>
        {description && (
          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
            {description}
          </p>
        )}
      </CardContent>
      
      <CardFooter className="p-4 pt-0 flex items-center justify-between gap-2">
        <span className="text-lg font-bold">{formattedPrice}</span>
        <Button
          size="sm"
          onClick={handleAddToCart}
          className="flex-1"
        >
          Add
        </Button>
      </CardFooter>
    </Card>
  );
}
