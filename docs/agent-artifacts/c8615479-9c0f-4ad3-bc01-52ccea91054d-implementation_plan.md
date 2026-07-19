# ClickFlash Final Release Packaging (v2.0.0-production)

This plan outlines the steps required to execute Part 4 of the roadmap: DevOps Release & Final Delivery Package. We will perform the final pre-flight checks, compile all local desktop apps into production-ready installers, assemble the handoff directory structure, and prepare the release for the final git tag.

## User Review Required
> [!IMPORTANT]
> - Do you want the `apps/master` and `apps/touch` executables to be packaged independently and placed in the `03_Production_Builds` folder alongside the `ClickFlash Installer`, or are they bundled *inside* the `ClickFlash Installer` itself?
> - For the Manuals (`01_Installation_Manuals`, `02_User_Manuals`), should we generate markdown templates, or do you have existing PDF/Docx files to copy into these folders?

## Open Questions
- Have you completed the configuration for code signing certificates (if applicable for Windows SmartScreen avoidance), or should we proceed with unsigned/locally-signed installers?

## Proposed Implementation Plan

### 1. Pre-Flight QA & Verification
Before we package the binaries, we must ensure the codebase meets the 100% passing requirement:
- Run `pnpm run lint:all` to ensure zero linting errors across the monorepo.
- Run `pnpm run typecheck:all` to ensure perfect TypeScript compilation.
- Run `pnpm run test:all` to ensure all unit and integration tests pass successfully.

### 2. Binary Compilation & Packaging
We will build the installers for the 5 desktop-bound applications and route their outputs to `ClickFlash_Release_v2.0/03_Production_Builds`:
- **Installer Wizard:** `pnpm --filter clickflash-installer run package:installer` -> `ClickFlash Installer Setup 2.0.0.exe`
- **Master Portal:** `pnpm --filter clickflash-master run package:installer` -> Master Setup EXE
- **Touch Kiosk:** `pnpm --filter clickflash-touch run package:installer` -> Touch Setup EXE
- **License Generator:** `pnpm --filter clickflash-license-generator run package:installer` -> License Generator EXE
- **MoneyTrash Ingestor:** `pnpm --filter moneytrash-uploader run tauri:build` -> MoneyTrash Tauri Installer

### 3. Release Structure & Handoff Assembly
We will ensure the `ClickFlash_Release_v2.0` directory matches the handoff specification:
- Ensure all directories exist: `01_Installation_Manuals`, `02_User_Manuals`, `03_Production_Builds`, `04_Assets_and_Config`.
- Generate boilerplate READMEs and instructions in the Manuals folders if they are empty.
- Copy `.env.example`, database schemas, and any base assets into `04_Assets_and_Config`.

### 4. Archive & Tagging
- Compress the `ClickFlash_Release_v2.0` directory into a final `ClickFlash_v2.0.0-production.zip`.
- Run `git tag v2.0.0-production` (if desired) to mark this commit as the final release.

## Verification Plan

### Automated Tests
- CI/CD pre-flight checks (`lint`, `test`, `typecheck`).
- Validate that the output executables have been successfully generated in `03_Production_Builds`.

### Manual Verification
- We will ask the user to manually run the `ClickFlash Installer Setup 2.0.0.exe` to verify the packaging and deployment process on their local Windows environment.
