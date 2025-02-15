import { createContext, useContext, useState, ReactNode } from "react";

interface RecipeContextType {
  completionPhase: boolean;
  setCompletionPhase: (value: boolean) => void;
  recipeStats: {
    totalTime: number;
    stepsCompleted: number;
    startTime?: Date;
    endTime?: Date;
    completionRate: number;
    aestheticsScore: number;
  };
  setRecipeStats: (stats: {
    totalTime: number;
    stepsCompleted: number;
    startTime?: Date;
    endTime?: Date;
    completionRate: number;
    aestheticsScore: number;
  }) => void;
}

const RecipeContext = createContext<RecipeContextType | undefined>(undefined);

export function RecipeProvider({ children }: { children: ReactNode }) {
  const [completionPhase, setCompletionPhase] = useState(false);
  const [recipeStats, setRecipeStats] = useState({
    totalTime: 0,
    stepsCompleted: 0,
    startTime: undefined,
    endTime: undefined,
    completionRate: 0,
    aestheticsScore: 0,
  });

  return (
    <RecipeContext.Provider
      value={{
        completionPhase,
        setCompletionPhase,
        recipeStats,
        setRecipeStats,
      }}
    >
      {children}
    </RecipeContext.Provider>
  );
}

export function useRecipe() {
  const context = useContext(RecipeContext);
  if (context === undefined) {
    throw new Error("useRecipe must be used within a RecipeProvider");
  }
  return context;
}
