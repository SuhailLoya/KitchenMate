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
import TranslateIcon from '@mui/icons-material/Translate';
import type { VoiceLocale } from '../../services/tts';

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
  { text: "3 eggs", completed: false },
  { text: "1 cup butter", completed: false },
  { text: "1 cup milk", completed: false },
];

const initialSteps: RecipeItem[] = [
  { text: "Crack 3 eggs into a large mixing bowl", completed: false },
  //   { text: "Pour 1 cup of milk into the bowl with eggs", completed: false },
  //   { text: "Add 1 cup of sugar to the mixture", completed: false },
  //   { text: "Mix in 1 cup of melted butter", completed: false },
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
  'it-IT': 'Italian',
  'zh-CN': 'Chinese',
  'en-US': 'English'
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
  const seenIngredientsRef = useRef<Map<string, string>>(new Map());
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

  const [currentLocale, setCurrentLocale] = useState<VoiceLocale>('en-US');

  const [isCompleted, setIsCompleted] = useState(false);

  const handleLocaleChange = (newLocale: VoiceLocale) => {
    setCurrentLocale(newLocale);
    tts.setLocale(newLocale);
  };

  const updateProgress = (text: string) => {
    if (preparationPhase) {
      // Extract the "I see:" section
      const seeSection = text.split("I see:")[1]?.split("I say:")[0]?.trim();
      if (!seeSection) return;

      // Parse the ingredients Gemini currently sees
      const currentlySeenIngredients = seeSection
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.startsWith("-"))
        .map((line) => line.substring(1).trim());

      console.log("Currently seen ingredients:", currentlySeenIngredients);

      // Update both state and ref with new ingredients
      const newMap = new Map(seenIngredientsRef.current);
      currentlySeenIngredients.forEach((ing) => {
        const key = ing.toLowerCase();
        if (!newMap.has(key)) {
          newMap.set(key, ing); // Store original text
          console.log(`Adding new ingredient to history: ${ing}`);
        }
      });

      seenIngredientsRef.current = newMap;
      setSeenIngredients(newMap);
      console.log("Updated seen ingredients:", Array.from(newMap.values()));

      // Update ingredients based on what Gemini actually sees
      setIngredients((prev) =>
        prev.map((item) => {
          const itemText = item.text.toLowerCase();
          const isCurrentlySeen = currentlySeenIngredients.some((seen) => {
            const seenLower = seen.toLowerCase();
            const [itemQuantity, ...itemWords] = itemText.split(" ");
            const [seenQuantity, ...seenWords] = seenLower.split(" ");

            return (
              itemQuantity === seenQuantity &&
              seenWords.join(" ").includes(itemWords.join(" "))
            );
          });

          if (isCurrentlySeen && !item.completed) {
            setLastCompletedIngredient(item.text);
          }

          return {
            ...item,
            completed: item.completed || isCurrentlySeen,
          };
        })
      );

      // Recipe steps remain the same...
      setSteps((prev) =>
        prev.map((item) => {
          // ... existing step logic
          return item;
        })
      );
    } else {
      // Extract the "I see:" section for recipe phase
      const seeSection = text.split("I see:")[1]?.split("I say:")[0]?.trim();
      if (!seeSection) return;

      // Parse the steps Gemini currently sees being performed
      const currentlySeenSteps = seeSection
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.startsWith("-"))
        .map((line) => line.substring(1).trim());

      console.log("Currently seen steps:", currentlySeenSteps);

      // Only update steps that are currently being performed
      setSteps((prev) =>
        prev.map((item) => {
          // If already completed, keep it completed
          if (item.completed) {
            console.log(`${item.text}: already completed`);
            return item;
          }

          // Check if this step is currently being performed
          const isCurrentlyPerformed = currentlySeenSteps.some(
            (seen) => seen.toLowerCase() === item.text.toLowerCase()
          );

          if (isCurrentlyPerformed) {
            console.log(`Step completed: ${item.text}`);
            // Update completed steps history
            const newMap = new Map(completedStepsRef.current);
            if (!newMap.has(item.text.toLowerCase())) {
              newMap.set(item.text.toLowerCase(), item.text);
              completedStepsRef.current = newMap;
              setCompletedSteps(newMap);
            }
          }

          return {
            ...item,
            completed: isCurrentlyPerformed,
          };
        })
      );
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
    setShowTransition(true);
    const readyMessage =
      "Great! You have all the ingredients ready. Let's start cooking!";
    setAnalysis(readyMessage);
    setSpeaking(true);
    await tts.speak(readyMessage);

    // Reset states for recipe phase
    setPreparationPhase(false);
    setLastCompletedIngredient(null);
    seenIngredientsRef.current = new Map();
    setSeenIngredients(new Map());
    setSeenHistory("");

    // Hide transition message after a delay
    setTimeout(() => {
      setShowTransition(false);
    }, 3000);
  };

  const analyzeStream = async () => {
    if (speaking || analysisInProgress.current) {
      console.log(
        speaking
          ? "Bot is speaking, skipping analysis"
          : "Analysis in progress, skipping"
      );
      return;
    }

    try {
      analysisInProgress.current = true;
      setIsAnalyzing(true);

      const image = await captureImage();
      if (image) {
        // Format history based on phase
        const formattedHistory = preparationPhase
          ? Array.from(seenIngredientsRef.current.values())
              .map((ing) => `- ${ing}`)
              .join("\n")
          : Array.from(completedStepsRef.current.values())
              .map((step) => `- ${step}`)
              .join("\n");

        console.log(
          `Current ${preparationPhase ? "ingredient" : "step"} history:`,
          formattedHistory
        );

        let result;
        if (preparationPhase || !allIngredientsReady) {
          result = await ingredientGemini.analyzeImage(
            image,
            ingredients,
            formattedHistory || "This is my first observation."
          );
        } else {
          // Only use recipe Gemini when all ingredients are ready and we're in recipe phase
          const { nextStep, followingStep } = getNextIncompleteStep();
          result = await recipeGemini.analyzeImage(
            image,
            nextStep?.text || null,
            followingStep?.text || null,
            formattedHistory
          );
        }

        console.log("Received Gemini response:", result);

        // Update progress based on response
        updateProgress(result);

        // Set full response as analysis text
        setAnalysis(result);

        // Extract only the "I say" portion for speech
        const saySection = result.split("I say:")[1]?.trim();
        if (saySection) {
          console.log("Speaking:", saySection);
          setSpeaking(true);
          await tts.speak(saySection);
          setSpeaking(false);
        }

        // Handle phase transition
        if (preparationPhase && allIngredientsReady) {
          await handlePhaseTransition();
        }

        // Add completion check to analyzeStream
        await checkCompletion();
      }
    } catch (error) {
      console.error("Failed to analyze stream:", error);
      const errorMessage =
        "I had trouble seeing what you're doing. Please make sure the ingredients are visible.";
      setAnalysis(errorMessage);
      // Don't speak error messages during ingredient selection
    } finally {
      setSpeaking(false);
      analysisInProgress.current = false;
      setIsAnalyzing(false);
      console.log("Analysis completed");
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

  // Only reset seen ingredients when explicitly transitioning to recipe phase
  useEffect(() => {
    if (!preparationPhase) {
      seenIngredientsRef.current = new Map();
      setSeenIngredients(new Map());
      setSeenHistory("");
    }
  }, [preparationPhase]);

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
        minHeight: '100vh',
        width: '100%',
        backgroundColor: preparationPhase ? colors.greenBg : colors.orangeBg,
        transition: 'background-color 0.8s ease',
        position: 'relative',
        margin: 0,
        padding: 0,
        overflow: 'hidden',
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
      <Box sx={{ display: 'flex', width: '100%', height: 'calc(100vh - 80px)' }}>
        {/* Left Side - Lists and Avatar (1/3 width) */}
        <Box
          sx={{
            width: '33.333%',
            height: '100%',
            p: 2,
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
            borderRight: `1px solid ${colors.orange}22`,
          }}
        >
          {/* Lists Section */}
          <Box sx={{ flex: 1, overflowY: 'auto' }}>
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
                          textDecoration: item.completed ? "line-through" : "none",
                          color: item.completed ? "text.disabled" : "text.primary",
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
                          textDecoration: item.completed ? "line-through" : "none",
                          color: item.completed ? "text.disabled" : "text.primary",
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
              display: 'flex',
              justifyContent: 'center',
              p: 2,
              backgroundColor: 'rgba(255, 107, 53, 0.05)',
              borderRadius: '12px',
            }}
          >
            <ChefAvatar speaking={speaking} locale={currentLocale} />
          </Box>
        </Box>

        {/* Right Side - Video and Chat (2/3 width) */}
        <Box
          sx={{
            width: '66.666%',
            height: '100%',
            p: 2,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Video Container */}
          <Paper
            elevation={3}
            sx={{
              flex: 1,
              mb: 2,
              borderRadius: 2,
              overflow: 'hidden',
              position: 'relative',
              filter: isCompleted ? 'brightness(0.5)' : 'none',
            }}
          >
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted={isCompleted}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
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
              height: '100px',
              display: 'flex',
              alignItems: 'center',
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
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          zIndex: 1000,
          display: showCompletionDialog ? 'block' : 'none',
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
          position: 'fixed',
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
                  borderRadius: '50%',
                  border: locale === currentLocale ? '2px solid #FF6B35' : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 600,
                  fontSize: '0.8rem',
                  color: locale === currentLocale ? '#FF6B35' : 'inherit',
                }}
              >
                {locale.split('-')[0].toUpperCase()}
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

      <Container maxWidth="md" sx={{ position: "relative", zIndex: 1 }}>
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
            py: 4,
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
                    fontSize: { xs: "2.5rem", md: "3.5rem" },
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
                  gridTemplateColumns: { xs: "1fr", md: "repeat(3, 1fr)" },
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
                    whileHover={{ y: -8, transition: { duration: 0.2 } }}
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
