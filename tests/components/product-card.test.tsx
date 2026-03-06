import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import { ProductCard } from '@/components/ecommerce/product-card';

// Mock Telegram
global.Telegram = {
  WebApp: {
    initData: '',
    initDataUnsafe: {},
    version: '7.0',
    platform: 'web',
    colorScheme: 'light',
    themeParams: {},
    expand: jest.fn(),
    close: jest.fn(),
    showMainButton: jest.fn(),
    hideMainButton: jest.fn(),
    showPopup: jest.fn(),
    showAlert: jest.fn(),
    showConfirm: jest.fn(),
    HapticFeedback: {
      impactOccurred: jest.fn(),
      notificationOccurred: jest.fn(),
      selectionChanged: jest.fn(),
    },
    onEvent: jest.fn(),
    offEvent: jest.fn(),
    ready: jest.fn(),
    MainButton: {
      text: '',
      color: '',
      text_color: '',
      isVisible: false,
      isActive: false,
      show: jest.fn(),
      hide: jest.fn(),
      enable: jest.fn(),
      disable: jest.fn(),
      onClick: jest.fn(),
      offClick: jest.fn(),
      setText: jest.fn(),
      setParams: jest.fn(),
    },
    BackButton: {
      isVisible: false,
      show: jest.fn(),
      hide: jest.fn(),
      onClick: jest.fn(),
      offClick: jest.fn(),
    },
    WebView: {
      openLink: jest.fn(),
    },
  },
};

describe('ProductCard', () => {
  const defaultProps = {
    productId: '1',
    name: 'Test Product',
    price: 99.99,
    image: 'https://example.com/image.jpg',
    description: 'Test description',
    category: 'Electronics',
  };

  it('renders product information correctly', () => {
    render(<ProductCard {...defaultProps} />);
    
    expect(screen.getByText('Test Product')).toBeInTheDocument();
    expect(screen.getByText('$99.99')).toBeInTheDocument();
    expect(screen.getByText('Electronics')).toBeInTheDocument();
  });

  it('displays badge when provided', () => {
    render(<ProductCard {...defaultProps} badge="Sale" />);
    
    expect(screen.getByText('Sale')).toBeInTheDocument();
  });

  it('calls onAddToCart when add button is clicked', () => {
    const onAddToCart = jest.fn();
    render(<ProductCard {...defaultProps} onAddToCart={onAddToCart} />);
    
    const addButton = screen.getByText('Add');
    fireEvent.click(addButton);
    
    expect(onAddToCart).toHaveBeenCalledTimes(1);
  });

  it('calls onClick when card is clicked', () => {
    const onClick = jest.fn();
    render(<ProductCard {...defaultProps} onClick={onClick} />);
    
    const card = screen.getByText('Test Product').closest('.cursor-pointer');
    if (card) {
      fireEvent.click(card);
    }
    
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('renders without image when image is not provided', () => {
    render(<ProductCard {...defaultProps} image={undefined} />);
    
    expect(screen.getByText('Test Product')).toBeInTheDocument();
  });

  it('renders without description when description is not provided', () => {
    render(<ProductCard {...defaultProps} description={undefined} />);
    
    expect(screen.getByText('Test Product')).toBeInTheDocument();
  });
});
