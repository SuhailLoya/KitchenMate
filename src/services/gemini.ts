import { GoogleGenerativeAI } from "@google/generative-ai";

export class GeminiService {
  private genAI: GoogleGenerativeAI;
  private model: any;

  constructor(apiKey: string) {
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      generationConfig: {
        temperature: 0.4, // Lower temperature for more consistent responses
        topP: 0.8,
        topK: 40,
        maxOutputTokens: 200,
      },
    });
  }

  async analyzeImage(image: Blob, recipeContext: string) {
    try {
      console.log("Starting Gemini analysis...");
      console.log("Context:", recipeContext);

      const imageData = await this.blobToGenerativePart(image);
      console.log("Image converted to base64");

      const result = await this.model.generateContent([
        recipeContext,
        imageData,
      ]);

      const response = result.response.text();
      console.log("Gemini response:", response);

      return response;
    } catch (error) {
      console.error("Gemini analysis failed:", error);
      throw error;
    }
  }

  private async blobToGenerativePart(blob: Blob) {
    // Convert Blob to base64 using FileReader
    const base64String = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        // Remove data URL prefix (e.g., "data:image/jpeg;base64,")
        const base64 = reader.result as string;
        const base64Data = base64.split(",")[1];
        resolve(base64Data);
      };
      reader.readAsDataURL(blob);
    });

    return {
      inlineData: {
        data: base64String,
        mimeType: blob.type,
      },
    };
  }
}
