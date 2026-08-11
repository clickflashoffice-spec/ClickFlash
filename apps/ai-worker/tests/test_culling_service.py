import cv2
import numpy as np
import pytest

import culling_service


def encode_jpeg(image: np.ndarray) -> bytes:
    success, encoded = cv2.imencode(
        ".jpg",
        image,
        [int(cv2.IMWRITE_JPEG_QUALITY), 100],
    )
    assert success
    return encoded.tobytes()


def test_invalid_image_data_fails_closed() -> None:
    with pytest.raises(ValueError, match="Invalid image data"):
        culling_service.evaluate_quality(b"not-an-image")


@pytest.mark.parametrize(
    ("pixel_value", "expected_flag"),
    [(0, "is_underexposed"), (255, "is_overexposed")],
)
def test_extreme_exposure_is_flagged(pixel_value: int, expected_flag: str) -> None:
    image = np.full((128, 128, 3), pixel_value, dtype=np.uint8)
    result = culling_service.evaluate_quality(encode_jpeg(image))

    assert result[expected_flag] is True
    assert result["exposure_score"] == pytest.approx(0.0)
    assert result["is_acceptable"] is False


def test_flat_midtone_image_is_well_exposed_but_blurry() -> None:
    image = np.full((128, 128, 3), 128, dtype=np.uint8)
    result = culling_service.evaluate_quality(encode_jpeg(image))

    assert result["exposure_score"] > 99.0
    assert result["is_blurry"] is True
    assert result["recommendation"] == "review"
    assert "blur" in result["review_reasons"]


def test_high_frequency_image_receives_deterministic_composite_score() -> None:
    rows, columns = np.indices((256, 256))
    checkerboard = ((rows // 8 + columns // 8) % 2 * 255).astype(np.uint8)
    image = cv2.cvtColor(checkerboard, cv2.COLOR_GRAY2BGR)
    encoded = encode_jpeg(image)

    first = culling_service.evaluate_quality(encoded)
    second = culling_service.evaluate_quality(encoded)

    assert first == second
    assert first["is_blurry"] is False
    assert first["faces_detected"] == 0
    assert first["eye_check_status"] == "not_applicable"
    assert 1 <= first["auto_star_rating"] <= 5
    assert 0.0 <= first["overall_quality"] <= 100.0
