import { Box, Typography, Container, Button } from "@mui/material";
import { useState } from "react";
import VideoStream from "../components/VideoStream/VideoStream";

function Welcome() {
  const [started, setStarted] = useState(false);

  return (
    <Container maxWidth="md">
      <Box
        sx={{
          marginTop: 4,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 4,
        }}
      >
        <Typography component="h1" variant="h2" gutterBottom>
          Cooking Assistant
        </Typography>

        {!started ? (
          <Button
            variant="contained"
            size="large"
            onClick={() => setStarted(true)}
          >
            Start Cooking
          </Button>
        ) : (
          <VideoStream />
        )}
      </Box>
    </Container>
  );
}

export default Welcome;
