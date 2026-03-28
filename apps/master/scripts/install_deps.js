// Install dependencies script
// Run with: node install_deps.js

const { execSync } = require('child_process');

console.log('Installing react-window dependencies...');

try {
    execSync('npm install react-window react-virtualized-auto-sizer', { stdio: 'inherit' });
    console.log('\n✓ Runtime dependencies installed');
} catch (error) {
    console.error('✗ Failed to install runtime dependencies:', error.message);
}

try {
    execSync('npm install --save-dev @types/react-window', { stdio: 'inherit' });
    console.log('\n✓ Type definitions installed');
} catch (error) {
    console.error('✗ Failed to install type definitions:', error.message);
}

console.log('\nInstallation complete!');
