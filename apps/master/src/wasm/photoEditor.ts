/**
 * AssemblyScript High-Performance Photo Manipulation Engine (WASM)
 * 
 * Target: WebAssembly release (--target release --runtime stub)
 * Provides ultra-fast pixel-level operations:
 * - Histogram Analysis
 * - Exposure, Contrast, Saturation, Clarity adjustments
 * - Box-blur Noise Reduction
 */

@inline
function clampByte(val: f32): u8 {
  if (val < 0.0) return 0;
  if (val > 255.0) return 255;
  return <u8>val;
}

/**
 * Analyze histogram into outPtr buffer (3 * 256 * 4 bytes = 3072 bytes total u32 array)
 * outPtr + 0..1023 -> R counts (256 * u32)
 * outPtr + 1024..2047 -> G counts (256 * u32)
 * outPtr + 2048..3071 -> B counts (256 * u32)
 */
export function analyzeHistogramWasm(ptr: i32, byteLen: i32, outPtr: i32): void {
  memory.fill(outPtr, 0, 3072);

  for (let i: i32 = 0; i < byteLen; i += 4) {
    let r = <i32>load<u8>(ptr + i);
    let g = <i32>load<u8>(ptr + i + 1);
    let b = <i32>load<u8>(ptr + i + 2);

    let rAddr = outPtr + (r << 2);
    let gAddr = outPtr + 1024 + (g << 2);
    let bAddr = outPtr + 2048 + (b << 2);

    store<u32>(rAddr, load<u32>(rAddr) + 1);
    store<u32>(gAddr, load<u32>(gAddr) + 1);
    store<u32>(bAddr, load<u32>(bAddr) + 1);
  }
}

/**
 * Apply color adjustments directly to pixel buffer in-place
 */
export function applyPixelAdjustmentsWasm(
  ptr: i32,
  byteLen: i32,
  exposure: f32,
  contrast: f32,
  saturation: f32,
  clarity: f32
): void {
  let factor = <f32>Math.pow(2.0, exposure);
  let cFactor = <f32>((259.0 * (<f64>contrast * 255.0 + 255.0)) / (255.0 * (259.0 - <f64>contrast * 255.0)));

  for (let i: i32 = 0; i < byteLen; i += 4) {
    let r = <f32>load<u8>(ptr + i);
    let g = <f32>load<u8>(ptr + i + 1);
    let b = <f32>load<u8>(ptr + i + 2);

    // Exposure
    r = r * factor;
    g = g * factor;
    b = b * factor;

    // Contrast
    r = cFactor * (r - 128.0 as f32) + (128.0 as f32);
    g = cFactor * (g - 128.0 as f32) + (128.0 as f32);
    b = cFactor * (b - 128.0 as f32) + (128.0 as f32);

    // Saturation
    let lum: f32 = 0.299 * r + 0.587 * g + 0.114 * b;
    r = lum + (r - lum) * (1.0 as f32 + saturation);
    g = lum + (g - lum) * (1.0 as f32 + saturation);
    b = lum + (b - lum) * (1.0 as f32 + saturation);

    // Clarity (micro-contrast approximation)
    let midDist: f32 = lum - (128.0 as f32);
    r = r + midDist * clarity * (0.15 as f32);
    g = g + midDist * clarity * (0.15 as f32);
    b = b + midDist * clarity * (0.15 as f32);

    store<u8>(ptr + i, clampByte(r));
    store<u8>(ptr + i + 1, clampByte(g));
    store<u8>(ptr + i + 2, clampByte(b));
  }
}

/**
 * 3x3 Box-Blur Noise Reduction
 * ptr: input RGBA buffer
 * width, height: dimensions
 * strength: blending factor (0.0 to 1.0)
 * outPtr: output RGBA buffer
 */
export function noiseReductionWasm(
  ptr: i32,
  width: i32,
  height: i32,
  strength: f32,
  outPtr: i32
): void {
  let byteLen = width * height * 4;
  memory.copy(outPtr, ptr, byteLen);

  for (let y: i32 = 1; y < height - 1; y++) {
    let yRow = y * width;
    for (let x: i32 = 1; x < width - 1; x++) {
      let idx = (yRow + x) << 2;

      let sumR: f32 = 0.0;
      let sumG: f32 = 0.0;
      let sumB: f32 = 0.0;

      for (let dy: i32 = -1; dy <= 1; dy++) {
        let nyRow = (y + dy) * width;
        for (let dx: i32 = -1; dx <= 1; dx++) {
          let nIdx = (nyRow + (x + dx)) << 2;
          sumR += <f32>load<u8>(ptr + nIdx);
          sumG += <f32>load<u8>(ptr + nIdx + 1);
          sumB += <f32>load<u8>(ptr + nIdx + 2);
        }
      }

      let origR = <f32>load<u8>(ptr + idx);
      let origG = <f32>load<u8>(ptr + idx + 1);
      let origB = <f32>load<u8>(ptr + idx + 2);

      let avgR: f32 = sumR / 9.0;
      let avgG: f32 = sumG / 9.0;
      let avgB: f32 = sumB / 9.0;

      store<u8>(outPtr + idx, clampByte(origR * (1.0 as f32 - strength) + avgR * strength));
      store<u8>(outPtr + idx + 1, clampByte(origG * (1.0 as f32 - strength) + avgG * strength));
      store<u8>(outPtr + idx + 2, clampByte(origB * (1.0 as f32 - strength) + avgB * strength));
    }
  }
}
