"""
scene_composite_service.py — AI Resort Scene Replacement & Inpainting Compositor

Allows guests to swap resort backgrounds with cinematic scenes:
- Sunset Beach & Tropical Ocean
- Golden Hour Resort Pool & Palms
- Luxury Villa & Mountain Panorama
- Night Fireworks Spectacular
- Custom Inpainting & Diffusion Prompt Replacement
"""
import io
import cv2
import numpy as np
from PIL import Image, ImageFilter, ImageEnhance

RESORT_SCENE_PRESETS = {
    "sunset_beach": {
        "title": "Sunset Beach & Ocean",
        "primary_color": (255, 120, 60),
        "ambient_warmth": 1.2,
    },
    "tropical_pool": {
        "title": "Tropical Pool & Palms",
        "primary_color": (30, 160, 220),
        "ambient_warmth": 1.0,
    },
    "golden_hour": {
        "title": "Golden Hour Oasis",
        "primary_color": (250, 190, 80),
        "ambient_warmth": 1.3,
    },
    "night_fireworks": {
        "title": "Night Fireworks Spectacular",
        "primary_color": (40, 20, 80),
        "ambient_warmth": 0.85,
    },
}

def generate_procedural_backdrop(width: int, height: int, preset_key: str = "sunset_beach") -> Image.Image:
    """
    Generates a high-resolution gradient backdrop corresponding to the resort theme.
    """
    preset = RESORT_SCENE_PRESETS.get(preset_key, RESORT_SCENE_PRESETS["sunset_beach"])
    top_color = preset["primary_color"]
    bottom_color = (20, 40, 60) if preset_key == "night_fireworks" else (240, 220, 190)

    # Create vertical gradient
    base = np.zeros((height, width, 3), dtype=np.uint8)
    for y in range(height):
        factor = y / float(height)
        r = int(top_color[0] * (1 - factor) + bottom_color[0] * factor)
        g = int(top_color[1] * (1 - factor) + bottom_color[1] * factor)
        b = int(top_color[2] * (1 - factor) + bottom_color[2] * factor)
        base[y, :] = (r, g, b)

    bg = Image.fromarray(base)
    # Apply soft atmospheric blur
    return bg.filter(ImageFilter.GaussianBlur(radius=15))

def composite_foreground_onto_scene(
    foreground_png_bytes: bytes,
    background_bytes: bytes | None = None,
    preset_theme: str = "sunset_beach",
    apply_color_harmonization: bool = True
) -> bytes:
    """
    Composites a transparent foreground cutout (RGBA) onto a scenic background.
    """
    fg_img = Image.open(io.BytesIO(foreground_png_bytes)).convert("RGBA")
    w, h = fg_img.size

    if background_bytes:
        bg_img = Image.open(io.BytesIO(background_bytes)).convert("RGB")
        bg_img = bg_img.resize((w, h), Image.Resampling.LANCZOS)
    else:
        bg_img = generate_procedural_backdrop(w, h, preset_theme)

    if apply_color_harmonization:
        preset = RESORT_SCENE_PRESETS.get(preset_theme, RESORT_SCENE_PRESETS["sunset_beach"])
        warmth = preset["ambient_warmth"]
        
        # Split RGBA channels
        r, g, b, alpha = fg_img.split()
        rgb_fg = Image.merge("RGB", (r, g, b))
        
        # Warmth tone adjustment
        enhancer = ImageEnhance.Color(rgb_fg)
        rgb_fg = enhancer.enhance(warmth)
        
        # Re-attach original alpha mask
        r_new, g_new, b_new = rgb_fg.split()
        fg_img = Image.merge("RGBA", (r_new, g_new, b_new, alpha))

    # Composite foreground on top of background
    bg_rgba = bg_img.convert("RGBA")
    composite = Image.alpha_composite(bg_rgba, fg_img).convert("RGB")

    output = io.BytesIO()
    composite.save(output, format="JPEG", quality=95)
    return output.getvalue()
