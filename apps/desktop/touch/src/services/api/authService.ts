import { pb, isNetworkError } from './core';
import { Photographer } from '../../types';
import { DEFAULT_MASTER_PORT } from '../../constants';

export const authService = {
    async getUsers(): Promise<Photographer[]> {
        const records = await pb.collection('users').getFullList();
        return records.map((r: any) => ({
            id: r.id,
            name: r.name,
            email: r.email,
            password: r.password,
            role: r.role,
            specialty: r.specialty,
            avatarUrl: r.avatarUrl,
            monthlyTarget: r.monthlyTarget,
            dailyPhotoTarget: r.dailyPhotoTarget,
            payrollType: r.payrollType,
            monthlySalary: r.monthlySalary,
            commissionRate: r.commissionRate,
            destinationId: r.destinationId,
            workingHours: r.workingHours
        }));
    },

    async createUser(data: Partial<Photographer>): Promise<Photographer> {
        const record = await pb.collection('users').create(data);
        return record as Photographer;
    },

    async updateUser(id: string | number, data: Partial<Photographer>): Promise<Photographer> {
        const record = await pb.collection('users').update(String(id), data);
        return record as Photographer;
    },

    async deleteUser(id: string | number): Promise<void> {
        await pb.collection('users').delete(String(id));
    },

    async loginUser(email: string, password: string): Promise<{ token: string; user: Photographer } | null> {
        try {
            const baseUrl = pb.baseUrlValue;

            // First, check if backend is reachable
            try {
                const healthController = new AbortController();
                const healthTimeoutId = setTimeout(() => healthController.abort(), 5000); // 5 second timeout

                const healthCheck = await fetch(`${baseUrl}/api/health`, {
                    method: 'GET',
                    signal: healthController.signal
                }).catch((fetchError) => {
                    // Catch network errors from fetch itself
                    if (isNetworkError(fetchError)) {
                        const networkError = new Error('Cannot connect to backend server. Please ensure the server is running. Start it with: node backend/server.js');
                        networkError.name = 'NetworkError';
                        throw networkError;
                    }
                    throw fetchError;
                });

                clearTimeout(healthTimeoutId);

                if (!healthCheck.ok) {
                    throw new Error(`Backend server is not responding. Please ensure the server is running on port ${DEFAULT_MASTER_PORT}.`);
                }
            } catch (healthError) {
                if (healthError instanceof Error) {
                    if (healthError.name === 'AbortError' || healthError.message.includes('timeout')) {
                        throw new Error(`Backend server connection timeout. Please check if the server is running on port ${DEFAULT_MASTER_PORT}.`);
                    }
                    if (healthError.name === 'NetworkError' ||
                        healthError.message.includes('Failed to fetch') ||
                        healthError.message.includes('NetworkError') ||
                        healthError.message.includes('Cannot connect to backend server')) {
                        throw new Error('Cannot connect to backend server. Please ensure the server is running. Start it with: node backend/server.js');
                    }
                    throw new Error(`Backend server error: ${healthError.message}`);
                }
                throw new Error(`Backend server is not reachable. Please ensure the server is running on port ${DEFAULT_MASTER_PORT}.`);
            }

            // Perform login with timeout
            const loginController = new AbortController();
            const loginTimeoutId = setTimeout(() => loginController.abort(), 10000); // 10 second timeout for login

            const response = await fetch(`${baseUrl}/api/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password }),
                signal: loginController.signal
            });
            clearTimeout(loginTimeoutId);

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: 'Login failed' }));
                // Prioritize message over error since message contains user-friendly description
                throw new Error(errorData.message || errorData.error || 'Login failed');
            }

            const data = await response.json();

            // Store the token in the pb adapter
            pb.setAuthToken(data.token);

            return {
                token: data.token,
                user: data.user as Photographer
            };
        } catch (error) {
            // Re-throw with more context if it's a network error
            if (error instanceof Error) {
                if (error.name === 'AbortError' || error.message.includes('timeout')) {
                    throw new Error('Login request timed out. Please check your connection and try again.');
                }
                if (isNetworkError(error) || error.message.includes('Cannot connect to backend server')) {
                    throw new Error('Cannot connect to backend server. Please ensure the server is running. Start it with: node backend/server.js');
                }
            }
            throw error;
        }
    }
};
