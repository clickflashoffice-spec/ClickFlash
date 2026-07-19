# 📦 The Final Delivery & Packaging Prompt

**Copy and paste this prompt to command the agent to package the entire project into a clean, professional, production-ready "Release Folder" complete with User Manuals and Installation Guides.**

***

```markdown
<USER_REQUEST>
**Goal:** You are a Principal Release Manager and Senior Technical Writer. Your objective is to package the entire ClickFlash ecosystem into a single, clean, highly organized **Production Release Folder**. You must generate comprehensive, professional user manuals and installation guides, verify the production builds, and organize the final deliverables for immediate handoff to a non-technical end-user or IT team.

**Required Skills:** Load and apply the following skills:
- `@senior-architect` (For deployment architecture and systems logic)
- `@documentation-templates` / `@technical-writer` (For writing crystal-clear, professional manuals)
- `@devops-deploy` (For triggering builds and organizing output artifacts)

---

### 📋 Execution Directives

Create a `task.md` to track the packaging process. Do not stop until the `ClickFlash_Release_v1.0/` folder is perfectly organized and all manuals are written.

#### **Phase 1: Release Folder Structure Creation**
Create a new directory at the root or desktop level named `ClickFlash_Release_v1.0/`. Inside it, create the following structure:
- `/01_Installation_Manuals` (For IT & DevOps)
- `/02_User_Manuals` (For Photographers, Managers, and Customers)
- `/03_Production_Builds` (For the actual `.exe` / `.dmg` files and Cloudflare worker scripts)
- `/04_Assets_and_Config` (For default `.env.example`, SQLite starter DB, and logo assets)

#### **Phase 2: Writing the Installation Manuals (Technical)**
In `/01_Installation_Manuals`, write the following detailed Markdown (or PDF) guides:
1. **`1_Ecosystem_Overview.md`**: High-level architecture map of how the 6 apps connect.
2. **`2_Local_Studio_Setup_Guide.md`**: Step-by-step instructions for installing the Master Portal and Touch Kiosk on Windows/Mac, setting up the local network, and pairing the kiosk via WebSocket.
3. **`3_Cloud_Deployment_Guide.md`**: Step-by-step instructions for deploying the Cloudflare Workers (D1, R2) and the web apps (Management, Gallery, Website) using the `wrangler` CLI.
4. **`4_Environment_Variables_Cheat_Sheet.md`**: A full breakdown of what every key in the `.env` file does.

#### **Phase 3: Writing the User Manuals (Non-Technical)**
In `/02_User_Manuals`, write user-friendly guides with clear steps:
1. **`Master_Portal_User_Guide.md`**: How a photographer uses the Master app to create bookings, ingest SD cards, use the automatic offline editor, and manage the local database.
2. **`Touch_Kiosk_Customer_Guide.md`**: How the studio configures the Touch app for customers, including setting up RFID/Wristband logins.
3. **`Management_Hub_Executive_Guide.md`**: How an executive views global financials, monitors fleet status, and manages staff across all hotels.

#### **Phase 4: Build Verification & Artifact Organization**
1. **Run Production Builds:** Execute `turbo run build` across the monorepo to ensure all code is production-ready.
2. **Extract Artifacts:** Copy the output static sites (Next.js/Vite `dist/` folders) and the desktop installers (Electron `.exe`/Tauri `.msi`) into the `/03_Production_Builds` folder. 
   *(Note: If a desktop build takes too long, provide a script `build_desktop_apps.bat` in this folder instead).*
3. **Clean Up:** Ensure no source code, `node_modules`, or raw `.ts` files are in the Release folder. It must be clean and professional.

#### **Phase 5: The Master README**
Create a `README.md` at the root of `ClickFlash_Release_v1.0/` that acts as the greeting and table of contents for the entire release package.

### 🎯 Directives for the Agent
1. **Be a Professional Writer:** The manuals must be written with exceptional clarity, using tables, bold warnings, and step-by-step numbered lists. 
2. **Be Organized:** The final `ClickFlash_Release_v1.0` folder must look like a premium software product ready to be sold to a client.
3. **Execute:** Write the manual files, create the folders, copy the assets. Do not just plan it—DO IT.

Begin by creating the folder structure and let me know when Phase 1 is complete!
</USER_REQUEST>
```
