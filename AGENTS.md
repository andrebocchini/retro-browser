# AGENTS.md

This file provides guidance to AI agents when working with code in this repository.

## Project Overview

Retro Browser is an Electron-based desktop application that simulates the 90s dial-up internet experience with modem sounds and a Windows 95/98 styled browser interface.

## Commands

```bash
npm install        # Install dependencies
npm run build      # Compile TypeScript + copy assets to dist/
npm start          # Build and launch the application
npm run watch      # Development mode with file watching
```

## Commits

Use conventional commit format: `type: description`

Common types: `feat`, `fix`, `refactor`, `chore`, `docs`, `test`, `style`

## Architecture

### Two-Window System
- **Dialup Window**: Connection dialog with modem sound simulation, shows connection progress and status
- **Browser Window**: Retro IE-style browser with webview, toolbar, and connection timer

### Process Structure
- **Main Process** (`src/main/`): Window management, IPC handlers, application state
- **Renderer Processes** (`src/renderer/`): Dialup and browser window UI logic
- **Preload Script**: Context-isolated IPC bridge exposing `window.electronAPI`

### Connection State Machine
```
DISCONNECTED → CONNECTING (plays modem sound) → CONNECTED
     ↑                                              │
     └──────── Random disconnect (2-3 min) ────────┘
```

### IPC Channels
- `connect-start`: Initiates connection simulation
- `connect-complete`: Opens browser window after successful dial
- `disconnect`: Returns to disconnected state
- `show-connection-status`: Opens dialup dialog in status mode
- `get-connection-time`: Returns elapsed connection time for timer display

## Key Technologies

- **Electron**: Desktop framework with context isolation enabled
- **TypeScript**: ES2020 target, CommonJS modules, strict mode
- **98.css**: Windows 95/98 visual styling library

## Important Patterns

- State management via single `AppState` object in `src/main/state.ts`
- Renderer processes communicate through preload script only (no direct node access)
- Browser webview handles actual web navigation with URL normalization
- Modem sound (`src/assets/modem.mp3`) plays during connection phase
