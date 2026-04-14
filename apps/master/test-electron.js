console.log('require.resolve("electron"):', require.resolve('electron'));
const e = require('electron');
console.log('typeof electron:', typeof e);
console.log('electron value:', e.substring(0, 50));
