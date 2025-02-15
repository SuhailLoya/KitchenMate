import { Box } from "@mui/material";
import { motion } from "framer-motion";
import italianChef from "../../images/chef_avatars/italian.png";
import chineseChef from "../../images/chef_avatars/chinese.png";
import englishChef from "../../images/chef_avatars/english.png";
import grandmaChef from "../../images/chef_avatars/grandma.png";
import type { VoiceLocale } from '../../services/tts';

interface ChefAvatarProps {
  speaking: boolean;
  locale: VoiceLocale;
}

const chefImages: Record<VoiceLocale, string> = {
  "it-IT": italianChef,
  "zh-CN": chineseChef,
  "en-US": englishChef,
  "grandma": grandmaChef,
};

const ChefAvatar = ({ speaking, locale }: ChefAvatarProps) => {
  return (
    <Box
      sx={{
        position: 'relative',
        width: 140,
        height: 140,
        padding: 2,
        backgroundColor: 'white',
        borderRadius: '50%',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
      }}
    >
      <Box
        component={motion.div}
        animate={speaking ? {
          scale: [1, 1.05, 1],
          transition: {
            duration: 0.5,
            repeat: Infinity,
          }
        } : {}}
        sx={{
          width: '100%',
          height: '100%',
          borderRadius: '50%',
          overflow: 'hidden',
          border: '2px solid #FF6B35',
          position: 'relative',
        }}
      >
        <motion.img
          key={locale}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          src={chefImages[locale]}
          alt={`${locale.split('-')[0]} Chef`}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: 'block',
          }}
        />
      </Box>
    </Box>
  );
};

export default ChefAvatar; 