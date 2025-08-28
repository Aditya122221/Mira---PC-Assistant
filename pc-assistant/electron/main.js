// main.js
import { app, BrowserWindow, shell } from 'electron';

function createWindow() {
    const win = new BrowserWindow({
        width: 1200, height: 800,
        autoHideMenuBar: true,
        webPreferences: {
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: true
        }
    });

    // Load your live site or local index.html
    win.loadURL('http://localhost:5173');

    // Open all external links in the default browser
    win.webContents.setWindowOpenHandler(({ url }) => {
        shell.openExternal(url);
        return { action: 'deny' };
    });

    // Optional: limit navigation to trusted origins
    win.webContents.on('will-navigate', (e, url) => {
        const allowed = ['http://localhost:5173'];
        if (!allowed.some(prefix => url.startsWith(prefix))) {
            e.preventDefault();
            shell.openExternal(url);
        }
    });
}

app.whenReady().then(() => {
    createWindow();
    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
