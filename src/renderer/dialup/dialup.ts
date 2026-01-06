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

/**
 * Dialog mode - determines which buttons are shown
 * 'connect' - Initial state, shows Connect button
 * 'status' - Connected state, shows Disconnect button
 * 'connection-lost' - Random disconnect occurred, shows Reconnect button
 */
type DialogMode = 'connect' | 'status' | 'connection-lost';

// Modem speed display names for status text
const modemDisplaySpeeds: Record<string, string> = {
  '14.4k': '14,400',
  '28.8k': '28,800',
  '33.6k': '33,600',
  '56k': '56,000',
};

// DOM element references
const statusText = document.getElementById('status-text') as HTMLParagraphElement;
const progressContainer = document.getElementById('progress-container') as HTMLDivElement;
const connectionLostWarning = document.getElementById('connection-lost-warning') as HTMLDivElement;
const connectBtn = document.getElementById('connect-btn') as HTMLButtonElement;
const reconnectBtn = document.getElementById('reconnect-btn') as HTMLButtonElement;
const disconnectBtn = document.getElementById('disconnect-btn') as HTMLButtonElement;
const cancelBtn = document.getElementById('cancel-btn') as HTMLButtonElement;
const modemAudio = document.getElementById('modem-audio') as HTMLAudioElement;
const modemFieldset = document.querySelector('.modem-fieldset') as HTMLFieldSetElement;
const modemRadios = document.querySelectorAll('input[name="modem-speed"]') as NodeListOf<HTMLInputElement>;

/**
 * Get the currently selected modem speed
 */
function getSelectedModemSpeed(): string {
  for (let i = 0; i < modemRadios.length; i++) {
    if (modemRadios[i].checked) {
      return modemRadios[i].value;
    }
  }
  return '56k'; // default
}

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
    playSound('error');
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
  reconnectBtn.disabled = true;
  cancelBtn.disabled = true;

  // Disable modem selection during connection
  modemFieldset.classList.add('disabled');

  // Hide warning if it was showing
  connectionLostWarning.classList.add('hidden');

  // Show progress animation
  progressContainer.classList.remove('hidden');

  // Get the selected modem speed
  const selectedSpeed = getSelectedModemSpeed();

  try {
    // Notify main process that connection is starting with selected speed
    await window.electronAPI.connectStart(selectedSpeed);

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
    const displaySpeed = modemDisplaySpeeds[selectedSpeed] || '56,000';
    statusText.textContent = `Connected at ${displaySpeed} bps.`;
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
    modemFieldset.classList.remove('disabled');
  } finally {
    isConnecting = false;
    connectBtn.disabled = false;
    reconnectBtn.disabled = false;
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
    reconnectBtn.disabled = false;
    cancelBtn.disabled = false;
    modemFieldset.classList.remove('disabled');
  } else if (currentMode === 'status') {
    // Just hide the window (close it)
    window.close();
  } else {
    // Close the app
    window.close();
  }
}

// Event listeners with click sounds
connectBtn.addEventListener('click', () => {
  playSound('click');
  connect();
});
reconnectBtn.addEventListener('click', () => {
  playSound('click');
  connect();
});
disconnectBtn.addEventListener('click', () => {
  playSound('click');
  disconnect();
});
cancelBtn.addEventListener('click', () => {
  playSound('click');
  cancel();
});

// Listen for mode changes from main process
window.electronAPI.onSetMode((mode: 'connect' | 'status' | 'connection-lost') => {
  setDialogMode(mode);
});

// Initialize dialog in connect mode
setDialogMode('connect');
})();
