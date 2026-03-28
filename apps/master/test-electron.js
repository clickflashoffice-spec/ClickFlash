const { app, BrowserWindow } = require('electron');
console.log('app:', typeof app);
console.log('BrowserWindow:', typeof BrowserWindow);
app.on('ready', () => {
  console.log('Electron is ready!');
  app.quit();
});
