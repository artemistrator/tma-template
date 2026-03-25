import { create } from 'zustand';

export interface Product {
  id: string;
  name: string;
  price: number;
  image?: string;
  description?: string;
  category?: string;
  badge?: string;
}

interface ProductState {
  // Search
  searchQuery: string;

  // Filters
  selectedCategories: string[];
  priceRange: [number, number];

  // All products (for filtering and lookup)
  allProducts: Product[];

  // Currently selected product (set before navigating to product-details)
  selectedProduct: Product | null;

  // Actions
  setSearchQuery: (query: string) => void;
  clearSearch: () => void;

  toggleCategory: (categoryId: string) => void;
  clearCategories: () => void;

  setPriceRange: (range: [number, number]) => void;
  resetPriceRange: (min: number, max: number) => void;
  clearAllFilters: () => void;

  setAllProducts: (products: Product[]) => void;
  setSelectedProduct: (product: Product | null) => void;

  // Get filtered products
  getFilteredProducts: () => Product[];
}

export const useProductStore = create<ProductState>((set, get) => ({
  searchQuery: '',
  selectedCategories: [],
  priceRange: [0, 1000],
  allProducts: [],
  selectedProduct: null,

  setSearchQuery: (query: string) => {
    set({ searchQuery: query });
  },

  clearSearch: () => {
    set({ searchQuery: '' });
  },

  toggleCategory: (categoryId: string) => {
    set((state) => ({
      selectedCategories: state.selectedCategories.includes(categoryId)
        ? state.selectedCategories.filter((id) => id !== categoryId)
        : [...state.selectedCategories, categoryId],
    }));
  },

  clearCategories: () => {
    set({ selectedCategories: [] });
  },

  setPriceRange: (range: [number, number]) => {
    set({ priceRange: range });
  },

  resetPriceRange: (min: number, max: number) => {
    set({ priceRange: [min, max] });
  },

  clearAllFilters: () => {
    set({
      searchQuery: '',
      selectedCategories: [],
      priceRange: [0, 1000],
    });
  },

  setAllProducts: (products: Product[]) => {
    set({ allProducts: products });
  },

  setSelectedProduct: (product: Product | null) => {
    set({ selectedProduct: product });
  },

  getFilteredProducts: () => {
    const { searchQuery, selectedCategories, priceRange, allProducts } = get();
    
    return allProducts.filter((product) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch = 
          product.name.toLowerCase().includes(query) ||
          product.description?.toLowerCase().includes(query) ||
          product.category?.toLowerCase().includes(query);
        
        if (!matchesSearch) return false;
      }
      
      // Category filter
      if (selectedCategories.length > 0 && product.category) {
        const categoryKey = product.category.toLowerCase();
        const matchesCategory = selectedCategories.some((catId) => {
          // Map category IDs to actual category names
          const categoryMap: Record<string, string[]> = {
            'audio': ['audio'],
            'wearables': ['wearables'],
            'accessories': ['accessories'],
            'peripherals': ['peripherals'],
          };
          return categoryMap[catId]?.includes(categoryKey);
        });
        
        if (!matchesCategory) return false;
      }
      
      // Price filter
      const matchesPrice = product.price >= priceRange[0] && product.price <= priceRange[1];
      if (!matchesPrice) return false;
      
      return true;
    });
  },
}));
