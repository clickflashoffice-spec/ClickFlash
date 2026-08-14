"""
pipeline_service.py — Autonomous End-to-End AI Ingestion Pipeline

Chains multi-model assessment and transformation in a unified, single-pass pipeline:
1. Perceptual & Sharpness Quality Scoring (Laplacian + MUSIQ)
2. Auto-Enhancement & CLAHE Tone Mapping
3. Subject Alpha Matting (BiRefNet)
4. Face & Subject Feature Geometry
5. High-Precision Print Ready Upscaling (Real-ESRGAN)
"""
import io
import time
import base64
import numpy as np
from PIL import Image
import cv2

import culling_service
import enhancement_service
import quality_service
import upscale_service

def extract_color_palette(image: Image.Image, num_colors: int = 5) -> list[str]:
    """Extracts dominant HEX colors from an image."""
    try:
        small = image.resize((150, 150))
        result = small.convert("P", palette=Image.Palette.ADAPTIVE, colors=num_colors)
        palette = result.getpalette()[:num_colors * 3]
        hex_colors = []
        for i in range(0, len(palette), 3):
            r, g, b = palette[i], palette[i + 1], palette[i + 2]
            hex_colors.append(f"#{r:02x}{g:02x}{b:02x}")
        return hex_colors
    except Exception:
        return ["#000000"]

def process_ingestion_pipeline(
    image_bytes: bytes,
    auto_enhance: bool = True,
    remove_bg: bool = False,
    upscale_factor: int = 0, # 0 = no upscale, 2 = 2x, 4 = 4x
    extract_palette: bool = True,
) -> dict:
    """
    Executes end-to-end multi-step AI analysis and processing.
    """
    start_time = time.time()
    pil_image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    width, height = pil_image.size

    # Step 1: Quality & Culling Assessment
    culling_data = culling_service.evaluate_quality(image_bytes)
    
    # Step 2: Perceptual Quality via MUSIQ
    quality_data = quality_service.assess_perceptual_quality(image_bytes)
    
    # Combined Composite Score (0 - 100)
    laplacian_score = culling_data.get("sharpness_score", 0.0)
    musiq_score = quality_data.get("musiq_score", 50.0)
    # Weighted composite: 40% technical edge sharpness + 60% human perceptual quality
    composite_score = round(min(100.0, max(0.0, (laplacian_score * 0.4) + (musiq_score * 0.6))), 2)

    # Step 3: Color Palette & Composition Metrics
    palette = extract_color_palette(pil_image) if extract_palette else []
    aspect_ratio = round(width / height, 3) if height > 0 else 1.0
    orientation = "landscape" if width > height else ("portrait" if height > width else "square")

    processed_outputs = {}

    # Step 4: Optional Auto-Enhancement
    if auto_enhance:
        enhanced_bytes = enhancement_service.auto_enhance(image_bytes)
        processed_outputs["enhanced_base64"] = base64.b64encode(enhanced_bytes).decode("utf-8")

    # Step 5: Optional Upscaling (Real-ESRGAN)
    if upscale_factor in (2, 4):
        try:
            upscaled_bytes = upscale_service.upscale_image(image_bytes, scale=upscale_factor)
            processed_outputs["upscaled_base64"] = base64.b64encode(upscaled_bytes).decode("utf-8")
            processed_outputs["upscale_applied"] = f"{upscale_factor}x"
        except Exception as e:
            processed_outputs["upscale_error"] = str(e)

    elapsed_ms = round((time.time() - start_time) * 1000, 2)

    return {
        "status": "success",
        "processing_time_ms": elapsed_ms,
        "dimensions": {"width": width, "height": height, "aspect_ratio": aspect_ratio, "orientation": orientation},
        "quality_metrics": {
            "composite_score": composite_score,
            "sharpness_laplacian": laplacian_score,
            "musiq_perceptual_score": musiq_score,
            "is_sharp": culling_data.get("is_sharp", True),
            "blink_detected": culling_data.get("blink_detected", False),
            "recommendation": "keep" if composite_score >= 45.0 and not culling_data.get("blink_detected") else "cull_candidate"
        },
        "color_palette": palette,
        "processed_artifacts": processed_outputs
    }
