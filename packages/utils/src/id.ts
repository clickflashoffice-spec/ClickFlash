import { randomFillSync } from 'crypto';

export function slugify(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function generateId(length = 21): string {
  const chars = 'useandom-26T198340PX75pxJACKVERYMINDBUSHWOLF_GQZbfghjklqvwyzrict';
  let id = '';
  const bytes = new Uint8Array(length);
  randomFillSync(bytes);
  for (let i = 0; i < length; i++) {
    id += chars[bytes[i] % 64];
  }
  return id;
}

export function prefixedId(prefix: string, length = 21): string {
  return `${prefix}_${generateId(length)}`;
}

