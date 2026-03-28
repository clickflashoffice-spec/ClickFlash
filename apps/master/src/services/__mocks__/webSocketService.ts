/**
 * Mock WebSocket Service for Testing
 */

export const webSocketService = {
    connect: jest.fn(),
    disconnect: jest.fn(),
    sendMessage: jest.fn(),
    on: jest.fn(),
    off: jest.fn(),
    isConnected: jest.fn(() => false),
    updateClientInfo: jest.fn(),
    requestAssistance: jest.fn(),
    subscribeToPhotoStream: jest.fn(() => jest.fn()), // returns unsubscribe function
};

export default webSocketService;
