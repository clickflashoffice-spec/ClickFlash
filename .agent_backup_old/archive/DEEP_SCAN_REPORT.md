# ClickFlash Deep Scan Report

**Date**: 2026-01-18
**Status**: CRITICAL FINDINGS
**Auditor**: Antigravity (Mission Control)

## Executive Summary

The deep scan has identified **3 Critical Issues** that undermine the core "Offline Ecosystem" promise. While the architecture is modular, recent optimizations (Phase 28) have aggressively stripped essential features (Face Recog, Previews) causing downstream failures in Touch App sync and functionality.

---

## 1. Critical Findings (Priority 0)

### 🚨 S-01: Hardcoded Secrets

- **Location**: `master-app/python/backend/auth.py` and `touch-app/python/backend/auth.py`
- **Issue**: `SECRET_KEY = "CHANGE_ME_IN_PRODUCTION"` is committed in the codebase.
- **Risk**: Full session hijacking if an attacker gains network access.
- **Fix**: Move to `.env` file handling immediately.

### 🚨 L-01: The "Ghost" Face Recognition (Law 03 Violation)

- **Symptom**: Touch App Face Search returns 0 results.
- **Root Cause**: The new `photoWorker.ts` (Node.js) **does not implement Face Detection**. It only performs `sharp` image resizing. The `metadata.json` generated for Touch contains empty `faces: []` arrays.
- **Impact**: One of the core selling points (Face Search) is non-functional in the React/Node stack.

### 🚨 L-02: Massive Bandwidth Regression (Law 05 Violation)

- **Symptom**: Kiosk Sync is slow; Touch App loads 20MB+ original images.
- **Root Cause**: Phase 28 "Import Speed Optimization" removed the generation of `_preview.jpg` (1200px) and `_tiny.webp`.
- **Logic Chain**: `kiosk_sync_service.py` looks for `_preview.jpg`. When missing, it falls back to copying the **Original** (Line 60).
- **Impact**: Destroys network performance on WiFi; violates "Data Role Separation".

---

## 2. Architecture & Maintenance (Priority 1)

### M-01: Manual Code Duplication (Law 01 Compliance)

- **Finding**: `auth.py` and `database.py` are identical across Master and Touch.
- **Status**: **Compliant** with "Law 01: Absolute Separation".
- **Action**: No code change needed, but requires "Lockstep Deployment" protocol to ensure updates (like fixing S-01) are applied to both.

### M-02: Missing Dependencies

- **Finding**: `touch-app/python/requirements.txt` lists `zeroconf` without version pin, while Master has `0.131.0`.
- **Fix**: Pin versions to ensure identical runtime environments.

---

## 3. Remediation Roadmap

### Phase 31: Security & Stability Patch

1. **Secure Auth**: Implement `python-dotenv` and generate distinct secrets for Master and Touch.
2. **Re-enable Previews**: Restore `preview` (1200px) generation in `photoWorker.ts`. It is essential for Touch.
    - *optimisation*: Offload to a lower-priority queue if import speed is critical.

### Phase 32: Face Recognition Restoration

1. **Implement Face Worker**: Add a dedicated `faceWorker.ts` (or Python sidecar) to process embeddings *after* the initial import.
2. **Backfill Script**: Scan existing photos to generate missing embeddings.

### Phase 33: Dependency Unification

1. **Lockfiles**: Generate `pip` lockfiles for both environments.

---

**Verify**: Awaiting user approval to proceed with Phase 31 (Security & Previews).
