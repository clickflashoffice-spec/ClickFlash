import { copyFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = resolve(
  appRoot,
  '../../packages/wasm-sharpness/target/wasm32-unknown-unknown/release/clickflash_wasm_sharpness.wasm',
);
const destination = resolve(appRoot, 'public/wasm/clickflash_wasm_sharpness.wasm');

await mkdir(dirname(destination), { recursive: true });
await copyFile(source, destination);
