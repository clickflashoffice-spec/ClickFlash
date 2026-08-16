import sys
import os
import urllib.request
import cv2

MODEL_URL = "https://raw.githubusercontent.com/opencv/opencv_contrib/master/modules/quality/samples/brisque_model_live.yml"
RANGE_URL = "https://raw.githubusercontent.com/opencv/opencv_contrib/master/modules/quality/samples/brisque_range_live.yml"

def download_file(url, filename):
    if not os.path.exists(filename):
        urllib.request.urlretrieve(url, filename)

def main():
    if len(sys.argv) < 2:
        print("Usage: python brisque_scorer.py <image_path>")
        sys.exit(1)
        
    image_path = sys.argv[1]
    if not os.path.exists(image_path):
        print(f"Error: File {image_path} not found")
        sys.exit(1)

    script_dir = os.path.dirname(os.path.abspath(__file__))
    model_path = os.path.join(script_dir, "brisque_model_live.yml")
    range_path = os.path.join(script_dir, "brisque_range_live.yml")

    try:
        download_file(MODEL_URL, model_path)
        download_file(RANGE_URL, range_path)
    except Exception as e:
        print(f"Error downloading models: {e}")
        sys.exit(1)

    try:
        img = cv2.imread(image_path)
        if img is None:
            print("Error: Could not read image")
            sys.exit(1)
            
        brisque = cv2.quality.QualityBRISQUE_create(model_path, range_path)
        score = brisque.compute(img)[0]
        # BRISQUE score ranges from 0 to 100. Lower is better quality.
        # We invert it to match the existing Sharpness Score logic where Higher is Better (100 = best).
        normalized_score = max(0, 100 - score)
        print(normalized_score)
    except Exception as e:
        print(f"Error computing BRISQUE: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
