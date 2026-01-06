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
