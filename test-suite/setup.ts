// ClickFlash Jest setup
// Loaded via setupFilesAfterEnv in root jest.config.js

// Extend Jest matchers if @testing-library/jest-dom is available
try {
  require('@testing-library/jest-dom');
} catch {
  // jest-dom not installed in this workspace; skip extension
}

// Default test timeout is configured in jest.config.js
