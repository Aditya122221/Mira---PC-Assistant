// electron.js
import { app, BrowserWindow, protocol, session } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function createWindow() {
    const win = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            sandbox: false,
            webSecurity: true
        },
    });

    if (app.isPackaged) {
        // Load the built index.html in production
        win.loadFile(path.join(__dirname, 'build', 'index.html'));
    } else {
        // Load from Vite dev server in development
        win.loadURL('http://localhost:5173');
        win.webContents.openDevTools();
    }
}

app.whenReady().then(() => {
    // Handle microphone permission requests
    session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
        if (permission === 'media') {
            // Allow microphone access
            callback(true);
        } else {
            callback(false);
        }
    });

    createWindow();
});

// Quit when all windows are closed (except on macOS)
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

// Re-create a window when app is activated (macOS)
app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});
