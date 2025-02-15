import { GoogleGenerativeAI } from "@google/generative-ai";

export class RecipeGeminiService {
  private genAI: GoogleGenerativeAI;
  private model: any;

  constructor(apiKey: string) {
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      generationConfig: {
        temperature: 0.4, // Slightly higher temperature for more natural cooking instructions
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
    seenHistory: string
  ) {
    try {
      console.log("Starting Recipe Step Analysis...");

      const context = `You are a friendly chef assistant helping someone follow a cake recipe.
        
        Current step to complete:
        - ${currentStep || "All steps completed!"}

        Next step will be:
        - ${nextStep || "Recipe will be complete!"}
        
        Previously completed steps:
        ${seenHistory || "Just starting the recipe."}
        
        IMPORTANT: Structure your response EXACTLY as follows and use the EXACT step descriptions:
        
        I saw: [List ALL previously completed steps using their exact descriptions, each on a new line with a dash prefix]
        I see: [Describe ONLY the current cooking action you observe, using EXACT match to step description if you see it being performed]
        I say: [Your friendly response about progress]

        Example response format:
        I saw:
        - Crack 3 eggs into a large mixing bowl
        - Pour 1 cup of milk into the bowl with eggs
        I see:
        - Add 1 cup of sugar to the mixture
        I say: Great job adding the sugar! Next, you'll need to mix in the melted butter.

        CRITICAL RULES:
        1. When listing steps in "I saw:" and "I see:", use EXACTLY the same text as shown in the step descriptions
        2. Only list a step in "I see:" if you are 100% certain the action is being performed right now
        3. Each step must start with "- " and be on a new line
        4. Don't abbreviate or modify the step descriptions
        5. Only mark a step as seen if ALL parts of the step are being performed (e.g., correct ingredients and actions)

        Current image analysis starting now.`;

      const imageData = await this.blobToGenerativePart(image);
      const result = await this.model.generateContent([context, imageData]);
      return result.response.text();
    } catch (error) {
      console.error("Recipe analysis failed:", error);
      throw error;
    }
  }

  private async blobToGenerativePart(blob: Blob) {
    const base64String = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
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
