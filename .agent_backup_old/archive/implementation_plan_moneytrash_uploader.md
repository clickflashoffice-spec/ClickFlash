# Implementation Plan: MoneyTrash Uploader & Email Integration

## Goal Description

Create a lightweight, standalone "MoneyTrash Uploader" Next.js application for manually uploading "MoneyTrash" (unsold) photos and "Sold Order" backups.
**NEW**: Enhance this tool to allowing setting **Photo Prices** and **Album Prices**, and sending **Email Notifications** to customers upon upload.

## User Review Required
>
> [!IMPORTANT]
>
> - Backend requires `nodemailer` configuration (SMTP service needed, e.g., Gmail, SendGrid, or Mailtrap).
> - Schema change: `albums` table will likely need new columns for `pricePerPhoto` (REAL) and `fullGalleryPrice` (REAL).

## Proposed Changes

### Backend (`web/management/backend`)

#### [NEW] [migrations/003_add_pricing_schema.sql](file:///e:/ClickFlash/web/management/backend/migrations/003_add_pricing_schema.sql)

- Add `pricePerPhoto` (REAL) and `fullGalleryPrice` (REAL) to `albums` table.

#### [MODIFY] [server.js](file:///e:/ClickFlash/web/management/backend/server.js)

- Add `nodemailer` setup.
- Add `POST /api/notify/customer` endpoint.
- Update `POST /api/collections/albums/records` to accept new price fields.

#### [MODIFY] [package.json](file:///e:/ClickFlash/web/management/package.json)

- Add `nodemailer` dependency.

### Frontend (`web/moneytrash-uploader`)

#### [MODIFY] [src/app/page.tsx](file:///e:/ClickFlash/web/moneytrash-uploader/src/app/page.tsx)

- Add inputs: `Single Photo Price`, `Full Gallery Price`.
- Add inputs: `Customer Name`, `Customer Email`.
- Add Checkbox: `Send Notification Email`.
- Update upload logic to send this data to backend.

## Verification Plan

### Automated Tests

- Test API endpoint `/api/notify/customer` with curl/Postman.
- Verify database schema update via `sqlite3`.

### Manual Verification

1. Open Uploader (Gold Mode).
2. Fill in Album Name, Access Code, Prices, Email.
3. Drag & Drop files.
4. Click Upload.
5. Verify:
   - Photos uploaded to `pb_data/uploads/photos/...`.
   - Album record created in DB with correct prices.
   - Email received at the target address (or logged in console if dev mode).
