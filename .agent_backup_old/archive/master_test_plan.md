# Phase 28: Master Test Plan

**Objective**: Verify functional integrity, performance, and stability of all three ClickFlash stacks (React, Python, C++) with a focus on recent "Gap Closure" features.

---

## 1. Test Strategy

We will employ a "Risk-Based Verification" approach:

1. **Critical Path**: Verify the core "Import -> Edit -> Buy" loop works on all stacks.
2. **Gap Closure**: Specifically test Thermal Monitoring and Disk Pruning in isolation.
3. **Parity Check**: Confirm UI/Logic matches between React (Gold Standard) and Python/C++.

---

## 2. Test Cases by Feature

### A. Core Workflow (The "Money" Loop)

*Applies to: React, Python, C++*

| ID | Test Case | Steps | Expected Result |
|----|-----------|-------|-----------------|
| CW-01 | **Photo Import** | 1. Drop 5 JPGs into watch folder. | Photos appear in Master UI. Thumbnails generated (tiny/preview). |
| CW-02 | **Sync to Touch** | 1. Import photos on Master.<br>2. Check Touch App. | Photos appear on Touch App within 5 seconds. |
| CW-03 | **Selection** | 1. User selects 2 photos on Touch.<br>2. Clicks "Order". | Order JSON created. Order pushed to Master. |
| CW-04 | **Order Fulfillment** | 1. Master detects new order.<br>2. Check output folder. | Full-res photos copied to `fulfilled/` folder. |

### B. Thermal Monitoring (Hardware Safety)

*Applies to: React, Python, C++*

| ID | Test Case | Steps | Expected Result |
|----|-----------|-------|-----------------|
| TM-01 | **Normal Operation** | 1. Start App.<br>2. Check logs/diagnostics. | Temp < 75°C. State: "Normal". No throttling. |
| TM-02 | **Warning State** | 1. Simulate temp = 76°C.<br>2. Process 10 photos. | UI shows "Warning". Processing works but logs "Throttled". |
| TM-03 | **Critical State** | 1. Simulate temp = 81°C. | UI shows "Critical". High delay between photos (e.g., 2s). |
| TM-04 | **Emergency Stop** | 1. Simulate temp = 86°C. | Processing PAUSES completely. Alert displayed. |

### C. Disk Space Pruning (Self-Healing)

*Applies to: React, Python, C++*

| ID | Test Case | Steps | Expected Result |
|----|-----------|-------|-----------------|
| DP-01 | **Monitoring** | 1. Check disk usage stats. | Reports correct % match with OS. |
| DP-02 | **Auto-Cleanup** | 1. Simulate disk usage = 91%.<br>2. Create dummy "old" thumbnails (>30 days). | "Old" thumbnails deleted. Recent ones kept. Log confirms MB freed. |
| DP-03 | **Manual Cleanup** | 1. Trigger "Clean Now" in Maintenance.<br>2. Select "Include Previews". | Previews folder cleared. Space freed. |

### D. AI & Intelligence (New Features)

*Applies to: React*

| ID | Test Case | Steps | Expected Result |
|----|-----------|-------|-----------------|
| AI-01 | **QR Generation** | 1. Open Touch App.<br>2. View Session. | QR Code displayed. Valid URL generated. |
| AI-02 | **Auto-Cull** | 1. Import blurry/eyes-closed photo.<br>2. Run Auto-Cull. | Photo marked "Rejected" or "Hidden". |

---

## 3. Execution Plan

### Step 1: React Stack Sanity (10 mins)

- Run Unit Tests: `npm test`
- Manual Walkthrough: Import -> Sync -> Order.

### Step 2: Python Code Verification (15 mins)

- Verify `MaintenanceService.py` logic via script.
- Verify `ThermalMonitor` (WMI) works on Windows.

### Step 3: C++ Code Verification (15 mins)

- Compile `MasterApp`.
- Verify `QStorageInfo` correctly reports disk space.
- Verify `ThermalMonitor` reads dummy/real values.

---

## 4. Reporting

Results will be logged in `.agent/test_results_phase28.md`.

- ✅ Pass
- ❌ Fail
- ⚠️ Warning (Non-blocking)

---

## 5. Tools & Scripts

We will create a helper script `scripts/verify_gap_closure.py` to act as a test harness for the Python/C++ logic without needing full GUI interaction.
