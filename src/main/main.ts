import { app, BrowserWindow } from 'electron';
import { state } from './state';
import { createDialupWindow } from './windows';
import { registerIpcHandlers } from './ipc-handlers';

/**
 * Create the initial application window
 */
function createWindow(): void {
  // Create the dialup window and store reference in state
  state.dialupWindow = createDialupWindow();

  // Intercept close to hide instead of destroy when connected
  state.dialupWindow.on('close', (event) => {
    if (state.status === 'connected' && state.dialupWindow) {
      // Prevent window destruction, just hide it
      event.preventDefault();
      state.dialupWindow.hide();
    }
  });

  // Handle dialup window close (when actually destroyed)
  state.dialupWindow.on('closed', () => {
    state.dialupWindow = null;
    // If dialup window is closed and we're not connected, quit the app
    if (state.status !== 'connected') {
      app.quit();
    }
  });
}

/**
 * Application initialization
 */
app.whenReady().then(() => {
  // Register IPC handlers before creating windows
  registerIpcHandlers();

  // Create the initial window
  createWindow();

  // macOS: Re-create window when clicking dock icon if no windows are open
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

/**
 * Quit when all windows are closed (except on macOS)
 */
app.on('window-all-closed', () => {
  // On macOS, apps typically stay active until explicitly quit
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

/**
 * Handle any uncaught errors
 */
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});
