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

    // Browser / Vite: import.meta.env is always available
    return {
        VITE_LOG_LEVEL: import.meta.env.VITE_LOG_LEVEL || 'INFO',
        DEV: import.meta.env.DEV,
        MODE: import.meta.env.MODE,
        VITE_API_BASE_URL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8090',
        VITE_APP_TITLE: import.meta.env.VITE_APP_TITLE || 'Star Master Photography'
    };
};
