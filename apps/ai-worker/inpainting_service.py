import cv2
import numpy as np
from simple_lama_inpainting import SimpleLama
from PIL import Image
import io

# Initialize the Lama model once so it loads into memory
_lama_model = None

def get_lama():
    global _lama_model
    if _lama_model is None:
        # SimpleLama automatically downloads the ONNX model if not present (~300MB)
        # and runs on CPU if no GPU is found.
        _lama_model = SimpleLama()
    return _lama_model

def inpaint(image_bytes: bytes, mask_bytes: bytes) -> bytes:
    """
    Performs Magic Eraser (inpainting) on the given image using the provided mask.
    The image and mask must be the same size.
    """
    try:
        # Read image and mask
        image = Image.open(io.BytesIO(image_bytes)).convert('RGB')
        
        # Mask must be single channel, where 255 is the area to remove
        mask = Image.open(io.BytesIO(mask_bytes)).convert('L')
        
        # Ensure sizes match
        if image.size != mask.size:
            mask = mask.resize(image.size, Image.Resampling.LANCZOS)
        
        # Apply SimpleLama
        lama = get_lama()
        result_img = lama(image, mask)
        
        # Convert to bytes
        img_byte_arr = io.BytesIO()
        result_img.save(img_byte_arr, format='JPEG', quality=95)
        
        return img_byte_arr.getvalue()
    except Exception as e:
        raise ValueError(f"Inpainting failed: {str(e)}")
