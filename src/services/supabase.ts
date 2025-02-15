import { createClient } from '@supabase/supabase-js';

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

// Add function to calculate aesthetics score
async function calculateAestheticsScore(finalImage: Blob): Promise<number> {
  // TODO: Implement aesthetics scoring using Gemini
  // This could analyze the final image and return a score from 0-100
  return 0;
}

// Export the completion rate calculation function
export function calculateCompletionRate(completedSteps: number, totalSteps: number): number {
  if (totalSteps === 0) return 0;
  return Math.round((completedSteps / totalSteps) * 100);
}

// Update the save function
export async function saveRecipeCompletion(
  completion: Omit<RecipeCompletion, 'id' | 'created_at'>,
  finalImage?: Blob
) {
  try {
    let aestheticsScore = 0;
    let finalImageUrl = null;

    if (finalImage) {
      // TODO: Implement image upload to storage
      // const { data: imageData, error: imageError } = await supabase.storage
      //   .from('recipe-images')
      //   .upload(`${Date.now()}-final.jpg`, finalImage);
      // if (imageError) throw imageError;
      // finalImageUrl = imageData.path;

      // Calculate aesthetics score
      aestheticsScore = await calculateAestheticsScore(finalImage);
    }

    const { data, error } = await supabase
      .from('recipe_completions')
      .insert([{
        ...completion,
        aesthetics_score: aestheticsScore,
        final_image_url: finalImageUrl,
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Failed to save recipe completion:', error);
    throw error;
  }
}

export async function getRecipeCompletions() {
  const { data, error } = await supabase
    .from('recipe_completions')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
} 