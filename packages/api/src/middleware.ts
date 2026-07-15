import { z, ZodError } from 'zod';

export const validatePayload = (schema: z.ZodSchema) => {
  return async (req: any, res: any, next: any) => {
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
