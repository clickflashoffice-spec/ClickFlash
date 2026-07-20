import os
import time
import queue
import threading
from loguru import logger

class Uploader:
    def __init__(self):
        self.upload_queue = queue.Queue()
        self.worker_thread = threading.Thread(target=self._upload_worker, daemon=True)

    def start(self):
        self.worker_thread.start()
        logger.info("Upload worker started")

    def enqueue(self, file_path: str):
        self.upload_queue.put(file_path)
        logger.debug(f"Enqueued {file_path} for upload")

    def _upload_worker(self):
        while True:
            try:
                file_path = self.upload_queue.get()
                logger.info(f"Starting upload for {file_path} to Cloudflare R2...")
                
                # Simulate Boto3 R2 Upload latency
                time.sleep(1) 
                
                logger.success(f"Upload complete: {file_path}")
                
                # Cleanup local file
                if os.path.exists(file_path):
                    os.remove(file_path)
                    logger.debug(f"Cleaned up local file: {file_path}")
                
                self.upload_queue.task_done()
            except Exception as e:
                logger.error(f"Upload worker error: {e}")
