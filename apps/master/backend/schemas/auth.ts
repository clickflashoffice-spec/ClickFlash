import { z } from 'zod';

export const loginSchema = z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters long'),
});

export const mutationSchema = z.object({
    entity: z.string().min(1, 'Entity is required'),
    action: z.enum(['create', 'update', 'delete', 'update_many', 'upsert']),
    data: z.record(z.any()), // Allow any object for data, but strictly object
    clientId: z.string().optional()
});
