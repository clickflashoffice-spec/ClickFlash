import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { IngestionStudioService, SessionMetadata, UploadConfig } from '../services/ingestionStudioService';
import { dbManager } from '../fastifyServer';
import { logger } from '../utils/logger';

// Instantiate the service (since dbManager is exported from fastifyServer)
// To prevent issues if dbManager is not ready, we can initialize it lazily or use a getter.
let ingestionService: IngestionStudioService;

const SessionMetadataSchema = z.object({
  eventName: z.string().min(1),
  accessCode: z.string().min(1)
});

const AddFilesSchema = z.object({
  filePaths: z.array(z.string())
});

const UploadConfigSchema = z.object({
  cloudUrl: z.string().url(),
  token: z.string().min(1)
});

export async function ingestionRoutes(fastify: FastifyInstance) {
  fastify.addHook('onRequest', async () => {
    if (!ingestionService && dbManager) {
      ingestionService = new IngestionStudioService(dbManager, 4);
    }
  });

  fastify.post('/api/ingestion/sessions', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const body = request.body;
      const parsed = z.object({
        sourcePath: z.string().min(1),
        metadata: SessionMetadataSchema
      }).parse(body);

      const session = ingestionService.createSession(parsed.sourcePath, parsed.metadata);
      return reply.status(201).send(session);
    } catch (err: any) {
      logger.error('Error creating ingestion session:', err);
      return reply.status(400).send({ error: err.message });
    }
  });

  fastify.get('/api/ingestion/sessions', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const sessions = ingestionService.getSessions();
      return reply.send(sessions);
    } catch (err: any) {
      return reply.status(500).send({ error: err.message });
    }
  });

  fastify.get('/api/ingestion/sessions/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as { id: string };
      const session = ingestionService.getSessionProgress(id);
      if (!session) return reply.status(404).send({ error: 'Session not found' });
      return reply.send(session);
    } catch (err: any) {
      return reply.status(500).send({ error: err.message });
    }
  });

  fastify.post('/api/ingestion/sessions/:id/files', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as { id: string };
      const parsed = AddFilesSchema.parse(request.body);
      
      ingestionService.addFilesToSession(id, parsed.filePaths);
      return reply.send({ success: true, count: parsed.filePaths.length });
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  });

  fastify.post('/api/ingestion/sessions/:id/grade', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as { id: string };
      // Fire and forget or wait? The instructions say triggering grading. We can wait or do it async.
      // Usually grading takes time. Let's start it and return accepted.
      ingestionService.gradeSession(id).catch(err => {
        logger.error(`Error in background grading for session ${id}:`, err);
      });
      return reply.status(202).send({ message: 'Grading started' });
    } catch (err: any) {
      return reply.status(500).send({ error: err.message });
    }
  });

  fastify.get('/api/ingestion/sessions/:id/progress', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as { id: string };
      const progress = ingestionService.getSessionProgress(id);
      if (!progress) return reply.status(404).send({ error: 'Session not found' });
      return reply.send(progress);
    } catch (err: any) {
      return reply.status(500).send({ error: err.message });
    }
  });

  fastify.post('/api/ingestion/sessions/:id/upload', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as { id: string };
      const parsed = UploadConfigSchema.parse(request.body);
      
      ingestionService.startUpload(id, parsed).catch(err => {
        logger.error(`Error in background upload for session ${id}:`, err);
      });
      return reply.status(202).send({ message: 'Upload started' });
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  });

  fastify.delete('/api/ingestion/sessions/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as { id: string };
      await ingestionService.deleteSession(id);
      return reply.send({ success: true });
    } catch (err: any) {
      return reply.status(500).send({ error: err.message });
    }
  });

  fastify.get('/api/ingestion/analytics', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const analytics = ingestionService.getAnalytics();
      return reply.send(analytics);
    } catch (err: any) {
      return reply.status(500).send({ error: err.message });
    }
  });

  fastify.post('/api/ingestion/grade-single', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const parsed = z.object({ filePath: z.string() }).parse(request.body);
      const fs = await import('fs');
      const buffer = await fs.promises.readFile(parsed.filePath);
      
      // Access sharpnessService indirectly or just instance
      const { WasmSharpnessService } = await import('../services/wasmSharpnessService');
      const sharpnessService = new WasmSharpnessService();
      const result = await sharpnessService.evaluateSharpness(buffer, 100);
      
      return reply.send(result);
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  });
}
