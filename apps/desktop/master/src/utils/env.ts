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
    // Handle Node.js backend or standard environments
    const envObj = (typeof import.meta !== 'undefined' && import.meta.env) 
        ? import.meta.env 
        : (typeof process !== 'undefined' && process.env) 
            ? process.env 
            : {};

    return {
        VITE_LOG_LEVEL: envObj.VITE_LOG_LEVEL || 'INFO',
        DEV: envObj.DEV || false,
        MODE: envObj.MODE || 'production',
        VITE_API_BASE_URL: envObj.VITE_API_BASE_URL || 'http://localhost:8090',
        VITE_APP_TITLE: envObj.VITE_APP_TITLE || 'Star Master Photography'
    };
};
