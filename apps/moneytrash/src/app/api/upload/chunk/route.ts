/**
 * Chunked Upload API Route
 * Handles resumable file uploads via chunks
 */

import { writeFile, mkdir, readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import path from 'path';
import crypto from 'crypto';

// Upload sessions storage (In-memory, but with persistence hooks)
let uploadSessions = new Map<string, UploadSession>();

// Initialize persistence
const SESSIONS_FILE = join(process.cwd(), 'uploads', 'temp', 'sessions.json');

async function persistSessions() {
  try {
    const data = JSON.stringify(Array.from(uploadSessions.entries()));
    await writeFile(SESSIONS_FILE, data);
  } catch (e) { /* ignore */ }
}

async function loadSessions() {
  try {
    if (existsSync(SESSIONS_FILE)) {
      const data = await readFile(SESSIONS_FILE, 'utf-8');
      const entries = JSON.parse(data);
      uploadSessions = new Map(entries.map(([k, v]: [string, any]) => [
        k,
        { ...v, uploadedChunks: new Set(v.uploadedChunks), createdAt: new Date(v.createdAt) }
      ]));
    }
  } catch (e) { /* ignore */ }
}

// Load on start
loadSessions();

interface UploadSession {
  id: string;
  fileName: string;
  fileSize: number;
  chunkSize: number;
  totalChunks: number;
  uploadedChunks: Set<number>;
  metadata: any;
  createdAt: Date;
  uploadDir: string;
}

const CHUNK_SIZE = 1024 * 1024; // 1MB chunks
const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB max
const UPLOAD_DIR = join(process.cwd(), 'uploads');

/** Initialize upload session */
export async function POST(request: Request) {
  try {
    const { fileName, fileSize, metadata } = await request.json();

    if (!fileName || !fileSize) {
      return Response.json({ error: 'Missing file info' }, { status: 400 });
    }

    if (fileSize > MAX_FILE_SIZE) {
      return Response.json(
        { error: `Max file size is ${MAX_FILE_SIZE / 1024 / 1024}MB` },
        { status: 413 }
      );
    }

    const sessionId = crypto.randomUUID();
    const totalChunks = Math.ceil(fileSize / CHUNK_SIZE);
    const sessionDir = join(UPLOAD_DIR, 'temp', sessionId);
    await mkdir(sessionDir, { recursive: true });

    const session: UploadSession = {
      id: sessionId,
      fileName: fileName.replace(/[^a-zA-Z0-9.-]/g, '_'),
      fileSize,
      chunkSize: CHUNK_SIZE,
      totalChunks,
      uploadedChunks: new Set(),
      metadata,
      createdAt: new Date(),
      uploadDir: sessionDir
    };

    uploadSessions.set(sessionId, session);
    await persistSessions();
    setTimeout(() => cleanupSession(sessionId), 24 * 60 * 60 * 1000);

    return Response.json({
      sessionId,
      chunkSize: CHUNK_SIZE,
      totalChunks,
      uploadedChunks: []
    });

  } catch (error) {
    console.error('[ChunkedUpload] Init error:', error);
    return Response.json({ error: 'Init failed' }, { status: 500 });
  }
}

/** Upload a chunk */
export async function PUT(request: Request) {
  try {
    const formData = await request.formData();
    const sessionId = formData.get('sessionId') as string;
    const chunkIndex = parseInt(formData.get('chunkIndex') as string, 10);
    const chunk = formData.get('chunk') as Blob;

    if (!sessionId || isNaN(chunkIndex) || !chunk) {
      return Response.json({ error: 'Missing fields' }, { status: 400 });
    }

    const session = uploadSessions.get(sessionId);
    if (!session) {
      return Response.json({ error: 'Session not found' }, { status: 404 });
    }

    const chunkPath = join(session.uploadDir, `chunk-${chunkIndex}`);
    const chunkBuffer = Buffer.from(await chunk.arrayBuffer());
    await writeFile(chunkPath, chunkBuffer);

    session.uploadedChunks.add(chunkIndex);
    await persistSessions();

    return Response.json({
      chunkIndex,
      uploaded: true,
      progress: Math.round((session.uploadedChunks.size / session.totalChunks) * 100)
    });

  } catch (error) {
    console.error('[ChunkedUpload] Chunk error:', error);
    return Response.json({ error: 'Chunk upload failed' }, { status: 500 });
  }
}

/** Get upload status */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return Response.json({ error: 'Missing session ID' }, { status: 400 });
    }

    const session = uploadSessions.get(sessionId);
    if (!session) {
      return Response.json({ error: 'Session not found' }, { status: 404 });
    }

    return Response.json({
      sessionId,
      fileName: session.fileName,
      totalChunks: session.totalChunks,
      uploadedChunks: Array.from(session.uploadedChunks),
      progress: Math.round((session.uploadedChunks.size / session.totalChunks) * 100),
      isComplete: session.uploadedChunks.size === session.totalChunks
    });

  } catch (error) {
    return Response.json({ error: 'Status check failed' }, { status: 500 });
  }
}

/** Finalize upload */
export async function PATCH(request: Request) {
  try {
    const { sessionId } = await request.json();

    if (!sessionId) {
      return Response.json({ error: 'Missing session ID' }, { status: 400 });
    }

    const session = uploadSessions.get(sessionId);
    if (!session) {
      return Response.json({ error: 'Session not found' }, { status: 404 });
    }

    if (session.uploadedChunks.size !== session.totalChunks) {
      const missing: number[] = [];
      for (let i = 0; i < session.totalChunks; i++) {
        if (!session.uploadedChunks.has(i)) missing.push(i);
      }
      return Response.json({ error: 'Incomplete', missingChunks: missing }, { status: 400 });
    }

    // Combine chunks using streams (Zero-Buffer Algorithm)
    const finalDir = join(UPLOAD_DIR, session.metadata?.accessCode || 'uncategorized');
    await mkdir(finalDir, { recursive: true });

    const finalPath = join(finalDir, `${Date.now()}-${session.fileName}`);
    const { createWriteStream } = await import('fs');
    const writeStream = createWriteStream(finalPath);

    for (let i = 0; i < session.totalChunks; i++) {
      const chunkPath = join(session.uploadDir, `chunk-${i}`);
      const chunkBuffer = await readFile(chunkPath);
      
      const canContinue = writeStream.write(chunkBuffer);
      if (!canContinue) {
        await new Promise((resolve) => writeStream.once('drain', resolve));
      }
    }
    writeStream.end();
    
    // Wait for the stream to finish writing
    await new Promise((resolve, reject) => {
      writeStream.on('finish', resolve);
      writeStream.on('error', reject);
    });

    // Trigger Background Sync (Law 13/15 delegation)
    const galleryApiUrl = process.env.GALLERY_API_URL || 'http://clickflash-gallery:8093';
    if (galleryApiUrl) {
      const { performBackgroundSync } = await import('../uploadUtils');
      performBackgroundSync(
        galleryApiUrl,
        session.metadata?.accessCode || 'uncategorized',
        session.metadata?.eventName || session.fileName,
        session.metadata || {},
        [{
          name: session.fileName,
          path: finalPath,
          type: session.metadata?.type || 'image/jpeg',
          size: session.fileSize,
          id: session.id,
          originalName: session.fileName,
          savedName: path.basename(finalPath)
        }]
      ).catch(err => console.error('[ChunkedUpload] BackgroundSync error:', err));
    }

    await cleanupSession(sessionId);
    return Response.json({ success: true, filePath: finalPath });

  } catch (error) {
    console.error('[ChunkedUpload] Finalize error:', error);
    return Response.json({ error: 'Finalize failed' }, { status: 500 });
  }
}

async function cleanupSession(sessionId: string) {
  const session = uploadSessions.get(sessionId);
  if (session) {
    try {
      const { rm } = await import('fs/promises');
      await rm(session.uploadDir, { recursive: true, force: true });
    } catch (e) { /* ignore */ }
    uploadSessions.delete(sessionId);
  }
}
