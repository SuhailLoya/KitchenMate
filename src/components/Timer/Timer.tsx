import { Box, Typography } from "@mui/material";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface TimerProps {
  duration: number;
  onComplete: () => void;
}

const Timer = ({ duration, onComplete }: TimerProps) => {
  const [timeLeft, setTimeLeft] = useState(duration);

  useEffect(() => {
    if (timeLeft <= 0) {
      onComplete();
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, onComplete]);

  return (
    <AnimatePresence>
      <Box
        component={motion.div}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        sx={{
          position: "absolute",
          top: -60,
          left: "50%",
          transform: "translateX(-50%)",
          backgroundColor: "rgba(255, 107, 53, 0.9)",
          borderRadius: "12px",
          padding: "8px 16px",
          boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
        }}
      >
        <Typography
          variant="h6"
          component={motion.div}
          key={timeLeft}
          initial={{ scale: 1.4 }}
          animate={{
            scale: 1,
            transition: {
              duration: 0.8,
              ease: "easeOut",
            },
          }}
          sx={{
            color: "white",
            fontWeight: "bold",
            textAlign: "center",
            display: "block",
            minWidth: "60px",
          }}
        >
          {timeLeft}s
        </Typography>
      </Box>
    </AnimatePresence>
  );
};

export default Timer; 