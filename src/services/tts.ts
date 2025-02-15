export class TTSService {
  private audio: HTMLAudioElement | null = null;
  private audioContext: AudioContext | null = null;
  private isPlaying = false;
  private audioQueue: string[] = [];

  constructor(private apiKey: string) {
    // Initialize audio context on user interaction
    document.addEventListener('click', () => {
      if (!this.audioContext) {
        this.audioContext = new AudioContext();
      }
    });
  }

  async speak(text: string): Promise<void> {
    // Add to queue if currently playing
    if (this.isPlaying) {
      this.audioQueue.push(text);
      return;
    }

    try {
      this.isPlaying = true;
      console.log('Fetching TTS audio for:', text);

      if (!this.audioContext) {
        this.audioContext = new AudioContext();
      }

      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      const response = await fetch(
        `https://texttospeech.googleapis.com/v1/text:synthesize?key=${this.apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            input: { text },
            voice: {
              languageCode: 'en-US',
              name: 'en-US-Standard-D',
              ssmlGender: 'MALE'
            },
            audioConfig: {
              audioEncoding: 'MP3',
              pitch: 0,
              speakingRate: 1.1,
              volumeGainDb: 3.0
            },
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`TTS API error: ${response.status}`);
      }

      const { audioContent } = await response.json();
      console.log('Received audio content');

      // Clean up previous audio
      this.stop();

      const audioBlob = new Blob(
        [Uint8Array.from(atob(audioContent), c => c.charCodeAt(0))],
        { type: 'audio/mp3' }
      );
      const audioUrl = URL.createObjectURL(audioBlob);
      this.audio = new Audio(audioUrl);
      this.audio.volume = 1.0;

      // Set up event listeners
      this.audio.addEventListener('ended', () => {
        console.log('Audio finished playing');
        URL.revokeObjectURL(audioUrl);
        this.audio = null;
        this.isPlaying = false;
        
        // Play next in queue if exists
        if (this.audioQueue.length > 0) {
          const nextText = this.audioQueue.shift();
          if (nextText) {
            this.speak(nextText);
          }
        }
      });

      this.audio.addEventListener('error', (e) => {
        console.error('Audio playback error:', e);
        this.isPlaying = false;
      });

      // Play the audio
      await this.audio.play();
      console.log('Audio started playing');

    } catch (error) {
      console.error('TTS failed:', error);
      this.isPlaying = false;
      throw error;
    }
  }

  private handleAutoplayBlocked(audio: HTMLAudioElement, audioUrl: string) {
    console.log('Autoplay blocked, adding play button');
    const playButton = document.createElement('button');
    playButton.textContent = 'Play Message';
    playButton.onclick = async () => {
      try {
        await audio.play();
        playButton.remove();
      } catch (error) {
        console.error('Manual play failed:', error);
      }
    };
    document.body.appendChild(playButton);
  }

  stop() {
    if (this.audio) {
      this.audio.pause();
      this.audio.currentTime = 0; // Reset playback position
      this.audio = null;
    }
    this.isPlaying = false;
    this.audioQueue = []; // Clear the queue
  }
} 