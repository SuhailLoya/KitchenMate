import { GoogleGenerativeAI } from "@google/generative-ai";
import { GenerativeModel } from "@google/generative-ai";

export class RecipeGeminiService {
  private gemini: GoogleGenerativeAI;
  private model: GenerativeModel;

  constructor(apiKey: string) {
    this.gemini = new GoogleGenerativeAI(apiKey);
    this.model = this.gemini.getGenerativeModel({
      model: "gemini-1.5-flash",
      generationConfig: {
        temperature: 0.2, // Lower temperature for more precise ingredient detection
        topP: 0.8,
        topK: 40,
        maxOutputTokens: 200,
      },
    });
  }

  async analyzeImage(
    image: Blob,
    currentStep: string | null,
    nextStep: string | null,
    history: string
  ): Promise<string> {
    try {
      console.log("=== Starting Recipe Analysis ===");
      console.log("Current step:", currentStep);
      console.log("Next step:", nextStep);
      console.log("Action history:", history);

      const prompt = `You are a cooking assistant analyzing a video stream. 

Current recipe step to check: ${currentStep || "No current step"}
Next step to prepare for: ${nextStep || "No next step"}

Previous actions completed:
${history || "No actions completed yet"}

CRITICAL RULES:
1. In the "I see:" section, ONLY list actions that EXACTLY match the current step
2. Do not mention any actions that don't precisely match the current step
3. If you see an action being performed but it doesn't match the current step, do not list it
4. As long as the image shows the current step being performed, you can acknowledge it and move on.

Format your response as follows:
I see:
- [ONLY list the current step if you see it being performed EXACTLY as described]

I say:
[Provide feedback based on what you see. Be encouraging and specific about what you're waiting to see for the current step]

Example responses:

Good response (when seeing the correct action):
I see:
- Crack 3 eggs into a large mixing bowl

I say: Perfect! I can see you cracking the eggs into the bowl. Let's move on to the next step.

Good response (when not seeing the correct action):
I see:
[empty because current step not seen]

I say: I'm waiting to see you crack 3 eggs into a large mixing bowl. Make sure to use all 3 eggs.

Keep your response focused and concise. Only acknowledge step completion when you see the EXACT action being performed.`;

      console.log("=== Prompt being sent to Gemini ===");
      console.log(prompt);

      const imageParts = [
        {
          inlineData: {
            data: await this.blobToBase64(image),
            mimeType: "image/jpeg",
          },
        },
      ];

      const result = await this.model.generateContent([prompt, ...imageParts]);
      const response = await result.response;
      const text = response.text();

      console.log("=== Gemini Response ===");
      console.log(text);

      return text;
    } catch (error) {
      console.error("Recipe analysis failed:", error);
      throw error;
    }
  }

  private async blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === "string") {
          resolve(reader.result.split(",")[1]);
        } else {
          reject(new Error("Failed to convert blob to base64"));
        }
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }
}
