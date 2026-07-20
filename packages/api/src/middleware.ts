import { z, ZodError } from 'zod';
import type { Request, Response, NextFunction } from 'express';

// Extend the Express Request to include our validated data
declare global {
  namespace Express {
    interface Request {
      validated?: any;
    }
  }
}

export const validatePayload = (schema: z.ZodSchema) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate both body and query
      const validatedData = await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });

      // Attach validated data to request
      req.validated = validatedData;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          error: 'Validation failed',
          details: error.errors.map(e => ({
            path: e.path.join('.'),
            message: e.message
          }))
        });
      }
      next(error);
    }
  };
};
