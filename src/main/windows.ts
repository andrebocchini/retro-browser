import { BrowserWindow } from 'electron';
import * as path from 'path';

/**
 * Create the dial-up connection dialog window
 * This window is styled to look like a Windows 95/98 dialog
 */
export function createDialupWindow(): BrowserWindow {
  const dialupWindow = new BrowserWindow({
    width: 400,
    height: 480,
    resizable: false,
    maximizable: false,
    minimizable: true,
    fullscreenable: false,
    title: 'Connect To...',
    icon: path.join(__dirname, '..', 'assets', 'dialup-icon.png'),
    webPreferences: {
      preload: path.join(__dirname, '..', 'renderer', 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Load the dialup HTML file
  dialupWindow.loadFile(
    path.join(__dirname, '..', 'renderer', 'dialup', 'dialup.html')
  );

  // Remove the default menu bar
  dialupWindow.setMenuBarVisibility(false);

  return dialupWindow;
}

/**
 * Create the main browser window
 * This window contains the retro-styled browser with navigation controls
 */
export function createBrowserWindow(): BrowserWindow {
  const browserWindow = new BrowserWindow({
    width: 1024,
    height: 768,
    minWidth: 640,
    minHeight: 480,
    title: 'Internet Explorer',
    icon: path.join(__dirname, '..', 'assets', 'browser-icon.png'),
    webPreferences: {
      preload: path.join(__dirname, '..', 'renderer', 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webviewTag: true, // Enable <webview> tag
    },
  });

  // Load the browser HTML file
  browserWindow.loadFile(
    path.join(__dirname, '..', 'renderer', 'browser', 'browser.html')
  );

  // Remove the default menu bar
  browserWindow.setMenuBarVisibility(false);

  return browserWindow;
}
