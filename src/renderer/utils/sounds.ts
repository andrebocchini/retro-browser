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
 * @param name - The name of the sound to play
 */
export function playSound(name: SoundName): void {
  const sound = sounds[name];
  if (sound) {
    sound.currentTime = 0;
    sound.play().catch(() => {
      // Ignore errors (e.g., user hasn't interacted with page yet)
    });
  }
}
