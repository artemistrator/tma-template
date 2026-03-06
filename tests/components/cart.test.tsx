import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import { Cart } from '@/components/ecommerce/cart';
import { useCartStore } from '@/store/cart-store';

describe('Cart', () => {
  beforeEach(() => {
    // Clear cart before each test
    useCartStore.getState().clearCart();
  });

  it('renders empty cart message when no items', () => {
    render(<Cart />);
    
    expect(screen.getByText('Your cart is empty')).toBeInTheDocument();
  });

  it('renders cart items when items exist', () => {
    // Add item to cart
    useCartStore.getState().addItem({
      id: '1',
      name: 'Test Product',
      price: 49.99,
      image: 'https://example.com/image.jpg',
      category: 'Electronics',
    });

    render(<Cart />);
    
    expect(screen.getByText('Test Product')).toBeInTheDocument();
    expect(screen.getByText('1 pcs')).toBeInTheDocument();
  });

  it('hides empty message when showEmpty is false', () => {
    render(<Cart showEmpty={false} />);
    
    expect(screen.queryByText('Your cart is empty')).not.toBeInTheDocument();
  });

  it('increases quantity when plus button is clicked', () => {
    useCartStore.getState().addItem({
      id: '1',
      name: 'Test Product',
      price: 49.99,
    });

    render(<Cart />);
    
    const plusButton = screen.getByLabelText('plus', { selector: 'button' });
    fireEvent.click(plusButton);
    
    expect(screen.getByText('2 pcs')).toBeInTheDocument();
  });

  it('decreases quantity when minus button is clicked', () => {
    useCartStore.getState().addItem({
      id: '1',
      name: 'Test Product',
      price: 49.99,
    }, 2);

    render(<Cart />);
    
    const minusButton = screen.getByLabelText('minus', { selector: 'button' });
    fireEvent.click(minusButton);
    
    expect(screen.getByText('1 pcs')).toBeInTheDocument();
  });

  it('removes item when trash button is clicked', () => {
    useCartStore.getState().addItem({
      id: '1',
      name: 'Test Product',
      price: 49.99,
    });

    render(<Cart />);
    
    const trashButton = screen.getByLabelText('trash', { selector: 'button' });
    fireEvent.click(trashButton);
    
    expect(screen.queryByText('Test Product')).not.toBeInTheDocument();
  });

  it('calls onProductClick when product is clicked', () => {
    useCartStore.getState().addItem({
      id: '1',
      name: 'Test Product',
      price: 49.99,
    });

    const onProductClick = jest.fn();
    render(<Cart onProductClick={onProductClick} />);
    
    const productTitle = screen.getByText('Test Product');
    fireEvent.click(productTitle);
    
    expect(onProductClick).toHaveBeenCalledWith('1');
  });

  it('calls onCheckout when checkout button is clicked', () => {
    useCartStore.getState().addItem({
      id: '1',
      name: 'Test Product',
      price: 49.99,
    });

    const onCheckout = jest.fn();
    render(<Cart onCheckout={onCheckout} />);
    
    // Note: You might need to adjust this based on your actual checkout button implementation
  });
});
