# Cloudflare R2 Integration Guide

## Overview

This guide covers the R2 (object storage) integration for the ClickFlash ecosystem, covering:

- Gallery assets storage (`clickflash-gallery-assets`)
- MoneyTrash uploads storage (`moneytrash-uploads`)

## Current R2 Configuration

### Existing Buckets

| Bucket Name                 | App                 | Purpose       | Status        |
| --------------------------- | ------------------- | ------------- | ------------- |
| `clickflash-gallery-assets` | Gallery, Management | Photo storage | ✅ Configured |
| `moneytrash-uploads`        | MoneyTrash          | Upload queue  | ✅ Configured |

### Bucket Bindings in wrangler.toml

**Gallery Backend:**

```toml
[[r2_buckets]]
binding = "GALLERY_BUCKET"
bucket_name = "clickflash-gallery-assets"
```

**MoneyTrash:**

```toml
[[r2_buckets]]
binding = "UPLOADS_BUCKET"
bucket_name = "moneytrash-uploads"
```

---

## R2 Bucket Provisioning

### Verify Existing Buckets

```bash
# List all R2 buckets
npx wrangler r2 bucket list

# Or via API
curl -X GET "https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/r2/buckets" \
  -H "Authorization: Bearer ${API_TOKEN}"
```

### Create New Bucket (if needed)

```bash
# For new deployment
npx wrangler r2 bucket create <bucket-name>

# Examples:
npx wrangler r2 bucket create clickflash-gallery-assets
npx wrangler r2 bucket create moneytrash-uploads
```

### R2 Bucket Permissions

Workers need Read/Write permissions. This is configured via the `wrangler.toml` binding.

---

## R2 Usage in Code

### MoneyTrash Worker - Upload Flow

```typescript
// src/handlers/upload/chunk.ts
export async function handleUploadChunk(
  request: Request,
  env: Env,
): Promise<Response> {
  // ... validation ...

  // Store chunk in R2
  await env.UPLOADS_BUCKET.put(`chunks/${sessionId}/${chunkIndex}`, chunkData, {
    httpMetadata: { contentType: mimeType },
    customMetadata: { sessionId, chunkIndex },
  });

  // Update session in KV
  await env.UPLOAD_SESSIONS.put(
    `session:${sessionId}`,
    JSON.stringify(session),
  );
}
```

### MoneyTrash Worker - Finalize Flow

```typescript
// src/handlers/upload/finalize.ts
async function assembleChunks(
  env: Env,
  session: UploadSession,
): Promise<string> {
  const finalKey = session.r2Key;
  const chunkKeys = session.uploadedChunks
    .sort((a, b) => a - b)
    .map((i) => `${session.r2Key}.part${i}`);

  // Assembly logic here
  return finalKey;
}
```

### Gallery Backend - R2 Operations

Check [`apps/gallery/backend/src/services/recordService.ts`](apps/gallery/backend/src/services/recordService.ts) for R2 integration with gallery photos.

---

## R2 URL Patterns

### Public Access (via Cloudflare CDN)

```
https://pub-<hash>.r2.dev/<bucket>/<key>
```

### Custom Domain (via Cloudflare Workers)

```
https://gallery.yourdomain.com/assets/<key>
```

### Signed URLs (for private content)

```typescript
// Generate presigned URL (if using S3-compatible API)
// Note: Cloudflare R2 supports S3-compatible API
const url = await env.GALLERY_BUCKET.createPresignedUrl({
  key: "photos/album-123/photo-456.jpg",
  expiresIn: 3600, // 1 hour
});
```

---

## R2 Performance Optimization

### 1. Use Workers for Image Processing

Instead of uploading processed images, upload originals and process with Workers:

```typescript
// Worker that resizes on-demand
export async function handleImageResize(
  request: Request,
  env: Env,
): Promise<Response> {
  const { key, width, height } = await request.json();

  // Get original from R2
  const object = await env.GALLERY_BUCKET.get(key);
  if (!object) return new Response("Not found", { status: 404 });

  // Resize using @napi-rs/canvas or similar
  const resized = await resizeImage(await object.arrayBuffer(), width, height);

  return new Response(resized, {
    headers: {
      "Content-Type": "image/webp",
      "Cache-Control": "public, max-age=31536000",
    },
  });
}
```

### 2. Set Proper Cache Headers

```typescript
// When uploading
await env.GALLERY_BUCKET.put(key, data, {
  httpMetadata: {
    cacheControl: "public, max-age=31536000",
  },
});
```

### 3. Use KV for Metadata Caching

Frequently accessed metadata (like album lists) should be cached in KV:

```typescript
// Cache album list in KV
await env.ALBUM_CACHE.put(
  `album:${albumId}`,
  JSON.stringify(albumData),
  { expirationTtl: 3600 }, // 1 hour
);
```

---

## R2 Storage Costs (as of 2024)

| Action                                     | Cost                |
| ------------------------------------------ | ------------------- |
| Storage                                    | $0.015 / GB / month |
| Class A Operations (PUT, COPY, POST, LIST) | $4.50 / million     |
| Class B Operations (GET, SELECT)           | $0.36 / million     |
| Egress (outbound transfer)                 | Free                |

**Tip:** Since R2 egress is free, it's ideal for serving user content without bandwidth costs.

---

## Troubleshooting

### "R2 bucket not found"

**Error:**

```
Error: R2_ERROR: No such bucket
```

**Solution:** Verify the bucket exists and the binding name in `wrangler.toml` matches.

### "Access denied"

**Error:**

```
Error: R2_ERROR: Access denied
```

**Solution:** Ensure the Worker has R2 permissions. Check `wrangler.toml` binding is correct.

### "Object not found"

**Error:**

```
Error: R2_ERROR: No such key
```

**Solution:** The object doesn't exist in R2. Check the key path is correct.

---

## Migration: Local Files → R2

### For existing Gallery photos:

1. **Option A: Direct Upload to R2**

```bash
# Using AWS CLI with Cloudflare R2 S3-compatible API
aws s3 sync ./uploads/ s3://clickflash-gallery-assets/ \
  --endpoint-url=https://<account-id>.r2.cloudflarestorage.com \
  --profile=cloudflare
```

2. **Option B: Use Rclone**

```bash
# Configure rclone
rclone config create cloudflare s3 \
  provider=Cloudflare \
  access_key_id=<key> \
  secret_access_key=<secret> \
  endpoint=<account-id>.r2.cloudflarestorage.com

# Sync local to R2
rclone sync ./pb_data/uploads/ cloudflare:clickflash-gallery-assets/
```

3. **Option C: Write a migration script**
   See [`apps/gallery/backend/shared/photoProcessor.ts`](apps/gallery/backend/shared/photoProcessor.ts) for existing photo processing logic that can be adapted.

---

## Verification Checklist

- [ ] R2 buckets created (`clickflash-gallery-assets`, `moneytrash-uploads`)
- [ ] `wrangler.toml` has correct bucket bindings
- [ ] Worker deploys successfully
- [ ] Test upload to R2 via MoneyTrash API
- [ ] Test photo retrieval via Gallery API
- [ ] Verify cache headers are set correctly
- [ ] Check R2 dashboard for operation counts

---

## Next Steps

After R2 is verified working:

1. **Phase 4:** Adapt Express backends to Cloudflare Workers
2. **Phase 5:** Configure Cloudflare Pages for frontends
3. **Phase 6:** Build hotel-specific installers
4. **Phase 7:** End-to-end testing

---

**Document Version:** 1.0  
**Last Updated:** March 22, 2026
