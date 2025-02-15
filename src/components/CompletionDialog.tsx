import {
  Dialog,
  DialogContent,
  DialogTitle,
  Box,
  Typography,
  Button,
  Paper,
  IconButton,
} from "@mui/material";
import cakeImage from "../images/cake.png";
import { useNavigate } from "react-router-dom";
import { saveRecipeCompletion } from "../services/supabase";
import { motion, AnimatePresence } from 'framer-motion';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import DeleteIcon from '@mui/icons-material/Delete';
import { useState, useRef } from "react";

interface CompletionDialogProps {
  open: boolean;
  stats: {
    totalTime: number;
    stepsCompleted: number;
    startTime?: Date;
    endTime?: Date;
    completionRate: number;
    aestheticsScore: number;
  };
  ingredients: { text: string }[];
  steps: { text: string }[];
  finalImage?: Blob;
  onClose: () => void;
}

// Animation variants for the dialog
const dialogVariants = {
  hidden: {
    opacity: 0,
    scale: 0.75,
    y: 20,
  },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: "easeOut",
    },
  },
  exit: {
    opacity: 0,
    scale: 0.75,
    y: 20,
    transition: {
      duration: 0.3,
      ease: "easeIn",
    },
  },
};

export function CompletionDialog({
  open,
  stats,
  ingredients,
  steps,
  finalImage,
  onClose,
}: CompletionDialogProps) {
  const navigate = useNavigate();
  const [customImage, setCustomImage] = useState<File | null>(null);
  const [showDefaultImage, setShowDefaultImage] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCameraStream(stream);
      setShowDefaultImage(false);
    } catch (err) {
      console.error("Error accessing camera:", err);
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setCustomImage(null);
    setShowDefaultImage(true);
  };

  const capturePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0);
        canvas.toBlob((blob) => {
          if (blob) {
            const file = new File([blob], "capture.jpg", { type: "image/jpeg" });
            setCustomImage(file);
            if (cameraStream) {
              cameraStream.getTracks().forEach(track => track.stop());
              setCameraStream(null);
            }
          }
        }, 'image/jpeg');
      }
    }
  };

  const handleClose = async () => {
    try {
      // Convert custom image to Blob if it exists
      const imageToSave = customImage ? 
        new Blob([await customImage.arrayBuffer()], { type: customImage.type }) : 
        finalImage;

      if (imageToSave) {
        await saveRecipeCompletion({
          total_time: stats.totalTime,
          steps_completed: stats.stepsCompleted,
          start_time: stats.startTime!.toISOString(),
          end_time: stats.endTime!.toISOString(),
          ingredients: ingredients.map(i => i.text),
          steps: steps.map(s => s.text),
          completion_rate: stats.completionRate || 0,
          aesthetics_score: stats.aestheticsScore || 0
        }, imageToSave);
      }
      onClose();
      navigate('/stats');
    } catch (error) {
      console.error('Failed to save completion:', error);
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <Dialog
          open={open}
          onClose={handleClose}
          maxWidth="sm"
          fullWidth
          PaperProps={{
            component: motion.div,
            variants: dialogVariants,
            initial: "hidden",
            animate: "visible",
            exit: "exit",
            style: {
              borderRadius: '16px',
              padding: '16px',
              background: 'linear-gradient(135deg, #fff 0%, #f5f5f5 100%)',
            },
          }}
        >
          <DialogTitle
            sx={{
              textAlign: 'center',
              fontFamily: "'Poppins', sans-serif",
              fontWeight: 600,
              fontSize: '1.75rem',
              color: '#2B2B2B',
              pb: 0,
            }}
          >
            Congratulations! 🎉
          </DialogTitle>
          <DialogContent>
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 3,
                pt: 2,
              }}
            >
              <Box sx={{ width: '100%', position: 'relative' }}>
                <Box
                  sx={{
                    position: 'relative',
                    width: '100%',
                    height: 200,
                    borderRadius: '12px',
                    overflow: 'hidden',
                    backgroundColor: 'rgba(255, 107, 53, 0.05)',
                  }}
                >
                  {cameraStream ? (
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        transform: 'scaleX(-1)',
                      }}
                    />
                  ) : (
                    <motion.img
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.3 }}
                      src={customImage ? URL.createObjectURL(customImage) : cakeImage}
                      alt="Recipe result"
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'contain',
                      }}
                    />
                  )}
                  
                  <Box
                    sx={{
                      position: 'absolute',
                      bottom: 8,
                      right: 8,
                      display: 'flex',
                      gap: 1,
                    }}
                  >
                    {cameraStream ? (
                      <IconButton
                        onClick={capturePhoto}
                        sx={{
                          backgroundColor: 'rgba(255,255,255,0.8)',
                          '&:hover': { backgroundColor: 'rgba(255,255,255,0.9)' },
                        }}
                      >
                        <PhotoCameraIcon />
                      </IconButton>
                    ) : (
                      <IconButton
                        onClick={startCamera}
                        sx={{
                          backgroundColor: 'rgba(0,0,0,0.5)',
                          color: 'white',
                          '&:hover': { backgroundColor: 'rgba(0,0,0,0.7)' },
                        }}
                      >
                        <PhotoCameraIcon />
                      </IconButton>
                    )}
                    {!showDefaultImage && (
                      <IconButton
                        onClick={stopCamera}
                        sx={{
                          backgroundColor: 'rgba(0,0,0,0.5)',
                          color: 'white',
                          '&:hover': { backgroundColor: 'rgba(0,0,0,0.7)' },
                        }}
                      >
                        <DeleteIcon />
                      </IconButton>
                    )}
                  </Box>
                </Box>
              </Box>
              
              <Typography
                variant="h6"
                sx={{
                  fontFamily: "'Inter', sans-serif",
                  textAlign: 'center',
                  color: '#FF6B35',
                }}
              >
                You've successfully completed the recipe!
              </Typography>

              <Paper
                elevation={0}
                sx={{
                  p: 3,
                  width: '100%',
                  backgroundColor: 'rgba(255, 107, 53, 0.05)',
                  borderRadius: '12px',
                }}
              >
                <Box sx={{ textAlign: "center" }}>
                  <Typography sx={{ mb: 1 }}>
                    Time taken: {formatTime(stats.totalTime)}
                  </Typography>
                  <Typography sx={{ mb: 1 }}>
                    Steps completed: {stats.stepsCompleted}
                  </Typography>
                  {stats.startTime && (
                    <Typography sx={{ mb: 1 }}>
                      Started at: {stats.startTime.toLocaleTimeString()}
                    </Typography>
                  )}
                  {stats.endTime && (
                    <Typography>
                      Finished at: {stats.endTime.toLocaleTimeString()}
                    </Typography>
                  )}
                </Box>
              </Paper>

              <Button
                variant="contained"
                onClick={handleClose}
                sx={{
                  backgroundColor: '#FF6B35',
                  fontFamily: "'Poppins', sans-serif",
                  fontSize: '1.1rem',
                  py: 1,
                  px: 4,
                  borderRadius: '8px',
                  textTransform: 'none',
                  '&:hover': {
                    backgroundColor: '#FF8B5E',
                  },
                }}
              >
                View Recipe History
              </Button>
            </Box>
          </DialogContent>
        </Dialog>
      )}
    </AnimatePresence>
  );
}

function formatTime(minutes: number) {
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hrs ? `${hrs}h ` : ""}${mins}m`;
}
