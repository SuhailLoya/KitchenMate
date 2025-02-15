import { useEffect, useState, useRef } from "react";
import {
  Box,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemText,
  Container,
  Button,
  SpeedDial,
  SpeedDialIcon,
  SpeedDialAction,
} from "@mui/material";
import { useVideoStream } from "../../hooks/useVideoStream";
import ChefAvatar from "../Chef/ChefAvatar";
import { GeminiService } from "../../services/gemini";
import { TTSService } from "../../services/tts";
import { IngredientGeminiService } from "../../services/ingredientGemini";
import { RecipeGeminiService } from "../../services/recipeGemini";
import { useRecipe } from "../../contexts/RecipeContext";
import { CompletionDialog } from "../CompletionDialog";
import { calculateCompletionRate } from "../../services/supabase";
import { motion, AnimatePresence } from "framer-motion";
import "@fontsource/poppins/700.css"; // Bold
import "@fontsource/poppins/600.css"; // Semi-bold
import "@fontsource/inter/400.css"; // Regular
import "@fontsource/inter/500.css"; // Medium
import TranslateIcon from "@mui/icons-material/Translate";
import type { VoiceLocale } from "../../services/tts";
import Timer from "../Timer/Timer";

const gemini = new GeminiService(import.meta.env.VITE_GEMINI_API_KEY);
const tts = new TTSService(import.meta.env.VITE_GOOGLE_CLOUD_API_KEY);
const ingredientGemini = new IngredientGeminiService(
  import.meta.env.VITE_GEMINI_API_KEY
);
const recipeGemini = new RecipeGeminiService(
  import.meta.env.VITE_GEMINI_API_KEY
);

interface RecipeItem {
  text: string;
  completed: boolean;
}

const initialIngredients: RecipeItem[] = [
    { text: "3 fresh eggs", completed: false },
    { text: "1 cup butter", completed: false },
    { text: "1 cup milk", completed: false },
];

const initialSteps: RecipeItem[] = [
  //   { text: "Crack 3 eggs into a large mixing bowl", completed: false },
  //   { text: "Pour 1 cup of milk into the bowl", completed: false },
  //   //   { text: "Add 1 cup of sugar to the mixture", completed: false },
  //   { text: "Mix in the butter", completed: false },
  { text: "Bake the mixture in the oven for 10 minutes", completed: false },
  { text: "Crack 3 eggs into a large mixing bowl", completed: false },
  //   { text: "Gradually add 2 cups of flour while stirring", completed: false },
];

// First, update the colors at the top of the file (before the VideoStream component)
const colors = {
  orange: "#FF6B35",
  orangeLight: "#FF8B5E",
  black: "#2B2B2B",
  white: "#FFFFFF",
  grayLight: "#F5F5F5",
  grayDark: "#4A4A4A",
  greenBg: "#E6FFE6", // Soft green for preparation phase
  orangeBg: "#FFF1E6", // Soft orange for recipe phase
};

// Add theme definition
const theme = {
  ...colors,
  fonts: {
    heading: "'Poppins', sans-serif",
    body: "'Inter', sans-serif",
  },
};

// Animation variants
const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: "easeOut" },
  },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2,
      delayChildren: 0.3,
    },
  },
};

const scaleIn = {
  hidden: { scale: 0.8, opacity: 0 },
  visible: {
    scale: 1,
    opacity: 1,
    transition: { duration: 0.5, ease: "easeOut" },
  },
};

// Add a new animation variant for the phase text
const phaseTextAnimation = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.8, // Slower fade in
      ease: "easeOut",
    },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    transition: {
      duration: 0.8, // Slower fade out
      ease: "easeIn",
    },
  },
};

const localeNames: Record<VoiceLocale, string> = {
  "it-IT": "Italian",
  "zh-CN": "Chinese",
  "en-US": "English",
  grandma: "Grandma",
};

const VideoStream = () => {
  const { videoRef, captureImage } = useVideoStream();
  const [analysis, setAnalysis] = useState<string>("");
  const [speaking, setSpeaking] = useState(false);
  const [ingredients, setIngredients] =
    useState<RecipeItem[]>(initialIngredients);
  const [steps, setSteps] = useState<RecipeItem[]>(initialSteps);
  const analysisInProgress = useRef(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [preparationPhase, setPreparationPhase] = useState(true);
  const [lastCompletedIngredient, setLastCompletedIngredient] = useState<
    string | null
  >(null);
  const [seenHistory, setSeenHistory] = useState<string>("");
  const [seenIngredients, setSeenIngredients] = useState<Map<string, string>>(
    new Map()
  );
  const [completedSteps, setCompletedSteps] = useState<Map<string, string>>(
    new Map()
  );
  const completedStepsRef = useRef<Map<string, string>>(new Map());

  // Add transition effect
  const [showTransition, setShowTransition] = useState(false);

  const allIngredientsReady = ingredients.every((item) => item.completed);

  const { setCompletionPhase, recipeStats, setRecipeStats } = useRecipe();
  const [showCompletionDialog, setShowCompletionDialog] = useState(false);
  const startTimeRef = useRef<Date>(new Date());
  const [finalImage, setFinalImage] = useState<Blob | null>(null);

  const [currentLocale, setCurrentLocale] = useState<VoiceLocale>("grandma");

  const [isCompleted, setIsCompleted] = useState(false);

  // Add new state for tracking last spoken ingredient
  const [lastSpokenIngredient, setLastSpokenIngredient] = useState<
    string | null
  >(null);

  // Add new state for timer
  const [showTimer, setShowTimer] = useState(false);

  const handleLocaleChange = async (newLocale: VoiceLocale) => {
    try {
      // Stop all audio and analysis
      tts.stop();
      clearPendingAnalysis();
      analysisInProgress.current = false;

      // Wait a moment to ensure all audio has stopped
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Update locale
      setCurrentLocale(newLocale);
      tts.setLocale(newLocale);

      // Clear states
      setAnalysis("");
      setSpeaking(false);
      setIsAnalyzing(false);

      // Ensure we're not speaking before starting new greeting
      if (!speaking) {
        setSpeaking(true);
        await tts.speak("Hello! I'm your new cooking assistant!");
        setSpeaking(false);

        // Only restart analysis after speaking is complete
        await analyzeStream();
      }
    } catch (error) {
      console.error("Error during voice change:", error);
      setSpeaking(false);
    }
  };

  const updateProgress = (text: string) => {
    if (preparationPhase) {
      console.log("=== Updating Progress ===");
      console.log("Current ingredients state:", ingredients);
      console.log("Current seenHistory:", seenHistory);
      console.log(
        "Current seenIngredients:",
        Array.from(seenIngredients.entries())
      );

      const seeSection = text.split("I see:")[1]?.split("I say:")[0]?.trim();
      if (!seeSection) {
        console.log("No 'I see' section found in response");
        return;
      }

      console.log("Extracted 'I see' section:", seeSection);

      const currentlySeenIngredients = seeSection
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.startsWith("-"))
        .map((line) => line.substring(1).trim());

      console.log("Currently seen ingredients:", currentlySeenIngredients);

      // Update ingredients state first
      setIngredients((prev) => {
        const updatedIngredients = prev.map((item) => {
          const itemText = item.text.toLowerCase();
          const isCurrentlySeen = currentlySeenIngredients.some((seen) => {
            const seenLower = seen.toLowerCase();
            return seenLower === itemText;
          });

          if (isCurrentlySeen && !item.completed) {
            console.log(`Marking ingredient as completed: ${item.text}`);
          }

          return {
            ...item,
            completed: item.completed || isCurrentlySeen,
          };
        });

        console.log("Updated ingredients state:", updatedIngredients);
        return updatedIngredients;
      });

      // Then update seenIngredients
      setSeenIngredients((prevMap) => {
        const newMap = new Map(prevMap);
        currentlySeenIngredients.forEach((ing) => {
          const key = ing.toLowerCase();
          if (!newMap.has(key)) {
            console.log(`Adding new ingredient to seenIngredients: ${ing}`);
            newMap.set(key, ing);
          }
        });
        return newMap;
      });

      // Update seenHistory based on seenIngredients
      const newHistory = Array.from(seenIngredients.values())
        .map((ing) => `- ${ing}`)
        .join("\n");

      console.log("Updated seenHistory:", newHistory);
      setSeenHistory(newHistory);

      // Handle TTS feedback
      const newlyCompletedIngredient = currentlySeenIngredients.find(
        (ing) => !Array.from(seenIngredients.values()).includes(ing)
      );

      if (
        newlyCompletedIngredient &&
        newlyCompletedIngredient !== lastSpokenIngredient
      ) {
        setLastSpokenIngredient(newlyCompletedIngredient);
        setLastCompletedIngredient(newlyCompletedIngredient);

        // Find next incomplete ingredient
        const nextIngredient = ingredients.find((item) => !item.completed);

        // Construct feedback message
        let message = `Great! I see the ${newlyCompletedIngredient}.`;
        if (nextIngredient) {
          message += ` Next, please show me the ${nextIngredient.text}.`;
        } else if (!allIngredientsReady) {
          message += " Please show me the remaining ingredients.";
        }

        // Speak the feedback
        setSpeaking(true);
        tts.speak(message).finally(() => {
          setSpeaking(false);
        });
      }
    } else {
      console.log("=== Updating Recipe Progress ===");
      console.log("Current steps state:", steps);
      console.log(
        "Current completed steps:",
        Array.from(completedSteps.entries())
      );

      // Extract the "I see:" and "I say:" sections
      const seeSection = text.split("I see:")[1]?.split("I say:")[0]?.trim();
      const saySection = text.split("I say:")[1]?.trim();

      if (!seeSection) {
        console.log("No 'I see' section found in response");
        return;
      }

      console.log("Extracted 'I see' section:", seeSection);

      // Parse the steps Gemini currently sees being performed
      const currentlySeenSteps = seeSection
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.startsWith("-"))
        .map((line) => line.substring(1).trim());

      console.log("Currently seen steps:", currentlySeenSteps);

      let stepCompleted = false;
      let completedStepText = "";

      // Update steps based on what Gemini sees
      setSteps((prev) => {
        const updatedSteps = prev.map((item) => {
          if (item.completed) return item;

          // Check if this step is being performed
          const isCurrentlyPerformed = currentlySeenSteps.some((seen) => {
            const seenLower = seen.toLowerCase();
            const itemLower = item.text.toLowerCase();
            return (
              seenLower.includes(itemLower) || itemLower.includes(seenLower)
            );
          });

          if (isCurrentlyPerformed && !item.completed) {
            console.log(`Marking step as completed: ${item.text}`);
            stepCompleted = true;
            completedStepText = item.text;

            // Update completed steps history
            const newMap = new Map(completedSteps);
            newMap.set(item.text.toLowerCase(), item.text);
            setCompletedSteps(newMap);
          }

          return {
            ...item,
            completed: item.completed || isCurrentlyPerformed,
          };
        });

        console.log("Updated steps state:", updatedSteps);
        return updatedSteps;
      });

      // Speak feedback when a step is completed
      if (stepCompleted && saySection) {
        console.log("Speaking feedback for completed step:", completedStepText);

        // Check if the completed step contains "minutes"
        if (completedStepText.toLowerCase().includes("minutes")) {
          setShowTimer(true);
        }

        setSpeaking(true);
        tts.speak(saySection).finally(() => {
          setSpeaking(false);
        });
      }
    }
  };

  // Clear any pending timeouts
  const clearPendingAnalysis = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  // Schedule next analysis
  const scheduleNextAnalysis = () => {
    clearPendingAnalysis(); // Clear any existing timeout
    if (!speaking) {
      // Only schedule if not speaking
      timeoutRef.current = setTimeout(analyzeStream, 2000);
    }
  };

  const getNextIncompleteStep = () => {
    // Don't provide next step if not all ingredients are ready
    if (!allIngredientsReady) {
      return { nextStep: null, followingStep: null };
    }

    const nextStep = steps.find((step) => !step.completed);
    const nextStepIndex = steps.findIndex((step) => !step.completed);
    const followingStep =
      nextStepIndex < steps.length - 1 ? steps[nextStepIndex + 1] : null;
    return { nextStep, followingStep };
  };

  const handlePhaseTransition = async () => {
    try {
      setShowTransition(true);

      // Stop any ongoing speech
      tts.stop();

      // Clear states for recipe phase
      setPreparationPhase(false);
      setLastCompletedIngredient(null);
      setSeenIngredients(new Map());
      setSeenHistory("");
      completedStepsRef.current = new Map();
      setCompletedSteps(new Map());

      // Announce phase transition and first step
      const firstStep = steps.find((step) => !step.completed);
      const transitionMessage = `Great! You have all the ingredients ready. Let's start cooking! Your first step is to ${firstStep?.text}.`;

      setAnalysis(transitionMessage);
      setSpeaking(true);
      await tts.speak(transitionMessage);
      setSpeaking(false);

      // Hide transition message after delay
      setTimeout(() => {
        setShowTransition(false);
      }, 3000);

      // Resume analysis after transition
      await analyzeStream();
    } catch (error) {
      console.error("Error during phase transition:", error);
      setSpeaking(false);
      setShowTransition(false);
    }
  };

  const analyzeStream = async () => {
    if (speaking || analysisInProgress.current) {
      return;
    }

    try {
      analysisInProgress.current = true;
      setIsAnalyzing(true);

      const image = await captureImage();
      if (image) {
        // Format history based on current phase using state instead of ref
        const formattedHistory = preparationPhase
          ? Array.from(seenIngredients.values())
              .map((ing) => `- ${ing}`)
              .join("\n")
          : Array.from(completedStepsRef.current.values())
              .map((step) => `- ${step}`)
              .join("\n");

        let result;
        if (preparationPhase) {
          // Use ingredientGemini during preparation phase
          result = await ingredientGemini.analyzeImage(
            image,
            ingredients,
            formattedHistory || "This is my first observation."
          );
        } else {
          // Use recipeGemini during recipe phase
          const { nextStep, followingStep } = getNextIncompleteStep();

          // Only proceed with recipe analysis if we have steps to complete
          if (nextStep) {
            result = await recipeGemini.analyzeImage(
              image,
              nextStep.text,
              followingStep?.text || null,
              formattedHistory || "Starting the recipe phase."
            );
          } else {
            await checkCompletion();
            return;
          }
        }

        // Update progress based on response
        updateProgress(result);

        // Set analysis text but don't speak unless there's a change
        setAnalysis(result);

        // Handle phase transition
        if (preparationPhase && allIngredientsReady) {
          await handlePhaseTransition();
        }

        await checkCompletion();
      }
    } catch (error) {
      console.error("Failed to analyze stream:", error);
      setAnalysis(
        "I had trouble seeing what you're doing. Please make sure everything is visible."
      );
    } finally {
      analysisInProgress.current = false;
      setIsAnalyzing(false);
      scheduleNextAnalysis();
    }
  };

  // Effect to handle speaking state changes
  useEffect(() => {
    if (speaking) {
      // Clear any pending analysis when speaking starts
      clearPendingAnalysis();
    } else {
      // Schedule next analysis when speaking ends
      scheduleNextAnalysis();
    }

    return () => clearPendingAnalysis();
  }, [speaking]);

  // Initial analysis
  useEffect(() => {
    analyzeStream();
    return () => {
      clearPendingAnalysis();
      tts.stop();
    };
  }, []); // Run once on mount

  // Reset completed steps when starting recipe phase
  useEffect(() => {
    if (!preparationPhase) {
      completedStepsRef.current = new Map();
      setCompletedSteps(new Map());
    }
  }, [preparationPhase]);

  // Add completion check to analyzeStream
  const checkCompletion = async () => {
    if (!preparationPhase && steps.every((step) => step.completed)) {
      setIsCompleted(true);
      const endTime = new Date();
      const totalMinutes = Math.round(
        (endTime.getTime() - startTimeRef.current.getTime()) / 60000
      );

      // Capture and set final image
      const capturedImage = await captureImage();
      setFinalImage(capturedImage);

      const completionRate = calculateCompletionRate(
        steps.filter((s) => s.completed).length,
        steps.length
      );

      setRecipeStats({
        totalTime: totalMinutes,
        stepsCompleted: steps.length,
        startTime: startTimeRef.current,
        endTime: endTime,
        completionRate,
        aestheticsScore: 0,
      });

      setCompletionPhase(true);
      setShowCompletionDialog(true);

      // Clean up
      clearPendingAnalysis();
      tts.stop();
    }
  };

  // Add to analyzeStream after updating steps
  useEffect(() => {
    checkCompletion();
  }, [steps]);

  return (
    <Box
      sx={{
        minHeight: "100vh",
        width: "100%",
        backgroundColor: preparationPhase ? colors.greenBg : colors.orangeBg,
        transition: "background-color 0.8s ease",
        position: "relative",
        margin: 0,
        padding: 0,
        overflow: "hidden",
      }}
    >
      {/* Phase Header */}
      <Box
        component={motion.div}
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        sx={{
          textAlign: "center",
          py: 3,
          borderBottom: `1px solid ${colors.orange}22`,
          backgroundColor: preparationPhase ? colors.greenBg : colors.orangeBg, // Match background
          boxShadow: `0 4px 20px ${colors.orange}11`,
          mb: 4,
          width: "100%",
          transition: "background-color 0.8s ease", // Match main background transition
        }}
      >
        <AnimatePresence mode="wait">
          <Typography
            variant="h4"
            component={motion.h1}
            key={preparationPhase ? "prep" : "recipe"}
            variants={phaseTextAnimation}
            initial="hidden"
            animate="visible"
            exit="exit"
            sx={{
              fontFamily: theme.fonts.heading,
              color: colors.orange,
              fontWeight: 600,
              "& span": {
                color: colors.black,
                position: "relative",
                "&::after": {
                  content: '""',
                  position: "absolute",
                  bottom: -4,
                  left: 0,
                  width: "100%",
                  height: 4,
                  background: colors.orange,
                  opacity: 0.3,
                  borderRadius: 2,
                },
              },
            }}
          >
            {preparationPhase ? (
              <>
                <span>Preparation</span> Phase
              </>
            ) : (
              <>
                <span>Recipe</span> Phase
              </>
            )}
          </Typography>
        </AnimatePresence>
      </Box>

      {/* Main Content */}
      <Box
        sx={{ display: "flex", width: "100%", height: "calc(100vh - 80px)" }}
      >
        {/* Left Side - Lists and Avatar (1/3 width) */}
        <Box
          sx={{
            width: "33.333%",
            height: "100%",
            p: 2,
            display: "flex",
            flexDirection: "column",
            gap: 2,
            borderRight: `1px solid ${colors.orange}22`,
          }}
        >
          {/* Lists Section */}
          <Box sx={{ flex: 1, overflowY: "auto" }}>
            {preparationPhase ? (
              <Paper elevation={3} sx={{ p: 2, mb: 2 }}>
                <Typography variant="h6" gutterBottom>
                  Required Ingredients
                </Typography>
                <List dense>
                  {ingredients.map((item, index) => (
                    <ListItem key={index}>
                      <ListItemText
                        primary={item.text}
                        sx={{
                          textDecoration: item.completed
                            ? "line-through"
                            : "none",
                          color: item.completed
                            ? "text.disabled"
                            : "text.primary",
                        }}
                      />
                    </ListItem>
                  ))}
                </List>
              </Paper>
            ) : (
              <Paper elevation={3} sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>
                  Recipe Steps
                </Typography>
                <List dense>
                  {steps.map((item, index) => (
                    <ListItem key={index}>
                      <ListItemText
                        primary={item.text}
                        sx={{
                          textDecoration: item.completed
                            ? "line-through"
                            : "none",
                          color: item.completed
                            ? "text.disabled"
                            : "text.primary",
                        }}
                      />
                    </ListItem>
                  ))}
                </List>
              </Paper>
            )}
          </Box>

          {/* Avatar Section */}
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              p: 2,
              backgroundColor: "rgba(255, 107, 53, 0.05)",
              borderRadius: "12px",
              position: "relative",
            }}
          >
            {showTimer && (
              <Timer
                duration={10}
                onComplete={() => {
                  setShowTimer(false);
                  setSpeaking(true);
                  tts
                    .speak("Time's up! Let's continue with the next step.")
                    .finally(() => {
                      setSpeaking(false);
                    });
                }}
              />
            )}
            <ChefAvatar speaking={speaking} locale={currentLocale} />
          </Box>
        </Box>

        {/* Right Side - Video and Chat (2/3 width) */}
        <Box
          sx={{
            width: "66.666%",
            height: "100%",
            p: 2,
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* Video Container */}
          <Paper
            elevation={3}
            sx={{
              flex: 1,
              mb: 2,
              borderRadius: 2,
              overflow: "hidden",
              position: "relative",
              filter: isCompleted ? "brightness(0.5)" : "none",
            }}
          >
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted={isCompleted}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
              }}
            />
          </Paper>

          {/* Chat Section - Text Only */}
          <Paper
            elevation={2}
            sx={{
              p: 2,
              backgroundColor: "#f5f5f5",
              borderRadius: "12px",
              height: "100px",
              display: "flex",
              alignItems: "center",
            }}
          >
            <Typography
              variant="body1"
              sx={{
                fontFamily: theme.fonts.body,
                color: colors.grayDark,
              }}
            >
              {showTransition
                ? "Great! You have all the ingredients ready. Let's start cooking!"
                : isAnalyzing
                ? "Analyzing what I'm seeing..."
                : analysis ||
                  "Hello! I'm your cooking assistant. Let me see what you're cooking!"}
            </Typography>
          </Paper>
        </Box>
      </Box>

      {/* CompletionDialog */}
      <Box
        sx={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0, 0, 0, 0.7)",
          zIndex: 1000,
          display: showCompletionDialog ? "block" : "none",
        }}
      >
        <CompletionDialog
          open={showCompletionDialog}
          stats={recipeStats}
          ingredients={ingredients}
          steps={steps}
          finalImage={finalImage}
          onClose={() => {
            setShowCompletionDialog(false);
            setFinalImage(null);
            setIsCompleted(false);
          }}
        />
      </Box>

      <SpeedDial
        ariaLabel="Voice Locale SpeedDial"
        sx={{
          position: "fixed",
          bottom: 16,
          right: 16,
        }}
        icon={<SpeedDialIcon icon={<TranslateIcon />} />}
      >
        {(Object.keys(localeNames) as VoiceLocale[]).map((locale) => (
          <SpeedDialAction
            key={locale}
            icon={
              <Box
                sx={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  border:
                    locale === currentLocale ? "2px solid #FF6B35" : "none",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 600,
                  fontSize: "0.8rem",
                  color: locale === currentLocale ? "#FF6B35" : "inherit",
                }}
              >
                {locale === "grandma"
                  ? "👵"
                  : locale.split("-")[0].toUpperCase()}
              </Box>
            }
            tooltipTitle={localeNames[locale]}
            onClick={() => handleLocaleChange(locale)}
          />
        ))}
      </SpeedDial>
    </Box>
  );
};

function Welcome() {
  const [started, setStarted] = useState(false);

  const handleStart = async () => {
    const audioContext = new AudioContext();
    await audioContext.resume();
    setStarted(true);
    try {
      await tts.speak("Hello! I'm ready to help you cook!");
    } catch (error) {
      console.error("Initial TTS test failed:", error);
    }
  };

  return (
    <Box
      component={motion.div}
      initial="hidden"
      animate="visible"
      sx={{
        minHeight: "100vh",
        background: `linear-gradient(135deg, ${colors.white} 0%, ${colors.grayLight} 100%)`,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Animated decorative elements */}
      <Box
        component={motion.div}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.5, ease: "easeOut" }}
        sx={{
          position: "absolute",
          top: -100,
          right: -100,
          width: 400,
          height: 400,
          borderRadius: "50%",
          background: `linear-gradient(45deg, ${colors.orange}22, ${colors.orangeLight}22)`,
          filter: "blur(60px)",
          zIndex: 0,
        }}
      />
      <Box
        component={motion.div}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.5, ease: "easeOut", delay: 0.5 }}
        sx={{
          position: "absolute",
          bottom: -150,
          left: -150,
          width: 500,
          height: 500,
          borderRadius: "50%",
          background: `linear-gradient(45deg, ${colors.orange}11, ${colors.orangeLight}11)`,
          filter: "blur(80px)",
          zIndex: 0,
        }}
      />

      <Container
        maxWidth="md"
        sx={{
          position: "relative",
          zIndex: 1,
          p: 0, // Remove padding
          "&.MuiContainer-root": {
            // Override MUI's default padding
            padding: 0,
          },
        }}
      >
        <Box
          component={motion.div}
          variants={staggerContainer}
          sx={{
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            py: 0, // Remove vertical padding
          }}
        >
          {!started ? (
            <>
              <Box
                component={motion.div}
                variants={fadeIn}
                sx={{ textAlign: "center" }}
              >
                <Typography
                  component={motion.h1}
                  variants={fadeIn}
                  sx={{
                    fontFamily: theme.fonts.heading,
                    fontSize: {
                      xs: "2.5rem",
                      md: "3.5rem",
                    },
                    fontWeight: 700,
                    color: colors.black,
                    mb: 2,
                    "& span": {
                      color: colors.orange,
                      position: "relative",
                      "&::after": {
                        content: '""',
                        position: "absolute",
                        bottom: -4,
                        left: 0,
                        width: "100%",
                        height: 4,
                        background: colors.orange,
                        opacity: 0.3,
                        borderRadius: 2,
                      },
                    },
                  }}
                >
                  Cooking <span>Assistant</span>
                </Typography>
                <Typography
                  variant="h6"
                  component={motion.p}
                  variants={fadeIn}
                  sx={{
                    fontFamily: theme.fonts.body,
                    color: colors.grayDark,
                    maxWidth: 600,
                    mx: "auto",
                    mb: 4,
                    lineHeight: 1.6,
                  }}
                >
                  Your AI-powered kitchen companion that helps you create
                  perfect recipes step by step
                </Typography>
                <motion.div
                  variants={scaleIn}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Button
                    variant="contained"
                    size="large"
                    onClick={handleStart}
                    sx={{
                      fontFamily: theme.fonts.heading,
                      backgroundColor: colors.orange,
                      fontSize: "1.2rem",
                      py: 1.5,
                      px: 4,
                      borderRadius: 2,
                      textTransform: "none",
                      boxShadow: `0 8px 16px ${colors.orange}33`,
                      "&:hover": {
                        backgroundColor: colors.orangeLight,
                        transform: "translateY(-2px)",
                        boxShadow: `0 12px 20px ${colors.orange}44`,
                      },
                      transition: "all 0.3s ease",
                    }}
                  >
                    Start Cooking
                  </Button>
                </motion.div>
              </Box>

              {/* Feature highlights with animations */}
              <Box
                component={motion.div}
                variants={staggerContainer}
                sx={{
                  display: "grid",
                  gridTemplateColumns: {
                    xs: "1fr",
                    md: "repeat(3, 1fr)",
                  },
                  gap: 4,
                  width: "100%",
                  mt: 4,
                }}
              >
                {[
                  {
                    title: "Real-time Guidance",
                    description: "Get step-by-step instructions as you cook",
                  },
                  {
                    title: "Ingredient Detection",
                    description: "Automatically tracks your ingredients",
                  },
                  {
                    title: "Progress Tracking",
                    description: "Monitor your recipe completion",
                  },
                ].map((feature, index) => (
                  <motion.div
                    key={index}
                    variants={fadeIn}
                    whileHover={{
                      y: -8,
                      transition: { duration: 0.2 },
                    }}
                  >
                    <Paper
                      elevation={0}
                      sx={{
                        p: 3,
                        borderRadius: 2,
                        backgroundColor: colors.white,
                        border: `1px solid ${colors.grayLight}`,
                        height: "100%",
                        transition: "all 0.3s ease",
                        "&:hover": {
                          boxShadow: `0 12px 24px ${colors.orange}11`,
                          borderColor: colors.orange,
                        },
                      }}
                    >
                      <Typography
                        variant="h6"
                        gutterBottom
                        sx={{
                          fontFamily: theme.fonts.heading,
                          color: colors.orange,
                          fontWeight: 600,
                        }}
                      >
                        {feature.title}
                      </Typography>
                      <Typography
                        sx={{
                          fontFamily: theme.fonts.body,
                          color: colors.grayDark,
                        }}
                      >
                        {feature.description}
                      </Typography>
                    </Paper>
                  </motion.div>
                ))}
              </Box>
            </>
          ) : (
            <VideoStream />
          )}
        </Box>
      </Container>
    </Box>
  );
}

export default Welcome;
