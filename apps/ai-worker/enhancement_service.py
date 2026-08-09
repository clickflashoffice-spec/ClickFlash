import cv2
import numpy as np

def auto_enhance(image_bytes: bytes) -> bytes:
    """
    Performs a highly optimized, CPU-friendly automatic image enhancement:
    1. Automatic White Balance (Simple Grayworld assumption)
    2. CLAHE (Contrast Limited Adaptive Histogram Equalization) on the L-channel of LAB color space
    """
    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    
    if img is None:
        raise ValueError("Invalid image data")

    # Step 1: Simple Grayworld White Balance
    result = img.astype('float32')
    # Calculate channel averages
    avg_b = np.average(result[:, :, 0])
    avg_g = np.average(result[:, :, 1])
    avg_r = np.average(result[:, :, 2])
    
    avg_gray = (avg_b + avg_g + avg_r) / 3
    
    if avg_b > 0 and avg_g > 0 and avg_r > 0:
        result[:, :, 0] = np.clip(result[:, :, 0] * (avg_gray / avg_b), 0, 255)
        result[:, :, 1] = np.clip(result[:, :, 1] * (avg_gray / avg_g), 0, 255)
        result[:, :, 2] = np.clip(result[:, :, 2] * (avg_gray / avg_r), 0, 255)
        
    img = result.astype('uint8')

    # Step 2: CLAHE on LAB Color Space to improve local contrast
    lab = cv2.cvtColor(img, cv2.COLOR_BGR2LAB)
    l, a, b = cv2.split(lab)
    
    # Apply CLAHE to L-channel
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8,8))
    cl = clahe.apply(l)
    
    # Merge channels and convert back to BGR
    limg = cv2.merge((cl, a, b))
    enhanced_img = cv2.cvtColor(limg, cv2.COLOR_LAB2BGR)
    
    # Encode back to bytes
    success, encoded_image = cv2.imencode('.jpg', enhanced_img, [int(cv2.IMWRITE_JPEG_QUALITY), 95])
    
    if not success:
        raise ValueError("Failed to encode enhanced image")
        
    return encoded_image.tobytes()
