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
 */
export const MIN_DISCONNECT_DELAY = 30 * 1000; // 30 seconds
export const MAX_DISCONNECT_DELAY = 30 * 1000; // 30 seconds
