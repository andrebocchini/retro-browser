import { ipcMain } from 'electron';
import {
  state,
  resetState,
  getConnectionDuration,
  getRandomDelay,
  MIN_DISCONNECT_DELAY,
  MAX_DISCONNECT_DELAY,
  ModemSpeed,
} from './state';
import { createBrowserWindow } from './windows';
import { applyNetworkThrottling } from './network-throttle';

/**
 * Register all IPC handlers
 * This should be called once during app initialization
 */
export function registerIpcHandlers(): void {
  /**
   * Handle connection start request
   * Called when user clicks "Connect" button
   */
  ipcMain.handle('connect-start', async (_event, modemSpeed: ModemSpeed) => {
    state.status = 'connecting';
    state.selectedModemSpeed = modemSpeed;
    return { success: true };
  });

  /**
   * Handle connection complete notification
   * Called after modem sound finishes playing
   */
  ipcMain.handle('connect-complete', async () => {
    state.status = 'connected';
    state.connectedAt = Date.now();

    // Hide the dialup window
    if (state.dialupWindow) {
      state.dialupWindow.hide();
    }

    // Create and show the browser window
    state.browserWindow = createBrowserWindow();

    // Apply network throttling when webview is attached
    state.browserWindow.webContents.on('did-attach-webview', (_event, webviewContents) => {
      applyNetworkThrottling(webviewContents);
    });

    // Handle browser window close
    state.browserWindow.on('closed', () => {
      state.browserWindow = null;
      // If user closes browser window directly, disconnect
      if (state.status === 'connected') {
        handleDisconnect();
      }
    });

    // Start the random disconnect timer
    scheduleRandomDisconnect();

    return { success: true };
  });

  /**
   * Handle request to show connection status dialog
   * Called when user clicks the connection status icon in browser toolbar
   */
  ipcMain.handle('show-connection-status', async () => {
    if (state.dialupWindow) {
      // Send message to dialup window to switch to status mode
      state.dialupWindow.webContents.send('set-mode', 'status');
      state.dialupWindow.show();
    }
    return { success: true };
  });

  /**
   * Handle disconnect request
   * Called when user clicks "Disconnect" button
   */
  ipcMain.handle('disconnect', async () => {
    handleDisconnect();
    return { success: true };
  });

  /**
   * Get current connection duration in seconds
   * Called by browser window to update the timer display
   */
  ipcMain.handle('get-connection-time', async () => {
    return getConnectionDuration();
  });
}

/**
 * Internal function to handle disconnection logic
 * @param isRandomDisconnect - Whether this is a random disconnect (affects messaging)
 */
function handleDisconnect(isRandomDisconnect: boolean = false): void {
  // Clear the random disconnect timer
  if (state.randomDisconnectTimer) {
    clearTimeout(state.randomDisconnectTimer);
    state.randomDisconnectTimer = null;
  }

  // Hide browser window (don't close, keep it for reconnection)
  if (state.browserWindow && !state.browserWindow.isDestroyed()) {
    if (isRandomDisconnect) {
      // For random disconnect, hide the window instead of closing
      state.browserWindow.hide();
    } else {
      // For manual disconnect, close the window
      state.browserWindow.close();
      state.browserWindow = null;
    }
  }

  // Reset state
  resetState();

  // Show dialup window with appropriate mode
  if (state.dialupWindow && !state.dialupWindow.isDestroyed()) {
    if (isRandomDisconnect) {
      // Show "connection lost" mode for random disconnects
      state.dialupWindow.webContents.send('set-mode', 'connection-lost');
    } else {
      state.dialupWindow.webContents.send('set-mode', 'connect');
    }
    state.dialupWindow.show();
  }
}

/**
 * Schedule a random disconnection
 * Called after successful connection and after each reconnection
 */
function scheduleRandomDisconnect(): void {
  // Clear any existing timer
  if (state.randomDisconnectTimer) {
    clearTimeout(state.randomDisconnectTimer);
  }

  // Calculate random delay between 2-3 minutes
  const delay = getRandomDelay(MIN_DISCONNECT_DELAY, MAX_DISCONNECT_DELAY);

  console.log(`Random disconnect scheduled in ${Math.round(delay / 1000)} seconds`);

  // Schedule the random disconnect
  state.randomDisconnectTimer = setTimeout(() => {
    if (state.status === 'connected') {
      console.log('Random disconnect triggered!');
      handleDisconnect(true);
    }
  }, delay);
}
