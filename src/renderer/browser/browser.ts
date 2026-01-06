// IIFE to avoid global scope pollution
(function() {
/**
 * Sound names available for playback
 */
type SoundName = 'click' | 'error';

/**
 * Audio elements cache
 */
const sounds: Record<SoundName, HTMLAudioElement> = {
  click: new Audio('../../assets/click.mp3'),
  error: new Audio('../../assets/error.mp3'),
};

/**
 * Play a sound effect
 */
function playSound(name: SoundName): void {
  const sound = sounds[name];
  if (sound) {
    sound.currentTime = 0;
    sound.play().catch(() => {
      // Ignore errors (e.g., user hasn't interacted with page yet)
    });
  }
}

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
const downloadProgress = document.getElementById('download-progress') as HTMLDivElement;
const progressBar = document.getElementById('progress-bar') as HTMLDivElement;
const bytesDisplay = document.getElementById('bytes-display') as HTMLSpanElement;

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
 * Format bytes to human readable string
 * @param bytes - Number of bytes
 */
function formatBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  } else if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  } else {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
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

// Navigation button event listeners with click sounds
backBtn.addEventListener('click', () => {
  playSound('click');
  webview.goBack();
});

forwardBtn.addEventListener('click', () => {
  playSound('click');
  webview.goForward();
});

stopBtn.addEventListener('click', () => {
  playSound('click');
  webview.stop();
});

reloadBtn.addEventListener('click', () => {
  playSound('click');
  webview.reload();
});

homeBtn.addEventListener('click', () => {
  playSound('click');
  addressBar.value = HOME_URL;
  webview.loadURL(HOME_URL);
});

// Address bar event listeners
goBtn.addEventListener('click', () => {
  playSound('click');
  navigateToAddress();
});

addressBar.addEventListener('keydown', (event: KeyboardEvent) => {
  if (event.key === 'Enter') {
    playSound('click');
    navigateToAddress();
  }
});

// Connection status button - shows connection dialog
connectionStatus.addEventListener('click', async () => {
  playSound('click');
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
  // Hide progress bar when loading completes
  downloadProgress.classList.add('hidden');
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
    playSound('error');
  }
});

webview.addEventListener('page-title-updated', (event: any) => {
  document.title = event.title ? `${event.title} - Internet Explorer` : 'Internet Explorer';
});

// Listen for download progress updates from main process
window.electronAPI.onDownloadProgress((progress) => {
  if (progress.isLoading) {
    downloadProgress.classList.remove('hidden');

    if (progress.totalBytes > 0) {
      // Determinate progress - we know the total size
      const percentage = (progress.bytesDownloaded / progress.totalBytes) * 100;
      progressBar.classList.remove('indeterminate');
      progressBar.style.width = `${Math.min(percentage, 100)}%`;
      bytesDisplay.textContent = `${formatBytes(progress.bytesDownloaded)} / ${formatBytes(progress.totalBytes)}`;
    } else {
      // Indeterminate progress - unknown total size
      progressBar.classList.add('indeterminate');
      progressBar.style.width = '';
      bytesDisplay.textContent = formatBytes(progress.bytesDownloaded);
    }
  } else {
    // Loading complete - hide progress
    downloadProgress.classList.add('hidden');
    progressBar.style.width = '0%';
    progressBar.classList.remove('indeterminate');
  }
});

// Initialize
startConnectionTimer();
updateNavigationButtons();
})();
