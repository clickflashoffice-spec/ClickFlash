import cv2
import numpy as np

def detect_blur(image_bytes: bytes) -> dict:
    """
    Computes the Laplacian variance of the image to detect blurriness.
    A lower variance indicates a blurrier image.
    """
    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    
    if img is None:
        raise ValueError("Invalid image data")

    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    
    # Calculate variance of the Laplacian
    variance = cv2.Laplacian(gray, cv2.CV_64F).var()
    
    # Simple threshold (can be adjusted or returned raw for client to decide)
    # Typically, variance < 100 is considered blurry.
    is_blurry = variance < 100.0
    
    return {
        "blur_score": float(variance),
        "is_blurry": bool(is_blurry)
    }

def detect_blinks_and_quality(image_bytes: bytes) -> dict:
    """
    Detects faces and uses basic heuristics for quality.
    For a fully robust blink detector, dlib's shape predictor or a tiny MobileNet
    eye-state classifier would be used. We start with a placeholder for eye/smile detection
    using Haar cascades for speed.
    """
    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    
    if img is None:
        raise ValueError("Invalid image data")

    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    
    # Using Haar cascades which are very fast on CPU
    face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
    eye_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_eye.xml')
    
    faces = face_cascade.detectMultiScale(gray, 1.3, 5)
    
    if len(faces) == 0:
        return {"faces_detected": 0, "eyes_visible": False, "quality_score": 0.0}
        
    eyes_found = 0
    for (x,y,w,h) in faces:
        roi_gray = gray[y:y+h, x:x+w]
        eyes = eye_cascade.detectMultiScale(roi_gray, 1.1, 3)
        eyes_found += len(eyes)
        
    # If we found at least 2 eyes per face on average, we assume no blinks
    # This is a very rough heuristic, optimized for CPU speed.
    eyes_visible = eyes_found >= (len(faces) * 1) 
    
    quality_score = 100.0 if eyes_visible else 50.0
    
    return {
        "faces_detected": len(faces),
        "eyes_visible": bool(eyes_visible),
        "quality_score": float(quality_score)
    }
