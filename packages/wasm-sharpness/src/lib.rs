use std::mem;

#[no_mangle]
pub extern "C" fn alloc(length: usize) -> *mut u8 {
    let mut buffer = Vec::<u8>::with_capacity(length);
    let pointer = buffer.as_mut_ptr();
    mem::forget(buffer);
    pointer
}

#[no_mangle]
pub unsafe extern "C" fn dealloc(pointer: *mut u8, length: usize) {
    if !pointer.is_null() && length > 0 {
        drop(Vec::from_raw_parts(pointer, 0, length));
    }
}

fn laplacian_at(grayscale: &[u8], width: usize, x: usize, y: usize) -> f64 {
    let index = y * width + x;
    let neighbours = grayscale[index - width - 1] as i32
        + grayscale[index - width] as i32
        + grayscale[index - width + 1] as i32
        + grayscale[index - 1] as i32
        + grayscale[index + 1] as i32
        + grayscale[index + width - 1] as i32
        + grayscale[index + width] as i32
        + grayscale[index + width + 1] as i32;
    (neighbours - 8 * grayscale[index] as i32) as f64
}

#[cfg(target_arch = "wasm32")]
#[target_feature(enable = "simd128")]
unsafe fn accumulate_simd_row(
    grayscale: &[u8],
    width: usize,
    y: usize,
    start_x: usize,
) -> (f64, f64) {
    use core::arch::wasm32::*;

    let load = |offset: usize| u16x8_extend_low_u8x16(v128_load64_zero(grayscale.as_ptr().add(offset) as *const v128));
    let row = y * width;
    let centre = load(row + start_x);
    let mut sum = load(row - width + start_x - 1);
    sum = i16x8_add(sum, load(row - width + start_x));
    sum = i16x8_add(sum, load(row - width + start_x + 1));
    sum = i16x8_add(sum, load(row + start_x - 1));
    sum = i16x8_add(sum, load(row + start_x + 1));
    sum = i16x8_add(sum, load(row + width + start_x - 1));
    sum = i16x8_add(sum, load(row + width + start_x));
    sum = i16x8_add(sum, load(row + width + start_x + 1));
    let laplacian = i16x8_sub(sum, i16x8_shl(centre, 3));
    let low = f32x4_convert_i32x4(i32x4_extend_low_i16x8(laplacian));
    let high = f32x4_convert_i32x4(i32x4_extend_high_i16x8(laplacian));
    let squared_low = f32x4_mul(low, low);
    let squared_high = f32x4_mul(high, high);
    let vector_sum = f32x4_add(low, high);
    let vector_squared_sum = f32x4_add(squared_low, squared_high);
    let sum = f32x4_extract_lane::<0>(vector_sum)
        + f32x4_extract_lane::<1>(vector_sum)
        + f32x4_extract_lane::<2>(vector_sum)
        + f32x4_extract_lane::<3>(vector_sum);
    let squared_sum = f32x4_extract_lane::<0>(vector_squared_sum)
        + f32x4_extract_lane::<1>(vector_squared_sum)
        + f32x4_extract_lane::<2>(vector_squared_sum)
        + f32x4_extract_lane::<3>(vector_squared_sum);
    (sum as f64, squared_sum as f64)
}

fn laplacian_variance_slice(grayscale: &[u8], width: usize, height: usize) -> f64 {
    if width < 3 || height < 3 || grayscale.len() != width * height {
        return 0.0;
    }

    let mut sum = 0.0;
    let mut squared_sum = 0.0;
    let mut count = 0usize;
    for y in 1..height - 1 {
        let mut x = 1usize;
        #[cfg(target_arch = "wasm32")]
        unsafe {
            while x + 8 <= width - 1 {
                let (block_sum, block_squared_sum) =
                    accumulate_simd_row(grayscale, width, y, x);
                sum += block_sum;
                squared_sum += block_squared_sum;
                count += 8;
                x += 8;
            }
        }
        while x < width - 1 {
            let value = laplacian_at(grayscale, width, x, y);
            sum += value;
            squared_sum += value * value;
            count += 1;
            x += 1;
        }
    }

    if count == 0 {
        return 0.0;
    }
    let mean = sum / count as f64;
    (squared_sum / count as f64 - mean * mean).max(0.0)
}

#[no_mangle]
pub unsafe extern "C" fn laplacian_variance(
    grayscale_pointer: *const u8,
    width: usize,
    height: usize,
) -> f64 {
    if grayscale_pointer.is_null() || width.checked_mul(height).is_none() {
        return 0.0;
    }
    let pixels = std::slice::from_raw_parts(grayscale_pointer, width * height);
    laplacian_variance_slice(pixels, width, height)
}

fn cubic_weight(distance: f64) -> f64 {
    let x = distance.abs();
    if x <= 1.0 {
        1.5 * x * x * x - 2.5 * x * x + 1.0
    } else if x < 2.0 {
        -0.5 * x * x * x + 2.5 * x * x - 4.0 * x + 2.0
    } else {
        0.0
    }
}

fn clamp_index(value: isize, maximum: usize) -> usize {
    value.max(0).min(maximum.saturating_sub(1) as isize) as usize
}

fn resize_bicubic_rgba_slice(
    source: &[u8],
    source_width: usize,
    source_height: usize,
    destination: &mut [u8],
    destination_width: usize,
    destination_height: usize,
) -> bool {
    if source.len() != source_width * source_height * 4
        || destination.len() != destination_width * destination_height * 4
        || source_width == 0
        || source_height == 0
        || destination_width == 0
        || destination_height == 0
    {
        return false;
    }

    let scale_x = source_width as f64 / destination_width as f64;
    let scale_y = source_height as f64 / destination_height as f64;
    for destination_y in 0..destination_height {
        let source_y = (destination_y as f64 + 0.5) * scale_y - 0.5;
        let base_y = source_y.floor() as isize;
        for destination_x in 0..destination_width {
            let source_x = (destination_x as f64 + 0.5) * scale_x - 0.5;
            let base_x = source_x.floor() as isize;
            let output = (destination_y * destination_width + destination_x) * 4;
            for channel in 0..4 {
                let mut weighted_sum = 0.0;
                let mut weight_total = 0.0;
                for sample_y in -1..=2 {
                    let y = clamp_index(base_y + sample_y, source_height);
                    let weight_y = cubic_weight(source_y - (base_y + sample_y) as f64);
                    for sample_x in -1..=2 {
                        let x = clamp_index(base_x + sample_x, source_width);
                        let weight =
                            weight_y * cubic_weight(source_x - (base_x + sample_x) as f64);
                        weighted_sum += source[(y * source_width + x) * 4 + channel] as f64 * weight;
                        weight_total += weight;
                    }
                }
                destination[output + channel] =
                    (weighted_sum / weight_total.max(f64::EPSILON)).round().clamp(0.0, 255.0) as u8;
            }
        }
    }
    true
}

#[no_mangle]
pub unsafe extern "C" fn resize_bicubic_rgba(
    source_pointer: *const u8,
    source_width: usize,
    source_height: usize,
    destination_pointer: *mut u8,
    destination_width: usize,
    destination_height: usize,
) -> i32 {
    let source_length = match source_width.checked_mul(source_height).and_then(|v| v.checked_mul(4)) {
        Some(length) => length,
        None => return 0,
    };
    let destination_length = match destination_width
        .checked_mul(destination_height)
        .and_then(|v| v.checked_mul(4))
    {
        Some(length) => length,
        None => return 0,
    };
    if source_pointer.is_null() || destination_pointer.is_null() {
        return 0;
    }
    let source = std::slice::from_raw_parts(source_pointer, source_length);
    let destination = std::slice::from_raw_parts_mut(destination_pointer, destination_length);
    i32::from(resize_bicubic_rgba_slice(
        source,
        source_width,
        source_height,
        destination,
        destination_width,
        destination_height,
    ))
}

#[cfg(test)]
mod tests {
    use super::{laplacian_variance_slice, resize_bicubic_rgba_slice};

    #[test]
    fn flat_images_have_zero_laplacian_variance() {
        assert_eq!(laplacian_variance_slice(&[100; 25], 5, 5), 0.0);
    }

    #[test]
    fn edges_have_positive_laplacian_variance() {
        let mut pixels = [0; 25];
        pixels[12] = 255;
        assert!(laplacian_variance_slice(&pixels, 5, 5) > 0.0);
    }

    #[test]
    fn bicubic_resize_preserves_a_uniform_rgba_image() {
        let source = [20, 40, 60, 255, 20, 40, 60, 255, 20, 40, 60, 255, 20, 40, 60, 255];
        let mut destination = [0; 16];
        assert!(resize_bicubic_rgba_slice(&source, 2, 2, &mut destination, 2, 2));
        assert_eq!(destination, source);
    }
}
