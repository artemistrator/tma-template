import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import { PromoSlider } from '@/components/ecommerce/promo-slider';

describe('PromoSlider', () => {
  const mockSlides = [
    {
      id: '1',
      title: 'Summer Sale',
      description: 'Up to 50% off',
      backgroundColor: '#FF6B6B',
    },
    {
      id: '2',
      title: 'New Arrivals',
      description: 'Check out the latest tech',
      backgroundColor: '#4ECDC4',
    },
    {
      id: '3',
      title: 'Free Shipping',
      description: 'On orders over $100',
      backgroundColor: '#45B7D1',
    },
  ];

  it('renders all slides', () => {
    render(<PromoSlider slides={mockSlides} autoPlay={false} />);
    
    expect(screen.getByText('Summer Sale')).toBeInTheDocument();
  });

  it('displays first slide by default', () => {
    render(<PromoSlider slides={mockSlides} autoPlay={false} />);
    
    expect(screen.getByText('Summer Sale')).toBeInTheDocument();
    expect(screen.getByText('Up to 50% off')).toBeInTheDocument();
  });

  it('changes slide when pagination dot is clicked', () => {
    render(<PromoSlider slides={mockSlides} autoPlay={false} />);
    
    const secondDot = screen.getAllByRole('button')[1];
    fireEvent.click(secondDot);
    
    expect(screen.getByText('New Arrivals')).toBeInTheDocument();
  });

  it('renders correct number of pagination dots', () => {
    render(<PromoSlider slides={mockSlides} autoPlay={false} />);
    
    const dots = screen.getAllByRole('button');
    expect(dots).toHaveLength(3);
  });

  it('hides pagination for single slide', () => {
    const singleSlide = [mockSlides[0]];
    render(<PromoSlider slides={singleSlide} autoPlay={false} />);
    
    const dots = screen.queryAllByRole('button');
    expect(dots).toHaveLength(0);
  });

  it('renders slide with image when provided', () => {
    const slideWithImage = [
      {
        id: '1',
        title: 'Featured',
        image: 'https://example.com/image.jpg',
      },
    ];

    render(<PromoSlider slides={slideWithImage} autoPlay={false} />);
    
    const slideElement = screen.getByText('Featured').parentElement;
    expect(slideElement).toHaveStyle('background-image: url(https://example.com/image.jpg)');
  });

  it('renders CTA button when ctaText and action are provided', () => {
    const slideWithCta = [
      {
        id: '1',
        title: 'Sale',
        ctaText: 'Shop Now',
        action: () => {},
        backgroundColor: '#FF6B6B',
      },
    ];

    render(<PromoSlider slides={slideWithCta} autoPlay={false} />);
    
    expect(screen.getByText('Shop Now')).toBeInTheDocument();
  });

  it('applies custom height when specified as number', () => {
    render(<PromoSlider slides={mockSlides} autoPlay={false} height={200} />);
    
    const container = screen.getByText('Summer Sale').closest('.overflow-hidden');
    expect(container).toHaveStyle('height: 200px');
  });

  it('applies custom height when specified as size string', () => {
    const { rerender } = render(<PromoSlider slides={mockSlides} autoPlay={false} height="sm" />);
    
    let container = screen.getByText('Summer Sale').closest('.overflow-hidden');
    expect(container).toHaveStyle('height: 120px');

    rerender(<PromoSlider slides={mockSlides} autoPlay={false} height="lg" />);
    container = screen.getByText('Summer Sale').closest('.overflow-hidden');
    expect(container).toHaveStyle('height: 240px');
  });

  it('does not auto-play when autoPlay is false', () => {
    jest.useFakeTimers();
    
    render(<PromoSlider slides={mockSlides} autoPlay={false} />);
    
    jest.advanceTimersByTime(6000);
    
    expect(screen.getByText('Summer Sale')).toBeInTheDocument();
    
    jest.useRealTimers();
  });
});
