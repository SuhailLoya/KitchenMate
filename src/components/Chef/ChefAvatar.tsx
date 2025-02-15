import { Paper } from '@mui/material';
import ChefSvg from './ChefSvg';

interface ChefAvatarProps {
  speaking: boolean;
}

const ChefAvatar = ({ speaking }: ChefAvatarProps) => {
  return (
    <Paper
      elevation={3}
      sx={{
        width: 120,
        height: 120,
        borderRadius: '50%',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FFE5B4',
      }}
    >
      <ChefSvg speaking={speaking} />
    </Paper>
  );
};

export default ChefAvatar; 