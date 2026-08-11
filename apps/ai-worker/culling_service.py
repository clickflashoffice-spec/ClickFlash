import cv2
import numpy as np

BLUR_THRESHOLD = 100.0
UNDEREXPOSED_LUMINANCE = 45.0
OVEREXPOSED_LUMINANCE = 210.0
CLIPPING_THRESHOLD = 0.50


def _decode_image(image_bytes: bytes) -> np.ndarray:
    if not image_bytes:
        raise ValueError("Invalid image data")

    encoded = np.frombuffer(image_bytes, np.uint8)
    image = cv2.imdecode(encoded, cv2.IMREAD_COLOR)
    if image is None or image.size == 0:
        raise ValueError("Invalid image data")

    return image


def _blur_metrics(image: np.ndarray) -> dict:
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    variance = float(cv2.Laplacian(gray, cv2.CV_64F).var())
    sharpness_score = min(100.0, max(0.0, variance / BLUR_THRESHOLD * 100.0))
    return {
        "blur_score": variance,
        "sharpness_score": sharpness_score,
        "is_blurry": variance < BLUR_THRESHOLD,
    }


def _exposure_metrics(image: np.ndarray) -> dict:
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    mean_luminance = float(gray.mean())
    shadow_clip_fraction = float(np.count_nonzero(gray <= 10) / gray.size)
    highlight_clip_fraction = float(np.count_nonzero(gray >= 245) / gray.size)
    clipped_fraction = min(1.0, shadow_clip_fraction + highlight_clip_fraction)

    center_score = max(
        0.0,
        100.0 - (abs(mean_luminance - 127.5) / 127.5 * 100.0),
    )
    clipping_multiplier = max(0.0, 1.0 - (clipped_fraction / CLIPPING_THRESHOLD))
    exposure_score = min(100.0, center_score * clipping_multiplier)

    return {
        "mean_luminance": mean_luminance,
        "shadow_clip_fraction": shadow_clip_fraction,
        "highlight_clip_fraction": highlight_clip_fraction,
        "exposure_score": exposure_score,
        "is_underexposed": (
            mean_luminance < UNDEREXPOSED_LUMINANCE
            or shadow_clip_fraction >= CLIPPING_THRESHOLD
        ),
        "is_overexposed": (
            mean_luminance > OVEREXPOSED_LUMINANCE
            or highlight_clip_fraction >= CLIPPING_THRESHOLD
        ),
    }


def _face_metrics(image: np.ndarray) -> dict:
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    face_cascade = cv2.CascadeClassifier(
        cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
    )
    eye_cascade = cv2.CascadeClassifier(
        cv2.data.haarcascades + "haarcascade_eye.xml"
    )

    if face_cascade.empty() or eye_cascade.empty():
        raise RuntimeError("OpenCV Haar cascade data is unavailable")

    faces = face_cascade.detectMultiScale(gray, 1.3, 5)
    eyes_found = 0
    for x, y, width, height in faces:
        face_region = gray[y:y + height, x:x + width]
        eyes_found += len(eye_cascade.detectMultiScale(face_region, 1.1, 3))

    face_count = len(faces)
    eyes_visible = face_count > 0 and eyes_found >= face_count
    if face_count == 0:
        eye_check_status = "not_applicable"
        face_quality_score = 75.0
    elif eyes_visible:
        eye_check_status = "clear"
        face_quality_score = 100.0
    else:
        # Haar eye absence is not reliable enough to claim a blink.
        eye_check_status = "review"
        face_quality_score = 40.0

    return {
        "faces_detected": face_count,
        "eyes_visible": eyes_visible,
        "eye_check_status": eye_check_status,
        "face_quality_score": face_quality_score,
    }


def _star_rating(score: float) -> int:
    if score >= 85.0:
        return 5
    if score >= 70.0:
        return 4
    if score >= 50.0:
        return 3
    if score >= 30.0:
        return 2
    return 1


def evaluate_quality(image_bytes: bytes) -> dict:
    """Return deterministic CPU-only quality signals and a review recommendation."""
    image = _decode_image(image_bytes)
    blur = _blur_metrics(image)
    exposure = _exposure_metrics(image)
    face = _face_metrics(image)

    overall_quality = round(
        blur["sharpness_score"] * 0.50
        + exposure["exposure_score"] * 0.35
        + face["face_quality_score"] * 0.15,
        2,
    )

    review_reasons = []
    if blur["is_blurry"]:
        review_reasons.append("blur")
    if exposure["is_underexposed"]:
        review_reasons.append("underexposed")
    if exposure["is_overexposed"]:
        review_reasons.append("overexposed")
    if face["eye_check_status"] == "review":
        review_reasons.append("eyes_not_confirmed")

    if overall_quality >= 70.0 and not review_reasons:
        recommendation = "keep"
    elif overall_quality >= 40.0:
        recommendation = "review"
    else:
        recommendation = "reject"

    return {
        **blur,
        **exposure,
        **face,
        "overall_quality": overall_quality,
        "auto_star_rating": _star_rating(overall_quality),
        "recommendation": recommendation,
        "is_acceptable": recommendation == "keep",
        "review_reasons": review_reasons,
    }


def detect_blur(image_bytes: bytes) -> dict:
    """Compatibility wrapper returning deterministic Laplacian blur metrics."""
    return _blur_metrics(_decode_image(image_bytes))


def detect_exposure(image_bytes: bytes) -> dict:
    """Compatibility wrapper returning histogram-derived exposure metrics."""
    return _exposure_metrics(_decode_image(image_bytes))


def detect_blinks_and_quality(image_bytes: bytes) -> dict:
    """
    Return conservative CPU face/eye signals.

    The Haar classifier can confirm visible eyes but cannot reliably diagnose a
    blink, so uncertain portraits are marked for review instead of rejected.
    """
    metrics = _face_metrics(_decode_image(image_bytes))
    return {
        **metrics,
        "quality_score": metrics["face_quality_score"],
    }
