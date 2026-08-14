/**
 * Export Utilities for Management Hub
 * Provides CSV and data export functionality
 */

/**
 * Convert array of objects to CSV string
 */
export function toCSV<T extends Record<string, unknown>>(
  data: T[],
  columns?: { key: keyof T; label: string }[]
): string {
  if (!data.length) return '';

  const headers = columns 
    ? columns.map(c => c.label)
    : Object.keys(data[0]);
  
  const keys = columns
    ? columns.map(c => c.key)
    : Object.keys(data[0]) as (keyof T)[];

  const escapeValue = (value: unknown): string => {
    if (value === null || value === undefined) return '';
    const str = String(value);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const headerRow = headers.join(',');
  const dataRows = data.map(row => 
    keys.map(key => escapeValue(row[key])).join(',')
  );

  return [headerRow, ...dataRows].join('\n');
}

/**
 * Trigger browser download of CSV file
 */
export function downloadCSV<T extends Record<string, unknown>>(
  data: T[],
  filename: string,
  columns?: { key: keyof T; label: string }[]
): void {
  const csv = toCSV(data, columns);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  link.click();
  
  URL.revokeObjectURL(url);
}

/**
 * Convert data to JSON and trigger download
 */
export function downloadJSON<T>(
  data: T,
  filename: string
): void {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.json') ? filename : `${filename}.json`;
  link.click();
  
  URL.revokeObjectURL(url);
}