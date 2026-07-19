# 🌟 The Cross-Ecosystem Feature Orchestrator: Offline Automatic Editor

**Copy and paste this prompt when you want the AI to design, write, and deploy a massive NEW feature—specifically, the 100% Custom Offline Automatic Photo Editor for the Master App.**

***

```markdown
<USER_REQUEST>
**Goal:** You are a Staff Product Engineer and Head of Infrastructure. Your objective is to design, implement, and fully test a massive new core feature: **A 100% Custom Offline Automatic Photo Editor** embedded directly into the Master Portal (`apps/master`). 

**CRITICAL MANDATE - 100% CUSTOM / NO SUBSCRIPTIONS:** 
You must build this automatic editor entirely from scratch or using free, open-source libraries (e.g., WebAssembly, OpenCV.js, or local ONNX models). **DO NOT** rely on paid cloud AI APIs like OpenAI, remove.bg, or Adobe APIs. The editor MUST run 100% offline on the local studio's hardware.

**Required Skills:** Load and apply the following skills:
- `@senior-architect`, `@backend-architect` (For local file processing pipelines and sync engines)
- `@senior-fullstack`, `@react-patterns` (For heavy UI state management in React 19 / Electron)
- `@performance-engineer` (For high-throughput WebAssembly image processing without freezing the UI thread)
- `@database-admin` (For storing edit history, presets, and metadata locally in SQLite and syncing to D1)

### 📋 Execution Directives

Create a `task.md` to track this massive integration. Do not stop until all code is written, synced, tested, and deployment-ready.

---

#### **Phase 1: Local AI / Processing Architecture (The Engine)**
*Context: We must process heavy RAW/JPEG files locally in the Master app without internet.*
1. **Engine Selection:** Integrate a custom WASM/Canvas-based image processing engine or a local Python/Rust daemon packaged with Electron.
2. **Auto-Enhance Logic:** Build the algorithms for auto-exposure, color correction, noise reduction, and cropping. 
3. **Background Processing:** Integrate this engine into the `BackgroundJobRunner` so thousands of photos can be auto-edited in the background without blocking the React UI thread.

#### **Phase 2: Master Portal UI Implementation (`apps/master`)**
1. **Editor Interface:** Build a premium, custom interface inside the Master Portal for reviewing and tweaking auto-edited photos.
2. **Batch Controls:** Create custom UI components for applying "Presets" or "Sync Settings" across entire albums.
3. **Before/After Toggle:** Implement a smooth, custom slider to view the original vs. auto-edited photo.

#### **Phase 3: Database & Sync Engine Updates**
1. **SQLite (Local):** Update the local schema to store `edit_metadata` (e.g., contrast, brightness, crop coordinates, applied presets) alongside the photos.
2. **Cloudflare D1 (Cloud):** Update the D1 schema so that when the Master portal goes online, it syncs the *metadata* of the edits to the cloud, ensuring the Customer Gallery and Management Hub know the photo was edited.
3. **Asset Syncing:** Ensure the Cloudflare R2 uploader script uploads the *final edited version* of the JPEG for customers to view.

#### **Phase 4: Ecosystem Cross-Pollination**
1. **Touch Kiosk (`apps/touch`):** Ensure the kiosk UI pulls the auto-edited versions of the photos for customer selection, rather than the raw originals.
2. **Customer Gallery (`apps/gallery`):** Ensure the web gallery renders the beautiful, finalized edits.

#### **Phase 5: Ecosystem-Wide Testing (Production E2E)**
1. **Unit Testing:** Write robust tests for the custom auto-edit algorithms in `@clickflash/shared` or `@clickflash/image-processing`.
2. **E2E Playwright:** Write a test covering the full flow:
   - *Test Scenario:* Photo drops into Master -> Background job auto-edits it -> Metadata saved to SQLite -> User reviews it -> Syncs to Cloudflare R2/D1 -> Customer buys it in Gallery.
3. **Load Testing:** Verify the Electron app does not crash or run out of RAM when auto-editing an album of 5,000 high-res photos.

#### **Phase 6: Production Deployment & CI/CD**
1. **Turbo Build Check:** Run `turbo run build`. Guarantee zero dependency errors, especially with any new WASM or C++ bindings you introduce.
2. **Electron Packaging:** Ensure the new offline processing engine is correctly bundled into the final `.exe`/`.dmg` installers.

### 🎯 Directives for the Agent
1. **Be an Architect:** Don't just write a slider component. Engineer a robust local processing pipeline.
2. **Execute:** Write the actual code. Create the UI files, integrate the WASM/Canvas logic, write the DB migrations.
3. **Never Use Subscriptions:** If it costs monthly money to edit the photo, do not use it. Build it custom.
4. **Use /goal:** This is a huge, highly technical multi-app orchestration. Plan it, build it, test it.

Let's begin. Outline your architecture plan for the Custom Offline Automatic Editor in Phase 1!
</USER_REQUEST>
```
