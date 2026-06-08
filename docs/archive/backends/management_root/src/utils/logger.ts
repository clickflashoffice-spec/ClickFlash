// apps/management/backend/src/utils/logger.ts

/**
 * Enterprise Structured Logger for Cloudflare Workers
 * Outputs JSON to stdout for Cloudflare Logs ingestion
 */
export class Logger {
    private component: string;
    private env: string;

    constructor(component: string = 'management-hub', env: string = 'development') {
        this.component = component;
        this.env = env;
    }

    private log(level: string, message: string, meta: Record<string, any> = {}) {
        const timestamp = new Date().toISOString();
        const logEntry = {
            timestamp,
            level,
            component: this.component,
            env: this.env,
            message,
            ...meta
        };

        // Cloudflare Workers capture console outputs and present them in the dashboard
        console.log(JSON.stringify(logEntry));
    }

    error(message: string, error?: any, meta: Record<string, any> = {}) {
        const errorMeta = error instanceof Error ? { 
            name: error.name, 
            errorMessage: error.message, 
            stack: process.env.NODE_ENV === 'production' ? undefined : error.stack 
        } : { error };
        
        this.log('ERROR', message, { ...meta, ...errorMeta });
    }

    warn(message: string, meta: Record<string, any> = {}) {
        this.log('WARN', message, meta);
    }

    info(message: string, meta: Record<string, any> = {}) {
        this.log('INFO', message, meta);
    }

    debug(message: string, meta: Record<string, any> = {}) {
        this.log('DEBUG', message, meta);
    }
}

export const logger = new Logger();
