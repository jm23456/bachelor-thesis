import React from 'react';

interface MuteButtonProps {
  isMuted: boolean;
  onToggle: () => void;
}

const MuteButton: React.FC<MuteButtonProps> = ({ isMuted, onToggle }) => {
  return (
    <button 
      className="mute-btn"
      onClick={onToggle}
      title={isMuted ? "Ton einschalten" : "Ton ausschalten"}
    >
      {isMuted ? '🔇' : '🔊'}
    </button>
  );
};

export default MuteButton;
