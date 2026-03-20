import React, { useEffect, useRef, useState, useMemo } from "react";
import CandidateCard from "../components/CandidateCard";
import MuteButton from "../components/MuteButton";
import ExitWarningModal from "../components/ExitWarningModal";
import type { ChatMessage } from "../types/types";
import useAudioPlayback from "../hooks/useAudioPlayback";
import "../App.css";
import LanguageToggle from "../components/LanguageToggle";
import { useLanguage } from "../hooks/useLanguage";
import mockDebateDE from '../../debate_text/mockDebate.de.json';
import mockDebateEN from '../../debate_text/mockDebate.en.json';


// "Be an Active Part" - Role
interface ActiveArgumentsScreenProps {
  topicTitle: string;
  introTime: string;
  inputText: string;
  setInputText: (value: string) => void;
  onSend: () => void;
  onExit: () => void;
  hasStarted: boolean;
  onStart: () => void;
  setIsPaused?: (paused: boolean) => void;
}

const ActiveArgumentsIntro: React.FC<ActiveArgumentsScreenProps> = ({
  introTime,
  inputText,
  setInputText,
  onSend,
  onExit,
  hasStarted,
  onStart,
  setIsPaused
}) => {
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [showUrgentPrompt, setShowUrgentPrompt] = useState(false);
  const [hasUserSentOpinion] = useState(false);
  const [showMessageSent, setShowMessageSent] = useState<boolean>(false);
  const [showExitWarning, setShowExitWarning] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { t, language } = useLanguage();
  const [isSending, setIsSending] = useState(false);
  const [showTimeExpired, setShowTimeExpired] = useState(false);
  type Color = "yellow" | "gray" | "green" | "red" | "blue";
  type Bot = {
    color: Color;
    label: string;
    description: string;
    id: number;
    speaker: string;
  };
  type SpeakerKey = "A" | "B" | "C" | "D" | "E" | "SYSTEM";

  const TYPEWRITER_SPEED: Record<string, number> = {
    A: 400,
    B: 380,
    C: 380,
    D: 380,
    E: 380,
  };

  type DebateScriptItem = {
    id: number;
    speaker: SpeakerKey;
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
  
  // Chatbot speaking logic
  const [activeBot, setActiveBot] = useState(0);
  const [spokenBots, setSpokenBots] = useState<number[]>([]);
  const [allBotsFinished, setAllBotsFinished] = useState(false);
  const totalBots = 4;

  // Typewriter state
  const [isTyping, setIsTyping] = useState(false);
  const [currentTypingText, setCurrentTypingText] = useState<string | undefined>(undefined);
  const [completedTexts, setCompletedTexts] = useState<Record<number, string>>({});
  const typingIntervalRef = useRef<number | null>(null);
  const isPausedRef= useRef(false);
  const pausedWordCountRef = useRef(0);

  // Mock debate data
  const debateData = (language === "de" ? mockDebateDE : mockDebateEN) as DebateData;
  const speakerColors: Record<string, Color> = {
    A: "red",
    B: "yellow",
    C: "green",
    D: "gray",
    E: "blue",
  };

  const debateScript: DebateScriptItem[] = debateData["Arguments Intro"]
  ?? debateData.debate_script ?? [];

  const roles: Partial<Record<SpeakerKey, RoleData>> | undefined = debateData.roles;

  const order: Color[] = ["yellow", "gray", "red", "green"];
  
  const allBots: Bot[] = useMemo (()=> {
    return debateScript.map((msg) => {
      const color = speakerColors[msg.speaker];
      return {
        color,
        label: msg.text,
        description: roles?.[msg.speaker]?.description ?? "",
        id: msg.id,
        speaker: msg.speaker,
      };
    }).filter((bot) => bot.color !== "blue").sort((a, b) => order.indexOf(a.color) - order.indexOf(b.color));
  }, [debateScript, roles]);


  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatHistory]);

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (typingIntervalRef.current) {
        clearInterval(typingIntervalRef.current);
      }
      stopPlaying();
    };
  }, [stopPlaying]);

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
    setIsPaused?.(true);
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
    setIsPaused?.(false);
    isPausedRef.current = false;
    resumePlaying();
  };

  const typewriterEffect = (text: string, botIndex: number, onComplete: () => void) => {
    const words = text.split(" ");
    let wordCount = pausedWordCountRef.current || 0;
    pausedWordCountRef.current = 0;
    if (wordCount === 0){
      setCurrentTypingText("");}
    
    // Bot-Farbe ermitteln und Speech Synthesis mit spezifischer Stimme starten
    const bot = allBots[botIndex];
    play({ 
      section: 'arguments_intro',
      speaker: bot.speaker, 
      id: bot.id,
      lang: language });
    
    // Berechne Wort-Dauer basierend auf Sprechgeschwindigkeit
    
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
    }, TYPEWRITER_SPEED[bot.speaker] ?? 380);
  };

  const handleNextSpeaker = () => {
    if (!hasStarted) {
      if (!allBots.length) return;
      onStart();
      // Starte Typewriter für ersten Bot (activeBot ist bereits 0)
      setIsTyping(true);
      setTimeout(() => {
        setIsTyping(false);
        typewriterEffect(allBots[0].label, 0, () => {});
      }, 800);
      return;
    }

    // Wenn noch am Tippen, nicht fortfahren
    if (isTyping || currentTypingText !== undefined) return;
    
    // Prüfen ob aktueller Bot noch nicht gesprochen hat
    if (!spokenBots.includes(activeBot)) {
      // Aktueller Bot hat noch nicht gesprochen, starte ihn
      setIsTyping(true);
      setTimeout(() => {
        setIsTyping(false);
        typewriterEffect(allBots[activeBot].label, activeBot, () => {});
      }, 800);
      return;
    }
    
    if (activeBot < totalBots - 1) {
      const nextBot = activeBot + 1;
      setActiveBot(nextBot);
      
      // Starte Typewriter für nächsten Bot
      setIsTyping(true);
      setTimeout(() => {
        setIsTyping(false);
        typewriterEffect(allBots[nextBot].label, nextBot, () => {});
      }, 800);
    } else {
      // Alle Bots haben gesprochen - zeige UrgentPrompt
      setAllBotsFinished(true);
      setShowUrgentPrompt(true);
    }
  };

  const handleSendMessage = () => {
    if (!inputText.trim()) return;
    
    setIsSending(true);

    setChatHistory(prev => [...prev, {
      id: Date.now(),
      type: "user",
      text: inputText.trim(),
      isComplete: true
    }]);
    
    setInputText("");
    
    // Reset urgent prompt nach User-Input
    setShowUrgentPrompt(false);
    
    // Zeige "Nachricht gesendet" Feedback
    setShowMessageSent(true);
    
    // Scroll zur Nachricht
    setTimeout(() => {
      scrollToBottom();
    }, 100);
    
    // Spürbare Pause, dann weiter zum ActiveDebateScreen
    setTimeout(() => {
      setShowMessageSent(false);
      onSend(); // Geht weiter zum nächsten Screen
      setIsSending(false);
    }, 1600);
  };

  const getBotText = (seq: number): string | undefined => {
    if (activeBot === seq && currentTypingText !== undefined) {
      return currentTypingText;
    }
    return undefined;
  };

  const getBubbleLabel = (seq: number,): string => {
    if (completedTexts[seq]) {
      return completedTexts[seq];
    }
    return allBots[seq].description;
  };

  return (
    <div className="screen debate-screen">
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
            <button className="start-debate-btn" onClick={() => {setShowTimeExpired(false); handleNextSpeaker();}}>
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

      {/* Chat-History - chronologisch */}
      <section className="debate-arguments">
        {chatHistory.map((msg) => (
          <div 
            key={msg.id} 
            className={`argument-box ${msg.type === "bot" ? `argument-${msg.color}` : "argument-user"}`}
          >
            <span className={msg.type === "bot" ? "argument-label" : "argument-text"}>
              {msg.text}
            </span>
          </div>
        ))}
        
        <div ref={messagesEndRef} />
      </section>

      {/* All candidates stage */}
      <section className={`debate-stage ${allBotsFinished ? 'stage-minimized' : ''}`} style={{ paddingTop: "50px" }}>
        <div className="arguments-stage">
          {allBots.map((bot, i) => (
            <CandidateCard
              key={i}
              color={bot.color as "yellow" | "gray" | "red" | "green"}
              hasMic={hasStarted && !allBotsFinished && activeBot === i && currentTypingText !== undefined}
              showBubble={hasStarted && (activeBot === i || spokenBots.includes(i))}
              bubbleText={getBotText(i)}
              isTyping={hasStarted && isTyping && activeBot === i}
              bubbleLabel={getBubbleLabel(i)}
              isSpeaking={hasStarted && !allBotsFinished && activeBot === i && (isTyping || currentTypingText !== undefined)}
              isPaused={showExitWarning}
            />
          ))}
        </div>
      </section>

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
              <button className="start-debate-btn" onClick={handleNextSpeaker}>
                {t("startDebate")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Overlay für User Input Prompt wenn alle Bots fertig sind */}
      {allBotsFinished && showUrgentPrompt && !hasUserSentOpinion && (
        <div className="urgent-prompt-overlay"></div>
      )}

      {/* Footer: Next Speaker Button ODER User Input */}
      {!allBotsFinished ? (
        <footer className="footer-end-row">
          <button 
            className="con-primary-btn" 
            onClick={handleNextSpeaker}
            disabled={hasStarted && (isTyping || currentTypingText !== undefined)}
          >
            {!hasStarted ? t("startDebate") : activeBot < totalBots - 1 ? t("nextSpeaker") : t("continue")}
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
      ) : (
        <footer className="debate-input-footer active-input-footer">
          {/* Aufforderung zur Teilnahme */}
          <div className={`participation-prompt ${showUrgentPrompt ? "urgent" : ""}`}>
            {showUrgentPrompt ? (
              <span className="urgent-text">{t("urgentPrompt")}</span>
            ) : (
              <span className="prompt-text">{t("urgentPrompt")}</span>
            )}
          </div>
          
          <div className="active-input-row">
            <div className="user-mic-icon">🎙️</div>
            <input
              className="text-input active-text-input"
              placeholder={t("opinionPlaceholder")}
              value={inputText}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setInputText(e.target.value)
              }
              onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                if (e.key === "Enter" && !e.shiftKey && !isSending) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
            />
            <button 
              className={"send-btn active-send-btn" + (inputText.trim() && !isSending ? " active" : "")}
              onClick={() => {if (!isSending) handleSendMessage()}}
              disabled={!inputText.trim() || isSending}
            >
              {t("send")}
            </button>
          </div>
          {hasStarted && (isTyping || currentTypingText !== undefined) && (
            <button 
              className="skip-icon-btn" 
              onClick={handleSkip}
              title={t("skipSpeaker")}
            >
              ⏭
            </button>
          )}
          
        </footer>
      )}
    </div>
  );
};

export default ActiveArgumentsIntro;