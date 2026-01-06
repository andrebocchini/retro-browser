import { WebContents } from 'electron';
import { state, MODEM_PROFILES } from './state';

/**
 * Debounce delay for progress updates in milliseconds
 */
const PROGRESS_UPDATE_DEBOUNCE_MS = 100;

/**
 * Track loading state for progress reporting
 */
interface LoadingRequest {
  requestId: string;
  bytesReceived: number;
  totalBytes: number;
}

/**
 * Map of active loading requests
 */
const loadingRequests = new Map<string, LoadingRequest>();

/**
 * Debounce timer for progress updates
 */
let progressUpdateTimer: NodeJS.Timeout | null = null;

/**
 * Attach CDP debugger and apply network throttling to a webview
 * @param webviewContents - The webContents of the webview to throttle
 */
export async function applyNetworkThrottling(webviewContents: WebContents): Promise<void> {
  const profile = MODEM_PROFILES[state.selectedModemSpeed];

  try {
    // Check if debugger is already attached
    if (webviewContents.debugger.isAttached()) {
      console.log('CDP debugger already attached, skipping...');
      return;
    }

    // Attach the debugger to the webview
    webviewContents.debugger.attach('1.3');
    console.log(`CDP debugger attached to webview (${profile.name})`);

    // Enable Network domain for monitoring
    await webviewContents.debugger.sendCommand('Network.enable');

    // Apply network throttling conditions
    await webviewContents.debugger.sendCommand('Network.emulateNetworkConditions', {
      offline: false,
      latency: profile.latency,
      downloadThroughput: profile.downloadThroughput,
      uploadThroughput: profile.uploadThroughput,
    });

    console.log(`Network throttling applied: ${profile.downloadThroughput} bytes/s download, ${profile.latency}ms latency`);

    // Set up progress monitoring and get cleanup function
    const cleanupProgressMonitoring = setupProgressMonitoring(webviewContents);

    // Handle webview destruction - clean up all resources
    webviewContents.once('destroyed', () => {
      // Clean up progress monitoring
      cleanupProgressMonitoring();

      // Clear pending progress update timer
      if (progressUpdateTimer) {
        clearTimeout(progressUpdateTimer);
        progressUpdateTimer = null;
      }

      // Detach debugger if still attached
      if (webviewContents.debugger.isAttached()) {
        try {
          webviewContents.debugger.detach();
          console.log('CDP debugger detached');
        } catch (error) {
          console.error('Error detaching debugger:', error);
        }
      }

      // Clear loading requests
      loadingRequests.clear();
      console.log('Webview destroyed, throttling ended');
    });

  } catch (error) {
    console.error('Failed to apply network throttling:', error);
  }
}

/**
 * Set up CDP event listeners for download progress monitoring
 * @returns Cleanup function to remove event listeners
 */
function setupProgressMonitoring(webviewContents: WebContents): () => void {
  const dbg = webviewContents.debugger;

  const messageHandler = (_event: Electron.Event, method: string, params: Record<string, unknown>) => {
    switch (method) {
      case 'Network.responseReceived': {
        // Validate params
        if (typeof params.requestId !== 'string') {
          break;
        }

        // Track new response with content-length if available
        const response = params.response as Record<string, unknown> | undefined;
        const headers = response?.headers as Record<string, string> | undefined;
        const contentLength = headers?.['content-length'] || headers?.['Content-Length'];

        let totalBytes = -1;
        if (typeof contentLength === 'string') {
          const parsed = parseInt(contentLength, 10);
          totalBytes = isNaN(parsed) ? -1 : parsed;
        }

        loadingRequests.set(params.requestId, {
          requestId: params.requestId,
          bytesReceived: 0,
          totalBytes,
        });
        break;
      }

      case 'Network.dataReceived': {
        // Validate params
        if (typeof params.requestId !== 'string' || typeof params.dataLength !== 'number') {
          break;
        }

        // Update bytes received
        const request = loadingRequests.get(params.requestId);
        if (request) {
          request.bytesReceived += params.dataLength;
          sendProgressUpdate();
        }
        break;
      }

      case 'Network.loadingFinished':
      case 'Network.loadingFailed': {
        if (typeof params.requestId === 'string') {
          loadingRequests.delete(params.requestId);
          sendProgressUpdate();
        }
        break;
      }
    }
  };

  dbg.on('message', messageHandler);

  // Return cleanup function
  return () => {
    dbg.removeListener('message', messageHandler);
  };
}

/**
 * Aggregate progress from all active requests and send to browser window
 */
function sendProgressUpdate(): void {
  // Debounce updates to avoid overwhelming IPC
  if (progressUpdateTimer) {
    return;
  }

  progressUpdateTimer = setTimeout(() => {
    progressUpdateTimer = null;

    // Check if browser window still exists
    if (!state.browserWindow || state.browserWindow.isDestroyed()) {
      return;
    }

    let totalBytes = 0;
    let bytesDownloaded = 0;

    for (const req of loadingRequests.values()) {
      bytesDownloaded += req.bytesReceived;
      if (req.totalBytes > 0) {
        totalBytes += req.totalBytes;
      }
    }

    try {
      state.browserWindow.webContents.send('download-progress', {
        bytesDownloaded,
        totalBytes: totalBytes > 0 ? totalBytes : -1,
        isLoading: loadingRequests.size > 0,
      });
    } catch (error) {
      // Window may have been destroyed between check and send
      console.error('Error sending progress update:', error);
    }
  }, PROGRESS_UPDATE_DEBOUNCE_MS);
}
