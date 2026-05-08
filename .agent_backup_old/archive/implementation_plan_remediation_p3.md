# Remediation Phase 3: Adaptive Performance

Implement dynamic thermal throttling and performance optimization to ensure system stability during high-volume photo processing.

## RCA

High-resolution photo processing (tier generation, face recognition, editing) is CPU-bound. On compact or fanless hardware used in kiosk environments, sustained load leads to thermal saturation, causing OS-level throttling or application crashes.

## Proposed Changes

### [Component] Master App (PhotoProcessor)

#### [MODIFY] [photo_processor.py](file:///e:/ClickFlash/master-app/python/backend/services/photo_processor.py)

- **Dynamic Concurrency Control**:
  - Introduce an `asyncio.Semaphore` to manage concurrent processing tasks.
  - Implement an `adaptive_concurrency_sync` loop that polls `get_max_temperature()` and adjusts the semaphore's effective limit.
  - **Logic**:
    - Under 75°C: Concurrency = 2 (Max for current Rule 13).
    - 75°C - 82°C: Concurrency = 1.
    - 82°C - 88°C: Concurrency = 1 + Forced 2s delay between tasks.
    - Above 88°C: Emergency Pause (Clear semaphore/Lock) + Wait for cool-down to 70°C.

- **WMI Optimization**:
  - Cache the WMI object to avoid overhead of re-initializing the COM interface on every temperature check.

### [Component] Master App (Telemetry)

#### [NEW] [telemetry_service.py](file:///e:/ClickFlash/master-app/python/backend/services/telemetry_service.py)

- **Features**:
  - Track CPU usage and temperature.
  - Provide a hook for the UI to display "Thermal Health" status.
  - Broadcast thermal warnings via WebSocket to any connected Kiosks (optional/phase 4).

## Verification Plan

### Automated Tests

- Mock `wmi` responses to simulate various thermal states.
- Verify that `process_photo` queue times increase as simulated temperature rises.
- Stress test the `ProcessPoolExecutor` and verify it doesn't exceed the dynamic semaphore limit.

### Manual Verification

- Observe the "Thermal Health" metrics in the Dashboard during a large import (500+ photos).
- Verify that the system remains responsive even when the CPU is under load.

Verify: [Plan Approved | Adjustment Needed]?
