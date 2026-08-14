import { pb } from '../pb';

export const configService = {
    exportConfig: async () => {
        const response = await fetch('/api/config/export', {
            headers: {
                'Authorization': `Bearer ${pb.authStore.token}`
            }
        });
        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.error || 'Failed to export configuration');
        }
        return response.json();
    },

    importConfig: async (config: any) => {
        const response = await fetch('/api/config/import', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${pb.authStore.token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(config)
        });
        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.error || 'Failed to import configuration');
        }
        return response.json();
    }
};
