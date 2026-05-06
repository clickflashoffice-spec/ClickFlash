# Plan: Phase 22 - Hardware Abstraction & Print Pipeline (Final Integration)

## 1. Problem Statement (RCA)

- **Bottleneck**: Current printing is synchronous and tightly coupled to `pdf-to-printer`, lacking support for commercial thermal printer features, hardware status monitoring, and batch processing.
- **Goal**: Implement a "Hardware Abstraction Layer" (HAL) that provides a unified, queue-based pipeline for reliable photo printing.

## 2. Technical Architecture

### A. Printer Management Service (Master)

- **abstraction**: Create `PrinterService.ts` to handle:
  - Enumeration via `jpeg-to-printer` (or `powershell` as fallback).
  - Status polling (Online/Offline/Paper-Out).
  - Unified Job Queue.

### B. Print Pipeline (Worker Thread)

- **job processing**: Move printing to a dedicated worker thread or async queue to prevent blocking the UI.
- **format conversion**: Ensure images are correctly sized for 4x6, 6x8, etc., before sending to the driver.

### C. Frontend Integration

- Update Master Management UI to show real-time printer status and queue depth.
- Implement "Auto-Print" for specific product types.

## 3. Implementation Steps

### Task 1: Unified Printer Abstraction

- [ ] Create `e:\ClickFlash\master-app\react-new\backend\services\HardwareService.ts`:
  - Implement `getPrinters()` with detailed health info.
  - Implement `enqueueJob()` with priority and paper-size logic.

### Task 2: Robust Print Route

- [ ] Refactor `e:\ClickFlash\master-app\react-new\backend\routes\orders.ts`:
  - Replace direct `ptp.print` calls with `hardwareService.print(photoPath, options)`.
  - Add support for "Package Printing" (printing an entire order).

### Task 3: Printer Monitoring Dashboard

- [ ] Update `e:\ClickFlash\master-app\react-new\backend\routes\system.ts`:
  - Add `/hardware/status` endpoint.

## 4. Verification Plan

- **Virtual Printer Test**: Send 10 jobs to "Microsoft Print to PDF" and verify they execute correctly in sequence.
- **Status API Check**: Verify that disconnecting a printer or changing the default is reflected in the API response within 5 seconds.
