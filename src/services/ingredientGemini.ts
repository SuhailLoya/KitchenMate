import { GoogleGenerativeAI } from "@google/generative-ai";

export class IngredientGeminiService {
  private genAI: GoogleGenerativeAI;
  private model: any;

  constructor(apiKey: string) {
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      generationConfig: {
        temperature: 0.3, // Lower temperature for more precise ingredient detection
        topP: 0.8,
        topK: 40,
        maxOutputTokens: 200,
      },
    });
  }

  async analyzeImage(image: Blob, ingredients: { text: string; completed: boolean }[], seenHistory: string) {
    try {
      console.log("Starting Ingredient Analysis...");
      
      const context = `You are a friendly chef assistant helping someone gather ingredients for a cake.
        
        Required ingredients (EXACT format to use when listing ingredients):
        ${ingredients.map(i => `- ${i.text}`).join('\n')}

        Previously seen ingredients:
        ${seenHistory}
        
        IMPORTANT: Structure your response EXACTLY as follows and use the EXACT ingredient names and quantities from the list above:
        
        I saw: [List ALL previously seen ingredients using their exact names from the list]
        I see: [List ONLY the ingredients you can CURRENTLY see in the image, using their exact names from the list. Each on a new line with a dash prefix]
        I say: [Your friendly response about progress]

        Example response format:
        I saw: Previously I've seen 3 eggs and 2 cups all-purpose flour
        I see:
        - 3 eggs
        - 1 cup butter
        I say: Great! I can see the eggs and butter. You still need milk, sugar, and flour.

        CRITICAL RULES:
        1. When listing ingredients in "I see:", use EXACTLY the same text as shown in Required ingredients
        2. Only list ingredients you are 100% certain about seeing in the current image
        3. Match quantities exactly - don't list an ingredient if the quantity doesn't match
        4. Each ingredient in "I see:" must start with "- " and be on a new line
        5. Don't abbreviate or modify the ingredient names

        Current image analysis starting now.`;

      const imageData = await this.blobToGenerativePart(image);
      const result = await this.model.generateContent([context, imageData]);
      return result.response.text();
    } catch (error) {
      console.error("Ingredient analysis failed:", error);
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