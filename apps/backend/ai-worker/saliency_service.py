import cv2
import numpy as np

def get_optimal_crop(image_bytes: bytes, target_aspect_ratio: float) -> dict:
    """
    Calculates the optimal crop coordinates for a given aspect ratio
    using OpenCV Saliency Detection to ensure the subject is centered.
    """
    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if img is None:
        raise ValueError("Could not decode image")

    h, w = img.shape[:2]
    current_aspect = w / float(h)

    # Determine crop dimensions
    if current_aspect > target_aspect_ratio:
        # Image is too wide, crop width
        crop_h = h
        crop_w = int(h * target_aspect_ratio)
    else:
        # Image is too tall, crop height
        crop_w = w
        crop_h = int(w / target_aspect_ratio)

    if crop_w >= w and crop_h >= h:
        return {"x": 0, "y": 0, "w": w, "h": h}

    try:
        # Calculate Static Saliency (Fine Grained)
        saliency = cv2.saliency.StaticSaliencyFineGrained_create()
        success, saliencyMap = saliency.computeSaliency(img)

        if not success:
            raise Exception("Saliency computation failed")
            
        # Compute center of mass of the saliency map
        M = cv2.moments(saliencyMap)
        if M["m00"] != 0:
            cX = int(M["m10"] / M["m00"])
            cY = int(M["m01"] / M["m00"])
        else:
            cX, cY = w // 2, h // 2
    except Exception as e:
        print(f"Saliency fallback to center: {e}")
        cX, cY = w // 2, h // 2

    # Calculate top-left corner based on center of mass
    x = max(0, min(w - crop_w, cX - crop_w // 2))
    y = max(0, min(h - crop_h, cY - crop_h // 2))

    return {
        "x": int(x),
        "y": int(y),
        "w": int(crop_w),
        "h": int(crop_h)
    }

if __name__ == "__main__":
    import sys
    import json
    if len(sys.argv) < 3:
        print(json.dumps({"error": "Usage: python saliency_service.py <image_path> <aspect_ratio>"}))
        sys.exit(1)
        
    image_path = sys.argv[1]
    aspect_ratio = float(sys.argv[2])
    
    try:
        with open(image_path, "rb") as f:
            image_bytes = f.read()
        crop_box = get_optimal_crop(image_bytes, aspect_ratio)
        print(json.dumps(crop_box))
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)
