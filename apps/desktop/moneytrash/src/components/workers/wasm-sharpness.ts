interface SharpnessWasmExports extends WebAssembly.Exports {
  memory: WebAssembly.Memory;
  alloc(length: number): number;
  dealloc(pointer: number, length: number): void;
  laplacian_variance(pointer: number, width: number, height: number): number;
}

let exportsPromise: Promise<SharpnessWasmExports | null> | null = null;

async function loadSharpnessWasm(): Promise<SharpnessWasmExports | null> {
  if (!exportsPromise) {
    exportsPromise = (async () => {
      try {
        const response = await fetch('/wasm/clickflash_wasm_sharpness.wasm');
        if (!response.ok) return null;
        const { instance } = await WebAssembly.instantiate(
          await response.arrayBuffer(),
          {},
        );
        const exports = instance.exports as SharpnessWasmExports;
        if (
          !(exports.memory instanceof WebAssembly.Memory) ||
          typeof exports.alloc !== 'function' ||
          typeof exports.dealloc !== 'function' ||
          typeof exports.laplacian_variance !== 'function'
        ) {
          return null;
        }
        return exports;
      } catch {
        return null;
      }
    })();
  }
  return exportsPromise;
}

export async function calculateWasmLaplacianVariance(
  grayscale: Uint8Array,
  width: number,
  height: number,
): Promise<number | null> {
  const exports = await loadSharpnessWasm();
  if (
    !exports ||
    width < 3 ||
    height < 3 ||
    grayscale.length !== width * height
  ) {
    return null;
  }

  const pointer = exports.alloc(grayscale.byteLength);
  if (!pointer) return null;
  try {
    new Uint8Array(exports.memory.buffer, pointer, grayscale.byteLength).set(grayscale);
    const result = exports.laplacian_variance(pointer, width, height);
    return Number.isFinite(result) ? result : null;
  } finally {
    exports.dealloc(pointer, grayscale.byteLength);
  }
}
