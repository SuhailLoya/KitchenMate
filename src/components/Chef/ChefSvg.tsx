import { keyframes } from '@mui/system';

const mouthOpen = keyframes`
  0%, 100% { d: path("M 25 35 Q 30 40 35 35"); }
  50% { d: path("M 25 38 Q 30 45 35 38"); }
`;

interface ChefSvgProps {
  speaking: boolean;
}

const ChefSvg = ({ speaking }: ChefSvgProps) => {
  return (
    <svg width="100" height="100" viewBox="0 0 60 60">
      {/* Chef's hat */}
      <path
        d="M 10 25 C 10 15 50 15 50 25 L 50 30 L 10 30 Z"
        fill="white"
        stroke="#333"
        strokeWidth="1"
      />
      
      {/* Face */}
      <circle cx="30" cy="35" r="15" fill="#FFE0BD" />
      
      {/* Eyes */}
      <circle cx="25" cy="32" r="1.5" fill="#333" />
      <circle cx="35" cy="32" r="1.5" fill="#333" />
      
      {/* Mouth */}
      <path
        d="M 25 35 Q 30 40 35 35"
        fill="none"
        stroke="#333"
        strokeWidth="1.5"
        strokeLinecap="round"
        style={{
          animation: speaking ? `${mouthOpen} 0.3s ease-in-out infinite` : 'none'
        }}
      />
    </svg>
  );
};

export default ChefSvg; 