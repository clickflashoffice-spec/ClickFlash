import os
import sys
import numpy as np
import cv2
import time
from sentinel import AISentinel, SPOOL_DIR, JOURNAL_FILE

def test_sentinel_pipeline():
    print("[TEST] Testing AI Sentinel & Ingest Insurance Engine...")
    sentinel = AISentinel()
    
    # 1. Test Heartbeat and Telemetry
    ack = sentinel.receive_heartbeat({
        "station_id": "test-station-01",
        "tether_active": True,
        "request_throttle": False
    })
    assert ack["status"] == "acknowledged", "Heartbeat failed"
    print("[PASS] Heartbeat acknowledged successfully")
    
    telemetry = sentinel.get_telemetry()
    assert telemetry["masterOnline"] is True, "Master should be online"
    assert telemetry["cpuLoadPercent"] >= 0, "CPU load valid"
    print(f"[PASS] Telemetry verified: CPU={telemetry['cpuLoadPercent']}%, Memory={telemetry['memoryUsedMb']}MB")
    
    # 2. Test Ingest Insurance on Sharp Synthetic Photo
    sharp_img = np.full((400, 400, 3), 128, dtype=np.uint8)
    for i in range(10, 390, 20):
        cv2.line(sharp_img, (i, 10), (i, 390), (220, 50, 50), 2)
    cv2.circle(sharp_img, (200, 200), 80, (50, 220, 50), 3)
    _, sharp_bytes = cv2.imencode('.jpg', sharp_img)
    sharp_bytes = sharp_bytes.tobytes()
    
    res_sharp = sentinel.insure_photo(sharp_bytes, "photo_sharp_001")
    assert res_sharp["isInsured"] is True
    assert res_sharp["verdict"] == "PASS"
    print(f"[PASS] Sharp Photo Passed Insurance: Laplacian={res_sharp['laplacianScore']}, Confidence={res_sharp['overallConfidence']}%")
    
    # 3. Test Ingest Insurance on Blurry Photo (Gaussian blur)
    blurry_img = cv2.GaussianBlur(sharp_img, (51, 51), 0)
    _, blur_bytes = cv2.imencode('.jpg', blurry_img)
    blur_bytes = blur_bytes.tobytes()
    
    res_blur = sentinel.insure_photo(blur_bytes, "photo_blur_002")
    assert res_blur["verdict"] == "WARN_BLUR"
    print(f"[PASS] Blurry Photo Correctly Flagged: Laplacian={res_blur['laplacianScore']} (Threshold < 70) -> Verdict: {res_blur['verdict']}")
    
    # 4. Test Emergency Spool Buffer
    spool_id = sentinel.spool_emergency_photo(sharp_bytes, "emergency_001.jpg", {"camera": "Sony A7IV"})
    assert os.path.exists(os.path.join(SPOOL_DIR, f"{spool_id}.bin"))
    assert os.path.exists(os.path.join(SPOOL_DIR, f"{spool_id}.meta"))
    print(f"[PASS] Emergency Photo Spooled: {spool_id}")
    
    # 5. Clean up test spool files
    try:
        os.remove(os.path.join(SPOOL_DIR, f"{spool_id}.bin"))
        os.remove(os.path.join(SPOOL_DIR, f"{spool_id}.meta"))
    except Exception:
        pass
        
    print("\n[SUCCESS] ALL 5 AI SENTINEL & INSURANCE TESTS PASSED!")

if __name__ == "__main__":
    test_sentinel_pipeline()
