import { contextBridge, ipcRenderer } from 'electron';

/**
 * Download progress information
 */
export interface DownloadProgress {
  bytesDownloaded: number;
  totalBytes: number;  // -1 if unknown
  isLoading: boolean;
}

/**
 * Type definitions for the API exposed to renderer processes
 */
export interface ElectronAPI {
  // Connection actions
  connectStart: (modemSpeed: string) => Promise<{ success: boolean }>;
  connectComplete: () => Promise<{ success: boolean }>;
  disconnect: () => Promise<{ success: boolean }>;
  showConnectionStatus: () => Promise<{ success: boolean }>;

  // Connection info
  getConnectionTime: () => Promise<number>;

  // Event listeners
  onSetMode: (callback: (mode: 'connect' | 'status' | 'connection-lost') => void) => void;
  onDownloadProgress: (callback: (progress: DownloadProgress) => void) => void;
}

/**
 * Expose protected methods to the renderer process
 * These can be accessed via window.electronAPI
 */
contextBridge.exposeInMainWorld('electronAPI', {
  // Connection actions
  connectStart: (modemSpeed: string) => ipcRenderer.invoke('connect-start', modemSpeed),
  connectComplete: () => ipcRenderer.invoke('connect-complete'),
  disconnect: () => ipcRenderer.invoke('disconnect'),
  showConnectionStatus: () => ipcRenderer.invoke('show-connection-status'),

  // Connection info
  getConnectionTime: () => ipcRenderer.invoke('get-connection-time'),

  // Event listeners
  onSetMode: (callback: (mode: 'connect' | 'status' | 'connection-lost') => void) => {
    ipcRenderer.on('set-mode', (_event, mode) => callback(mode));
  },
  onDownloadProgress: (callback: (progress: DownloadProgress) => void) => {
    ipcRenderer.on('download-progress', (_event, progress) => callback(progress));
  },
} as ElectronAPI);
