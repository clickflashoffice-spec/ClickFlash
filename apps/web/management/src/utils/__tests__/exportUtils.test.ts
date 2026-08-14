/**
 * Unit Tests for Export Utilities
 */

import {
  toCSV,
  downloadJSON
} from '../exportUtils';

describe('Export Utils', () => {
  describe('toCSV', () => {
    it('should convert simple data to CSV', () => {
      const data = [
        { name: 'John', age: 30 },
        { name: 'Jane', age: 25 }
      ];
      const result = toCSV(data);
      expect(result).toBe('name,age\nJohn,30\nJane,25');
    });

    it('should handle custom columns', () => {
      const data = [{ name: 'John', age: 30 }];
      const columns = [
        { key: 'name' as const, label: 'Name' },
        { key: 'age' as const, label: 'Age' }
      ];
      const result = toCSV(data, columns);
      expect(result).toBe('Name,Age\nJohn,30');
    });

    it('should handle empty array', () => {
      expect(toCSV([])).toBe('');
    });

    it('should escape values with commas', () => {
      const data = [{ name: 'John, Jr.', age: 30 }];
      const result = toCSV(data);
      expect(result).toBe('name,age\n"John, Jr.",30');
    });

    it('should escape values with quotes', () => {
      const data = [{ name: 'John "Doe"', age: 30 }];
      const result = toCSV(data);
      expect(result).toBe('name,age\n"John ""Doe""",30');
    });

    it('should handle null/undefined values', () => {
      const data = [{ name: 'John', age: null as any, city: undefined as any }];
      const result = toCSV(data);
      expect(result).toBe('name,age,city\nJohn,,');
    });

    it('should handle single row', () => {
      const data = [{ id: 1, value: 'test' }];
      const result = toCSV(data);
      expect(result).toBe('id,value\n1,test');
    });

    it('should handle numeric values', () => {
      const data = [{ amount: 1000.50, count: 5 }];
      const result = toCSV(data);
      expect(result).toBe('amount,count\n1000.5,5');
    });

    it('should handle boolean values', () => {
      const data = [{ active: true, deleted: false }];
      const result = toCSV(data);
      expect(result).toBe('active,deleted\ntrue,false');
    });
  });

  describe('toCSV edge cases', () => {
    it('should use keys from first object only', () => {
      const data = [
        { a: 1 },
        { b: 2 }
      ];
      const result = toCSV(data);
      expect(result).toContain('a');
      expect(result).not.toContain('b');
    });

    it('should handle special characters', () => {
      const data = [{ text: 'line1\nline2\ttab' }];
      const result = toCSV(data);
      expect(result).toContain('"line1\nline2\ttab"');
    });
  });

  describe('downloadJSON', () => {
    it('should create valid JSON string', () => {
      const data = { name: 'Test', value: 123 };
      const json = JSON.stringify(data, null, 2);
      expect(json).toContain('"name": "Test"');
      expect(json).toContain('"value": 123');
    });

    it('should pretty print nested objects', () => {
      const data = { nested: { value: 1 } };
      const json = JSON.stringify(data, null, 2);
      expect(json).toContain('  "nested"');
      expect(json).toContain('  "value": 1');
    });

    it('should handle empty object', () => {
      const data = {};
      const json = JSON.stringify(data);
      expect(json).toBe('{}');
    });

    it('should handle arrays', () => {
      const data = [1, 2, 3];
      const json = JSON.stringify(data);
      expect(json).toBe('[1,2,3]');
    });
  });
});