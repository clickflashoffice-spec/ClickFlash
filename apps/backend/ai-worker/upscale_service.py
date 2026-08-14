"""
upscale_service.py — AI Super-Resolution via Real-ESRGAN

OSS upgrade for ClickFlash image enhancement pipeline.
Provides 2x and 4x upscaling using pre-trained Real-ESRGAN models.

Stars: 28K | License: BSD-3-Clause
@see https://github.com/xinntao/Real-ESRGAN
"""

import io
import numpy as np
import cv2
from PIL import Image

# Lazy-loaded model instance
_upscaler = None


def _get_upscaler(scale: int = 4):
    """Lazy-load the RealESRGAN upscaler model."""
    global _upscaler

    try:
        from realesrgan import RealESRGANer
        from basicsr.archs.rrdbnet_arch import RRDBNet
    except ImportError:
        raise ImportError(
            "Real-ESRGAN not installed. Run: pip install realesrgan basicsr"
        )

    if _upscaler is None or _upscaler.scale != scale:
        # Use RealESRGAN_x4plus for 4x, RealESRGAN_x2plus for 2x
        if scale == 2:
            model = RRDBNet(
                num_in_ch=3,
                num_out_ch=3,
                num_feat=64,
                num_block=23,
                num_grow_ch=32,
                scale=2,
            )
            model_name = "RealESRGAN_x2plus"
        else:
            model = RRDBNet(
                num_in_ch=3,
                num_out_ch=3,
                num_feat=64,
                num_block=23,
                num_grow_ch=32,
                scale=4,
            )
            model_name = "RealESRGAN_x4plus"

        _upscaler = RealESRGANer(
            scale=scale,
            model_path=None,  # Auto-downloads from GitHub releases
            model=model,
            tile=512,  # Process in tiles to reduce memory
            tile_pad=10,
            pre_pad=0,
            half=False,  # CPU mode — no half precision
            device="cpu",
        )

    return _upscaler


def upscale_image(image_bytes: bytes, scale: int = 4) -> bytes:
    """
    Upscale an image by 2x or 4x using Real-ESRGAN.

    Args:
        image_bytes: Input image as bytes
        scale: Upscale factor (2 or 4, default: 4)

    Returns:
        Upscaled image as JPEG bytes at quality 95
    """
    if scale not in (2, 4):
        raise ValueError("Scale must be 2 or 4")

    # Decode image
    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

    if img is None:
        raise ValueError("Invalid image data")

    # Upscale
    upscaler = _get_upscaler(scale)
    output, _ = upscaler.enhance(img, outscale=scale)

    # Encode result
    success, encoded = cv2.imencode(
        ".jpg", output, [int(cv2.IMWRITE_JPEG_QUALITY), 95]
    )

    if not success:
        raise ValueError("Failed to encode upscaled image")

    return encoded.tobytes()
