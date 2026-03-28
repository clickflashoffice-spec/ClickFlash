const { defaults: tsjPreset } = require('ts-jest/presets');

module.exports = {
    testEnvironment: 'jsdom',
    roots: ['<rootDir>/src', '<rootDir>/backend'],
    transform: {
        ...tsjPreset.transform,
        '^.+\\.(ts|tsx)$': 'ts-jest',
        '^.+\\.(js|jsx)$': 'babel-jest',
    },
    moduleNameMapper: {
        '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
        '\\.(gif|ttf|eot|svg|png)$': '<rootDir>/__mocks__/fileMock.js',
        '^.*[/\\\\]utils[/\\\\]env$': '<rootDir>/__mocks__/env.js',
        '^.*[/\\\\]utils[/\\\\]env\\.ts$': '<rootDir>/__mocks__/env.js',
        '\\.module\\.(css|less|scss|sass)$': 'identity-obj-proxy',
        '\\.module\\.css$': 'identity-obj-proxy',
        '^@/services/pb$': '<rootDir>/src/services/__mocks__/pb.ts',
        '^services/pb$': '<rootDir>/src/services/__mocks__/pb.ts',
        '^@/services/webSocketService$': '<rootDir>/src/services/__mocks__/webSocketService.ts',
        '^services/webSocketService$': '<rootDir>/src/services/__mocks__/webSocketService.ts',
    },
    setupFilesAfterEnv: ['<rootDir>/src/setupTests.ts'],
    testPathIgnorePatterns: ['/node_modules/', '/dist/', '/release/'],
};
