# Retro Browser - Implementation Plan

A nostalgic app that simulates the 90s dial-up internet experience, complete with modem sounds and a retro browser interface.

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Architecture Diagrams](#architecture-diagrams)
3. [Technology Stack](#technology-stack)
4. [Implementation Steps](#implementation-steps)

---

## Project Overview

### What We're Building

A cross-platform desktop application that:

1. Shows a dial-up connection dialog when launched
2. Plays modem negotiation sounds when connecting
3. Opens a retro-styled browser window after "connecting"
4. Displays a connection timer in the browser toolbar
5. Allows users to "disconnect" and return to the dial-up dialog
6. Simulates unstable connections with random disconnects every 2-3 minutes

### Target Platforms

- Windows
- macOS
- Linux

---

## Architecture Diagrams

### Diagram 1: Application States and Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                         App States                               │
└─────────────────────────────────────────────────────────────────┘

  ┌──────────────┐       Connect        ┌──────────────────────────┐
  │   DIALUP     │ ──────────────────►  │        CONNECTED         │
  │   WINDOW     │                      │                          │
  │              │                      │  ┌────────────────────┐  │
  │ [Connect]    │                      │  │  Browser Window    │  │
  │              │                      │  │                    │  │
  └──────────────┘                      │  │  ← → ⟳ ✕ [url]    │  │
        ▲                               │  │         [🖥 00:42] │  │
        │                               │  │                    │  │
        │ Click                         │  │    <webview>       │  │
        │ status                        │  │                    │  │
        │ icon                          │  └────────────────────┘  │
        │                               │                          │
  ┌─────┴────────┐                      └──────────────────────────┘
  │   DIALUP     │       Disconnect               │
  │   WINDOW     │ ◄──────────────────────────────┘
  │  (modal)     │            ▲
  │              │            │
  │ [Disconnect] │            │ Random disconnect
  │              │            │ (every 2-3 minutes)
  └──────────────┘            │
        │                     │
        └─────────────────────┘
        App closes / returns to initial state
```

### Diagram 1b: Random Disconnection Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    Random Disconnect Timer                       │
└─────────────────────────────────────────────────────────────────┘

  CONNECTED STATE
       │
       ▼
  ┌────────────────────────────┐
  │  Start random disconnect   │
  │  timer (2-3 min interval)  │
  └────────────────────────────┘
       │
       │ Timer fires randomly
       ▼
  ┌────────────────────────────┐
  │  Trigger 'random-disconnect'│
  │  - Hide browser window     │
  │  - Show dialup window      │
  │  - Display "Connection     │
  │    lost" message           │
  │  - Reset connection state  │
  └────────────────────────────┘
       │
       ▼
  ┌────────────────────────────┐
  │  User clicks "Reconnect"   │
  │  - Normal connection flow  │
  │  - Timer restarts after    │
  │    successful reconnection │
  └────────────────────────────┘
```

### Diagram 2: Process Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                       Main Process                               │
│                                                                  │
│  - Manages app state: 'disconnected' | 'connecting' | 'connected'│
│  - Tracks connection start time                                  │
│  - Manages random disconnect timer (2-3 minute intervals)        │
│  - Handles IPC:                                                  │
│      • connect-start → play audio, update state                  │
│      • connect-complete → hide dialup, show browser, start timer │
│      • show-connection-status → show dialup as modal             │
│      • disconnect → close browser, show dialup (fresh)           │
│      • get-connection-time → returns elapsed seconds             │
│      • random-disconnect → triggered by timer, shows dialup      │
└─────────────────────────────────────────────────────────────────┘
                              │
            ┌─────────────────┴─────────────────┐
            ▼                                   ▼
   ┌─────────────────┐                ┌─────────────────────────┐
   │  Dialup Window  │                │    Browser Window       │
   │                 │                │                         │
   │  Mode: 'connect'│                │  Toolbar:               │
   │   or 'status'   │                │   [←] [→] [⟳] [✕]      │
   │                 │                │   [address bar    ]     │
   │  [Connect] or   │                │   [🖥 00:01:23] ← click │
   │  [Disconnect]   │                │                         │
   │                 │                │  <webview>              │
   └─────────────────┘                └─────────────────────────┘
```

### Diagram 3: Component Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Main Process                                  │
│  - Window management                                            │
│  - IPC handlers for navigation controls                         │
│  - Audio playback (modem sounds)                                │
│  - Application state management                                 │
└─────────────────────┬───────────────────────────────────────────┘
                      │ IPC
        ┌─────────────┴─────────────┐
        ▼                           ▼
┌───────────────────┐    ┌─────────────────────────────┐
│  Dialup Window    │    │      Browser Window         │
│  (BrowserWindow)  │    │      (BrowserWindow)        │
│                   │    │                             │
│  - Retro dialog   │    │  ┌─────────────────────┐   │
│  - Connect button │    │  │ Toolbar (HTML/CSS)  │   │
│  - Status text    │    │  │ ← → ⟳ ✕  [address] │   │
│  - Animation      │    │  │ [🖥 00:01:23]       │   │
│  - Disconnect btn │    │  └─────────────────────┘   │
└───────────────────┘    │  ┌─────────────────────┐   │
                         │  │    <webview>        │   │
                         │  │  (embedded browser) │   │
                         │  └─────────────────────┘   │
                         └─────────────────────────────┘
```

### Diagram 4: File Structure

```
retro-browser/
├── package.json
├── tsconfig.json
├── electron-builder.json
├── src/
│   ├── main/
│   │   ├── main.ts              # Electron main process entry point
│   │   ├── state.ts             # Application state management
│   │   ├── ipc-handlers.ts      # IPC communication handlers
│   │   └── windows.ts           # Window creation utilities
│   ├── renderer/
│   │   ├── dialup/
│   │   │   ├── dialup.html      # Dialup window markup
│   │   │   ├── dialup.css       # Dialup window styles
│   │   │   └── dialup.ts        # Dialup window logic
│   │   ├── browser/
│   │   │   ├── browser.html     # Browser window markup
│   │   │   ├── browser.css      # Browser window styles
│   │   │   └── browser.ts       # Browser window logic
│   │   └── preload.ts           # Preload script for IPC bridge
│   └── assets/
│       └── modem.mp3            # Dial-up modem sound file
└── dist/                        # Compiled output (generated)
```

---

## Technology Stack

| Technology | Purpose |
|------------|---------|
| Electron | Cross-platform desktop app framework |
| TypeScript | Type-safe JavaScript |
| 98.css | Windows 95/98 retro styling |
| HTML5 Audio | Playing modem sounds |
| Electron webview | Embedded browser functionality |

---

## Implementation Steps

### Phase 1: Project Setup

---

#### Step 1: Initialize npm Project

**Objective:** Create a package.json file with project metadata.

**Description:**
Initialize a new npm project. This creates the package.json file that tracks dependencies and scripts.

**Work:**
```bash
npm init -y
```

Then open `package.json` and update it to look like this:

```json
{
  "name": "retro-browser",
  "version": "1.0.0",
  "description": "A nostalgic dial-up internet experience",
  "main": "dist/main/main.js",
  "scripts": {
    "build": "tsc",
    "start": "npm run build && electron .",
    "watch": "tsc --watch"
  },
  "keywords": ["electron", "retro", "dialup", "browser"],
  "author": "Your Name",
  "license": "MIT"
}
```

**Success Criteria:**
- `package.json` exists in the project root
- The `main` field points to `dist/main/main.js`
- The `scripts` section includes `build`, `start`, and `watch` commands

**Test Steps:**
1. Run `cat package.json` to view the file contents
2. Verify the `main` field is set to `dist/main/main.js`
3. Verify the scripts section contains `build`, `start`, and `watch`

---

#### Step 2: Install Dependencies

**Objective:** Install all required npm packages.

**Description:**
Install Electron as our application framework, TypeScript for type-safe development, and 98.css for retro styling.

**Work:**
```bash
npm install electron --save-dev
npm install typescript --save-dev
npm install 98.css --save
```

**Success Criteria:**
- `node_modules` directory exists
- `package.json` includes `electron` and `typescript` in `devDependencies`
- `package.json` includes `98.css` in `dependencies`
- `package-lock.json` exists

**Test Steps:**
1. Run `cat package.json` and verify dependencies are listed
2. Run `ls node_modules` and verify `electron`, `typescript`, and `98.css` folders exist
3. Run `npx electron --version` to verify Electron is installed (should print a version number)
4. Run `npx tsc --version` to verify TypeScript is installed (should print a version number)

---

#### Step 3: Create TypeScript Configuration

**Objective:** Configure TypeScript compiler options.

**Description:**
Create a `tsconfig.json` file that tells TypeScript how to compile our code. We need to configure it to output to the `dist` directory and work with Electron.

**Work:**
Create a file named `tsconfig.json` in the project root with this content:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020", "DOM"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

**Success Criteria:**
- `tsconfig.json` exists in the project root
- The `outDir` is set to `./dist`
- The `rootDir` is set to `./src`

**Test Steps:**
1. Run `cat tsconfig.json` to verify the file contents
2. Run `npx tsc --noEmit` - should complete without errors (may warn about no input files, which is okay at this stage)

---

#### Step 4: Create Directory Structure

**Objective:** Create all required directories for the project.

**Description:**
Create the folder structure that will hold our source code, organized by main process, renderer process, and assets.

**Work:**
```bash
mkdir -p src/main
mkdir -p src/renderer/dialup
mkdir -p src/renderer/browser
mkdir -p src/assets
```

**Success Criteria:**
- All directories exist as shown in the file structure diagram
- The structure is: `src/main`, `src/renderer/dialup`, `src/renderer/browser`, `src/assets`

**Test Steps:**
1. Run `find src -type d` (or `tree src` if available) to see the directory structure
2. Verify you see:
   - `src/main`
   - `src/renderer/dialup`
   - `src/renderer/browser`
   - `src/assets`

---

#### Step 5: Download Modem Sound File

**Objective:** Obtain a dial-up modem sound effect.

**Description:**
Download a dial-up modem negotiation sound file. This is the iconic sound that modems made when connecting to the internet in the 90s. You need to find a royalty-free version online.

**Work:**
1. Search for "dial-up modem sound effect free download" or "dial-up modem sound mp3"
2. Good sources include:
   - freesound.org (search for "dial up modem")
   - archive.org (search for "modem sound")
   - YouTube audio library
3. Download an MP3 file (ideally 20-40 seconds long)
4. Save it as `src/assets/modem.mp3`

**Success Criteria:**
- A file named `modem.mp3` exists in `src/assets/`
- The file is a valid audio file (MP3 format)
- The file plays the recognizable dial-up modem sound

**Test Steps:**
1. Run `ls -la src/assets/` to verify the file exists
2. Run `file src/assets/modem.mp3` to verify it's recognized as an audio file
3. Play the file with your system's audio player to verify it sounds correct

---

### Phase 2: Main Process Implementation

---

#### Step 6: Create Application State Module

**Objective:** Create a module to manage the application's state.

**Description:**
Create a TypeScript file that defines and manages the application state. This includes tracking whether we're connected, when the connection started, and references to our windows.

**Work:**
Create file `src/main/state.ts`:

```typescript
import { BrowserWindow } from 'electron';

/**
 * Possible states of the dial-up connection
 */
export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected';

/**
 * Application state interface
 */
export interface AppState {
  /** Current connection status */
  status: ConnectionStatus;
  /** Timestamp when connection was established (null if not connected) */
  connectedAt: number | null;
  /** Reference to the dial-up dialog window */
  dialupWindow: BrowserWindow | null;
  /** Reference to the browser window */
  browserWindow: BrowserWindow | null;
  /** Timer ID for random disconnection (null if not active) */
  randomDisconnectTimer: NodeJS.Timeout | null;
}

/**
 * Global application state
 * This object is the single source of truth for the app's current state
 */
export const state: AppState = {
  status: 'disconnected',
  connectedAt: null,
  dialupWindow: null,
  browserWindow: null,
  randomDisconnectTimer: null,
};

/**
 * Reset the application state to its initial values
 * Used when disconnecting
 */
export function resetState(): void {
  state.status = 'disconnected';
  state.connectedAt = null;
  // Clear any existing random disconnect timer
  if (state.randomDisconnectTimer) {
    clearTimeout(state.randomDisconnectTimer);
    state.randomDisconnectTimer = null;
  }
  // Note: We don't reset window references here as they're managed separately
}

/**
 * Calculate how many seconds have elapsed since connection
 * @returns Number of seconds connected, or 0 if not connected
 */
export function getConnectionDuration(): number {
  if (state.connectedAt === null) {
    return 0;
  }
  return Math.floor((Date.now() - state.connectedAt) / 1000);
}

/**
 * Generate a random delay between min and max milliseconds
 * @param minMs - Minimum delay in milliseconds
 * @param maxMs - Maximum delay in milliseconds
 * @returns Random delay in milliseconds
 */
export function getRandomDelay(minMs: number, maxMs: number): number {
  return Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
}

/**
 * Constants for random disconnect timing
 * MIN_DISCONNECT_DELAY: 2 minutes in milliseconds
 * MAX_DISCONNECT_DELAY: 3 minutes in milliseconds
 */
export const MIN_DISCONNECT_DELAY = 2 * 60 * 1000; // 2 minutes
export const MAX_DISCONNECT_DELAY = 3 * 60 * 1000; // 3 minutes
```

**Success Criteria:**
- File `src/main/state.ts` exists
- The file exports `AppState` type, `state` object, `resetState` function, `getConnectionDuration` function, `getRandomDelay` function, and timing constants
- The `randomDisconnectTimer` field is included in the state
- No TypeScript compilation errors

**Test Steps:**
1. Run `npx tsc --noEmit` to check for compilation errors
2. Verify the file compiles without errors
3. Review the code to ensure all exports are present
4. Verify `MIN_DISCONNECT_DELAY` and `MAX_DISCONNECT_DELAY` constants are exported

---

#### Step 7: Create Window Factory Module

**Objective:** Create a module with functions to create the application windows.

**Description:**
Create a TypeScript file with factory functions that create and configure the BrowserWindow instances for the dialup dialog and browser windows.

**Work:**
Create file `src/main/windows.ts`:

```typescript
import { BrowserWindow } from 'electron';
import * as path from 'path';

/**
 * Create the dial-up connection dialog window
 * This window is styled to look like a Windows 95/98 dialog
 */
export function createDialupWindow(): BrowserWindow {
  const dialupWindow = new BrowserWindow({
    width: 400,
    height: 300,
    resizable: false,
    maximizable: false,
    minimizable: true,
    fullscreenable: false,
    title: 'Connect To...',
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
```

**Success Criteria:**
- File `src/main/windows.ts` exists
- The file exports `createDialupWindow` and `createBrowserWindow` functions
- Both functions return `BrowserWindow` instances
- The preload script path is correctly configured
- webviewTag is enabled for the browser window

**Test Steps:**
1. Run `npx tsc --noEmit` to check for compilation errors
2. Verify both functions are exported
3. Check that `webviewTag: true` is present in browser window options

---

#### Step 8: Create IPC Handlers Module

**Objective:** Create a module to handle Inter-Process Communication between main and renderer processes.

**Description:**
Create a TypeScript file that sets up all the IPC (Inter-Process Communication) handlers. These handlers allow the renderer processes (the windows) to communicate with the main process.

**Work:**
Create file `src/main/ipc-handlers.ts`:

```typescript
import { ipcMain, BrowserWindow } from 'electron';
import {
  state,
  resetState,
  getConnectionDuration,
  getRandomDelay,
  MIN_DISCONNECT_DELAY,
  MAX_DISCONNECT_DELAY,
} from './state';
import { createBrowserWindow } from './windows';

/**
 * Register all IPC handlers
 * This should be called once during app initialization
 */
export function registerIpcHandlers(): void {
  /**
   * Handle connection start request
   * Called when user clicks "Connect" button
   */
  ipcMain.handle('connect-start', async () => {
    state.status = 'connecting';
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
```

**Success Criteria:**
- File `src/main/ipc-handlers.ts` exists
- The file exports a `registerIpcHandlers` function
- Handlers are registered for: `connect-start`, `connect-complete`, `show-connection-status`, `disconnect`, `get-connection-time`
- The disconnect logic properly cleans up windows and resets state
- The `scheduleRandomDisconnect` function schedules random disconnects after connection
- Random disconnects show a different dialog mode (`connection-lost`)

**Test Steps:**
1. Run `npx tsc --noEmit` to check for compilation errors
2. Verify all five IPC handlers are registered
3. Review the `handleDisconnect` function to ensure it handles all cleanup
4. Verify `scheduleRandomDisconnect` is called in `connect-complete` handler
5. Verify random disconnect uses `connection-lost` mode for the dialup window

---

#### Step 9: Create Main Entry Point

**Objective:** Create the main process entry point that initializes the Electron application.

**Description:**
Create the main TypeScript file that starts the Electron application. This file handles app lifecycle events and creates the initial window.

**Work:**
Create file `src/main/main.ts`:

```typescript
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

  // Handle dialup window close
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
```

**Success Criteria:**
- File `src/main/main.ts` exists
- The file imports and uses modules from `state.ts`, `windows.ts`, and `ipc-handlers.ts`
- IPC handlers are registered before window creation
- App handles `ready`, `activate`, and `window-all-closed` events
- macOS-specific behavior is implemented

**Test Steps:**
1. Run `npx tsc --noEmit` to check for compilation errors
2. Verify the import statements reference the correct modules
3. Verify `registerIpcHandlers()` is called in `app.whenReady()`

---

### Phase 3: Preload Script

---

#### Step 10: Create Preload Script

**Objective:** Create the preload script that exposes IPC methods to renderer processes securely.

**Description:**
Create a preload script that uses `contextBridge` to safely expose IPC methods to the renderer processes. This is required because we're using `contextIsolation: true` for security.

**Work:**
Create file `src/renderer/preload.ts`:

```typescript
import { contextBridge, ipcRenderer } from 'electron';

/**
 * Type definitions for the API exposed to renderer processes
 */
export interface ElectronAPI {
  // Connection actions
  connectStart: () => Promise<{ success: boolean }>;
  connectComplete: () => Promise<{ success: boolean }>;
  disconnect: () => Promise<{ success: boolean }>;
  showConnectionStatus: () => Promise<{ success: boolean }>;

  // Connection info
  getConnectionTime: () => Promise<number>;

  // Event listeners
  onSetMode: (callback: (mode: 'connect' | 'status' | 'connection-lost') => void) => void;
}

/**
 * Expose protected methods to the renderer process
 * These can be accessed via window.electronAPI
 */
contextBridge.exposeInMainWorld('electronAPI', {
  // Connection actions
  connectStart: () => ipcRenderer.invoke('connect-start'),
  connectComplete: () => ipcRenderer.invoke('connect-complete'),
  disconnect: () => ipcRenderer.invoke('disconnect'),
  showConnectionStatus: () => ipcRenderer.invoke('show-connection-status'),

  // Connection info
  getConnectionTime: () => ipcRenderer.invoke('get-connection-time'),

  // Event listeners
  onSetMode: (callback: (mode: 'connect' | 'status' | 'connection-lost') => void) => {
    ipcRenderer.on('set-mode', (_event, mode) => callback(mode));
  },
} as ElectronAPI);
```

Also, create a TypeScript declaration file so that renderer TypeScript files know about `window.electronAPI`.

Create file `src/renderer/global.d.ts`:

```typescript
import { ElectronAPI } from './preload';

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

export {};
```

**Success Criteria:**
- File `src/renderer/preload.ts` exists
- File `src/renderer/global.d.ts` exists
- The preload script exposes all required IPC methods
- Type definitions are provided for TypeScript support

**Test Steps:**
1. Run `npx tsc --noEmit` to check for compilation errors
2. Verify all IPC methods match those in `ipc-handlers.ts`
3. Verify the `ElectronAPI` interface includes all methods

---

### Phase 4: Dialup Window Implementation

---

#### Step 11: Create Dialup Window HTML

**Objective:** Create the HTML structure for the dial-up connection dialog.

**Description:**
Create an HTML file that structures the dial-up dialog. This includes the connection status text, connect/disconnect buttons, and imports the 98.css stylesheet for retro styling.

**Work:**
Create file `src/renderer/dialup/dialup.html`:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self'">
  <title>Connect To...</title>
  <link rel="stylesheet" href="../../../node_modules/98.css/dist/98.css">
  <link rel="stylesheet" href="dialup.css">
</head>
<body>
  <div class="window dialup-window">
    <div class="title-bar">
      <div class="title-bar-text">Connect To...</div>
    </div>
    <div class="window-body">
      <!-- Connection icon and info -->
      <div class="connection-info">
        <div class="computer-icon">🖥️</div>
        <div class="connection-details">
          <p class="isp-name">Dial-Up Networking</p>
          <p class="phone-number">Phone: 555-1234</p>
        </div>
      </div>

      <!-- Status section -->
      <fieldset class="status-fieldset">
        <legend>Status</legend>
        <div id="status-section">
          <p id="status-text">Ready to connect.</p>
          <div id="progress-container" class="hidden">
            <div id="progress-animation"></div>
          </div>
        </div>
      </fieldset>

      <!-- Connection lost warning (hidden by default) -->
      <div id="connection-lost-warning" class="warning-box hidden">
        <span class="warning-icon">⚠️</span>
        <span class="warning-text">Connection was lost. Please reconnect.</span>
      </div>

      <!-- Buttons -->
      <div class="button-row">
        <button id="connect-btn" class="default">Connect</button>
        <button id="reconnect-btn" class="hidden default">Reconnect</button>
        <button id="disconnect-btn" class="hidden">Disconnect</button>
        <button id="cancel-btn">Cancel</button>
      </div>
    </div>
  </div>

  <!-- Audio element for modem sound -->
  <audio id="modem-audio" preload="auto">
    <source src="../../assets/modem.mp3" type="audio/mpeg">
  </audio>

  <script src="dialup.js"></script>
</body>
</html>
```

**Success Criteria:**
- File `src/renderer/dialup/dialup.html` exists
- The HTML includes the 98.css stylesheet
- The HTML has a status text element with id `status-text`
- The HTML has Connect, Reconnect, Disconnect, and Cancel buttons
- The HTML includes a connection-lost warning box element
- The HTML includes an audio element for the modem sound
- Content Security Policy is set

**Test Steps:**
1. Open the HTML file in a browser (it won't be fully functional but should render)
2. Verify the 98.css stylesheet path is correct
3. Verify all button IDs are present: `connect-btn`, `reconnect-btn`, `disconnect-btn`, `cancel-btn`
4. Verify the audio element source path is correct
5. Verify the `connection-lost-warning` element exists

---

#### Step 12: Create Dialup Window CSS

**Objective:** Create custom styles for the dial-up dialog.

**Description:**
Create a CSS file with additional styles for the dial-up dialog that complement the 98.css base styles. This includes layout, animations, and custom styling.

**Work:**
Create file `src/renderer/dialup/dialup.css`:

```css
/* Reset and base styles */
* {
  box-sizing: border-box;
}

body {
  margin: 0;
  padding: 8px;
  background-color: #008080; /* Classic teal background */
  min-height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
}

/* Main window container */
.dialup-window {
  width: 100%;
  max-width: 380px;
}

.window-body {
  padding: 12px;
}

/* Connection info section */
.connection-info {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
  padding: 8px;
  background: #fff;
  border: 1px solid #808080;
}

.computer-icon {
  font-size: 48px;
  line-height: 1;
}

.connection-details {
  flex: 1;
}

.connection-details p {
  margin: 0;
  font-size: 11px;
}

.isp-name {
  font-weight: bold;
  font-size: 12px !important;
  margin-bottom: 4px !important;
}

/* Status fieldset */
.status-fieldset {
  margin-bottom: 12px;
}

#status-section {
  min-height: 40px;
}

#status-text {
  margin: 0;
  font-size: 11px;
}

/* Progress animation */
#progress-container {
  margin-top: 8px;
  height: 16px;
  background: #fff;
  border: 1px inset #808080;
  overflow: hidden;
}

#progress-animation {
  height: 100%;
  width: 30%;
  background: linear-gradient(90deg, #000080, #0000ff, #000080);
  animation: progress-slide 1.5s ease-in-out infinite;
}

@keyframes progress-slide {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(400%); }
}

/* Button row */
.button-row {
  display: flex;
  justify-content: flex-end;
  gap: 6px;
}

.button-row button {
  min-width: 75px;
}

/* Utility classes */
.hidden {
  display: none !important;
}

/* Connected state styles */
.connection-timer {
  font-family: monospace;
  font-size: 14px;
  font-weight: bold;
  color: #000080;
  margin-top: 8px;
}

/* Connection lost warning box */
.warning-box {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  margin-bottom: 12px;
  background: #ffffcc;
  border: 1px solid #cc9900;
  color: #663300;
}

.warning-icon {
  font-size: 20px;
  line-height: 1;
}

.warning-text {
  font-size: 11px;
  font-weight: bold;
}
```

**Success Criteria:**
- File `src/renderer/dialup/dialup.css` exists
- The CSS includes the classic teal background color (#008080)
- Progress animation is defined
- The `.hidden` utility class is defined
- Button row styling is consistent with Windows 95/98 aesthetic
- Warning box styles are defined for connection lost state

**Test Steps:**
1. Open `dialup.html` in a browser
2. Verify the background is teal colored
3. Verify the window has a retro Windows appearance
4. Inspect that all CSS classes referenced in the HTML exist
5. Verify `.warning-box` class is styled with yellow background

---

#### Step 13: Create Dialup Window TypeScript

**Objective:** Implement the dial-up dialog logic including connection simulation.

**Description:**
Create the TypeScript file that handles the dial-up dialog interactions: connecting, playing modem sounds, updating status text, and handling the two dialog modes (connect vs. status).

**Work:**
Create file `src/renderer/dialup/dialup.ts`:

```typescript
/**
 * Dialog mode - determines which buttons are shown
 * 'connect' - Initial state, shows Connect button
 * 'status' - Connected state, shows Disconnect button
 * 'connection-lost' - Random disconnect occurred, shows Reconnect button
 */
type DialogMode = 'connect' | 'status' | 'connection-lost';

// DOM element references
const statusText = document.getElementById('status-text') as HTMLParagraphElement;
const progressContainer = document.getElementById('progress-container') as HTMLDivElement;
const connectionLostWarning = document.getElementById('connection-lost-warning') as HTMLDivElement;
const connectBtn = document.getElementById('connect-btn') as HTMLButtonElement;
const reconnectBtn = document.getElementById('reconnect-btn') as HTMLButtonElement;
const disconnectBtn = document.getElementById('disconnect-btn') as HTMLButtonElement;
const cancelBtn = document.getElementById('cancel-btn') as HTMLButtonElement;
const modemAudio = document.getElementById('modem-audio') as HTMLAudioElement;

/**
 * Current mode of the dialog
 */
let currentMode: DialogMode = 'connect';

/**
 * Whether a connection attempt is in progress
 */
let isConnecting = false;

/**
 * Helper function to create a delay
 * @param ms - Milliseconds to wait
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Update the dialog UI based on the current mode
 * @param mode - The mode to switch to
 */
function setDialogMode(mode: DialogMode): void {
  currentMode = mode;

  // Hide all mode-specific elements first
  connectBtn.classList.add('hidden');
  reconnectBtn.classList.add('hidden');
  disconnectBtn.classList.add('hidden');
  connectionLostWarning.classList.add('hidden');
  progressContainer.classList.add('hidden');

  if (mode === 'connect') {
    // Initial state - show Connect button
    connectBtn.classList.remove('hidden');
    cancelBtn.textContent = 'Cancel';
    statusText.textContent = 'Ready to connect.';
  } else if (mode === 'status') {
    // Connected state - show Disconnect button
    disconnectBtn.classList.remove('hidden');
    cancelBtn.textContent = 'Close';
    statusText.textContent = 'Connected to the Internet.';
  } else if (mode === 'connection-lost') {
    // Connection lost state - show warning and Reconnect button
    connectionLostWarning.classList.remove('hidden');
    reconnectBtn.classList.remove('hidden');
    cancelBtn.textContent = 'Cancel';
    statusText.textContent = 'Connection lost unexpectedly.';
  }
}

/**
 * Simulate the dial-up connection process
 * Plays modem sound and shows status updates
 */
async function connect(): Promise<void> {
  if (isConnecting) return;
  isConnecting = true;

  // Disable buttons during connection
  connectBtn.disabled = true;
  cancelBtn.disabled = true;

  // Show progress animation
  progressContainer.classList.remove('hidden');

  try {
    // Notify main process that connection is starting
    await window.electronAPI.connectStart();

    // Start playing modem sound
    modemAudio.currentTime = 0;
    modemAudio.play().catch((err) => {
      console.warn('Could not play audio:', err);
    });

    // Status: Dialing
    statusText.textContent = 'Dialing...';
    await delay(3000);

    // Status: Verifying
    statusText.textContent = 'Verifying username and password...';
    await delay(2500);

    // Status: Authenticating
    statusText.textContent = 'Authenticated. Logging on to network...';
    await delay(2000);

    // Status: Registering
    statusText.textContent = 'Registering your computer on the network...';
    await delay(1500);

    // Status: Connected
    const speeds = ['28,800', '33,600', '56,000'];
    const randomSpeed = speeds[Math.floor(Math.random() * speeds.length)];
    statusText.textContent = `Connected at ${randomSpeed} bps.`;
    await delay(1500);

    // Stop audio and notify main process
    modemAudio.pause();
    modemAudio.currentTime = 0;

    // Tell main process connection is complete
    await window.electronAPI.connectComplete();
  } catch (error) {
    console.error('Connection error:', error);
    statusText.textContent = 'Connection failed. Please try again.';
    progressContainer.classList.add('hidden');
  } finally {
    isConnecting = false;
    connectBtn.disabled = false;
    cancelBtn.disabled = false;
  }
}

/**
 * Handle disconnect button click
 */
async function disconnect(): Promise<void> {
  try {
    await window.electronAPI.disconnect();
  } catch (error) {
    console.error('Disconnect error:', error);
  }
}

/**
 * Handle cancel button click
 */
function cancel(): void {
  if (isConnecting) {
    // Stop connection attempt
    isConnecting = false;
    modemAudio.pause();
    modemAudio.currentTime = 0;
    setDialogMode('connect');
    connectBtn.disabled = false;
    cancelBtn.disabled = false;
  } else if (currentMode === 'status') {
    // Just hide the window (close it)
    window.close();
  } else {
    // Close the app
    window.close();
  }
}

// Event listeners
connectBtn.addEventListener('click', connect);
reconnectBtn.addEventListener('click', connect); // Reconnect uses same connect logic
disconnectBtn.addEventListener('click', disconnect);
cancelBtn.addEventListener('click', cancel);

// Listen for mode changes from main process
window.electronAPI.onSetMode((mode: 'connect' | 'status' | 'connection-lost') => {
  setDialogMode(mode);
});

// Initialize dialog in connect mode
setDialogMode('connect');
```

**Success Criteria:**
- File `src/renderer/dialup/dialup.ts` exists
- The file handles 'connect', 'status', and 'connection-lost' dialog modes
- The connection process shows realistic status messages
- Modem audio plays during connection
- Random connection speed is displayed
- IPC communication is properly implemented
- Reconnect button uses same logic as Connect button
- Connection-lost mode shows warning and reconnect button

**Test Steps:**
1. Run `npx tsc --noEmit` to check for compilation errors
2. Verify all IPC methods (`connectStart`, `connectComplete`, `disconnect`) are called
3. Verify the status message sequence is complete
4. Verify `onSetMode` listener handles all three modes
5. Verify the reconnect button event listener is registered

---

### Phase 5: Browser Window Implementation

---

#### Step 14: Create Browser Window HTML

**Objective:** Create the HTML structure for the retro browser window.

**Description:**
Create an HTML file that structures the browser window with a toolbar (navigation buttons, address bar, connection status) and a webview for displaying web pages.

**Work:**
Create file `src/renderer/browser/browser.html`:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self'">
  <title>Internet Explorer</title>
  <link rel="stylesheet" href="../../../node_modules/98.css/dist/98.css">
  <link rel="stylesheet" href="browser.css">
</head>
<body>
  <div class="browser-container">
    <!-- Toolbar -->
    <div class="toolbar">
      <div class="toolbar-row navigation-row">
        <!-- Navigation buttons -->
        <div class="nav-buttons">
          <button id="back-btn" class="nav-button" title="Back" disabled>
            <span class="button-icon">◀</span>
            <span class="button-label">Back</span>
          </button>
          <button id="forward-btn" class="nav-button" title="Forward" disabled>
            <span class="button-icon">▶</span>
            <span class="button-label">Forward</span>
          </button>
          <button id="stop-btn" class="nav-button" title="Stop">
            <span class="button-icon">✕</span>
            <span class="button-label">Stop</span>
          </button>
          <button id="reload-btn" class="nav-button" title="Refresh">
            <span class="button-icon">⟳</span>
            <span class="button-label">Refresh</span>
          </button>
          <button id="home-btn" class="nav-button" title="Home">
            <span class="button-icon">🏠</span>
            <span class="button-label">Home</span>
          </button>
        </div>
      </div>

      <!-- Address bar row -->
      <div class="toolbar-row address-row">
        <label for="address-bar" class="address-label">Address</label>
        <div class="address-wrapper">
          <input 
            type="text" 
            id="address-bar" 
            class="address-input" 
            placeholder="http://"
            value="https://www.google.com"
          >
        </div>
        <button id="go-btn" class="go-button">Go</button>
        
        <!-- Connection status indicator -->
        <button id="connection-status" class="connection-indicator" title="Connection Status">
          <span class="status-icon">🖥️</span>
          <span id="connection-timer" class="status-timer">00:00:00</span>
        </button>
      </div>
    </div>

    <!-- Webview container -->
    <div class="webview-container">
      <webview 
        id="webview" 
        src="https://www.google.com"
        autosize="on"
      ></webview>
    </div>

    <!-- Status bar -->
    <div class="status-bar">
      <div id="status-message" class="status-bar-field">Ready</div>
      <div id="zone-indicator" class="status-bar-field">Internet zone</div>
    </div>
  </div>

  <script src="browser.js"></script>
</body>
</html>
```

**Success Criteria:**
- File `src/renderer/browser/browser.html` exists
- The HTML includes all navigation buttons: back, forward, stop, reload, home
- The HTML includes an address bar input
- The HTML includes a connection status button with timer
- The HTML includes a webview element
- Content Security Policy is set

**Test Steps:**
1. Verify all required IDs exist: `back-btn`, `forward-btn`, `stop-btn`, `reload-btn`, `home-btn`, `address-bar`, `go-btn`, `connection-status`, `connection-timer`, `webview`
2. Verify the webview element is present with `autosize="on"`
3. Verify the default URL is set (https://www.google.com)

---

#### Step 15: Create Browser Window CSS

**Objective:** Create styles for the retro browser window.

**Description:**
Create a CSS file that styles the browser window to look like an old Internet Explorer or Netscape browser, while remaining functional.

**Work:**
Create file `src/renderer/browser/browser.css`:

```css
/* Reset and base styles */
* {
  box-sizing: border-box;
}

html, body {
  margin: 0;
  padding: 0;
  height: 100%;
  overflow: hidden;
  font-family: 'MS Sans Serif', 'Segoe UI', Tahoma, sans-serif;
  font-size: 11px;
}

/* Main container */
.browser-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: #c0c0c0;
}

/* Toolbar */
.toolbar {
  background: linear-gradient(180deg, #d4d0c8 0%, #c0c0c0 100%);
  border-bottom: 1px solid #808080;
  padding: 2px 4px;
}

.toolbar-row {
  display: flex;
  align-items: center;
  padding: 2px 0;
  gap: 4px;
}

/* Navigation buttons */
.nav-buttons {
  display: flex;
  gap: 2px;
}

.nav-button {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-width: 50px;
  padding: 2px 4px;
  background: transparent;
  border: none;
  cursor: pointer;
}

.nav-button:hover:not(:disabled) {
  background: #e0e0e0;
  border: 1px outset #fff;
}

.nav-button:active:not(:disabled) {
  border: 1px inset #808080;
}

.nav-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.button-icon {
  font-size: 16px;
  line-height: 1;
}

.button-label {
  font-size: 10px;
  margin-top: 2px;
}

/* Address bar row */
.address-row {
  gap: 6px;
}

.address-label {
  font-weight: normal;
  margin-right: 4px;
}

.address-wrapper {
  flex: 1;
  display: flex;
}

.address-input {
  flex: 1;
  height: 22px;
  padding: 2px 4px;
  font-size: 12px;
  font-family: inherit;
}

.go-button {
  min-width: 40px;
}

/* Connection status indicator */
.connection-indicator {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  background: #ffffcc;
  border: 1px solid #808080;
  cursor: pointer;
  margin-left: auto;
}

.connection-indicator:hover {
  background: #ffff99;
}

.status-icon {
  font-size: 14px;
}

.status-timer {
  font-family: 'Courier New', monospace;
  font-size: 11px;
  font-weight: bold;
  min-width: 60px;
  text-align: center;
}

/* Webview container */
.webview-container {
  flex: 1;
  position: relative;
  border: 2px inset #808080;
  margin: 0 2px;
  background: white;
}

webview {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  border: none;
}

/* Status bar */
.status-bar {
  display: flex;
  padding: 2px 4px;
  gap: 2px;
  background: #c0c0c0;
  border-top: 1px solid #fff;
}

.status-bar-field {
  padding: 2px 4px;
  background: #fff;
  border: 1px inset #808080;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.status-bar-field:last-child {
  flex: 0 0 100px;
  text-align: center;
}

/* Loading state */
.loading .status-icon {
  animation: pulse 1s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
```

**Success Criteria:**
- File `src/renderer/browser/browser.css` exists
- The toolbar has a gradient background typical of 90s interfaces
- Navigation buttons have hover and active states
- The webview container fills available space
- Connection indicator has distinct styling
- Status bar is properly styled

**Test Steps:**
1. Open `browser.html` in a browser (webview won't work but layout should be visible)
2. Verify the toolbar renders with proper styling
3. Verify the address bar spans most of the width
4. Verify the connection status button is visible

---

#### Step 16: Create Browser Window TypeScript

**Objective:** Implement browser window logic including navigation and timer.

**Description:**
Create the TypeScript file that handles browser navigation (back, forward, reload, stop), address bar input, connection timer updates, and webview events.

**Work:**
Create file `src/renderer/browser/browser.ts`:

```typescript
// Type assertion for webview element (Electron-specific)
type WebviewElement = HTMLElement & {
  src: string;
  canGoBack: () => boolean;
  canGoForward: () => boolean;
  goBack: () => void;
  goForward: () => void;
  reload: () => void;
  stop: () => void;
  loadURL: (url: string) => Promise<void>;
  getURL: () => string;
  addEventListener: (event: string, callback: (e: any) => void) => void;
};

// DOM element references
const backBtn = document.getElementById('back-btn') as HTMLButtonElement;
const forwardBtn = document.getElementById('forward-btn') as HTMLButtonElement;
const stopBtn = document.getElementById('stop-btn') as HTMLButtonElement;
const reloadBtn = document.getElementById('reload-btn') as HTMLButtonElement;
const homeBtn = document.getElementById('home-btn') as HTMLButtonElement;
const goBtn = document.getElementById('go-btn') as HTMLButtonElement;
const addressBar = document.getElementById('address-bar') as HTMLInputElement;
const connectionStatus = document.getElementById('connection-status') as HTMLButtonElement;
const connectionTimer = document.getElementById('connection-timer') as HTMLSpanElement;
const statusMessage = document.getElementById('status-message') as HTMLDivElement;
const webview = document.getElementById('webview') as WebviewElement;

/**
 * Default home page URL
 */
const HOME_URL = 'https://www.google.com';

/**
 * Interval ID for the connection timer
 */
let timerInterval: number | null = null;

/**
 * Format seconds into HH:MM:SS string
 * @param totalSeconds - Total seconds to format
 */
function formatTime(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return [hours, minutes, seconds]
    .map((n) => n.toString().padStart(2, '0'))
    .join(':');
}

/**
 * Start the connection timer display
 */
function startConnectionTimer(): void {
  // Clear any existing timer
  if (timerInterval !== null) {
    clearInterval(timerInterval);
  }

  // Update immediately
  updateTimerDisplay();

  // Update every second
  timerInterval = window.setInterval(updateTimerDisplay, 1000);
}

/**
 * Update the timer display with current connection duration
 */
async function updateTimerDisplay(): Promise<void> {
  try {
    const seconds = await window.electronAPI.getConnectionTime();
    connectionTimer.textContent = formatTime(seconds);
  } catch (error) {
    console.error('Error getting connection time:', error);
  }
}

/**
 * Update navigation button states based on webview state
 */
function updateNavigationButtons(): void {
  // Small delay to ensure webview state is updated
  setTimeout(() => {
    backBtn.disabled = !webview.canGoBack();
    forwardBtn.disabled = !webview.canGoForward();
  }, 100);
}

/**
 * Normalize URL - add https:// if no protocol specified
 * @param url - URL to normalize
 */
function normalizeUrl(url: string): string {
  let normalizedUrl = url.trim();

  // If no protocol, add https://
  if (!normalizedUrl.match(/^https?:\/\//i)) {
    normalizedUrl = 'https://' + normalizedUrl;
  }

  return normalizedUrl;
}

/**
 * Navigate to the URL in the address bar
 */
function navigateToAddress(): void {
  const url = normalizeUrl(addressBar.value);
  addressBar.value = url;
  webview.loadURL(url);
}

// Navigation button event listeners
backBtn.addEventListener('click', () => {
  webview.goBack();
});

forwardBtn.addEventListener('click', () => {
  webview.goForward();
});

stopBtn.addEventListener('click', () => {
  webview.stop();
});

reloadBtn.addEventListener('click', () => {
  webview.reload();
});

homeBtn.addEventListener('click', () => {
  addressBar.value = HOME_URL;
  webview.loadURL(HOME_URL);
});

// Address bar event listeners
goBtn.addEventListener('click', () => {
  navigateToAddress();
});

addressBar.addEventListener('keydown', (event: KeyboardEvent) => {
  if (event.key === 'Enter') {
    navigateToAddress();
  }
});

// Connection status button - shows connection dialog
connectionStatus.addEventListener('click', async () => {
  try {
    await window.electronAPI.showConnectionStatus();
  } catch (error) {
    console.error('Error showing connection status:', error);
  }
});

// Webview event listeners
webview.addEventListener('did-start-loading', () => {
  statusMessage.textContent = 'Loading...';
  connectionStatus.classList.add('loading');
});

webview.addEventListener('did-stop-loading', () => {
  statusMessage.textContent = 'Done';
  connectionStatus.classList.remove('loading');
  updateNavigationButtons();
});

webview.addEventListener('did-navigate', (event: any) => {
  addressBar.value = event.url;
  updateNavigationButtons();
});

webview.addEventListener('did-navigate-in-page', (event: any) => {
  addressBar.value = event.url;
  updateNavigationButtons();
});

webview.addEventListener('did-fail-load', (event: any) => {
  if (event.errorCode !== -3) {
    // -3 is aborted, not a real error
    statusMessage.textContent = `Error: ${event.errorDescription}`;
  }
});

webview.addEventListener('page-title-updated', (event: any) => {
  document.title = event.title ? `${event.title} - Internet Explorer` : 'Internet Explorer';
});

// Initialize
startConnectionTimer();
updateNavigationButtons();
```

**Success Criteria:**
- File `src/renderer/browser/browser.ts` exists
- All navigation buttons (back, forward, stop, reload, home) have click handlers
- Address bar handles Enter key for navigation
- Connection timer updates every second
- Webview events update the address bar and status message
- Connection status button triggers the status dialog

**Test Steps:**
1. Run `npx tsc --noEmit` to check for compilation errors
2. Verify all button event listeners are registered
3. Verify the `formatTime` function correctly formats seconds
4. Verify webview event listeners update UI appropriately

---

### Phase 6: Build and Test

---

#### Step 17: Copy Static Assets During Build

**Objective:** Ensure HTML, CSS, and audio files are copied to the dist folder.

**Description:**
TypeScript only compiles `.ts` files. We need to ensure our HTML, CSS, and audio files are also available in the dist folder. We'll update our build process to copy these files.

**Work:**
Update `package.json` scripts to include file copying:

```json
{
  "scripts": {
    "copy-assets": "cp -r src/renderer/*.html src/renderer/**/*.html src/renderer/**/*.css src/assets dist/ 2>/dev/null || xcopy src\\renderer\\*.html dist\\renderer\\ /s /y && xcopy src\\renderer\\**\\*.css dist\\renderer\\ /s /y && xcopy src\\assets dist\\assets\\ /s /y",
    "build": "tsc && npm run copy-html && npm run copy-css && npm run copy-assets-folder",
    "copy-html": "node -e \"const fs=require('fs');const path=require('path');function copyHtml(src,dest){fs.readdirSync(src,{withFileTypes:true}).forEach(f=>{const srcPath=path.join(src,f.name);const destPath=path.join(dest,f.name);if(f.isDirectory()){fs.mkdirSync(destPath,{recursive:true});copyHtml(srcPath,destPath)}else if(f.name.endsWith('.html')){fs.copyFileSync(srcPath,destPath)}})}copyHtml('src/renderer','dist/renderer')\"",
    "copy-css": "node -e \"const fs=require('fs');const path=require('path');function copyCss(src,dest){fs.readdirSync(src,{withFileTypes:true}).forEach(f=>{const srcPath=path.join(src,f.name);const destPath=path.join(dest,f.name);if(f.isDirectory()){fs.mkdirSync(destPath,{recursive:true});copyCss(srcPath,destPath)}else if(f.name.endsWith('.css')){fs.copyFileSync(srcPath,destPath)}})}copyCss('src/renderer','dist/renderer')\"",
    "copy-assets-folder": "node -e \"const fs=require('fs');fs.mkdirSync('dist/assets',{recursive:true});fs.readdirSync('src/assets').forEach(f=>fs.copyFileSync('src/assets/'+f,'dist/assets/'+f))\"",
    "start": "npm run build && electron .",
    "watch": "tsc --watch"
  }
}
```

Alternatively, create a simple build script file. Create `scripts/copy-assets.js`:

```javascript
const fs = require('fs');
const path = require('path');

/**
 * Recursively copy files with specific extensions
 */
function copyFilesWithExtensions(srcDir, destDir, extensions) {
  // Create destination directory if it doesn't exist
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }

  const items = fs.readdirSync(srcDir, { withFileTypes: true });

  for (const item of items) {
    const srcPath = path.join(srcDir, item.name);
    const destPath = path.join(destDir, item.name);

    if (item.isDirectory()) {
      copyFilesWithExtensions(srcPath, destPath, extensions);
    } else {
      const ext = path.extname(item.name).toLowerCase();
      if (extensions.includes(ext)) {
        fs.copyFileSync(srcPath, destPath);
        console.log(`Copied: ${srcPath} -> ${destPath}`);
      }
    }
  }
}

// Copy HTML and CSS files from renderer
copyFilesWithExtensions('src/renderer', 'dist/renderer', ['.html', '.css']);

// Copy assets folder
const assetsDir = 'dist/assets';
if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true });
}

if (fs.existsSync('src/assets')) {
  const assets = fs.readdirSync('src/assets');
  for (const asset of assets) {
    fs.copyFileSync(
      path.join('src/assets', asset),
      path.join(assetsDir, asset)
    );
    console.log(`Copied: src/assets/${asset} -> ${assetsDir}/${asset}`);
  }
}

console.log('Asset copy complete!');
```

Then update `package.json`:

```json
{
  "scripts": {
    "build": "tsc && node scripts/copy-assets.js",
    "start": "npm run build && electron .",
    "watch": "tsc --watch"
  }
}
```

**Success Criteria:**
- A build script exists that copies HTML, CSS, and audio files
- Running `npm run build` compiles TypeScript AND copies static assets
- The dist folder contains all necessary files after build

**Test Steps:**
1. Create the `scripts` directory: `mkdir -p scripts`
2. Create the `scripts/copy-assets.js` file
3. Update `package.json` with the new scripts
4. Run `npm run build`
5. Verify `dist/renderer/dialup/dialup.html` exists
6. Verify `dist/renderer/browser/browser.html` exists
7. Verify `dist/assets/modem.mp3` exists

---

#### Step 18: Build the Application

**Objective:** Compile the TypeScript code and prepare all files.

**Description:**
Run the build process to compile TypeScript and copy all necessary files to the dist directory.

**Work:**
```bash
npm run build
```

**Success Criteria:**
- Build completes without errors
- The `dist` directory contains:
  - `main/main.js`
  - `main/state.js`
  - `main/windows.js`
  - `main/ipc-handlers.js`
  - `renderer/preload.js`
  - `renderer/dialup/dialup.html`
  - `renderer/dialup/dialup.css`
  - `renderer/dialup/dialup.js`
  - `renderer/browser/browser.html`
  - `renderer/browser/browser.css`
  - `renderer/browser/browser.js`
  - `assets/modem.mp3`

**Test Steps:**
1. Run `npm run build`
2. Check for any TypeScript compilation errors
3. Run `ls -la dist/main/` to verify main process files
4. Run `ls -la dist/renderer/dialup/` to verify dialup files
5. Run `ls -la dist/renderer/browser/` to verify browser files
6. Run `ls -la dist/assets/` to verify assets

---

#### Step 19: Run the Application

**Objective:** Launch and test the complete application.

**Description:**
Start the Electron application and verify all functionality works correctly.

**Work:**
```bash
npm start
```

**Success Criteria:**
- Application launches without errors
- Dialup window appears with Connect button
- Clicking Connect plays modem sound and shows status updates
- After connecting, browser window appears
- Browser can navigate to web pages
- Connection timer counts up
- Clicking connection status shows dialup dialog with Disconnect button
- Clicking Disconnect returns to initial state

**Test Steps:**

1. **Initial Launch Test:**
   - Run `npm start`
   - Verify the dialup window appears
   - Verify the window has Windows 95/98 styling
   - Verify "Connect" button is visible

2. **Connection Test:**
   - Click the "Connect" button
   - Verify modem sound plays
   - Verify status messages appear in sequence:
     - "Dialing..."
     - "Verifying username and password..."
     - "Authenticated. Logging on to network..."
     - "Registering your computer on the network..."
     - "Connected at XX,XXX bps."
   - Verify dialup window disappears after connection

3. **Browser Window Test:**
   - Verify browser window appears after connection
   - Verify toolbar has all buttons (Back, Forward, Stop, Refresh, Home)
   - Verify address bar shows the default URL
   - Verify connection timer is visible and counting up

4. **Navigation Test:**
   - Type a URL (e.g., "example.com") in address bar
   - Press Enter or click Go
   - Verify the page loads
   - Verify address bar updates
   - Click Back button (should now be enabled)
   - Verify navigation works

5. **Connection Status Test:**
   - Click on the connection status indicator (with timer)
   - Verify dialup dialog reappears
   - Verify "Disconnect" button is visible
   - Verify "Connect" button is hidden

6. **Disconnect Test:**
   - Click "Disconnect" button
   - Verify browser window closes
   - Verify dialup window shows "Connect" button again
   - Verify timer is no longer visible in dialup window

7. **Reconnection Test:**
   - Click "Connect" again
   - Verify the full connection process works again
   - Verify browser window appears with reset timer

8. **Random Disconnect Test:**
   - After connecting, wait 2-3 minutes for a random disconnect to occur
   - Verify the browser window becomes hidden
   - Verify the dialup dialog appears with "Connection lost" warning
   - Verify the "Reconnect" button is visible (not "Connect")
   - Verify the status text shows "Connection lost unexpectedly"

9. **Reconnection After Random Disconnect Test:**
   - Click the "Reconnect" button
   - Verify the modem sound plays and connection process runs
   - Verify the browser window reappears after successful reconnection
   - Verify the connection timer restarts from 00:00:00
   - Verify a new random disconnect is scheduled (wait another 2-3 minutes to confirm)

---

#### Step 20: Debug Common Issues

**Objective:** Troubleshoot and fix common issues that may occur.

**Description:**
This step provides guidance for debugging common problems you might encounter.

**Common Issues and Solutions:**

1. **"Cannot find module" errors:**
   - Ensure you ran `npm install`
   - Check that all import paths are correct
   - Verify `tsconfig.json` settings

2. **Webview doesn't load pages:**
   - Ensure `webviewTag: true` is set in BrowserWindow webPreferences
   - Check browser console for Content Security Policy errors
   - Try removing CSP meta tag temporarily for testing

3. **Audio doesn't play:**
   - Check that `modem.mp3` exists in `src/assets/`
   - Verify the audio file path in `dialup.html`
   - Check browser console for audio errors
   - Some systems may require user interaction before audio plays

4. **IPC communication fails:**
   - Verify preload script path in `windows.ts`
   - Check that `contextIsolation: true` is set
   - Ensure all IPC channel names match between main and renderer

5. **Styles don't apply:**
   - Verify 98.css path in HTML files
   - Check that CSS files were copied to dist
   - Inspect element in DevTools to check if styles are loading

6. **Timer doesn't update:**
   - Check browser console for errors in `getConnectionTime`
   - Verify IPC handler is registered in `ipc-handlers.ts`
   - Check that `connectedAt` is being set correctly

7. **Random disconnect doesn't work:**
   - Check the console for "Random disconnect scheduled" message
   - Verify `scheduleRandomDisconnect` is called in `connect-complete` handler
   - Check that `MIN_DISCONNECT_DELAY` and `MAX_DISCONNECT_DELAY` constants are correctly imported
   - Verify the timer isn't being cleared prematurely
   - For testing, temporarily reduce the delay constants to 10-20 seconds

**Debug Tools:**

```bash
# Open DevTools in Electron windows
# Add this to main.ts after creating windows:
dialupWindow.webContents.openDevTools();
browserWindow.webContents.openDevTools();

# Run with verbose logging
DEBUG=* npm start
```

**Success Criteria:**
- All identified issues are resolved
- Application runs without console errors
- All features work as expected

**Test Steps:**
1. Review any error messages in terminal or DevTools console
2. Apply relevant fixes from the solutions above
3. Rebuild and retest: `npm run build && npm start`
4. Verify the issue is resolved

---

### Phase 7: Polish and Enhancements (Optional)

---

#### Step 21: Add Window Icons (Optional)

**Objective:** Add custom window icons for a more authentic look.

**Description:**
Create or download retro-style icons for the application windows.

**Work:**
1. Find or create icons:
   - A computer/modem icon for the dialup dialog
   - An Internet Explorer-style "e" icon for the browser

2. Save icons as PNG files in `src/assets/`

3. Update `windows.ts` to use the icons:

```typescript
import * as path from 'path';

export function createDialupWindow(): BrowserWindow {
  const dialupWindow = new BrowserWindow({
    // ... other options ...
    icon: path.join(__dirname, '..', 'assets', 'dialup-icon.png'),
  });
  // ...
}

export function createBrowserWindow(): BrowserWindow {
  const browserWindow = new BrowserWindow({
    // ... other options ...
    icon: path.join(__dirname, '..', 'assets', 'browser-icon.png'),
  });
  // ...
}
```

**Success Criteria:**
- Icon files exist in `src/assets/`
- Windows display custom icons in title bar and taskbar

**Test Steps:**
1. Add icon files to `src/assets/`
2. Update `windows.ts` with icon paths
3. Rebuild and run the application
4. Verify icons appear in window title bars

---

#### Step 22: Add Sound Effects (Optional)

**Objective:** Add additional sound effects for enhanced nostalgia.

**Description:**
Add optional sound effects for button clicks, page loads, or errors.

**Work:**
1. Find retro sound effects (click sounds, error sounds)
2. Add them to `src/assets/`
3. Create a simple audio utility:

```typescript
// src/renderer/utils/sounds.ts
const sounds = {
  click: new Audio('../assets/click.mp3'),
  error: new Audio('../assets/error.mp3'),
};

export function playSound(name: keyof typeof sounds): void {
  const sound = sounds[name];
  if (sound) {
    sound.currentTime = 0;
    sound.play().catch(() => {});
  }
}
```

**Success Criteria:**
- Additional sound files exist in `src/assets/`
- Sounds play at appropriate times (optional feature)

**Test Steps:**
1. Add sound files
2. Import and use the sound utility
3. Test that sounds play when expected

---

#### Step 23: Package for Distribution (Optional)

**Objective:** Create distributable packages for Windows, macOS, and Linux.

**Description:**
Use electron-builder to create installable packages for all platforms.

**Work:**
1. Install electron-builder:
```bash
npm install electron-builder --save-dev
```

2. Create `electron-builder.json`:
```json
{
  "appId": "com.example.retro-browser",
  "productName": "Retro Browser",
  "directories": {
    "output": "release"
  },
  "files": [
    "dist/**/*",
    "node_modules/**/*",
    "package.json"
  ],
  "mac": {
    "target": "dmg"
  },
  "win": {
    "target": "nsis"
  },
  "linux": {
    "target": "AppImage"
  }
}
```

3. Add build scripts to `package.json`:
```json
{
  "scripts": {
    "dist": "npm run build && electron-builder",
    "dist:win": "npm run build && electron-builder --win",
    "dist:mac": "npm run build && electron-builder --mac",
    "dist:linux": "npm run build && electron-builder --linux"
  }
}
```

4. Run the build:
```bash
npm run dist
```

**Success Criteria:**
- Distributable packages are created in the `release` directory
- Packages can be installed and run on target platforms

**Test Steps:**
1. Install electron-builder
2. Create configuration file
3. Run `npm run dist`
4. Find generated packages in `release/` directory
5. Test installation on target platform

---

## Summary Checklist

Use this checklist to track your progress:

- [ ] **Phase 1: Project Setup**
  - [ ] Step 1: Initialize npm project
  - [ ] Step 2: Install dependencies
  - [ ] Step 3: Create TypeScript configuration
  - [ ] Step 4: Create directory structure
  - [ ] Step 5: Download modem sound file

- [ ] **Phase 2: Main Process**
  - [ ] Step 6: Create state module (includes random disconnect timer)
  - [ ] Step 7: Create windows module
  - [ ] Step 8: Create IPC handlers module (includes random disconnect logic)
  - [ ] Step 9: Create main entry point

- [ ] **Phase 3: Preload Script**
  - [ ] Step 10: Create preload script and type definitions

- [ ] **Phase 4: Dialup Window**
  - [ ] Step 11: Create dialup HTML (includes connection-lost warning)
  - [ ] Step 12: Create dialup CSS (includes warning box styles)
  - [ ] Step 13: Create dialup TypeScript (handles connection-lost mode)

- [ ] **Phase 5: Browser Window**
  - [ ] Step 14: Create browser HTML
  - [ ] Step 15: Create browser CSS
  - [ ] Step 16: Create browser TypeScript

- [ ] **Phase 6: Build and Test**
  - [ ] Step 17: Set up asset copying
  - [ ] Step 18: Build the application
  - [ ] Step 19: Run and test the application (includes random disconnect tests)
  - [ ] Step 20: Debug any issues

- [ ] **Phase 7: Polish (Optional)**
  - [ ] Step 21: Add window icons
  - [ ] Step 22: Add sound effects
  - [ ] Step 23: Package for distribution

---

## Resources

- [Electron Documentation](https://www.electronjs.org/docs)
- [98.css Documentation](https://jdan.github.io/98.css/)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)
- [Electron webview Documentation](https://www.electronjs.org/docs/latest/api/webview-tag)

---

*Good luck with your implementation! Remember to commit your code regularly and don't hesitate to search for solutions when you encounter issues.*
