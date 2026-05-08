import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { performBackgroundSync } from './uploadUtils';

// Configuration
// ... (rest of imports and config)
const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE_MB || '50') * 1024 * 1024; // Default 50MB
const ALLOWED_TYPES = (process.env.ALLOWED_FILE_TYPES || 'image/jpeg,image/png,image/heic').split(',');

export async function POST(request: Request) {
  try {
    const formData = await request.formData();

    const files = formData.getAll('files') as File[];
    const eventName = formData.get('eventName') as string;
    const accessCode = formData.get('accessCode') as string;
    const mode = formData.get('mode') as string;
    const priceSingle = formData.get('singlePhotoPrice') as string;
    const priceFull = formData.get('fullGalleryPrice') as string;
    const customerEmail = formData.get('customerEmail') as string;

    // Validation
    if (!files.length || !eventName || !accessCode) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Validate file types and sizes
    for (const file of files) {
      if (file.size > MAX_FILE_SIZE) {
        return Response.json({
          error: `File "${file.name}" exceeds maximum size of ${MAX_FILE_SIZE / 1024 / 1024}MB`
        }, { status: 413 });
      }
      if (!ALLOWED_TYPES.includes(file.type)) {
        return Response.json({
          error: `File "${file.name}" has invalid type "${file.type}". Allowed types: ${ALLOWED_TYPES.join(', ')}`
        }, { status: 415 });
      }
    }

    // Sanitize access code
    const sanitizedAccessCode = accessCode.replace(/[^a-zA-Z0-9-_]/g, '');
    if (sanitizedAccessCode !== accessCode) {
      return Response.json({
        error: 'Access code contains invalid characters. Use only letters, numbers, hyphens, and underscores.'
      }, { status: 400 });
    }

    // Create upload directory structure
    const uploadDir = join(process.cwd(), 'uploads', sanitizedAccessCode);
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    const galleryApiUrl = process.env.GALLERY_API_URL || 'http://clickflash-gallery:8093';

    // Step 1: Sync Album Metadata to Gallery
    if (galleryApiUrl) {
      try {
        await fetch(`${galleryApiUrl}/api/cloud/sync-album`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: sanitizedAccessCode,
            title: eventName,
            price_single: parseFloat(priceSingle || '0'),
            price_full: parseFloat(priceFull || '0'),
            customer_email: customerEmail || '',
            date: new Date().toISOString()
          })
        });
        console.log(`Successfully synced album ${sanitizedAccessCode} to gallery`);
      } catch (syncErr) {
        console.error(`Failed to sync album ${sanitizedAccessCode} to gallery:`, syncErr);
        // Don't fail the upload if gallery sync fails
      }
    }

    const uploadedFiles = [];
    const errors = [];

    // Process each file (Local Ingestion Buffer - Law 13/15)
    for (const file of files) {
      try {
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Generate unique filename with sanitization
        const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const photoId = crypto.randomUUID();
        const fileName = `${Date.now()}-${sanitizedFileName}`;
        const filePath = join(uploadDir, fileName);

        await writeFile(filePath, buffer);
        uploadedFiles.push({
          id: photoId,
          originalName: file.name,
          savedName: fileName,
          size: buffer.length,
          path: filePath,
          type: file.type,
          buffer: buffer // Keep buffer for immediate sync trigger
        });
      } catch (error) {
        console.error(`Failed to save ${file.name}:`, error);
        errors.push({ file: file.name, error: error instanceof Error ? error.message : String(error) });
      }
    }

    // Step 2: Return immediate response to UI (202 Accepted Pattern)
    const metadata = {
      eventName,
      accessCode: sanitizedAccessCode,
      mode,
      priceSingle,
      priceFull,
      customerEmail,
      uploadedAt: new Date().toISOString(),
      totalFiles: uploadedFiles.length,
      totalSize: uploadedFiles.reduce((sum, f) => sum + f.size, 0),
      files: uploadedFiles.map(f => ({ id: f.id, originalName: f.originalName, savedName: f.savedName, size: f.size })),
      errors: errors.length ? errors : undefined
    };

    await writeFile(
      join(uploadDir, 'metadata.json'),
      JSON.stringify(metadata, null, 2)
    );

    // Step 3: Trigger Background Sync Delegation (Non-blocking)
    if (galleryApiUrl && uploadedFiles.length > 0) {
      // Fire and forget
      performBackgroundSync(galleryApiUrl, sanitizedAccessCode, eventName, metadata, uploadedFiles.map(f => ({
        name: f.originalName,
        path: f.path,
        type: f.type,
        size: f.size,
        id: f.id,
        originalName: f.originalName,
        savedName: f.savedName
      })))
        .catch(err => console.error('[BackgroundSync] Fatal delegation error:', err));
    }

    return Response.json({
      success: true,
      message: `Accepted ${uploadedFiles.length} files for processing.`,
      accessCode: sanitizedAccessCode,
      status: 'processing'
    });

  } catch (error) {
    console.error('Upload error:', error);
    return Response.json({ error: 'Upload failed' }, { status: 500 });
  }
}