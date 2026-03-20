import React, { useState, useEffect, useRef, useMemo } from "react";
import CandidateCard from "../components/CandidateCard";
import MuteButton from "../components/MuteButton";
import ExitWarningModal from "../components/ExitWarningModal";
import useAudioPlayback from "../hooks/useAudioPlayback";
import "../App.css";
import LanguageToggle from "../components/LanguageToggle";
import { useLanguage } from '../hooks/useLanguage';    
import mockDebateDE from '../../debate_text/mockDebate.de.json';
import mockDebateEN from '../../debate_text/mockDebate.en.json';


interface ArgumentsIntroProps {
  topicTitle: string;
  onContinue: () => void;
  onExit: () => void;
  introTime: string;
  totalBots: number;
  onFinalContinue: () => void;
  hasStarted: boolean;
  onStart: () => void;
  setIsPaused?: (paused: boolean) => void;
}

const ArgumentsIntro: React.FC<ArgumentsIntroProps> = ({
  onContinue,
  onExit,
  introTime,
  totalBots,
  onFinalContinue,
  hasStarted,
  onStart,
  setIsPaused,
}) => {
  const { t, language } = useLanguage();
  const [spokenBots, setSpokenBots] = useState<number[]>([]); 
  const [isTyping, setIsTyping] = useState(false);
  const [currentTypingText, setCurrentTypingText] = useState<string | undefined>(undefined);
  const [completedTexts, setCompletedTexts] = useState<Record<number, string>>({});
  const typingIntervalRef = useRef<number | null>(null);
  const isPausedRef = useRef(false);
  const pausedWordCountRef = useRef(0);
  const [showExitWarning, setShowExitWarning] = useState(false);
  const [activeBot, setActiveBot] = useState(0);
  const [showTimeExpired, setShowTimeExpired] = useState(false);
  type Color = "yellow" | "gray" | "blue" | "green" | "red" ;
  type Bot = {
    color: Color;
    label: string;
    description: string;
    id: number;
    speaker: string;
  };

  type Speaker = "A" | "B" | "C" | "D" | "E" | "SYSTEM";

    type DebateScriptItem = {
    id: number;
    speaker: Speaker;
    text: string;
  }

  type RoleData = {
    description: string;
  }

  type DebateData = {
    debate_script?: DebateScriptItem[];
    "Arguments Intro"?: DebateScriptItem[];
    roles?: Record<string, RoleData>;
  }

  // Timer abgelaufen Check
  useEffect(() => {
    if (introTime === "0:00" && hasStarted && !showTimeExpired) {
      setShowTimeExpired(true);
    }
  }, [introTime, hasStarted, showTimeExpired]);

  // Audio Playback
  const { isMuted, toggleMute, play, stopPlaying, pausePlaying, resumePlaying } = useAudioPlayback();

  // Skip function - überspringt nur den aktuellen Bot (stoppt Sprechen, zeigt vollen Text)
  const handleSkip = () => {
    if (typingIntervalRef.current) {
      clearInterval(typingIntervalRef.current);
      typingIntervalRef.current = null;
    }
    stopPlaying();
    
    // Zeige den vollständigen Text des aktuellen Bots an
    const currentBotText = allBots[activeBot].label;
    setCurrentTypingText(undefined);
    setCompletedTexts(prev => ({ ...prev, [activeBot]: currentBotText }));
    setSpokenBots(prev => prev.includes(activeBot) ? prev : [...prev, activeBot]);
    setIsTyping(false);
  };

  // Exit handlers
  const handleExitClick = () => {
    setShowExitWarning(true);
    setIsPaused(true);
    isPausedRef.current = true;
    pausePlaying();
  };

  const handleExitConfirm = () => {
    setShowExitWarning(false);
    isPausedRef.current = false;
    if (typingIntervalRef.current) {
      clearInterval(typingIntervalRef.current);
      typingIntervalRef.current = null;
    }
    stopPlaying();
    onExit();
  };

  const handleExitCancel = () => {
    setShowExitWarning(false);
    setIsPaused(false);
    isPausedRef.current = false;
    resumePlaying();
  };

  // Pro: B (yellow) = Solidarität & soziale Perspektive, D (gray) = Ökonomische Systemperspektive
  // Contra: A (red) = Kosten & Versicherer-Perspektive, C (green) = Medizinische Fachperspektive
  // Undecided: E (blue) = Betroffene Bevölkerung
  const debateData = (language === "de" ? mockDebateDE : mockDebateEN) as DebateData;
  const speakerColors: Record<string, Color> = {
    A: "red",
    B: "yellow",
    C: "green",
    D: "gray",
    E: "blue",
  };

   const debateScript: DebateScriptItem[]= debateData["Arguments Intro"]
  ?? debateData.debate_script ?? [];

  const roles = debateData.roles;

  const order: Color[] = ["yellow", "gray", "blue", "red", "green"];

  const allBots: Bot[] = useMemo (()=> {
    return debateScript.map((msg): Bot => {
      const color = speakerColors[msg.speaker];
      return {
        color,
        label: msg.text,
        description: (roles as Record <Speaker, RoleData> | undefined)?.[msg.speaker]?.description ?? "",
        id: msg.id,
        speaker: msg.speaker,
      };
    }).sort((a, b) => order.indexOf(a.color) - order.indexOf(b.color));
  }, [debateScript, roles]);

  const typewriterEffect = (text: string, botIndex: number, onComplete: () => void) => {
    const words = text.split(" ");
    let wordCount = pausedWordCountRef.current || 0;
    pausedWordCountRef.current = 0;

    if(wordCount === 0){
      setCurrentTypingText("");
    }
    
    // Bot-Farbe ermitteln und Audio Playback starten
    const bot = allBots[botIndex];
    play({ 
      section: 'arguments_intro',
      speaker: bot.speaker, 
      id: bot.id,
      lang: language 
    });
    
    typingIntervalRef.current = window.setInterval(() => {
      if (isPausedRef.current) {
        pausedWordCountRef.current = wordCount;
        return;
      }
      wordCount++;
      if (wordCount <= words.length) {
        setCurrentTypingText(words.slice(0, wordCount).join(" "));
      } else {
        if (typingIntervalRef.current) {
          clearInterval(typingIntervalRef.current);
          typingIntervalRef.current = null;
        }
        setCurrentTypingText(undefined);
        setCompletedTexts(prev => ({ ...prev, [botIndex]: text }));
        setSpokenBots(prev => [...prev, botIndex]);
        onComplete();
      }
    }, 380);
  };

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (typingIntervalRef.current) {
        clearInterval(typingIntervalRef.current);
      }
      stopPlaying();
    };
  }, [stopPlaying]);

  const handleNext = () => {
    if (!hasStarted) {
      if (!allBots.length) return;
      onStart();
      setActiveBot(0);
      // Starte Typewriter für ersten Bot
      setIsTyping(true);
      setTimeout(() => {
        setIsTyping(false);
        typewriterEffect(allBots[0].label, 0, () => {});
      }, 800);
      return;
    }

    // Wenn noch am Tippen, nicht fortfahren
    if (isTyping || currentTypingText !== undefined) return;
    
    if (activeBot < totalBots - 1) {
      const nextBot = activeBot + 1;
      setActiveBot(nextBot);
      onContinue();
      
      // Starte Typewriter für nächsten Bot
      setIsTyping(true);
      setTimeout(() => {
        setIsTyping(false);
        typewriterEffect(allBots[nextBot].label, nextBot, () => {});
      }, 800);
    } else {
      onFinalContinue();      
    }
  };

  const getBotText = (seq: number): string | undefined => {
    if (activeBot === seq && currentTypingText !== undefined) {
      return currentTypingText;
    }
    return undefined;
  };

  const getBubbleLabel = (seq: number): string => {
    if (completedTexts[seq]) {
      return completedTexts[seq];
    }
    return allBots[seq].description;
  };

  return (
    <div className="screen">
      <LanguageToggle />
      <ExitWarningModal 
        isOpen={showExitWarning} 
        onConfirm={handleExitConfirm} 
        onCancel={handleExitCancel} 
      />



      {/* Timer abgelaufen Popup */}
      {showTimeExpired && (
        <div className="start-debate-modal-overlay">
          <div className="start-debate-modal" style={{padding: 0, overflow: "hidden"}}>
            <div style={{
              background: "linear-gradient(135deg, #ede9fe 0%, #ddd6fe 100%)",
              borderRadius: "1.5rem 1.5rem 0 0",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px"
            }}>
              <div className="modal-icon">⏱️</div>
              <span style={{fontSize: "16px", fontWeight: "600", color: "#dc2626"}}>{t("timeExpired")}</span>
            </div>
            <div style={{padding: "0rem 1rem 1.5rem 1rem"}}>
              <div className="time-bar">
              <div className="time-bar-fill"></div>
              </div>
            <p style={{fontSize: "16px", marginBottom: "2px"}}>{t("timeExpiredContinue")}</p>
            <p style={{fontSize: "16px", marginTop: "0px"}}>{t("timeExpiredContinue2")}</p>
            <button className="start-debate-btn" onClick={() => {setShowTimeExpired(false); handleNext();}}>
              {t("continue")}
            </button>
          </div>
        </div>
        </div>
      )}
      <div className="top-exit-row">
        <span className="timer-display">{introTime}</span>
        <div className="top-buttons-row">
          <MuteButton isMuted={isMuted} onToggle={toggleMute} />
          <button className="exit-btn" onClick={handleExitClick}>
            {t("exit")}
          </button>
        </div>
      </div>


      <header className="screen-header">
        <p className="subtitleArgu">{t("eachSide")}</p>
      </header>

      <section className="screen-body" style={{
        borderRadius: "24px",
        paddingTop: "50px",
    background: `
      radial-gradient(
        circle at center,
        rgba(255,255,255,0.9) 0%,
        rgba(255,255,255,0.6) 30%,
        rgba(255,255,255,0.0) 60%
      ),
      linear-gradient(
        90deg,
        #eaf6f1 0%,
        #f7f9fc 50%,
        #e9f1fb 100%
      )
    `
  }}>
        <div className="arguments-stage">
          <div className="candidates-row-unified">
            {allBots.map((bot, i) => {
              return (
                <CandidateCard
                  key={i}
                  color={bot.color as "yellow" | "gray" | "blue" | "red" | "green"}
                  hasMic={hasStarted && activeBot === i && currentTypingText !== undefined}
                  showBubble={hasStarted && (activeBot === i || spokenBots.includes(i))}
                  bubbleText={getBotText(i)}
                  isTyping={hasStarted && isTyping && activeBot === i}
                  bubbleLabel={hasStarted ? getBubbleLabel(i) : ""}
                  isSpeaking={hasStarted && activeBot === i && (isTyping || currentTypingText !== undefined)}
                  isPaused={showExitWarning}
                />
              );
            })}
          </div>
        </div>
      </section>
            {/* Modal Overlay für Start Debate */}
      {!hasStarted && (
        <div className="start-debate-modal-overlay">
          <div className="start-debate-modal" style={{padding: 0, overflow: "hidden"}}>
            <div style={{
              background: "linear-gradient(135deg, #ede9fe 0%, #ddd6fe 100%)",
              padding: "1.25rem 1.5rem",
              borderRadius: "1.5rem 1.5rem 0 0",
              marginBottom: "0.5rem"
            }}>
              <p style={{fontSize: "20px", fontWeight: "600", margin: 0, color: "#5b21b6"}}>{t("popup1")}</p>
            </div>
            <div style={{padding: "0rem 0.5rem 1.5rem 0.5rem"}}>
              <p style={{fontSize: "18px", marginTop: "10px"}}>{t("popup2")}</p>
              <p style={{fontSize: "18px"}}>{t("popup3")}</p>
              <button className="start-debate-btn" onClick={handleNext}>
                {t("startDebate")}
              </button>
            </div>
          </div>
        </div>
      )}
      <footer className="action-row">
        <button 
          className="con-primary-btn" 
          onClick={handleNext}
          disabled={hasStarted && (isTyping || currentTypingText !== undefined)} 
          style={{marginTop: "15px"}}
        >
          {activeBot < totalBots - 1 ? t("nextSpeaker") : t("continue")}
        </button>
        {hasStarted ? (
          (isTyping || currentTypingText !== undefined) ? (
            <button 
              className="skip-icon-btn" 
              onClick={handleSkip}
              title={t("skipSpeaker")}
            >
              ⏭
            </button>
          ) : (
            <div className="skip-icon-placeholder"></div>
          )
        ) : null}
      </footer>
    </div>
  );
};

export default ArgumentsIntro;