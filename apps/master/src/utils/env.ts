/// <reference types="vite/client" />

export const getEnv = () => {
    // Handle Jest environment
    if (typeof jest !== 'undefined') {
        return {
            VITE_LOG_LEVEL: 'INFO',
            DEV: true,
            MODE: 'test',
            VITE_API_BASE_URL: 'http://localhost:8090',
            VITE_APP_TITLE: 'Star Master Photography'
        };
    }

    // Handle production/development environments
    // Use process.env as fallback since import.meta.env may not be available
    return {
        VITE_LOG_LEVEL: process.env.VITE_LOG_LEVEL || 'INFO',
        DEV: process.env.NODE_ENV !== 'production',
        MODE: process.env.NODE_ENV || 'development',
        VITE_API_BASE_URL: process.env.VITE_API_BASE_URL || 'http://localhost:8090',
        VITE_APP_TITLE: process.env.VITE_APP_TITLE || 'Star Master Photography'
    };
};
