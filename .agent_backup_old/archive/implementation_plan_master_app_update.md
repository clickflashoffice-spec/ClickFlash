# Implementation Plan: Master App (Management) Update

## Goal Description

Update the **Master Management App** (`web/management`) to include the new **Pricing** and **Email Notification** features recently added to the MoneyTrash Uploader. This ensures the main admin interfaces allows full control over these new capabilities.

## User Review Required
>
> [!NOTE]
> This plan assumes the backend changes (Schema `003` and `nodemailer` setup) from the Uploader task are already applied.

## Proposed Changes

### Backend (`E:\ClickFlash\master-app\react-new\backend`)

#### [NEW] [migrations/003_add_pricing_schema.sql](file:///E:/ClickFlash/master-app/react-new/backend/migrations/003_add_pricing_schema.sql)

- Add `pricePerPhoto` (REAL) and `fullGalleryPrice` (REAL) to `albums` table.

#### [MODIFY] [server.ts](file:///E:/ClickFlash\master-app\react-new\backend\server.ts)

- Add `nodemailer` setup (types needed).
- Add `POST /api/notify/customer` endpoint.

#### [MODIFY] [package.json](file:///E:/ClickFlash\master-app\react-new\package.json)

- Add `nodemailer` and `@types/nodemailer`.

### Frontend (`E:\ClickFlash\master-app\react-new\src`)

#### [MODIFY] [components/AlbumModal.tsx] (or similar)

- Add Pricing Inputs.

#### [MODIFY] [components/UploadWizard.tsx] (or similar)

- Add Email Notification step.

## Verification Plan

### Manual Verification

1. Open Management App (`http://localhost:8092`).
2. specific "Create Album" flow.
3. Verify new Pricing inputs appear.
4. Verify saving an album persists the prices to DB.
5. Verify "Send Email" triggers the same backend endpoint as the Uploader.
