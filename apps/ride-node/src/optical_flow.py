import cv2
import numpy as np
import threading
import time
from loguru import logger

class OpticalFlowAnalyzer:
    def __init__(self, camera_index=0):
        self.camera_index = camera_index
        self.current_speed_category = "NORMAL"
        self.running = False
        
        # We classify speeds to map to shutter speeds later
        self.SPEED_THRESHOLDS = {
            "SLOW": 2.0,    # Average vector magnitude < 2.0
            "NORMAL": 5.0,  # Average vector magnitude < 5.0
            "FAST": float('inf')
        }

    def start(self):
        self.running = True
        threading.Thread(target=self._flow_worker, daemon=True).start()
        logger.info("Optical Flow Analyzer started.")

    def stop(self):
        self.running = False

    def get_speed_category(self):
        return self.current_speed_category

    def _flow_worker(self):
        cap = cv2.VideoCapture(self.camera_index)
        if not cap.isOpened():
            logger.error("Optical Flow: Could not open webcam.")
            self.running = False
            return

        ret, frame1 = cap.read()
        if not ret:
            logger.error("Optical Flow: Could not read first frame.")
            cap.release()
            self.running = False
            return

        prvs = cv2.cvtColor(frame1, cv2.COLOR_BGR2GRAY)
        
        # Resize to speed up dense optical flow computation
        prvs = cv2.resize(prvs, (320, 240))

        logger.info("Optical Flow: Background calculation loop running...")

        while self.running:
            ret, frame2 = cap.read()
            if not ret:
                time.sleep(0.1)
                continue

            next_frame = cv2.cvtColor(frame2, cv2.COLOR_BGR2GRAY)
            next_frame = cv2.resize(next_frame, (320, 240))

            # Calculate Dense Optical Flow (Farneback)
            flow = cv2.calcOpticalFlowFarneback(
                prvs, next_frame, None, 
                pyr_scale=0.5, levels=3, winsize=15, 
                iterations=3, poly_n=5, poly_sigma=1.2, flags=0
            )
            
            # Compute magnitude of the 2D flow vectors
            mag, _ = cv2.cartToPolar(flow[..., 0], flow[..., 1])
            
            # Get the 95th percentile magnitude to ignore small noise but capture fast moving objects
            # Using mean can be diluted by large static background
            flow_score = np.percentile(mag, 95)
            
            if flow_score < self.SPEED_THRESHOLDS["SLOW"]:
                self.current_speed_category = "SLOW"
            elif flow_score < self.SPEED_THRESHOLDS["NORMAL"]:
                self.current_speed_category = "NORMAL"
            else:
                self.current_speed_category = "FAST"
                
            # Update previous frame
            prvs = next_frame
            
            # Sleep briefly to reduce CPU load (10 fps is enough for speed classification)
            time.sleep(0.1)

        cap.release()
        logger.info("Optical Flow Analyzer stopped.")
