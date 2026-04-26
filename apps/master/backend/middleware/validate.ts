import { Request, Response, NextFunction } from 'express';
import { ZodObject, ZodError } from 'zod';
import { sendInvalidInputError } from '../shared/errorHandler';

export const validate = (schema: ZodObject<any>) => async (req: Request, res: Response, next: NextFunction) => {
    try {
        await schema.parseAsync(req.body);
        next();
    } catch (error) {
        if (error instanceof ZodError) {
            const errorMessages = error.errors.map((e: any) => `${e.path.join('.')}: ${e.message}`).join(', ');
            return sendInvalidInputError(res, `Validation Error: ${errorMessages}`);
        }
        return sendInvalidInputError(res, 'Invalid request data');
    }
};
