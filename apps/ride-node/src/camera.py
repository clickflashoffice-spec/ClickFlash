import os
from loguru import logger
import gphoto2 as gp

class CameraManager:
    def __init__(self):
        self.camera = None
        self.context = gp.Context()
        self.is_capturing = False

    def connect(self):
        try:
            self.camera = gp.Camera()
            self.camera.init(self.context)
            logger.info("Successfully connected to Nikon D7000 via gphoto2")
            return True
        except gp.GPhoto2Error as e:
            logger.error(f"Failed to connect to camera: {e}")
            self.camera = None
            return False

    def set_shutter_speed(self, speed_str: str):
        """
        Dynamically adjusts the DSLR shutter speed.
        speed_str: string representation like '1/2000' or '1/500'
        """
        if not self.camera:
            return False
            
        try:
            config = self.camera.get_config(self.context)
            # Find the shutterspeed config
            shutter_speed = config.get_child_by_name("shutterspeed")
            shutter_speed.set_value(speed_str)
            self.camera.set_config(config, self.context)
            logger.info(f"Shutter speed adapted to: {speed_str}")
            return True
        except gp.GPhoto2Error as e:
            logger.error(f"Failed to set shutter speed to {speed_str}: {e}")
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
            target_dir = "/tmp/ride_photos"
            if os.name == 'nt':
                target_dir = "C:/tmp/ride_photos"
                
            os.makedirs(target_dir, exist_ok=True)
            target = os.path.join(target_dir, file_path.name)
            
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
