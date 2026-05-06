# Verification Plan: Kiosk Transfer Automation

## Objective

Verify the end-to-end "Send to Touch" workflow, ensuring the recent database fix (Migration 035) allows files to be transferred to custom paths and that notifications are broadcast.

## Scope

- **Script**: `e:/ClickFlash/master-app/react-new/verify_kiosk_transfer.js`
- **Actions**:
  1. **Simulate Kiosk**: Create a temporary Kiosk record with a verifiable local `uploadFolderPath`.
  2. **Trigger Transfer**: Call the backend API `POST /api/kiosk/send-album`.
  3. **Verify Files**: Check that photos are physically copied to the target folder.
  4. **Verify WebSocket**: Listen for `ALBUM_SENT` (or similar) notification.

## Implementation Details

### `verify_kiosk_transfer.js`

- **Dependencies**: `axios` (API), `ws` (WebSocket), `better-sqlite3` (DB Setup).
- **Steps**:
  1. **Database Prep**:
     - Insert test Kiosk: `Test Kiosk` -> `dist/test_kiosk_upload`.
     - Insert test Album/Photo if needed.
  2. **API Call**:
     - Authenticate (mock session or JWT).
     - Send Album.
  3. **Validation**:
     - `fs.existsSync(path.join(uploadDir, photoName))`
  4. **Cleanup**:
     - Delete test Kiosk.
     - Delete test files.

## Risks

- **Authentication**: Usage of `sqlite3` to inject a session or using a fixed dev token.
- **Port Conflicts**: Assuming port 8090.

## Success Criteria

- Script prints `[SUCCESS] Files transferred to custom path.`
- Script prints `[SUCCESS] WebSocket notification received.`
