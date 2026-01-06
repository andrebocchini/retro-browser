/**
 * Shared types used by both main and renderer processes
 */

/**
 * Available modem speed options
 */
export type ModemSpeed = '14.4k' | '28.8k' | '33.6k' | '56k';

/**
 * Options passed when initiating a connection
 */
export interface ConnectOptions {
  modemSpeed: ModemSpeed;
  randomDisconnectEnabled: boolean;
}
