"""
segmentation_service.py — Interactive Image Segmentation via MobileSAM

Lightweight SAM (Segment Anything Model) variant optimized for CPU deployment.
Provides point-based interactive segmentation and auto-segmentation.

@see https://github.com/ChaoningZhang/MobileSAM
"""

import io
import numpy as np
import cv2
from PIL import Image

# Lazy-loaded model
_sam_model = None
_sam_predictor = None


def _get_predictor():
    """Lazy-load the MobileSAM predictor."""
    global _sam_model, _sam_predictor

    if _sam_predictor is None:
        try:
            from mobile_sam import sam_model_registry, SamPredictor, SamAutomaticMaskGenerator
        except ImportError:
            raise ImportError(
                "MobileSAM not installed. Run: pip install mobile-sam"
            )

        # MobileSAM uses the 'vit_t' (tiny) architecture
        model_type = "vit_t"
        _sam_model = sam_model_registry[model_type]()
        _sam_model.eval()
        _sam_predictor = SamPredictor(_sam_model)

    return _sam_predictor


def _get_mask_generator():
    """Get automatic mask generator for segment-everything."""
    from mobile_sam import SamAutomaticMaskGenerator

    predictor = _get_predictor()
    return SamAutomaticMaskGenerator(
        _sam_model,
        points_per_side=16,  # Fewer points for faster CPU inference
        pred_iou_thresh=0.86,
        stability_score_thresh=0.92,
        min_mask_region_area=100,
    )


def segment_with_points(
    image_bytes: bytes,
    points: list[list[int]],
    labels: list[int],
) -> bytes:
    """
    Segment an image using point prompts.

    Args:
        image_bytes: Input image as bytes
        points: List of [x, y] coordinates for prompts
        labels: List of labels (1 = foreground, 0 = background) for each point

    Returns:
        Binary mask as PNG bytes (white = selected, black = background)
    """
    # Decode image
    image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    img_array = np.array(image)

    predictor = _get_predictor()
    predictor.set_image(img_array)

    input_points = np.array(points)
    input_labels = np.array(labels)

    masks, scores, _ = predictor.predict(
        point_coords=input_points,
        point_labels=input_labels,
        multimask_output=True,
    )

    # Take the highest-confidence mask
    best_mask_idx = np.argmax(scores)
    mask = masks[best_mask_idx]

    # Convert boolean mask to PNG
    mask_image = Image.fromarray((mask * 255).astype(np.uint8), mode="L")
    output = io.BytesIO()
    mask_image.save(output, format="PNG")
    return output.getvalue()


def segment_everything(image_bytes: bytes) -> list[dict]:
    """
    Auto-segment all objects in an image.

    Returns a list of dicts, each with:
    - area: Number of pixels in the mask
    - bbox: [x, y, w, h] bounding box
    - score: Predicted IoU score
    - mask_png: PNG bytes of the mask
    """
    image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    img_array = np.array(image)

    generator = _get_mask_generator()
    masks = generator.generate(img_array)

    results = []
    for mask_data in masks:
        # Convert mask to PNG bytes
        mask = mask_data["segmentation"]
        mask_image = Image.fromarray((mask * 255).astype(np.uint8), mode="L")
        mask_output = io.BytesIO()
        mask_image.save(mask_output, format="PNG")

        results.append({
            "area": int(mask_data["area"]),
            "bbox": [int(v) for v in mask_data["bbox"]],
            "score": float(mask_data["predicted_iou"]),
            "mask_png": mask_output.getvalue(),
        })

    # Sort by area descending (largest objects first)
    results.sort(key=lambda x: x["area"], reverse=True)
    return results
