# Phase 25: Cross-Stack Parity Audit & Alignment - Implementation Plan

## Problem Statement (RCA)

**Current State**: The ecosystem has 3 parallel implementations:

- **React (Modern)**: `master-app/react-new` & `touch-app/react` - v4.4.0
- **Python (Legacy)**: `master-app/python` & `touch-app/python`
- **C++ (Native)**: `master-app/cpp` & `touch-app/cpp`

**Critical Gap**: Feature parity unknown. Modern React stack has advanced features (AI culling, QR login, thermal throttling, tiered sync) that may not exist in Python/C++ versions.

**Risk**: Users running Python/C++ builds get inferior experience. Deployment confusion about which stack to use.

**Goal**: Achieve 100% feature parity across all 3 stacks OR document intentional differences with migration path.

## Scope Definition

### Phase 25A: Census & Discovery (1-2 hours)

- Catalog all files in Python and C++ codebases
- Map file structure to React equivalents
- Identify which features exist where

### Phase 25B: Feature Matrix (1 hour)

- Create comparison table of features across stacks
- Red/Yellow/Green status for each feature
- Document dependencies and blockers

### Phase 25C: Critical Feature Porting (3-4 hours)

- Port priority features from React to Python/C++:
  1. Thermal Throttling (already in Python, needs verification)
  2. Tiered Asset Sync (Master → Touch)
  3. AI Culling Dashboard (Master only, needs UI)
  4. QR Login Display (Touch, optional feature)
  5. Modern Error Boundaries & Recovery

### Phase 25D: UI Parity (2-3 hours)

- Port glassmorphic design to Python (PyQt6/PySide6)
- Port glassmorphic design to C++ (Qt6)
- Ensure visual consistency across all platforms

### Phase 25E: Testing & Verification (1-2 hours)

- Build all 6 applications (React × 2, Python × 2, C++ × 2)
- Functional testing of critical paths
- Performance benchmarking

## Technical Architecture

### Language-Specific Constraints

#### React/TypeScript (Modern Stack)

**Pros**:

- Fastest development
- Rich ecosystem (Face-API, Sharp, TensorFlow)
- Hot reload, dev tools
- Already at v4.4.0 with latest features

**Cons**:

- Slower startup vs C++
- Higher memory usage

#### Python (Legacy Stack)

**Current State**: Last known version ~v3.x
**Pros**:

- Rapid prototyping
- Strong ML libraries (OpenCV, face_recognition)
- Easier to maintain than C++

**Cons**:

- Slower than C++
- GIL limits multi-threading
- Deployment size

**Key Files to Audit**:

- `master-app/python/main.py` or equivalent entry point
- Photo processing logic
- Face recognition integration
- Database access patterns

#### C++ (Native Stack)

**Current State**: Last known version ~v2.x
**Pros**:

- Fastest performance
- Lowest memory footprint
- Professional-grade reliability

**Cons**:

- Hardest to develop
- Longer compile times
- Less flexibility

**Key Files to Audit**:

- `master-app/cpp/src/` (likely MainWindow, PhotoProcessor)
- `touch-app/cpp/src/` (likely TouchWindow, OrderService)
- Qt6 UI files (.ui, .qml)

## Implementation Steps

### Task 1: File Census

**Objective**: Understand what exists in Python and C++ codebases

**Actions**:

1. List all Python files in `master-app/python` and `touch-app/python`
2. List all C++ files in `master-app/cpp` and `touch-app/cpp`
3. Create `census_python.md` and `census_cpp.md` with file counts and structure
4. Identify entry points (main.py, main.cpp)

**Output**: Inventory of all files by stack

### Task 2: Feature Detection

**Objective**: Map which features exist in which stacks

**Actions**:

1. Search Python codebase for keywords:
   - `"thermal"` or `"WMI"` or `"CPU temp"`
   - `"face_recognition"` or `"face-api"`
   - `"tier"` or `"preview"` or `"tiny"`
   - `"AI"` or `"culling"` or `"score"`
   - `"QR"` or `"qrcode"`

2. Search C++ codebase for keywords:
   - Same as above, adapted for C++ syntax
   - Qt class names (QMainWindow, QLabel, etc.)

3. Create `feature_matrix.md`:

   ```
   | Feature | React | Python | C++ | Priority |
   |---------|-------|--------|-----|----------|
   | Thermal Throttling | ✅ v4.2 | ✅ v3.x | ❌ | HIGH |
   | Tiered Sync | ✅ v4.2 | ❌ | ❌ | HIGH |
   | AI Culling | ✅ v4.4 | ❌ | ❌ | MEDIUM |
   | QR Login | ✅ v5.0 | ❌ | ❌ | LOW |
   | Face Recognition | ✅ v4.1 | ✅ v3.x | ❌ | HIGH |
   ```

**Output**: Feature comparison matrix

### Task 3: Critical Gap Analysis

**Objective**: Identify must-have features missing from Python/C++

**Decision Matrix**:

- **Red (Critical)**: Feature exists in React, missing in Python/C++, causes functional gap
- **Yellow (Important)**: Feature exists in React, would improve Python/C++ experience
- **Green (Nice-to-have)**: Feature exists in React, optional for Python/C++

**Actions**:

1. Review feature matrix
2. Mark each gap as Red/Yellow/Green
3. Create prioritized remediation list

**Output**: Prioritized gap list

### Task 4: Python Feature Porting (High Priority)

**Objective**: Bring Python stack to parity with React v4.4

**Priority 1: Tiered Sync (Master → Touch)**

- Check if Python Master has `send-to-kiosk` logic
- Add preview/tiny tier generation if missing
- Update Python Touch to expect tiered assets

**Priority 2: Thermal Verification**

- Verify Python has WMI thermal throttling (should exist from v3.x)
- Compare with React `ThermalService.ts`
- Ensure identical thresholds (80°C warning, 90°C emergency)

**Priority 3: Face Recognition Parity**

- Verify Python uses `face_recognition` library
- Ensure index structure matches React vector DB
- Test cross-compatibility (Python index → React search)

**Output**: Updated Python codebase with critical features

### Task 5: C++ Feature Porting (If Time Permits)

**Objective**: Bring C++ stack to feature parity

**Challenges**:

- C++ doesn't have easy face recognition libraries (would need dlib/OpenCV DNN)
- Thermal monitoring requires platform-specific code (Windows WMI, Linux sensors)
- UI refresh needed for glassmorphism (Qt6 QML)

**Recommendation**: Focus on Python parity first. C++ can follow in Phase 26 if needed.

**Output**: Decision on C++ scope

### Task 6: UI Consistency (Python)

**Objective**: Port glassmorphic design to Python PyQt6

**Actions**:

1. Review React `AICullingDashboard.tsx` for design patterns
2. Create Python equivalent using PyQt6 QSS (stylesheets)
3. Implement gradient backgrounds, blur effects, rounded corners
4. Test on Windows

**Files to Create**:

- `master-app/python/ui/styles/glassmorphic.qss`
- `master-app/python/ui/components/statistics_panel.py`

**Output**: Visually consistent Python UI

### Task 7: Build Verification

**Objective**: Ensure all stacks compile and run

**Actions**:

1. Build React apps: `npm run build` (Master & Touch)
2. Build/Run Python apps: `python main.py` (Master & Touch)
3. Build C++ apps: `cmake --build` or Qt Creator (Master & Touch)
4. Document any build errors

**Output**: Build status report

### Task 8: Functional Testing

**Objective**: Verify critical paths work in all stacks

**Test Cases**:

1. **Photo Import**: Import 10 photos in each stack
2. **Face Recognition**: Search for face in each stack
3. **Order Creation**: Create order in Touch, verify in Master
4. **Export**: Generate fulfillment package
5. **Thermal**: Trigger thermal throttling (if testable)

**Output**: Test results matrix

## Success Criteria

**Must-Have**:

- ✅ Complete file census of Python and C++ codebases
- ✅ Feature matrix showing parity status across all 3 stacks
- ✅ Python stack has Tiered Sync and Thermal Throttling (if missing)
- ✅ All 6 applications build successfully

**Should-Have**:

- ✅ Python UI updated with glassmorphic design patterns
- ✅ Face Recognition parity verified across stacks
- ✅ Documentation of intentional differences

**Nice-to-Have**:

- ✅ C++ feature porting started
- ✅ Cross-stack integration tests
- ✅ Performance benchmarks

## Risk Assessment

**High Risk**:

- Python/C++ codebases may be outdated or broken
- Dependencies may be missing (OpenCV, Qt6, face_recognition)
- Build systems may fail on current machine

**Mitigation**:

- Start with census and grep searches (read-only)
- Don't modify code until structure understood
- Document blockers for user decision

**Medium Risk**:

- Feature gaps too large to close in Phase 25
- UI porting to Qt6 more complex than expected

**Mitigation**:

- Focus on high-priority features only
- Create roadmap for Phase 26 if needed

## Estimated Timeline

| Task | Duration | Complexity |
|------|----------|------------|
| File Census | 30min | 3/10 |
| Feature Detection | 1-2hr | 5/10 |
| Gap Analysis | 30min | 4/10 |
| Python Tiered Sync | 1-2hr | 7/10 |
| Python Thermal Verify | 30min | 4/10 |
| Python UI Update | 2-3hr | 8/10 |
| Build Verification | 1hr | 6/10 |
| Testing | 1hr | 5/10 |

**Total**: 7-10 hours (spread over multiple sessions)

## User Approval Required

Before proceeding, confirm:

1. **Scope**: Focus on Python parity, defer C++ to Phase 26?
2. **Priority**: Tiered Sync + Thermal + UI, or different priorities?
3. **Approach**: Read-only audit first, then selective porting?

**Awaiting user confirmation to proceed with Task 1: File Census.**
