import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import { SearchBar } from '@/components/ecommerce/search-bar';

describe('SearchBar', () => {
  it('renders correctly', () => {
    render(<SearchBar placeholder="Search..." />);
    expect(screen.getByPlaceholderText('Search...')).toBeInTheDocument();
  });

  it('calls onSearch when typing', () => {
    const onSearch = jest.fn();
    render(<SearchBar onSearch={onSearch} />);
    
    fireEvent.change(screen.getByPlaceholderText('Search products...'), {
      target: { value: 'test' },
    });
    
    expect(onSearch).toHaveBeenCalledWith('test');
  });

  it('shows clear button when has value', () => {
    render(<SearchBar defaultValue="test" />);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('calls onClear when clear button clicked', () => {
    const onClear = jest.fn();
    const onSearch = jest.fn();
    render(<SearchBar defaultValue="test" onClear={onClear} onSearch={onSearch} />);
    
    fireEvent.click(screen.getByRole('button'));
    
    expect(onClear).toHaveBeenCalled();
    expect(onSearch).toHaveBeenCalledWith('');
  });
});
