import time
import os
import threading
from loguru import logger
import gphoto2 as gp
from src.uploader import Uploader

try:
    import cv2
    import numpy as np
    has_cv = True
except ImportError:
    has_cv = False

class CameraManager:
    def __init__(self):
        self.camera = None
        self.context = gp.Context()
        self.is_capturing = False

    def connect(self):
        try:
            self.camera = gp.Camera()
            self.camera.init(self.context)
            logger.info("Successfully connected to Nikon D7000")
            return True
        except gp.GPhoto2Error as e:
            logger.error(f"Failed to connect to camera: {e}")
            self.camera = None
            return False

    def capture(self):
        if self.is_capturing:
            logger.warning("Already capturing, ignoring trigger...")
            return None
            
        if not self.camera:
            logger.warning("Camera not connected. Attempting reconnect...")
            if not self.connect():
                return None
        
        self.is_capturing = True
        try:
            logger.info("Triggering high-res DSLR capture...")
            file_path = self.camera.capture(gp.GP_CAPTURE_IMAGE, self.context)
            
            # Download image to local disk
            target = os.path.join("/tmp/ride_photos", file_path.name)
            os.makedirs("/tmp/ride_photos", exist_ok=True)
            
            camera_file = self.camera.file_get(
                file_path.folder, file_path.name, gp.GP_FILE_TYPE_NORMAL, self.context)
            camera_file.save(target)
            logger.success(f"Saved locally to {target}")
            return target
        except Exception as e:
            logger.error(f"Capture failed: {e}")
            return None
        finally:
            self.is_capturing = False

def run_vision_trigger(camera: CameraManager, uploader: Uploader):
    if not has_cv:
        logger.error("OpenCV not installed. Vision trigger cannot run.")
        return

    logger.info("Starting AI Vision Trigger using USB Webcam...")
    
    # Open standard USB webcam (index 0 or 1)
    # The Nikon is connected via gphoto2, so the OS usually assigns the cheap webcam to index 0
    cap = cv2.VideoCapture(0)
    
    if not cap.isOpened():
        logger.error("Could not open USB webcam for vision trigger.")
        return

    # Background subtractor for motion detection
    back_sub = cv2.createBackgroundSubtractorMOG2(history=500, varThreshold=50, detectShadows=False)
    
    # Cooldown to prevent triggering 30 times a second while rider is passing
    cooldown = 0
    
    while True:
        ret, frame = cap.read()
        if not ret:
            logger.warning("Failed to read from webcam.")
            time.sleep(1)
            continue

        # Optional: Define a ROI (Region of Interest) Box over the frame 
        # For a waterslide, this would be the tube exit.
        # height, width = frame.shape[:2]
        # roi = frame[int(height*0.2):int(height*0.8), int(width*0.2):int(width*0.8)]
        
        # Apply background subtraction
        fg_mask = back_sub.apply(frame)
        
        # Clean up mask (remove noise)
        kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
        fg_mask = cv2.morphologyEx(fg_mask, cv2.MORPH_OPEN, kernel)
        
        # Find contours of moving objects
        contours, _ = cv2.findContours(fg_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        motion_detected = False
        for contour in contours:
            # If the moving object is large enough (e.g. a person, not a water splash drop)
            if cv2.contourArea(contour) > 5000:
                motion_detected = True
                break
                
        if motion_detected and cooldown == 0:
            logger.warning("AI VISION TRIGGER: Massive motion detected! Firing DSLR!")
            
            # Fire DSLR in a separate thread so we don't block the video stream
            def trigger_dslr():
                img_path = camera.capture()
                if img_path:
                    uploader.enqueue(img_path)
            
            threading.Thread(target=trigger_dslr).start()
            
            # Set cooldown (e.g. 3 seconds before taking next rider's photo)
            cooldown = 90 # approx 90 frames @ 30fps
            
        if cooldown > 0:
            cooldown -= 1

def main():
    logger.info("Starting ClickFlash Automatic Ride Node Daemon (Vision Trigger Edition)")
    
    camera = CameraManager()
    camera.connect()
    
    uploader = Uploader.from_environment()
    uploader.start()
    
    # Run the OpenCV Vision Trigger on the main thread
    run_vision_trigger(camera, uploader)

if __name__ == "__main__":
    main()
