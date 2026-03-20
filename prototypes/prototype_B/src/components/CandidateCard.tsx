import React, { useState, useRef, useEffect } from "react";
import yellowVideo from "../avatars/yellow.mp4";
import redVideo from "../avatars/red.mp4";
import greenVideo from "../avatars/green.mp4";
import greyVideo from "../avatars/grey.mp4";
import blueVideo from "../avatars/blue.mp4";
import yellowStandard from "../avatars/yellow_standard.jpg";
import redStandard from "../avatars/red_standard.jpg";
import greenStandard from "../avatars/green_standard.jpg";
import greyStandard from "../avatars/grey_standard.jpg";
import blueStandard from "../avatars/blue_standard.jpg";

interface CandidateCardProps {
  color: "yellow" | "gray" | "green" | "red" | "blue";
  hasMic?: boolean;
  showBubble?: boolean;
  bubbleText?: string;
  isTyping?: boolean;
  bubbleLabel?: string;
  isSpeaking?: boolean;
  isPaused?: boolean;
}


const CandidateCard: React.FC<CandidateCardProps> = ({ color, hasMic = false, showBubble = false, bubbleText, isTyping = false, bubbleLabel = "Introduction", isSpeaking = false, isPaused = false }) => {
  const [hovered, setHovered] = useState(false);
  const bubbleRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const bubbleVisible = showBubble || hovered || bubbleText !== undefined || isTyping;
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  
  // Video abspielen/stoppen wenn isSpeaking oder isPaused sich ändert
  useEffect(() => {
    if (!videoRef.current) return;

    if (isSpeaking && hasMic && !isPaused) {
      videoRef.current.currentTime = 0;
        videoRef.current.play();
      } else {
        videoRef.current.pause();
        videoRef.current.currentTime = 0;
        if (!isPaused) {
          videoRef.current.currentTime = 0;
        }
      }
  }, [isSpeaking, hasMic, isPaused]);
  
  // Auto-scroll nach unten wenn Text sich ändert
  useEffect(() => {
    if (bubbleRef.current && bubbleText !== undefined) {
      bubbleRef.current.scrollTop = bubbleRef.current.scrollHeight;
    }
  }, [bubbleText]);

  const getAvatarAsset = () => {
    switch (color) {
      case "yellow":
        return { video: yellowVideo, image: yellowStandard };
      case "red":
        return { video: redVideo, image: redStandard };
      case "green":
        return { video: greenVideo, image: greenStandard };
      case "gray": 
        return { video: greyVideo, image: greyStandard };
      case "blue":
        return { video: blueVideo, image: blueStandard };
    }
  }
    const {video, image} = getAvatarAsset();
  
  return (
    <div className={`candidate-card candidate-${color}${isSpeaking ? " speaking" : ""}`}
    onMouseEnter={() => setHovered(true)}
    onMouseLeave={() => setHovered(false)}
    >
      {bubbleVisible && (
        <div className="candidate-speech-bubble" ref={bubbleRef} style={{ whiteSpace: 'pre-line' }}>
          {isTyping ? (
            <span className="typing-dots">
              <span className="dot"></span>
              <span className="dot"></span>
              <span className="dot"></span>
            </span>
          ) : bubbleText !== undefined ? (
            <span>{bubbleText}{!isPaused && <span className="cursor">|</span>}</span>
          ) : (
            <span>{bubbleLabel}</span>
          )}
        </div>
      )}
      <div className={`candidate-robot ${hasMic ? "has-mic" : ""}`}>
          <video
            ref={videoRef}
            src={color === "yellow" ? yellowVideo : color === "red" ? redVideo : color === "green" ? greenVideo : color === "blue" ? blueVideo : greyVideo}
            className={`robot-video ${isVideoPlaying ? "visible" : "hidden"}`}
            loop
            muted
            playsInline
            onPlay={() => setIsVideoPlaying(true)}
            onPause={() => setIsVideoPlaying(false)}
            onEnded={() => setIsVideoPlaying(false)}
          />
        
        {!isVideoPlaying && (
          <img src={image} 
          alt={`${color} robot`} 
          className="robot-image" 
          />
        )}

        {hasMic && <span className="mic-icon">🎙️</span>}
      </div>
      <div className="candidate-podium">
        <div className="podium-modern">
          <div className="podium-modern-top"></div>
          <div className="podium-modern-stand"></div>
          <div className="podium-modern-base"></div>
        </div>
      </div>
    </div>
  );
};

export default CandidateCard;