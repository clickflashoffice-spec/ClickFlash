import { pb } from '../pb';

export interface SecurityAuditLog {
    id: string;
    user_id: string;
    action: string;
    resource: string;
    ip_address?: string;
    user_agent?: string;
    success: boolean;
    created_at: string;
}

export interface ActiveSession {
    id: string;
    user_id: string;
    device: string;
    ip_address: string;
    last_active: string;
    created_at: string;
}

export const securityService = {
    async getAuditLogs(filters?: { userId?: string; action?: string; startDate?: string; endDate?: string }): Promise<SecurityAuditLog[]> {
        const queryParams = new URLSearchParams();
        if (filters?.userId) queryParams.append('userId', filters.userId);
        if (filters?.action) queryParams.append('action', filters.action);
        if (filters?.startDate) queryParams.append('startDate', filters.startDate);
        if (filters?.endDate) queryParams.append('endDate', filters.endDate);

        const response = await fetch(`${pb.baseUrlValue}/api/security/audit-logs?${queryParams.toString()}`, {
            headers: {
                'Authorization': `Bearer ${pb.authStore.token}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch audit logs');
        }

        return response.json();
    },

    async getActiveSessions(): Promise<ActiveSession[]> {
        const response = await fetch(`${pb.baseUrlValue}/api/security/sessions`, {
            headers: {
                'Authorization': `Bearer ${pb.authStore.token}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch active sessions');
        }

        return response.json();
    },

    async revokeSession(sessionId: string): Promise<void> {
        const response = await fetch(`${pb.baseUrlValue}/api/security/sessions/${sessionId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${pb.authStore.token}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to revoke session');
        }
    },
};
