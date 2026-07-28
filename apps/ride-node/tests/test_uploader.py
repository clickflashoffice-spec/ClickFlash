import tempfile
import unittest
from pathlib import Path

from src.uploader import UploadReceipt, Uploader, sha256_checksum


class StubTransport:
    def __init__(self, receipt: UploadReceipt | None = None, error: Exception | None = None):
        self.receipt = receipt
        self.error = error

    def upload(self, file_path: Path) -> UploadReceipt:
        if self.error:
            raise self.error
        if not self.receipt:
            raise AssertionError("Receipt is required")
        return self.receipt


class UploaderTests(unittest.TestCase):
    def make_source(self, directory: str, content: bytes = b"ride-photo") -> Path:
        source = Path(directory) / "capture.jpg"
        source.write_bytes(content)
        return source

    def test_retains_source_without_transport(self):
        with tempfile.TemporaryDirectory() as directory:
            source = self.make_source(directory)

            self.assertFalse(Uploader().process_file(str(source)))
            self.assertTrue(source.exists())

    def test_retains_source_when_upload_raises(self):
        with tempfile.TemporaryDirectory() as directory:
            source = self.make_source(directory)
            transport = StubTransport(error=RuntimeError("network failure"))

            self.assertFalse(Uploader(transport).process_file(str(source)))
            self.assertTrue(source.exists())

    def test_retains_source_when_acknowledgement_is_not_durable(self):
        with tempfile.TemporaryDirectory() as directory:
            source = self.make_source(directory)
            checksum = sha256_checksum(source)[0]
            receipt = UploadReceipt("ride/capture.jpg", source.stat().st_size, checksum, False)

            self.assertFalse(Uploader(StubTransport(receipt)).process_file(str(source)))
            self.assertTrue(source.exists())

    def test_retains_source_when_acknowledged_size_differs(self):
        with tempfile.TemporaryDirectory() as directory:
            source = self.make_source(directory)
            checksum = sha256_checksum(source)[0]
            receipt = UploadReceipt("ride/capture.jpg", source.stat().st_size + 1, checksum, True)

            self.assertFalse(Uploader(StubTransport(receipt)).process_file(str(source)))
            self.assertTrue(source.exists())

    def test_retains_source_when_acknowledged_checksum_differs(self):
        with tempfile.TemporaryDirectory() as directory:
            source = self.make_source(directory)
            receipt = UploadReceipt("ride/capture.jpg", source.stat().st_size, "wrong-checksum", True)

            self.assertFalse(Uploader(StubTransport(receipt)).process_file(str(source)))
            self.assertTrue(source.exists())

    def test_deletes_source_only_after_verified_acknowledgement(self):
        with tempfile.TemporaryDirectory() as directory:
            source = self.make_source(directory)
            checksum = sha256_checksum(source)[0]
            receipt = UploadReceipt("ride/capture.jpg", source.stat().st_size, checksum, True)

            self.assertTrue(Uploader(StubTransport(receipt)).process_file(str(source)))
            self.assertFalse(source.exists())


if __name__ == "__main__":
    unittest.main()
