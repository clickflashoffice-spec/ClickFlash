import { describe, it, expect, jest } from '@jest/globals';
import { renderHook, act } from '@testing-library/react';
import { useState, useCallback } from 'react';

describe('React Hooks', () => {
  describe('useState', () => {
    it('should initialize state correctly', () => {
      const { result } = renderHook(() => {
        const [count, setCount] = useState(0);
        return { count, setCount };
      });

      expect(result.current.count).toBe(0);
    });

    it('should update state correctly', () => {
      const { result } = renderHook(() => {
        const [count, setCount] = useState(0);
        return { count, setCount };
      });

      act(() => {
        result.current.setCount(5);
      });

      expect(result.current.count).toBe(5);
    });

    it('should preserve state across re-renders', () => {
      const { result, rerender } = renderHook(() => {
        const [count, setCount] = useState(0);
        return { count, setCount };
      });

      act(() => {
        result.current.setCount(10);
      });

      rerender();

      expect(result.current.count).toBe(10);
    });
  });

  describe('useCallback', () => {
    it('should maintain referential equality', () => {
      const { result } = renderHook(() => {
        const [count, setCount] = useState(0);
        
        const increment = useCallback(() => {
          setCount(prev => prev + 1);
        }, []);

        return { count, increment };
      });

      const firstCallback = result.current.increment;

      act(() => {
        result.current.increment();
      });

      const { result: newResult, rerender } = renderHook(() => {
        const [count, setCount] = useState(1);
        
        const increment = useCallback(() => {
          setCount(prev => prev + 1);
        }, []);

        return { count, increment };
      });

      expect(result.current.increment).toBe(firstCallback);
    });
  });
});

describe('Component Logic', () => {
  describe('Pagination', () => {
    it('should calculate correct page numbers', () => {
      const totalItems = 100;
      const itemsPerPage = 20;
      const totalPages = Math.ceil(totalItems / itemsPerPage);

      expect(totalPages).toBe(5);
    });

    it('should calculate correct offset', () => {
      const page = 3;
      const itemsPerPage = 20;
      const offset = (page - 1) * itemsPerPage;

      expect(offset).toBe(40);
    });
  });

  describe('Sorting', () => {
    it('should sort by ascending order', () => {
      const items = [{ id: 3 }, { id: 1 }, { id: 2 }];
      
      const sorted = [...items].sort((a, b) => a.id - b.id);
      
      expect(sorted[0].id).toBe(1);
      expect(sorted[2].id).toBe(3);
    });

    it('should sort by descending order', () => {
      const items = [{ id: 3 }, { id: 1 }, { id: 2 }];
      
      const sorted = [...items].sort((a, b) => b.id - a.id);
      
      expect(sorted[0].id).toBe(3);
      expect(sorted[2].id).toBe(1);
    });
  });

  describe('Filtering', () => {
    it('should filter items correctly', () => {
      const items = [
        { id: 1, category: 'print' },
        { id: 2, category: 'digital' },
        { id: 3, category: 'print' },
      ];

      const filtered = items.filter(item => item.category === 'print');
      
      expect(filtered).toHaveLength(2);
      expect(filtered.every(item => item.category === 'print')).toBe(true);
    });

    it('should return empty array when no matches', () => {
      const items = [
        { id: 1, category: 'print' },
      ];

      const filtered = items.filter(item => item.category === 'nonexistent');
      
      expect(filtered).toHaveLength(0);
    });
  });
});

describe('Utility Functions', () => {
  describe('String manipulation', () => {
    it('should generate slug correctly', () => {
      const slugify = (text: string) =>
        text.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

      expect(slugify('Miami Resort')).toBe('miami-resort');
      expect(slugify('Test_Album-123')).toBe('testalbum-123');
    });

    it('should truncate string correctly', () => {
      const truncate = (str: string, maxLength: number) =>
        str.length > maxLength ? str.slice(0, maxLength) + '...' : str;

      expect(truncate('Hello World', 5)).toBe('Hello...');
      expect(truncate('Hi', 10)).toBe('Hi');
    });
  });

  describe('Number formatting', () => {
    it('should format currency correctly', () => {
      const formatCurrency = (amount: number) => 
        `$${amount.toFixed(2)}`;

      expect(formatCurrency(99.9)).toBe('$99.90');
      expect(formatCurrency(100)).toBe('$100.00');
    });

    it('should format large numbers with commas', () => {
      const formatNumber = (num: number) =>
        num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');

      expect(formatNumber(1000)).toBe('1,000');
      expect(formatNumber(1000000)).toBe('1,000,000');
    });
  });

  describe('Date formatting', () => {
    it('should format ISO date correctly', () => {
      const formatDate = (isoString: string) => {
        const date = new Date(isoString);
        return date.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        });
      };

      const result = formatDate('2024-01-15T00:00:00Z');
      expect(result).toContain('Jan');
      expect(result).toContain('15');
      expect(result).toContain('2024');
    });
  });
});
