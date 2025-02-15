import { useEffect, useState } from "react";
import {
    Box,
    Container,
    Typography,
    CircularProgress,
    LinearProgress,
    Divider,
    Card,
    CardContent,
    Rating,
    useTheme,
    IconButton,
    Tooltip,
    Snackbar,
    Alert,
} from "@mui/material";
import { RecipeCompletion, getRecipeCompletions } from "../services/supabase";
import ShareIcon from "@mui/icons-material/Share";
import InstagramIcon from "@mui/icons-material/Instagram";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import { motion, AnimatePresence } from "framer-motion";
import "@fontsource/poppins/700.css"; // Bold
import "@fontsource/poppins/600.css"; // Semi-bold
import "@fontsource/inter/400.css"; // Regular
import "@fontsource/inter/500.css"; // Medium
import user1 from "../images/user_icons/user1.png";
import user2 from "../images/user_icons/user2.png";
import user3 from "../images/user_icons/user3.png";
import user4 from "../images/user_icons/user4.png";
import user5 from "../images/user_icons/user5.png";

// Custom color palette
const colors = {
    orange: "#FF6B35", // Vibrant orange
    orangeLight: "#FF8B5E",
    black: "#2B2B2B",
    white: "#FFFFFF",
    grayLight: "#F5F5F5",
    grayDark: "#4A4A4A",
};

// Animation variants
const pageAnimation = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            duration: 0.6,
            when: "beforeChildren",
        },
    },
};

const listAnimation = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1,
            delayChildren: 0.3,
        },
    },
};

const itemAnimation = {
    hidden: { opacity: 0, y: 20 },
    visible: {
        opacity: 1,
        y: 0,
        transition: {
            duration: 0.5,
            ease: "easeOut",
        },
    },
};

// Theme with fonts (same as front page)
const theme = {
    ...colors,
    fonts: {
        heading: "'Poppins', sans-serif",
        body: "'Inter', sans-serif",
    },
};

// Add user icons array
const userIcons = [
    { src: user1, alt: "Sarah K." },
    { src: user2, alt: "Mike R." },
    { src: user3, alt: "Emma L." },
    { src: user4, alt: "John D." },
    { src: user5, alt: "Lisa M." },
];

// Utility function to get random likes
const getRandomLikes = () => {
    // Get random number of likes between 2 and userIcons.length
    const numLikes = Math.floor(Math.random() * (userIcons.length - 1)) + 2;

    // Shuffle array and take first n elements
    return [...userIcons].sort(() => Math.random() - 0.5).slice(0, numLikes);
};

function StatsPage() {
    const [completions, setCompletions] = useState<RecipeCompletion[]>([]);
    const [loading, setLoading] = useState(true);
    const [snackbarOpen, setSnackbarOpen] = useState(false);
    const [snackbarMessage, setSnackbarMessage] = useState("");

    useEffect(() => {
        async function loadCompletions() {
            try {
                const data = await getRecipeCompletions();
                setCompletions(data);
            } catch (error) {
                console.error("Failed to load completions:", error);
            } finally {
                setLoading(false);
            }
        }

        loadCompletions();
    }, []);

    const formatTime = (minutes: number) => {
        const hrs = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return `${hrs ? `${hrs}h ` : ""}${mins}m`;
    };

    const handleShare = (completion: RecipeCompletion) => {
        const shareText = `Just completed a cake recipe in ${formatTime(
            completion.total_time
        )} with ${completion.completion_rate}% completion rate! 🎂✨`;

        // Simulate Instagram sharing
        console.log("Sharing to Instagram:", shareText);
        setSnackbarMessage("Opening Instagram share...");
        setSnackbarOpen(true);
    };

    const handleCopyLink = (completion: RecipeCompletion) => {
        const shareUrl = `${window.location.origin}/recipe/${completion.id}`;
        navigator.clipboard.writeText(shareUrl);
        setSnackbarMessage("Link copied to clipboard!");
        setSnackbarOpen(true);
    };

    if (loading) {
        return (
            <Box
                sx={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    minHeight: "100vh",
                    gap: 2,
                }}
            >
                <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                >
                    <CircularProgress sx={{ color: colors.orange }} />
                </motion.div>
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2, duration: 0.5 }}
                >
                    <Typography
                        sx={{
                            color: colors.grayDark,
                            fontFamily: theme.fonts.body,
                        }}
                    >
                        Loading your recipe history...
                    </Typography>
                </motion.div>
            </Box>
        );
    }

    return (
        <Box
            component={motion.div}
            variants={pageAnimation}
            initial="hidden"
            animate="visible"
            sx={{
                minHeight: "100vh",
                backgroundColor: colors.grayLight,
                pt: 4,
                pb: 8,
                fontFamily: theme.fonts.body, // Default body font
            }}
        >
            <Container maxWidth="md">
                <Typography
                    component={motion.h1}
                    variants={itemAnimation}
                    variant="h3"
                    gutterBottom
                    align="center"
                    sx={{
                        fontFamily: theme.fonts.heading,
                        color: colors.black,
                        fontWeight: 700,
                        mb: 4,
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
                    Recipe <span>Completion</span> History
                </Typography>

                <Box
                    sx={{
                        height: "calc(100vh - 200px)",
                        overflowY: "auto",
                        "&::-webkit-scrollbar": {
                            width: "8px",
                        },
                        "&::-webkit-scrollbar-track": {
                            background: colors.white,
                            borderRadius: "4px",
                        },
                        "&::-webkit-scrollbar-thumb": {
                            background: colors.orange,
                            borderRadius: "4px",
                        },
                        "&::-webkit-scrollbar-thumb:hover": {
                            background: colors.orangeLight,
                        },
                    }}
                >
                    <Box
                        component={motion.div}
                        variants={listAnimation}
                        sx={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 3,
                        }}
                    >
                        {completions.map((completion, index) => {
                            // Get random likes for this completion
                            const likes = getRandomLikes();

                            return (
                                <motion.div
                                    key={completion.id}
                                    variants={itemAnimation}
                                    whileHover={{ y: -4 }}
                                    transition={{ duration: 0.2 }}
                                >
                                    <Card
                                        elevation={0}
                                        sx={{
                                            borderRadius: 2,
                                            transition: "all 0.3s ease",
                                            border: `1px solid ${colors.grayLight}`,
                                            backgroundColor: colors.white,
                                            boxShadow: `
                        0 4px 6px -1px rgba(0, 0, 0, 0.1),
                        0 2px 4px -1px rgba(0, 0, 0, 0.06),
                        0 0 0 1px rgba(255, 107, 53, 0.05)
                      `,
                                            "&:hover": {
                                                transform: "translateY(-4px)",
                                                boxShadow: `
                          0 20px 25px -5px rgba(255, 107, 53, 0.1),
                          0 10px 10px -5px rgba(255, 107, 53, 0.04),
                          0 0 0 1px rgba(255, 107, 53, 0.1)
                        `,
                                                borderColor: colors.orange,
                                            },
                                        }}
                                    >
                                        <CardContent sx={{ p: 3 }}>
                                            <Box sx={{ mb: 3 }}>
                                                <Typography
                                                    variant="h6"
                                                    gutterBottom
                                                    sx={{
                                                        fontFamily:
                                                            theme.fonts.heading,
                                                        color: colors.black,
                                                        fontWeight: 600,
                                                    }}
                                                >
                                                    Completed on{" "}
                                                    {new Date(
                                                        completion.end_time
                                                    ).toLocaleDateString()}
                                                </Typography>
                                                <Typography
                                                    variant="subtitle2"
                                                    sx={{
                                                        fontFamily:
                                                            theme.fonts.body,
                                                        color: colors.grayDark,
                                                        fontWeight: 500,
                                                    }}
                                                >
                                                    at{" "}
                                                    {new Date(
                                                        completion.end_time
                                                    ).toLocaleTimeString()}
                                                </Typography>
                                            </Box>

                                            <Box
                                                sx={{
                                                    display: "grid",
                                                    gap: 3,
                                                    gridTemplateColumns:
                                                        "1fr 1fr",
                                                    mb: 3,
                                                }}
                                            >
                                                <Box>
                                                    <Typography
                                                        sx={{
                                                            fontFamily:
                                                                theme.fonts
                                                                    .body,
                                                            color: colors.grayDark,
                                                            mb: 1,
                                                            fontWeight: 500,
                                                        }}
                                                    >
                                                        Time Taken
                                                    </Typography>
                                                    <Typography
                                                        variant="h6"
                                                        sx={{
                                                            fontFamily:
                                                                theme.fonts
                                                                    .heading,
                                                            color: colors.orange,
                                                            fontWeight: 600,
                                                        }}
                                                    >
                                                        {formatTime(
                                                            completion.total_time
                                                        )}
                                                    </Typography>
                                                </Box>

                                                <Box>
                                                    <Typography
                                                        sx={{
                                                            fontFamily:
                                                                theme.fonts
                                                                    .body,
                                                            color: colors.grayDark,
                                                            mb: 1,
                                                            fontWeight: 500,
                                                        }}
                                                    >
                                                        Completion Rate
                                                    </Typography>
                                                    <Box
                                                        sx={{
                                                            display: "flex",
                                                            alignItems:
                                                                "center",
                                                            gap: 1,
                                                        }}
                                                    >
                                                        <LinearProgress
                                                            variant="determinate"
                                                            value={
                                                                completion.completion_rate
                                                            }
                                                            sx={{
                                                                flexGrow: 1,
                                                                height: 8,
                                                                borderRadius: 4,
                                                                backgroundColor:
                                                                    colors.grayLight,
                                                                "& .MuiLinearProgress-bar":
                                                                    {
                                                                        backgroundColor:
                                                                            colors.orange,
                                                                        borderRadius: 4,
                                                                    },
                                                            }}
                                                        />
                                                        <Typography
                                                            variant="body2"
                                                            sx={{
                                                                fontFamily:
                                                                    theme.fonts
                                                                        .heading,
                                                                color: colors.orange,
                                                                fontWeight: 600,
                                                            }}
                                                        >
                                                            {Math.round(
                                                                completion.completion_rate
                                                            )}
                                                            %
                                                        </Typography>
                                                    </Box>
                                                </Box>
                                            </Box>

                                            <Box sx={{ mb: 3 }}>
                                                <Typography
                                                    sx={{
                                                        color: colors.grayDark,
                                                        mb: 1,
                                                    }}
                                                >
                                                    Aesthetics Score
                                                </Typography>
                                                <Rating
                                                    value={
                                                        completion.aesthetics_score
                                                    }
                                                    readOnly
                                                    precision={0.5}
                                                    sx={{
                                                        "& .MuiRating-iconFilled":
                                                            {
                                                                color: colors.orange,
                                                            },
                                                        "& .MuiRating-iconEmpty":
                                                            {
                                                                color: colors.grayLight,
                                                            },
                                                    }}
                                                />
                                            </Box>

                                            <Divider
                                                sx={{
                                                    borderColor:
                                                        colors.grayLight,
                                                    my: 3,
                                                }}
                                            />

                                            <Box
                                                sx={{
                                                    display: "grid",
                                                    gap: 4,
                                                    gridTemplateColumns:
                                                        "1fr 1fr",
                                                }}
                                            >
                                                <Box>
                                                    <Typography
                                                        sx={{
                                                            fontFamily:
                                                                theme.fonts
                                                                    .heading,
                                                            color: colors.grayDark,
                                                            fontWeight: 600,
                                                            mb: 2,
                                                        }}
                                                    >
                                                        Ingredients Used
                                                    </Typography>
                                                    <Box component="ul">
                                                        {completion.ingredients.map(
                                                            (
                                                                ingredient,
                                                                index
                                                            ) => (
                                                                <li key={index}>
                                                                    <Typography
                                                                        variant="body2"
                                                                        sx={{
                                                                            fontFamily:
                                                                                theme
                                                                                    .fonts
                                                                                    .body,
                                                                            color: colors.black,
                                                                        }}
                                                                    >
                                                                        {
                                                                            ingredient
                                                                        }
                                                                    </Typography>
                                                                </li>
                                                            )
                                                        )}
                                                    </Box>
                                                </Box>

                                                <Box>
                                                    <Typography
                                                        sx={{
                                                            fontFamily:
                                                                theme.fonts
                                                                    .heading,
                                                            color: colors.grayDark,
                                                            fontWeight: 600,
                                                            mb: 2,
                                                        }}
                                                    >
                                                        Steps Completed
                                                    </Typography>
                                                    <Box component="ol">
                                                        {completion.steps.map(
                                                            (step, index) => (
                                                                <li key={index}>
                                                                    <Typography
                                                                        variant="body2"
                                                                        sx={{
                                                                            fontFamily:
                                                                                theme
                                                                                    .fonts
                                                                                    .body,
                                                                            color: colors.black,
                                                                        }}
                                                                    >
                                                                        {step}
                                                                    </Typography>
                                                                </li>
                                                            )
                                                        )}
                                                    </Box>
                                                </Box>
                                            </Box>

                                            <Box
                                                sx={{
                                                    display: "flex",
                                                    justifyContent: "flex-end",
                                                    gap: 1,
                                                    mt: 3,
                                                    pt: 2,
                                                    borderTop: `1px dashed ${colors.grayLight}`,
                                                }}
                                            >
                                                <Tooltip title="Copy link">
                                                    <IconButton
                                                        onClick={() =>
                                                            handleCopyLink(
                                                                completion
                                                            )
                                                        }
                                                        sx={{
                                                            color: colors.grayDark,
                                                            "&:hover": {
                                                                color: colors.orange,
                                                            },
                                                        }}
                                                    >
                                                        <ContentCopyIcon />
                                                    </IconButton>
                                                </Tooltip>
                                                <Tooltip title="Share to Instagram">
                                                    <IconButton
                                                        onClick={() =>
                                                            handleShare(
                                                                completion
                                                            )
                                                        }
                                                        sx={{
                                                            background: `linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)`,
                                                            color: colors.white,
                                                            "&:hover": {
                                                                background: `linear-gradient(45deg, #e6683c 0%, #dc2743 25%, #cc2366 50%, #bc1888 75%, #f09433 100%)`,
                                                            },
                                                        }}
                                                    >
                                                        <InstagramIcon />
                                                    </IconButton>
                                                </Tooltip>
                                            </Box>
                                            {/* Likes section */}
                                            <Box
                                                sx={{
                                                    mt: 2,
                                                    display: "flex",
                                                    alignItems: "center",
                                                    gap: 1,
                                                }}
                                            >
                                                <Box
                                                    sx={{
                                                        display: "flex",
                                                        alignItems: "center",
                                                    }}
                                                >
                                                    {/* Show only the random likes */}
                                                    {likes
                                                        .slice(0, 3)
                                                        .map((user, index) => (
                                                            <Box
                                                                key={index}
                                                                component={
                                                                    motion.div
                                                                }
                                                                whileHover={{
                                                                    y: -4,
                                                                }}
                                                                sx={{
                                                                    marginLeft:
                                                                        index ===
                                                                        0
                                                                            ? 0
                                                                            : "-12px",
                                                                    border: `2px solid ${colors.white}`,
                                                                    borderRadius:
                                                                        "50%",
                                                                    width: 32,
                                                                    height: 32,
                                                                    overflow:
                                                                        "hidden",
                                                                    boxShadow:
                                                                        "0 2px 4px rgba(0,0,0,0.1)",
                                                                    zIndex:
                                                                        5 -
                                                                        index,
                                                                    transition:
                                                                        "transform 0.2s ease",
                                                                    "&:hover": {
                                                                        transform:
                                                                            "translateY(-2px)",
                                                                        zIndex: 10,
                                                                    },
                                                                }}
                                                            >
                                                                <Tooltip
                                                                    title={
                                                                        user.alt
                                                                    }
                                                                >
                                                                    <img
                                                                        src={
                                                                            user.src
                                                                        }
                                                                        alt={
                                                                            user.alt
                                                                        }
                                                                        style={{
                                                                            width: "100%",
                                                                            height: "100%",
                                                                            objectFit:
                                                                                "cover",
                                                                        }}
                                                                    />
                                                                </Tooltip>
                                                            </Box>
                                                        ))}

                                                    {/* Show +X others if there are more */}
                                                    {likes.length > 3 && (
                                                        <Box
                                                            sx={{
                                                                marginLeft:
                                                                    "-12px",
                                                                width: 32,
                                                                height: 32,
                                                                borderRadius:
                                                                    "50%",
                                                                backgroundColor:
                                                                    colors.grayLight,
                                                                border: `2px solid ${colors.white}`,
                                                                display: "flex",
                                                                alignItems:
                                                                    "center",
                                                                justifyContent:
                                                                    "center",
                                                                fontSize:
                                                                    "0.75rem",
                                                                fontWeight: 600,
                                                                color: colors.grayDark,
                                                                fontFamily:
                                                                    theme.fonts
                                                                        .body,
                                                                boxShadow:
                                                                    "0 2px 4px rgba(0,0,0,0.1)",
                                                            }}
                                                        >
                                                            +{likes.length - 3}
                                                        </Box>
                                                    )}
                                                </Box>

                                                <Typography
                                                    sx={{
                                                        fontFamily:
                                                            theme.fonts.body,
                                                        color: colors.grayDark,
                                                        fontSize: "0.875rem",
                                                        ml: 1,
                                                    }}
                                                >
                                                    Liked by{" "}
                                                    <strong>
                                                        {likes[0].alt}
                                                    </strong>
                                                    {likes.length > 1 && (
                                                        <>
                                                            {" "}
                                                            and{" "}
                                                            <strong>
                                                                {likes.length -
                                                                    1}{" "}
                                                                others
                                                            </strong>
                                                        </>
                                                    )}
                                                </Typography>
                                            </Box>
                                            {completion.final_image_url && (
                                                <>
                                                    <Box
                                                        sx={{
                                                            mt: 3,
                                                            position:
                                                                "relative",
                                                            "&::after": {
                                                                content: '""',
                                                                position:
                                                                    "absolute",
                                                                top: 0,
                                                                left: 0,
                                                                right: 0,
                                                                bottom: 0,
                                                                borderRadius:
                                                                    "8px",
                                                                boxShadow:
                                                                    "inset 0 0 0 1px rgba(0,0,0,0.1)",
                                                                pointerEvents:
                                                                    "none",
                                                            },
                                                        }}
                                                    >
                                                        <img
                                                            src={
                                                                completion.final_image_url
                                                            }
                                                            alt="Final result"
                                                            style={{
                                                                width: "100%",
                                                                height: "200px",
                                                                objectFit:
                                                                    "contain",
                                                                borderRadius:
                                                                    "8px",
                                                                boxShadow: `
                                  0 4px 12px rgba(0, 0, 0, 0.1),
                                  0 0 0 1px rgba(0, 0, 0, 0.05)
                                `,
                                                            }}
                                                        />
                                                    </Box>
                                                </>
                                            )}
                                        </CardContent>
                                    </Card>
                                </motion.div>
                            );
                        })}
                    </Box>
                </Box>

                <AnimatePresence>
                    {snackbarOpen && (
                        <Snackbar
                            open={snackbarOpen}
                            autoHideDuration={3000}
                            onClose={() => setSnackbarOpen(false)}
                            anchorOrigin={{
                                vertical: "bottom",
                                horizontal: "center",
                            }}
                            TransitionComponent={motion.div}
                            TransitionProps={{
                                initial: { opacity: 0, y: 50 },
                                animate: { opacity: 1, y: 0 },
                                exit: { opacity: 0, y: 50 },
                            }}
                        >
                            <Alert
                                onClose={() => setSnackbarOpen(false)}
                                severity="success"
                                sx={{
                                    backgroundColor: colors.orange,
                                    color: colors.white,
                                    fontFamily: theme.fonts.body,
                                    "& .MuiAlert-icon": {
                                        color: colors.white,
                                    },
                                }}
                            >
                                {snackbarMessage}
                            </Alert>
                        </Snackbar>
                    )}
                </AnimatePresence>
            </Container>
        </Box>
    );
}

export default StatsPage;
