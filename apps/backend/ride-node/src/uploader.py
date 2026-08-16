import base64
import hashlib
import hmac
import os
import queue
import threading
from dataclasses import dataclass
from pathlib import Path
from typing import Protocol
from uuid import uuid4

import boto3
import redis
from loguru import logger


@dataclass(frozen=True)
class UploadReceipt:
    remote_key: str
    byte_length: int
    checksum_sha256: str
    durable: bool


class UploadTransport(Protocol):
    def upload(self, file_path: Path) -> UploadReceipt:
        ...


def sha256_checksum(file_path: Path) -> tuple[str, str]:
    digest = hashlib.sha256()
    with file_path.open("rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(chunk)
    raw_digest = digest.digest()
    return digest.hexdigest(), base64.b64encode(raw_digest).decode("ascii")


class R2UploadTransport:
    def __init__(
        self,
        endpoint_url: str,
        access_key_id: str,
        secret_access_key: str,
        bucket: str,
        prefix: str = "ride-captures",
    ):
        self.bucket = bucket
        self.prefix = prefix.strip("/")
        self.client = boto3.client(
            "s3",
            endpoint_url=endpoint_url,
            aws_access_key_id=access_key_id,
            aws_secret_access_key=secret_access_key,
            region_name="auto",
        )

    @classmethod
    def from_environment(cls) -> "R2UploadTransport | None":
        values = {
            "endpoint_url": os.getenv("R2_ENDPOINT_URL"),
            "access_key_id": os.getenv("R2_ACCESS_KEY_ID"),
            "secret_access_key": os.getenv("R2_SECRET_ACCESS_KEY"),
            "bucket": os.getenv("R2_BUCKET"),
        }
        missing = [name for name, value in values.items() if not value]
        if missing:
            logger.warning(
                "Ride upload disabled; missing configuration: {}",
                ", ".join(sorted(missing)),
            )
            return None

        return cls(
            endpoint_url=values["endpoint_url"] or "",
            access_key_id=values["access_key_id"] or "",
            secret_access_key=values["secret_access_key"] or "",
            bucket=values["bucket"] or "",
            prefix=os.getenv("R2_PREFIX", "ride-captures"),
        )

    def upload(self, file_path: Path) -> UploadReceipt:
        local_size = file_path.stat().st_size
        checksum_hex, checksum_base64 = sha256_checksum(file_path)
        object_name = f"{uuid4().hex}-{file_path.name}"
        remote_key = f"{self.prefix}/{object_name}" if self.prefix else object_name

        with file_path.open("rb") as source:
            response = self.client.put_object(
                Bucket=self.bucket,
                Key=remote_key,
                Body=source,
                ContentLength=local_size,
                ChecksumSHA256=checksum_base64,
                Metadata={"sha256": checksum_hex},
            )

        head = self.client.head_object(
            Bucket=self.bucket,
            Key=remote_key,
            ChecksumMode="ENABLED",
        )
        acknowledged_checksum = head.get("ChecksumSHA256") or response.get("ChecksumSHA256")
        acknowledged_size = int(head.get("ContentLength", -1))
        metadata_checksum = str(head.get("Metadata", {}).get("sha256", ""))
        durable = (
            acknowledged_size == local_size
            and hmac.compare_digest(str(acknowledged_checksum or ""), checksum_base64)
            and hmac.compare_digest(metadata_checksum, checksum_hex)
        )

        return UploadReceipt(
            remote_key=remote_key,
            byte_length=acknowledged_size,
            checksum_sha256=metadata_checksum,
            durable=durable,
        )


class Uploader:
    def __init__(self, transport: UploadTransport | None = None, redis_client: redis.Redis | None = None):
        self.transport = transport
        self.redis_client = redis_client
        self.upload_queue: queue.Queue[str] = queue.Queue()
        self.worker_thread = threading.Thread(target=self._upload_worker, daemon=True)

    @classmethod
    def from_environment(cls) -> "Uploader":
        redis_host = os.getenv("REDIS_HOST", "localhost")
        redis_port = int(os.getenv("REDIS_PORT", "6379"))
        redis_password = os.getenv("REDIS_PASSWORD", None)
        
        redis_client = None
        try:
            redis_client = redis.Redis(host=redis_host, port=redis_port, password=redis_password, decode_responses=True)
            redis_client.ping()
        except Exception as e:
            logger.warning(f"Failed to connect to Redis: {e}")
            redis_client = None
            
        return cls(R2UploadTransport.from_environment(), redis_client)

    def start(self) -> None:
        self.worker_thread.start()
        logger.info("Upload worker started")

    def enqueue(self, file_path: str) -> None:
        self.upload_queue.put(file_path)
        logger.debug("Enqueued {} for upload", file_path)

    def process_file(self, raw_file_path: str) -> bool:
        file_path = Path(raw_file_path)
        if not file_path.is_file():
            logger.error("Upload source is missing or is not a file: {}", file_path)
            return False
        if self.transport is None:
            logger.error("Upload transport is not configured; retaining {}", file_path)
            return False

        original_size = file_path.stat().st_size
        original_checksum, _ = sha256_checksum(file_path)
        try:
            receipt = self.transport.upload(file_path)
        except Exception as error:
            logger.error("Upload failed for {}; source retained: {}", file_path, error)
            return False

        current_size = file_path.stat().st_size if file_path.exists() else -1
        current_checksum = sha256_checksum(file_path)[0] if file_path.exists() else ""
        if (
            not receipt.durable
            or receipt.byte_length != original_size
            or current_size != original_size
            or not hmac.compare_digest(receipt.checksum_sha256, original_checksum)
            or not hmac.compare_digest(current_checksum, original_checksum)
        ):
            logger.error(
                "Upload acknowledgement could not be verified for {}; source retained",
                file_path,
            )
            return False

        file_path.unlink()
        logger.success("Upload verified at {}; removed local source {}", receipt.remote_key, file_path)
        
        # Publish event to Master OS Redis Stream
        if self.redis_client:
            event_payload = {
                "operation": "register",
                "url": f"https://{self.transport.bucket}.r2.cloudflarestorage.com/{receipt.remote_key}",
                "fileSize": str(receipt.byte_length),
                "originalFilename": file_path.name,
                "fileHash": receipt.checksum_sha256,
                "status": "pending_processing",
                "source": "ride-node"
            }
            try:
                self.redis_client.xadd("photo_ingestion", event_payload, maxlen=10000)
                logger.info("Published photo_ingestion event to Redis Stream")
            except Exception as e:
                logger.error(f"Failed to publish event to Redis: {e}")
                
        return True

    def _upload_worker(self) -> None:
        while True:
            file_path = self.upload_queue.get()
            try:
                self.process_file(file_path)
            finally:
                self.upload_queue.task_done()
