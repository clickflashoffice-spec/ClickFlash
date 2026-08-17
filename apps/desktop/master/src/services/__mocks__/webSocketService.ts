import { vi } from 'vitest';
/**
 * Mock WebSocket Service for Testing
 */

export const webSocketService = {
    connect: vi.fn(),
    disconnect: vi.fn(),
    sendMessage: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
    isConnected: vi.fn(() => false),
    updateClientInfo: vi.fn(),
    requestAssistance: vi.fn(),
    subscribeToPhotoStream: vi.fn(() => vi.fn()), // returns unsubscribe function
};

export default webSocketService;
