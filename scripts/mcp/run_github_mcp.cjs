#!/usr/bin/env node
/**
 * ClickFlash Autonomous MCP Runner - GitHub MCP Server
 * Dynamically resolves GitHub token from environment or active `gh` CLI session.
 * Never hardcodes secrets or tokens into source control.
 */
const { execSync, spawn } = require('child_process');
const path = require('path');

let token = process.env.GITHUB_PERSONAL_ACCESS_TOKEN || process.env.GITHUB_TOKEN;

if (!token) {
  try {
    token = execSync('gh auth token', { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] }).trim();
  } catch (_err) {
    // Falls back to empty if unauthenticated
  }
}

const childEnv = {
  ...process.env,
  GITHUB_PERSONAL_ACCESS_TOKEN: token || '',
  GITHUB_TOKEN: token || ''
};

const npxCmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';

const child = spawn(npxCmd, ['-y', '@modelcontextprotocol/server-github'], {
  env: childEnv,
  stdio: 'inherit',
  shell: false
});

child.on('exit', (code) => {
  process.exit(code || 0);
});
