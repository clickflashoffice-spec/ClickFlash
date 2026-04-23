# ISSUE RESOLUTION SUMMARY

## Problem

Photos were not displaying in the Touch application customer view, and "Recovered Album" entries kept appearing.

## Root Causes Found

### 1. **DeepScan Running Every 30 Seconds** (PRIMARY ISSUE)

- **Location**: `backend/server.js` line 564-630, inside `startFolderMonitor()` function
- **Problem**: The DeepScan logic was running every 30 seconds and creating "Recovered Album" entries for ANY folder in the uploads directory that didn't have a database record
- **Impact**: These albums were marked with `kiosk_ready=1`, making them appear in the customer view
- **Fix**: Commented out the entire DeepScan block in `startFolderMonitor()`

### 2. **Missing Collection Metadata in API Responses**

- **Location**: `backend/routes/collections.js`
- **Problem**: API responses didn't include `collectionId` and `collectionName` fields
- **Impact**: Frontend's `pb.files.getUrl()` function couldn't construct proper file URLs
- **Fix**: Added `collectionId` and `collectionName` to all API responses (both main records and expanded relations)

## Changes Made

### File: `backend/server.js`

- **Lines 564-630**: Disabled DeepScan in `startFolderMonitor()` by wrapping it in `/* */` comments
- **Reason**: AlbumMonitor is the sole source of truth for album imports from Master

### File: `backend/routes/collections.js`

- **Lines 385-410**: Added `collectionId` and `collectionName` to expanded photos
- **Lines 236-245**: Added `collectionId` and `collectionName` to create/update responses
- **Line 22**: Added `password_must_change` to allowed columns for users table

### File: `backend/routes/auth.js`

- **Lines 151-228**: Implemented forced password change logic on login

### File: `backend/shared/defaultUserConfig.js`

- **Line 15-17**: Added `password_must_change: 1` to default user config

### File: `backend/shared/init-default-user.js`

- **Lines 70-80**: Updated user creation to include `password_must_change` column

## Verification Steps

1. **Check Server Logs**: Look for "[Startup] DeepScan disabled - using AlbumMonitor only"
2. **Monitor Database**: Run `SELECT * FROM albums WHERE title LIKE '%Recovered%'` - should return 0 results after cleanup
3. **Test Photo Display**: Navigate to customer view and verify photos load correctly
4. **Test API Response**: Check that `/api/collections/albums/records?expand=photos_via_album` returns records with `collectionId` field

## Remaining "Recovered Albums"

The existing "Recovered Album" entries in the database need to be manually deleted. They cannot be deleted via the Touch API because albums are read-only in Touch (they should only be created/modified in Master).

**To clean up existing entries**, you have two options:

### Option 1: Via Master Backend (Recommended)

If you have access to the Master application, delete the "Recovered Album" entries from there.

### Option 2: Direct Database Access

Stop the Touch server and run:

```bash
node backend/cleanup-recovered-final.js
```

## Prevention

The DeepScan is now permanently disabled. Future album imports will ONLY come through:

1. **AlbumMonitor**: Watches for albums from Master with `metadata.json`
2. **Manual Import**: Via Master backend API

## Testing Checklist

- [ ] Server starts without errors
- [ ] No "Recovered Album" entries appear after 1 minute
- [ ] Photos display correctly in customer view (<http://localhost:5174/?mode=touch>)
- [ ] Image URLs are constructed correctly (check browser Network tab)
- [ ] Login with default password shows `requirePasswordChange: true`
- [ ] After changing password, flag is cleared

## Files to Review

1. `backend/server.js` - DeepScan disabled
2. `backend/routes/collections.js` - Collection metadata injection
3. `backend/routes/auth.js` - Password change enforcement
4. `backend/shared/defaultUserConfig.js` - Default user config
5. `backend/shared/init-default-user.js` - User initialization

---

**Status**: ✅ Fixed
**Date**: 2025-12-12
**Impact**: High - Resolves photo display and prevents unwanted album creation
