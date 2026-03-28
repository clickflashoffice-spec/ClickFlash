/**
 * Start backend server for E2E tests with test database
 */

const { spawn } = require('child_process');
const path = require('path');

console.log('[E2E Server] Starting backend with test database...');

// Set environment variables for test
process.env.NODE_ENV = 'test';
process.env.DB_PATH = path.resolve(__dirname, '../pb_data/test.db');
process.env.PORT = '8090';

// Start the backend server
const server = spawn('npx', ['tsx', 'watch', 'backend/server.ts'], {
  cwd: path.resolve(__dirname, '..'),
  stdio: 'pipe',
  env: { ...process.env }
});

server.stdout.on('data', (data) => {
  const output = data.toString();
  process.stdout.write(output);
  
  // Signal when server is ready
  if (output.includes('Titan Protocol] Master Server running')) {
    console.log('[E2E Server] ✅ Backend ready on port 8090');
  }
});

server.stderr.on('data', (data) => {
  process.stderr.write(data);
});

server.on('close', (code) => {
  console.log(`[E2E Server] Backend exited with code ${code}`);
  process.exit(code);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('[E2E Server] Shutting down...');
  server.kill('SIGINT');
});

process.on('SIGTERM', () => {
  console.log('[E2E Server] Shutting down...');
  server.kill('SIGTERM');
});
