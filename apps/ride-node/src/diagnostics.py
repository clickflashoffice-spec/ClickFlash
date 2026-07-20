import cv2
import numpy as np
import requests
from loguru import logger
from .camera import CameraManager

class AutoCalibration:
    def __init__(self, camera_manager: CameraManager, webhook_url: str = "http://localhost:3000/api/diagnostics"):
        self.camera = camera_manager
        self.webhook_url = webhook_url

    def run_daily_diagnostics(self):
        logger.info("Starting Daily Auto-Calibration & Lens Diagnostics...")
        
        # 1. Take a test photo
        file_path = self.camera.capture()
        if not file_path:
            logger.error("Diagnostic Failed: Could not capture test photo.")
            self._send_alert("Camera Connection Failure", "Failed to capture test image during daily diagnostics.")
            return False

        # 2. Analyze the photo
        img = cv2.imread(file_path, cv2.IMREAD_GRAYSCALE)
        if img is None:
            logger.error(f"Diagnostic Failed: Could not read image file at {file_path}")
            return False

        issues = []

        # A. Exposure Check (Mean Brightness)
        mean_brightness = np.mean(img)
        logger.debug(f"Mean brightness: {mean_brightness}")
        if mean_brightness < 20:
            issues.append("Severe Underexposure (Lens cap on or flash failure?)")
        elif mean_brightness > 240:
            issues.append("Severe Overexposure (Settings issue?)")

        # B. Focus Check (Variance of Laplacian)
        laplacian_var = cv2.Laplacian(img, cv2.CV_64F).var()
        logger.debug(f"Laplacian Variance (Focus Score): {laplacian_var}")
        # Threshold depends on the scene. For a fixed DSLR on a track, it should remain relatively constant.
        if laplacian_var < 50: 
            issues.append("Image Out of Focus (Autofocus failed or lens bumped)")

        # C. Lens Dirt / Dust Spots Check
        # Apply a heavy blur to smooth out the actual scene, then find dark spots
        blurred = cv2.GaussianBlur(img, (51, 51), 0)
        # Calculate difference between original and blurred
        diff = cv2.absdiff(img, blurred)
        # Threshold the difference
        _, thresh = cv2.threshold(diff, 30, 255, cv2.THRESH_BINARY)
        # Find contours of dark spots
        contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        dirt_spots = 0
        for cnt in contours:
            area = cv2.contourArea(cnt)
            # Filter out tiny noise and massive objects. We are looking for sensor dust blobs.
            if 100 < area < 5000:
                dirt_spots += 1
                
        logger.debug(f"Detected {dirt_spots} potential dust/dirt spots.")
        if dirt_spots > 10:
            issues.append(f"Lens/Sensor Dirt Detected ({dirt_spots} spots found)")

        # 3. Report Results
        if issues:
            logger.error("Diagnostics finished with warnings!")
            for issue in issues:
                logger.warning(f" - {issue}")
            self._send_alert("Lens Diagnostics Warning", ", ".join(issues))
            return False
            
        logger.success("Daily Diagnostics Passed. System is healthy.")
        return True

    def _send_alert(self, title: str, description: str):
        logger.info(f"Mocking Webhook Alert to {self.webhook_url} -> {title}: {description}")
        # In a real scenario:
        # try:
        #     requests.post(self.webhook_url, json={"title": title, "description": description, "severity": "high"})
        # except Exception as e:
        #     logger.error(f"Failed to send webhook: {e}")
