import { safeStorage } from './safeStorage';

export const getSavedConnectionSettings = () => {
    const savedConnSettings = safeStorage.getItem('connectionSettings');
    return savedConnSettings ? JSON.parse(savedConnSettings) : { mode: 'local' };
};

export const isCloudMode = getSavedConnectionSettings().mode === 'cloud';
