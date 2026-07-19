# v3.0.0 Production Release Packaging Plan

We will prepare the final delivery package for the `v3.0.0` release for the 3 Sousse hotels. This ensures all the new features (Zero-Config Pairing, Edge AI, Automated Revenue pipelines) are properly distributed.

## User Review Required

> [!IMPORTANT]  
> Please review this deployment plan. We will be executing build commands and creating a large packaged directory. If everything looks correct, click **Proceed**.

## Proposed Changes

We will execute the following steps to build and package the ecosystem:

### 1. Release Directory Scaffolding
- Create `ClickFlash_Release_v3.0` on your desktop.
- Create subdirectories: `01_Installation_Manuals`, `02_User_Manuals`, `03_Production_Builds`, `04_Assets_and_Config`.

### 2. Manual Generation
- Generate updated markdown manuals focusing on the new v3.0.0 features:
  - `Cloud_Infrastructure_Setup.md`
  - `Studio_Network_Setup.md`
  - `Operator_Guide.md` (Including AutoCrop and Boomerang guides)
  - `Customer_Kiosk_Guide.md` (Including Magic Shot and Facial Search instructions)

### 3. Asset & Config Collation
- Copy `.env.example` and standard configurations to `04_Assets_and_Config` to ensure the installation teams have the exact environment templates.

### 4. Production Build & Binary Delivery
- Run `npm run package` in `apps/master`
- Run `npm run package` in `apps/touch`
- Copy resulting `.exe` and installer binaries to the `03_Production_Builds` folder.
- Execute `npm run build:hotels` in `apps/master` to package the hotel-specific configurations if the script supports it.

### 5. Git Release Tagging
- Commit the finalized codebase.
- Tag the release as `v3.0.0-production`.

## Verification Plan
- Verify all binaries exist in the `03_Production_Builds` directory.
- Verify `git tag` lists `v3.0.0-production`.
