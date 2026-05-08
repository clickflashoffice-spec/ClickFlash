# Plan: Phase 23 - Final Ecosystem Stabilization & Production Hardening

## 1. Problem Statement (RCA)

- **Bottleneck**: The system is functional but requires high-availability configurations (WAL, disk pruning, and global error recovery) to survive real-world photography events with 100GB+ datasets and potentially unreliable hardware.

## 2. Technical Architecture

### A. Database Durability

- **WAL Checkpoint Management**: Ensure `MaintenanceService` triggers full WAL checkpoints (`wal_checkpoint(RESTART)`) regularly to prevent `master.db-wal` from growing indefinitely.

### B. Disk Life-support

- **Pruning Logic**: Implement automatic pruning of tiered assets and old logs when disk usage exceeds 90%.

### C. Global Error Handling

- **IPC Crash Protection**: Ensure the Electron main process catches all backend signals and restarts services if they hang.

## 3. Implementation Steps

### Task 1: Checkpoint & Pruning

- [ ] Update `e:\ClickFlash\master-app\react-new\backend\services\maintenanceService.ts`:
  - Add `performCheckpoint()` call to the daily maintenance.
  - Implement `pruneLargeDirs()` to clear non-essential tiered assets when space is low.

### Task 2: Service Protection

- [ ] Update `e:\ClickFlash\master-app\react-new\electron-main.js`:
  - Refine error logging for the bundled backend processes.

### Task 3: Final Production Configuration

- [ ] Update `e:\ClickFlash\master-app\react-new\backend\config\constants.ts`:
  - Set `PRUNE_RETENTION_DAYS`.
  - Ensure development flags are disabled for production builds.

## 4. Verification Plan

- **Disk Pressure Simulation**: Manually trigger the pruning logic and verify it deletes oldest assets first.
- **WAL Growth Test**: Generate 1000 mutations and verify the checkpoint reduces WAL size to zero.
