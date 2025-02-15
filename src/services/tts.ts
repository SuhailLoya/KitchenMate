export type VoiceLocale = "it-IT" | "zh-CN" | "en-US" | "grandma";

interface VoiceConfig {
  name: string;
  pitch: number;
  speakingRate: number;
  effectsProfileId?: string[];
}

// Update default config to use grandma voice
const defaultConfig: VoiceConfig = {
  name: "ms-MY-Wavenet-C",
  pitch: 0,
  speakingRate: 1,
  effectsProfileId: ["small-bluetooth-speaker-class-device"],
};

const voiceConfigs: Record<VoiceLocale, VoiceConfig> = {
  "it-IT": {
    name: "it-IT-Neural2-F",
    pitch: 0,
    speakingRate: 1,
    effectsProfileId: ["small-bluetooth-speaker-class-device"],
  },
  "zh-CN": {
    name: "cmn-CN-Wavenet-B",
    pitch: 0,
    speakingRate: 1,
    effectsProfileId: ["small-bluetooth-speaker-class-device"],
  },
  "en-US": {
    name: "en-US-Neural2-D",
    pitch: 0,
    speakingRate: 1,
    effectsProfileId: ["small-bluetooth-speaker-class-device"],
  },
  grandma: {
    name: "ms-MY-Wavenet-C", // Using female voice for grandma
    pitch: -3, // Lower pitch for older voice
    speakingRate: 1.2, // Slightly slower speaking rate
    effectsProfileId: ["small-bluetooth-speaker-class-device"],
  },
};

export class TTSService {
  private synthesis: SpeechSynthesis;
  private currentLocale: VoiceLocale = "grandma";
  private apiKey: string;

  constructor(apiKey: string) {
    this.synthesis = window.speechSynthesis;
    this.apiKey = apiKey;
  }

  setLocale(locale: VoiceLocale) {
    if (!voiceConfigs[locale]) {
      console.warn(
        `Voice config not found for locale ${locale}, using default`
      );
    }
    this.currentLocale = locale;
  }

  async speak(text: string): Promise<void> {
    if (!text) {
      console.warn("Empty text provided to speak");
      return;
    }

    // Get config with fallback to default
    const config = voiceConfigs[this.currentLocale] || defaultConfig;

    // Create base request body
    const requestBody: any = {
      audioConfig: {
        audioEncoding: "LINEAR16",
        pitch: config.pitch,
        speakingRate: config.speakingRate,
      },
      input: {
        text: text,
      },
      voice: {
        languageCode: this.currentLocale,
        name: config.name,
      },
    };

    // Only add effectsProfileId if it exists
    if (config.effectsProfileId) {
      requestBody.audioConfig.effectsProfileId = config.effectsProfileId;
    }

    try {
      const response = await fetch(
        `https://texttospeech.googleapis.com/v1/text:synthesize?key=${this.apiKey}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (!data.audioContent) {
        throw new Error("No audio content received from API");
      }

      // Convert base64 to audio and play it
      const audioContent = data.audioContent;
      const audioBlob = new Blob(
        [Uint8Array.from(atob(audioContent), (c) => c.charCodeAt(0))],
        { type: "audio/mp3" }
      );
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);

      return new Promise((resolve, reject) => {
        audio.onended = () => {
          URL.revokeObjectURL(audioUrl);
          resolve();
        };
        audio.onerror = (error) => {
          URL.revokeObjectURL(audioUrl);
          reject(error);
        };
        audio.play().catch(reject);
      });
    } catch (error) {
      console.error("TTS API Error:", error);
      throw error;
    }
  }

  stop() {
    this.synthesis.cancel();
  }
}
