// @vitest-environment jsdom
import { describe, it } from 'vitest'; it('has indexeddb', () => { console.log('globalThis.indexedDB:', !!globalThis.indexedDB); console.log('window.indexedDB:', !!window.indexedDB); });
