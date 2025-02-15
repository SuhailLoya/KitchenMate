import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey);

export interface RecipeCompletion {
    id?: string;
    created_at?: string;
    total_time: number;
    steps_completed: number;
    start_time: string;
    end_time: string;
    ingredients: string[];
    steps: string[];
    completion_rate: number;
    aesthetics_score: number;
    final_image_url?: string;
}

import { GoogleGenerativeAI } from "@google/generative-ai";

export class AestheticsGeminiService {
    private genAI: GoogleGenerativeAI;
    private model: any;

    constructor(apiKey: string) {
        this.genAI = new GoogleGenerativeAI(apiKey);
        this.model = this.genAI.getGenerativeModel({
            model: "gemini-1.5-flash",
            generationConfig: {
                temperature: 0.2, // Lower temperature for consistency
                topP: 0.8,
                topK: 40,
                maxOutputTokens: 20,
            },
        });
    }

    async evaluateImage(image: Blob): Promise<number> {
        try {
            console.log("Starting Aesthetics Analysis...");

            const prompt = `You are an expert in food presentation aesthetics.
      
      Analyze the provided image of a completed recipe and rate its visual appeal on a scale of 1 to 5 based on:
      - Color balance and plating aesthetics
      - Overall presentation neatness
      - Professional appearance

      Strictly return the result in the following JSON format:
      {"score": X}
      where X is an integer between 1 and 5.`;

            const imageData = await this.blobToGenerativePart(image);
            const result = await this.model.generateContent([
                prompt,
                imageData,
            ]);

            return this.parseGeminiScore(result.response.text());
        } catch (error) {
            console.error("Aesthetics analysis failed:", error);
            return 1; // Default score if error
        }
    }

    private async blobToGenerativePart(blob: Blob) {
        const base64String = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64 = reader.result as string;
                resolve(base64.split(",")[1]); // Extract only the Base64 data
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

    private parseGeminiScore(responseText: string): number {
        try {
            console.log("Gemini Response:", responseText); // Debugging log

            // Match JSON object containing the score
            const jsonMatch = responseText.match(/\{.*?\}/);
            if (jsonMatch) {
                const jsonData = JSON.parse(jsonMatch[0]);
                if (jsonData.score && typeof jsonData.score === "number") {
                    return Math.max(1, Math.min(5, jsonData.score)); // Ensure it's within bounds
                }
            }

            console.warn("Failed to extract score, defaulting to 1");
            return 1;
        } catch (error) {
            console.error("Error parsing Gemini response:", error);
            return 1;
        }
    }
}
const geminiService = new AestheticsGeminiService(
    import.meta.env.VITE_GEMINI_API_KEY
);

export async function calculateAestheticsScore(
    finalImage: Blob
): Promise<number> {
    try {
        const score = await geminiService.evaluateImage(finalImage);
        return score;
    } catch (error) {
        console.error("Error calculating aesthetics score:", error);
        return 1; // Default score in case of failure
    }
}
// Export the completion rate calculation function
export function calculateCompletionRate(
    completedSteps: number,
    totalSteps: number
): number {
    if (totalSteps === 0) return 0;
    return Math.round((completedSteps / totalSteps) * 100);
}

// Update the save function
export async function saveRecipeCompletion(
    completion: Omit<RecipeCompletion, "id" | "created_at">,
    finalImage?: Blob
) {
    try {
        let aestheticsScore = 0;
        let finalImageUrl = null;

        if (finalImage) {
            // Upload image to Supabase storage (recipe-images bucket)
            const fileName = `${Date.now()}-final.jpg`;
            const { data: imageData, error: imageError } =
                await supabase.storage
                    .from("recipe-images")
                    .upload(fileName, finalImage);

            if (imageError) throw imageError;

            // Get the public URL of the uploaded image
            finalImageUrl = supabase.storage
                .from("recipe-images")
                .getPublicUrl(fileName).data.publicUrl;

            // Calculate aesthetics score
            aestheticsScore = await calculateAestheticsScore(finalImage);
        }

        const { data, error } = await supabase
            .from("recipe_completions")
            .insert([
                {
                    ...completion,
                    aesthetics_score: aestheticsScore,
                    final_image_url: finalImageUrl,
                },
            ])
            .select()
            .single();

        if (error) throw error;
        return data;
    } catch (error) {
        console.error("Failed to save recipe completion:", error);
        throw error;
    }
}

export async function getRecipeCompletions() {
    const { data, error } = await supabase
        .from("recipe_completions")
        .select("*")
        .order("created_at", { ascending: false });

    if (error) throw error;
    return data;
}
