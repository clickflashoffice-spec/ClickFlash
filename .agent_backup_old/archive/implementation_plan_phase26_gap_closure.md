# Phase 26: Critical Gap Closure - Implementation Plan

## Objective

Close critical gaps identified in Phase 25 to ensure all 3 stacks (React, Python, C++) are fully production-safe and feature-complete.

## Root Cause Analysis

**Phase 25 Findings**:

1. **C++ Thermal Monitoring**: MISSING (critical safety gap)
   - **Risk**: Hardware damage under sustained photo processing load
   - **Impact**: Potential CPU/GPU overheating, system crashes, hardware failure
   - **Root Cause**: React and Python ported thermal monitoring from v4.2, C++ never updated

2. **Disk Space Pruning**: Missing in Python/C++ (React-only)
   - **Risk**: Disk overflow after months of operation
   - **Impact**: System crashes, failed photo imports, database corruption
   - **Root Cause**: React v4.4 added automated pruning, not backported

3. **C++ WAL Checkpointing**: Unknown/Missing
   - **Risk**: Database .wal file grows unbounded
   - **Impact**: Slow queries, disk waste, eventual corruption
   - **Root Cause**: Python has WAL mode, C++ database status unclear

## Phase 26 Scope

### Task 1: C++ Thermal Monitoring (HIGH PRIORITY) ⚠️

**Estimated Time**: 4-6 hours
**Complexity**: 8/10

**Goal**: Port thermal monitoring from React/Python to C++ to prevent hardware damage

**Sub-Tasks**:

1. Research Qt6 thermal APIs (QSysInfo, platform-specific)
2. Create `ThermalMonitor.h/cpp` service
3. Implement temperature polling (every 5 seconds)
4. Add throttling delays based on temperature thresholds:
   - < 75°C: Normal operation
   - 75-80°C: Warning (0.5s delay between photos)
   - 80-85°C: Critical (2s delay)
   - > 85°C: Emergency (10s delay + warning dialog)
5. Integrate into `PhotoProcessor::processPhoto()`
6. Add thermal status to UI (optional visual indicator)
7. Test with simulated high temps

**Reference Implementation**:

- React: `src/services/ThermalService.ts`
- Python: `verify_throttling.py` + `photo_processor.py::_handle_throttling()`

**Acceptance Criteria**:

- ✅ C++ reads CPU temperature from system
- ✅ Processing automatically throttles at 75°C+
- ✅ Emergency shutdown at 90°C (or user-configurable max)
- ✅ Thermal status logged to diagnostics

---

### Task 2: Python Disk Pruning (MEDIUM PRIORITY) 🟡

**Estimated Time**: 3-4 hours
**Complexity**: 6/10

**Goal**: Add automated disk space monitoring and cleanup to prevent overflow

**Sub-Tasks**:

1. Create `DiskMonitor` in Python `maintenance_service.py`
2. Monitor disk usage every 10 minutes
3. Trigger auto-cleanup at 90% capacity:
   - Delete thumbnails older than 30 days
   - Delete temporary files
   - Delete old backups (keep last 5)
4. Add manual "Free Space" button to UI
5. Log cleanup actions to audit trail

**Reference Implementation**:

- React: `src/services/MaintenanceService.ts::checkDiskSpace()`

**Acceptance Criteria**:

- ✅ Python monitors disk usage automatically
- ✅ Auto-cleanup at 90% threshold
- ✅ Manual cleanup available in maintenance UI
- ✅ Cleanup actions logged

---

### Task 3: C++ Disk Pruning (MEDIUM PRIORITY) 🟡

**Estimated Time**: 3-4 hours
**Complexity**: 6/10

**Goal**: Port disk monitoring to C++ stack

**Sub-Tasks**:

1. Add disk monitoring to `MaintenanceService.cpp`
2. Use Qt `QStorageInfo` for disk usage
3. Implement same cleanup logic as Python
4. Add UI indicator for disk status
5. Test with full disk simulation

**Acceptance Criteria**:

- ✅ C++ monitors disk usage
- ✅ Auto-cleanup at 90%
- ✅ Manual cleanup in settings

---

### Task 4: C++ WAL Checkpointing (LOW PRIORITY) 🟢

**Estimated Time**: 1-2 hours
**Complexity**: 4/10

**Goal**: Ensure C++ database uses WAL mode and periodic checkpointing

**Sub-Tasks**:

1. Inspect C++ database initialization code
2. Add `PRAGMA journal_mode=WAL` if missing
3. Add periodic `PRAGMA wal_checkpoint(TRUNCATE)` to maintenance
4. Verify .wal file doesn't grow unbounded
5. Test with heavy database writes

**Reference Implementation**:

- Python: `database.py` L22-29
- React: Database initialization with WAL

**Acceptance Criteria**:

- ✅ C++ uses WAL mode
- ✅ Periodic checkpointing prevents bloat
- ✅ No performance degradation

---

## Implementation Order

### Phase 1: Foundation (Day 1)

1. **Task 1.1**: Research C++ thermal APIs (1 hour)
2. **Task 1.2**: Create `ThermalMonitor` skeleton (1 hour)
3. **Task 4**: C++ WAL checkpointing (quick win) (1-2 hours)

### Phase 2: Core Implementation (Day 2)

4. **Task 1.3-1.5**: Implement C++ thermal monitoring (3-4 hours)
2. **Task 2**: Python disk pruning (3-4 hours)

### Phase 3: Polish & Testing (Day 3)

6. **Task 3**: C++ disk pruning (3-4 hours)
2. **Task 1.6-1.7**: C++ thermal UI + testing (2 hours)
3. **Full Integration Testing**: All features across all stacks (2 hours)

**Total Estimated Time**: 15-20 hours (3 days part-time or 2 days full-time)

---

## Technical Architecture

### C++ Thermal Monitoring Design

```cpp
// ThermalMonitor.h
class ThermalMonitor : public QObject {
    Q_OBJECT
public:
    enum ThermalState {
        Normal,      // < 75°C
        Warning,     // 75-80°C
        Critical,    // 80-85°C
        Emergency    // > 85°C
    };

    ThermalMonitor(QObject *parent = nullptr);
    
    float getCurrentTemperature();
    ThermalState getState();
    int getThrottleDelay(); // milliseconds
    
signals:
    void temperatureChanged(float temp);
    void stateChanged(ThermalState state);
    
private slots:
    void pollTemperature();
    
private:
    QTimer *m_pollTimer;
    float m_currentTemp;
    ThermalState m_currentState;
};
```

**Platform-Specific Implementations**:

- **Windows**: WMI (same as Python) via QProcess calling PowerShell
- **Linux**: `/sys/class/thermal/thermal_zone0/temp`
- **macOS**: `osx-cpu-temp` or `ioreg`

**Integration Point**: `PhotoProcessor::processPhoto()`

```cpp
// Before processing each photo
int delay = m_thermalMonitor->getThrottleDelay();
if (delay > 0) {
    QThread::msleep(delay);
    emit processingThrottled(delay, m_thermalMonitor->getCurrentTemperature());
}
```

---

### Disk Monitoring Design (Python & C++)

**Python** (`maintenance_service.py`):

```python
async def check_disk_space(self):
    stats = shutil.disk_usage(self.data_dir)
    usage_percent = (stats.used / stats.total) * 100
    
    if usage_percent > 90:
        await self.auto_cleanup()
    
    return usage_percent

async def auto_cleanup(self):
    # 1. Delete old thumbnails
    cutoff = datetime.now() - timedelta(days=30)
    for file in Path(self.upload_dir).glob("*/tiny/*"):
        if file.stat().st_mtime < cutoff.timestamp():
            file.unlink()
    
    # 2. Delete temp files
    # 3. Delete old backups (keep last 5)
```

**C++** (`MaintenanceService.cpp`):

```cpp
float MaintenanceService::checkDiskSpace() {
    QStorageInfo storage(m_dataDir);
    float usagePercent = (1.0 - (storage.bytesAvailable() / storage.bytesTotal())) * 100;
    
    if (usagePercent > 90.0) {
        autoCleanup();
    }
    
    return usagePercent;
}
```

---

## Testing Strategy

### Thermal Monitoring Tests

1. **Unit Test**: Mock temperature values, verify throttle delays
2. **Integration Test**: Run photo processing with simulated high temp
3. **Stress Test**: Process 100 photos, monitor thermal response
4. **Manual Test**: Check UI indicator updates correctly

### Disk Pruning Tests

1. **Unit Test**: Verify file deletion logic
2. **Integration Test**: Fill disk to 91%, verify auto-cleanup
3. **Regression Test**: Ensure important files not deleted
4. **Manual Test**: Verify manual cleanup button works

### WAL Checkpointing Tests

1. **Unit Test**: Check PRAGMA settings
2. **Load Test**: Write 10,000 records, verify .wal size
3. **Performance Test**: Benchmark query speed before/after checkpoint

---

## Success Criteria

### Must-Have ✅

1. C++ thermal monitoring operational with temperature-based throttling
2. Python disk pruning prevents overflow at 90% capacity
3. C++ WAL checkpointing prevents database bloat

### Should-Have 🟡

1. C++ disk pruning operational
2. Thermal status visible in C++ UI
3. Cleanup actions logged in audit trail

### Nice-to-Have 🟢

1. User-configurable thermal thresholds
2. Disk usage graph in maintenance UI
3. Email alerts for critical thermal events

---

## Risk Assessment

**High Risk**:

- C++ thermal APIs may be platform-specific (Windows WMI vs Linux sysfs)
- Disk cleanup may delete important files if logic is buggy

**Mitigation**:

- Test thermal monitoring on Windows first (primary platform)
- Implement dry-run mode for cleanup (log what would be deleted)
- Add confirmation dialog before manual cleanup

**Medium Risk**:

- Performance impact of thermal polling (every 5 seconds)
- Disk cleanup may not free enough space

**Mitigation**:

- Use background thread for temperature polling
- Implement aggressive cleanup thresholds (e.g., 95% = delete everything non-essential)

---

## Deliverables

### Code Files

- `master-app/cpp/src/services/ThermalMonitor.h`
- `master-app/cpp/src/services/ThermalMonitor.cpp`
- `master-app/python/backend/services/maintenance.py` (updated)
- `master-app/cpp/src/services/MaintenanceService.cpp` (updated)

### Documentation

- `.agent/phase26_complete.md` - Implementation summary
- `THERMAL_MONITORING.md` - Thermal API reference
- `MAINTENANCE_GUIDE.md` - Disk cleanup procedures

### Tests

- `tests/thermal_monitor_test.cpp`
- `tests/test_disk_cleanup.py`

---

## Next Steps

1. **User Approval**: Confirm priorities and scope
2. **Begin Task 1.1**: Research C++ thermal APIs (Qt6 docs, platform-specific)
3. **Create Feature Branch**: `feature/phase26-gap-closure`
4. **Implement in Order**: Thermal → Disk → WAL

**Awaiting user approval to proceed with Task 1: C++ Thermal Monitoring**
