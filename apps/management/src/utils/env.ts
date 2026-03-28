/// <reference types="vite/client" />

export const getEnv = () => {
    // Handle Jest environment
    if (typeof jest !== 'undefined') {
        return {
            VITE_LOG_LEVEL: 'INFO',
            DEV: true,
            MODE: 'test',
            VITE_API_BASE_URL: 'http://localhost:8090',
            VITE_APP_TITLE: 'Star Master Management'
        };
    }

    // Handle production/development environments
    // Use import.meta.env for Vite environment
    return {
        VITE_LOG_LEVEL: import.meta.env.VITE_LOG_LEVEL || 'INFO',
        DEV: import.meta.env.DEV || import.meta.env.MODE === 'development',
        MODE: import.meta.env.MODE || 'development',
        VITE_API_BASE_URL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8090',
        VITE_APP_TITLE: import.meta.env.VITE_APP_TITLE || 'Star Master Management'
    };
};
