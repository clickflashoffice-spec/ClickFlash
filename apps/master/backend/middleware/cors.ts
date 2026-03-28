// backend/middleware/cors.ts
// CORS Middleware

import { Request, Response, NextFunction } from 'express';
import { ALLOWED_ORIGINS } from '../config/constants';

/**
 * CORS Middleware
 * 
 * Handles Cross-Origin Resource Sharing (CORS) for the Master Portal backend.
 * Validates origin against whitelist and sets appropriate headers.
 */
export function corsMiddleware(req: Request, res: Response, next?: NextFunction): boolean {
    const origin = req.headers.origin;

    // Check if origin is in allowed list
    if (origin && ALLOWED_ORIGINS.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    } else if (!origin && process.env.NODE_ENV !== 'production') {
        // Allow requests without origin only in development (e.g., Postman, curl)
        res.setHeader('Access-Control-Allow-Origin', '*');
    }

    // Set CORS headers
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours

    // Handle Preflight
    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return true;
    }

    if (next) next();
    return true;
}
