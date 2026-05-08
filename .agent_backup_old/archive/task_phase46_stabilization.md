# Deep Dive & Reorganization

- [/] **Phase 1: Analysis & Planning**
  - [x] specific: Read existing `reorg_spec.md` and `rules`
  - [x] specific: Inventory the `.agent` directory mess (69+ files)
  - [x] specific: Draft `implementation_plan.md` for reorganization
  - [x] specific: Get User Approval `[APPROVED]`

- [/] **Phase 2: Execution (The Great Migration)**
  - [x] Create folder structure
  - [x] Move "Stale/Archive" files
  - [x] Move "Common" files
  - [x] Move "Docs" files
  - [x] Move "Audit" files

- [ ] **Phase 3: Stabilization**
  - [ ] Reset local `task.md` to match Brain `task.md` `[IN PROGRESS]`
  - [ ] Verify `rules` and `skills` accessibility
  - [ ] Create `PROJECT_MANIFEST.md` in `common/` to describe the new layout

- [/] **Phase 4: Bug Fixes - Photo Editor (Current)**
  - [x] Fix Straightener: Remove "Zoom to Fill" auto-scaling
  - [x] Fix Edit Scope: Restrict manual edits to active photo only (unless batch action)
  - [/] Fix Crop: Ensure cropped image is uploaded and persisted properly
  - [ ] Verification: Test all fixes
