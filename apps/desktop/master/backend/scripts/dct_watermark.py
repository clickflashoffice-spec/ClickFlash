import sys
import os
import cv2
import numpy as np

def embed_watermark(image_path, watermark_text, output_path):
    img = cv2.imread(image_path, cv2.IMREAD_COLOR)
    if img is None:
        print(f"Error: Could not read image at {image_path}")
        sys.exit(1)

    h, w = img.shape[:2]

    # Convert to YUV to work on the luminance channel
    yuv = cv2.cvtColor(img, cv2.COLOR_BGR2YUV)
    y, u, v = cv2.split(yuv)

    # DCT works on float32 blocks of 8x8. We pad image to be multiple of 8
    pad_h = (8 - h % 8) % 8
    pad_w = (8 - w % 8) % 8
    y_padded = np.pad(y, ((0, pad_h), (0, pad_w)), 'edge').astype(np.float32)
    h_pad, w_pad = y_padded.shape

    # Apply DCT
    dct = cv2.dct(y_padded)

    # Encode text into bits
    # Format: length (16 bits) + string bits
    text_bytes = watermark_text.encode('utf-8')
    bit_array = []
    # 16-bit length
    length = len(text_bytes)
    for i in range(16):
        bit_array.append((length >> (15 - i)) & 1)
    # text bits
    for b in text_bytes:
        for i in range(8):
            bit_array.append((b >> (7 - i)) & 1)

    # Embed bits into the mid-frequency components of DCT blocks
    bit_idx = 0
    total_bits = len(bit_array)
    alpha = 5.0 # Embed strength

    # Mid frequency coordinates in 8x8 block
    u1, v1 = 4, 5
    u2, v2 = 5, 4

    for i in range(0, h_pad, 8):
        for j in range(0, w_pad, 8):
            if bit_idx >= total_bits:
                break
            
            block = dct[i:i+8, j:j+8]
            # Embed using relation between two coefficients
            bit = bit_array[bit_idx]
            
            diff = block[u1, v1] - block[u2, v2]
            
            # Modulate based on bit
            if bit == 1:
                if diff < alpha:
                    block[u1, v1] += alpha
                    block[u2, v2] -= alpha
            else:
                if diff > -alpha:
                    block[u1, v1] -= alpha
                    block[u2, v2] += alpha
                    
            bit_idx += 1
        if bit_idx >= total_bits:
            break

    # Inverse DCT
    y_inv = cv2.idct(dct)
    y_inv = np.clip(y_inv, 0, 255).astype(np.uint8)
    
    # Remove padding
    y_inv = y_inv[:h, :w]
    
    # Merge back and convert to BGR
    yuv_inv = cv2.merge((y_inv, u, v))
    bgr_inv = cv2.cvtColor(yuv_inv, cv2.COLOR_YUV2BGR)

    # Save output
    cv2.imwrite(output_path, bgr_inv)
    print(f"SUCCESS: Embedded '{watermark_text}' into {output_path}")

def main():
    if len(sys.argv) < 4:
        print("Usage: python dct_watermark.py <input_image> <watermark_text> <output_image>")
        sys.exit(1)
        
    input_image = sys.argv[1]
    watermark_text = sys.argv[2]
    output_image = sys.argv[3]

    embed_watermark(input_image, watermark_text, output_image)

if __name__ == "__main__":
    main()
