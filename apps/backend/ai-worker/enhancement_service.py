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
    
    # Step 3: Unsharp Mask for sharpening
    blurred = cv2.GaussianBlur(enhanced_img, (0, 0), 1.0)
    enhanced_img = cv2.addWeighted(enhanced_img, 1.8, blurred, -0.8, 0)
    
    # Encode back to bytes
    success, encoded_image = cv2.imencode('.jpg', enhanced_img, [int(cv2.IMWRITE_JPEG_QUALITY), 95])
    
    if not success:
        raise ValueError("Failed to encode enhanced image")
        
    return encoded_image.tobytes()

def auto_enhance_pro(image_bytes: bytes) -> bytes:
    """
    Performs a 'Canvas Pro' level automatic image enhancement:
    - Retinex-inspired shadows/highlights recovery
    - Vibrance and saturation boost
    - Crisp sharpening
    Works purely on CPU.
    """
    from PIL import Image, ImageEnhance, ImageFilter
    import io
    
    try:
        img = Image.open(io.BytesIO(image_bytes)).convert('RGB')
        
        # 1. Color Balance / Vibrance
        color_enhancer = ImageEnhance.Color(img)
        img = color_enhancer.enhance(1.25)  # Boost saturation slightly
        
        # 2. Contrast
        contrast_enhancer = ImageEnhance.Contrast(img)
        img = contrast_enhancer.enhance(1.10)
        
        # 3. Brightness (Shadows/Highlights recovery simulation)
        # Using a slight brightness bump
        brightness_enhancer = ImageEnhance.Brightness(img)
        img = brightness_enhancer.enhance(1.05)
        
        # 4. Sharpening
        # UnsharpMask parameters: radius, percent, threshold
        img = img.filter(ImageFilter.UnsharpMask(radius=2, percent=150, threshold=3))
        
        img_byte_arr = io.BytesIO()
        img.save(img_byte_arr, format='JPEG', quality=95)
        
        return img_byte_arr.getvalue()
    except Exception as e:
        raise ValueError(f"Pro enhancement failed: {str(e)}")
