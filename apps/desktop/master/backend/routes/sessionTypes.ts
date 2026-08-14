import express, { Request, Response, Router } from 'express';
import { SessionTypeService } from '../services/sessionTypeService';
import { sendInternalError, sendInvalidInputError, sendNotFoundError } from '../utils/errorHandler';
import { strictRateLimiter } from '../middleware/rateLimiter';
import { customRoutesSchemas } from '../utils/validation';

export default function sessionTypeRoutes(context: any): Router {
    const router = express.Router();
    const service: SessionTypeService = new SessionTypeService(context.dbManager, context.logger);

    // GET / (List)
    router.get('/', (_req: Request, res: Response) => {
        try {
            const types = service.getAll();
            res.status(200).json(types);
        } catch (err: any) {
            sendInternalError(res, err);
        }
    });

    // POST / (Create)
    router.post('/', strictRateLimiter, (req: Request, res: Response) => {
        try {
            const parsed = customRoutesSchemas.sessionType.safeParse(req.body);
            if (!parsed.success) {
                return sendInvalidInputError(res, 'Name is required or invalid input');
            }
            const { name, numberOfPhotos, price } = parsed.data;

            const newType = service.create({ name, numberOfPhotos, price });
            res.status(201).json(newType);
        } catch (err: any) {
            sendInternalError(res, err);
        }
    });

    // GET /:id (Available for detailed view if needed)
    router.get('/:id', (req: Request, res: Response) => {
        const id = String(req.params.id);
        const item = service.getById(id);
        if (item) res.status(200).json(item);
        else sendNotFoundError(res, 'Session Type not found');
    });

    // PUT /:id (Update)
    router.put('/:id', strictRateLimiter, (req: Request, res: Response) => {
        const id = String(req.params.id);
        try {
            const parsed = customRoutesSchemas.sessionType.partial().safeParse(req.body);
            if (!parsed.success) {
                return sendInvalidInputError(res, 'Invalid input');
            }
            const updated = service.update(id, parsed.data);
            res.status(200).json(updated);
        } catch (err: any) {
            if (err.message === 'Session Type not found') sendNotFoundError(res, err.message);
            else sendInternalError(res, err);
        }
    });

    // DELETE /:id (Delete)
    router.delete('/:id', strictRateLimiter, (req: Request, res: Response) => {
        const id = String(req.params.id);
        try {
            service.delete(id);
            res.status(200).json({ success: true, id });
        } catch (err: any) {
            sendInternalError(res, err);
        }
    });

    return router;
}
