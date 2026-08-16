import argparse
import os
import io
import random
import sys
from PIL import Image, ImageOps

from segmentation_service import segment_everything
from scene_composite_service import composite_foreground_onto_scene, RESORT_SCENE_PRESETS

def process_magic_shot(input_path: str, output_path: str, theme: str = None):
    print(f"Reading {input_path}...")
    try:
        with open(input_path, "rb") as f:
            image_bytes = f.read()
    except Exception as e:
        print(f"Error reading input: {e}")
        sys.exit(1)

    print("Running MobileSAM segment_everything...")
    try:
        results = segment_everything(image_bytes)
    except Exception as e:
        print(f"Error during segmentation: {e}")
        sys.exit(1)

    if not results:
        print("Error: No objects detected in image.")
        sys.exit(1)

    # Assume largest object is the primary subject
    largest_obj = results[0]
    mask_png_bytes = largest_obj["mask_png"]

    # Convert to RGBA cutout
    print("Applying mask to generate foreground cutout...")
    orig_img = Image.open(io.BytesIO(image_bytes)).convert("RGBA")
    mask_img = Image.open(io.BytesIO(mask_png_bytes)).convert("L")
    
    # Ensure mask matches image size exactly
    if orig_img.size != mask_img.size:
        mask_img = mask_img.resize(orig_img.size, Image.Resampling.LANCZOS)
    
    # Optional: Slightly blur mask edges for anti-aliasing
    # from PIL import ImageFilter
    # mask_img = mask_img.filter(ImageFilter.GaussianBlur(radius=1))
    
    # Apply alpha
    orig_img.putalpha(mask_img)

    # Save to bytes
    fg_io = io.BytesIO()
    orig_img.save(fg_io, format="PNG")
    fg_bytes = fg_io.getvalue()

    # Select Theme
    if not theme or theme not in RESORT_SCENE_PRESETS:
        theme = random.choice(list(RESORT_SCENE_PRESETS.keys()))

    print(f"Compositing onto scene: {theme}...")
    try:
        output_bytes = composite_foreground_onto_scene(
            foreground_png_bytes=fg_bytes,
            preset_theme=theme,
            apply_color_harmonization=True
        )
    except Exception as e:
        print(f"Error during composition: {e}")
        sys.exit(1)

    print(f"Saving Magic Shot to {output_path}...")
    try:
        with open(output_path, "wb") as f:
            f.write(output_bytes)
    except Exception as e:
        print(f"Error saving output: {e}")
        sys.exit(1)

    print("Success: Magic Shot generated.")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="ClickFlash Magic Shots CLI")
    parser.add_argument("-i", "--input", required=True, help="Input JPEG path")
    parser.add_argument("-o", "--output", required=True, help="Output Magic Shot path")
    parser.add_argument("-t", "--theme", required=False, help="Specific scene preset")
    
    args = parser.parse_args()

    if not os.path.exists(args.input):
        print(f"Error: Input file {args.input} does not exist.")
        sys.exit(1)
        
    process_magic_shot(args.input, args.output, args.theme)
