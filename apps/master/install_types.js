const { execSync } = require('child_process');
try {
    console.log('Installing React types...');
    execSync('npm install --save-dev @types/react @types/react-dom', { stdio: 'inherit' });
    console.log('Installation successful.');
} catch (error) {
    console.error('Installation failed:', error.message);
    process.exit(1);
}
