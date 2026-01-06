import { BrowserWindow } from 'electron';
import { ModemSpeed } from '../shared/types';

// Re-export for convenience
export { ModemSpeed } from '../shared/types';

/**
 * Possible states of the dial-up connection
 */
export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected';

/**
 * Modem profile configuration for network throttling
 */
export interface ModemProfile {
  name: string;
  downloadThroughput: number;  // bytes per second
  uploadThroughput: number;    // bytes per second
  latency: number;             // milliseconds
  displaySpeed: string;        // for UI display (e.g., "14,400 bps")
}

/**
 * Network throttling profiles for different modem speeds
 * Throughput values are in bytes per second
 */
export const MODEM_PROFILES: Record<ModemSpeed, ModemProfile> = {
  '14.4k': {
    name: '14.4k Modem',
    downloadThroughput: 1800,    // ~1.8 KB/s
    uploadThroughput: 900,
    latency: 500,
    displaySpeed: '14,400',
  },
  '28.8k': {
    name: '28.8k Modem',
    downloadThroughput: 3600,    // ~3.6 KB/s
    uploadThroughput: 1800,
    latency: 400,
    displaySpeed: '28,800',
  },
  '33.6k': {
    name: '33.6k Modem',
    downloadThroughput: 4200,    // ~4.2 KB/s
    uploadThroughput: 2100,
    latency: 350,
    displaySpeed: '33,600',
  },
  '56k': {
    name: '56k Modem',
    downloadThroughput: 6800,    // ~6.8 KB/s (typical real-world 56k)
    uploadThroughput: 3400,
    latency: 300,
    displaySpeed: '56,000',
  },
};

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
  /** Selected modem speed for network throttling */
  selectedModemSpeed: ModemSpeed;
  /** Whether random disconnects are enabled */
  randomDisconnectEnabled: boolean;
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
  selectedModemSpeed: '56k',
  randomDisconnectEnabled: true,
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
  // Note: We don't reset window references or user preferences (selectedModemSpeed,
  // randomDisconnectEnabled) here as they should persist across connections
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
 */
export const MIN_DISCONNECT_DELAY = 2 * 60 * 1000; // 2 minutes
export const MAX_DISCONNECT_DELAY = 3 * 60 * 1000; // 3 minutes
