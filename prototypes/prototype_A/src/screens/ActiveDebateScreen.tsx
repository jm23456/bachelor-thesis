import React, { useEffect, useRef, useState, useMemo } from "react";
import CandidateCard from "../components/CandidateCard";
import MuteButton from "../components/MuteButton";
import ExitWarningModal from "../components/ExitWarningModal";
import useAudioPlayback from "../hooks/useAudioPlayback";
import type { ChatMessage } from "../types/types";
import "../App.css";
import LanguageToggle from "../components/LanguageToggle";
import { useLanguage } from '../hooks/useLanguage';
import mockDebateDE from '../../debate_text/mockDebate.de.json';
import mockDebateEN from '../../debate_text/mockDebate.en.json';


// "Be an Active Part" - Role
interface ActiveDebateScreenProps {
  topicTitle: string;
  timeLeft: string;
  inputText: string;
  setInputText: (value: string) => void;
  onSend: () => void;
  onExit: () => void;
  hasStarted: boolean;
  onStart: () => void;
  userIntroMessage?: string | null;
  setIsPaused: (paused: boolean) => void;
}

const ActiveDebateScreen: React.FC<ActiveDebateScreenProps> = ({
  timeLeft,
  inputText,
  setInputText,
  onSend,
  onExit,
  hasStarted,
  onStart,
  userIntroMessage,
  setIsPaused,
}) => {
  const [visibleBubbles, setVisibleBubbles] = useState(0);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [currentSpeaker, setCurrentSpeaker] = useState<Color>("yellow");
  const [currentTypingText, setCurrentTypingText] = useState<string | undefined>(undefined);
  const [hasUserSentOpinion, setHasUserSentOpinion] = useState(false);
  const [showExitWarning, setShowExitWarning] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const hasStartedRef = useRef(false);
  const typingIntervalRef = useRef<number | null>(null);
  const currentBubbleRef = useRef<{text: string, color: Color, side: "pro" | "contra" | "undecided"} | null>(null);
  const isPausedRef= useRef(false);
  const pausedWordCountRef = useRef(0);
  const textFinishedRef = useRef(false);
  const audioFinishedRef = useRef(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const { t, language } = useLanguage();
  const [showTimeExpired, setShowTimeExpired] = useState(false);
  const [showDebateFinished, setShowDebateFinished] = useState(false);

  type Color = "red" | "yellow" | "green" | "gray" | "blue";


    type SpeakerKey = "A" | "B" | "C" | "D" | "E" | "SYSTEM";

  // Typewriter-Geschwindigkeit pro Speaker (ms pro Wort)
  // Höherer Wert = langsamer
  const TYPEWRITER_SPEED: Record<string, number> = {
    A: 450,   // Rot - langsamer
    B: 380,   // Gelb - normal
    C: 380,   // Grün - normal
    D: 380,   // Grau - normal
    E: 380,   // Blau - normal
  };

  type DebateScriptItem = {
    id: number;
    speaker: SpeakerKey;
    text: string;
  }

  type RoleData = {
    label?: string;
    description?: string;
    orientation?: "pro" | "contra" | "undecided";
  }

  type DebateData = {
    debate_script?: DebateScriptItem[];
    "Arguments Intro"?: DebateScriptItem[];
    roles?: Record<string, RoleData>;
  }

  // Timer abgelaufen Check
  useEffect(() => {
    if (timeLeft === "0:00" && hasStarted && !showTimeExpired) {
      setShowTimeExpired(true);
    }
  }, [timeLeft, hasStarted, showTimeExpired]);

  // Audio Playback
  const { isMuted, toggleMute, play, stopPlaying, pausePlaying, resumePlaying } = useAudioPlayback();

  // Exit handlers
  const handleExitClick = () => {
    setShowExitWarning(true);
    setIsPaused(true);
    pausePlaying();
    // Pausiere auch den Typewriter-Effekt
    if (typingIntervalRef.current) {
      clearInterval(typingIntervalRef.current);
      typingIntervalRef.current = null;
    }
  };

  const handleExitConfirm = () => {
    setShowExitWarning(false);
    setIsPaused(false);
    stopPlaying();
    onExit();
  };

  const handleExitCancel = () => {
    setShowExitWarning(false);
    setIsPaused(false);
    resumePlaying();
    // Setze den Typewriter-Effekt fort, falls ein Text gerade angezeigt wurde
    if (currentBubbleRef.current && currentTypingText !== undefined) {
      const { text, color, side } = currentBubbleRef.current;
      const words = text.split(" ");
      const currentWordCount = currentTypingText ? currentTypingText.split(" ").length : 0;
      let wordCount = currentWordCount;
      
      typingIntervalRef.current = window.setInterval(() => {
        wordCount++;
        if (wordCount <= words.length) {
          setCurrentTypingText(words.slice(0, wordCount).join(" "));
        } else {
          if (typingIntervalRef.current) {
            clearInterval(typingIntervalRef.current);
            typingIntervalRef.current = null;
          }
          setCurrentTypingText(undefined);
          setIsSpeaking(false); 
          currentBubbleRef.current = null;
          setChatHistory(prev => [...prev, {
            id: Date.now(),
            type: "bot",
            color: color as Color,
            text: text,
            side: side as "pro" | "contra" | "undecided",
            isComplete: true
          }]);
          setVisibleBubbles(prev => prev + 1);
        }
      }, 380);
    }
  };

  // Skip function - überspringt nur den aktuellen Bot (stoppt Sprechen, zeigt vollen Text)
  const handleSkip = () => {
    if (typingIntervalRef.current) {
      clearInterval(typingIntervalRef.current);
      typingIntervalRef.current = null;
    }
    stopPlaying();
    setIsSpeaking(false);
    
    // Reset completion refs
    textFinishedRef.current = true;
    audioFinishedRef.current = true;
    
    // Zeige den vollständigen Text des aktuellen Bots an
    if (currentBubbleRef.current) {
      const { text, color, side } = currentBubbleRef.current;
      setCurrentTypingText(undefined);
      setChatHistory(prev => [...prev, {
        id: Date.now(),
        type: "bot",
        color: color,
        text: text,
        side: side,
        isComplete: true
      }]);
      setVisibleBubbles(prev => prev + 1);
      currentBubbleRef.current = null;
    }
  };

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (typingIntervalRef.current) {
        clearInterval(typingIntervalRef.current);
      }
      stopPlaying();
    };
  }, [stopPlaying, inputText]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Mock-Debatte: Krankenkassenprämien

  const debateData = (language === 'de' ? mockDebateDE : mockDebateEN) as DebateData;

  const speakerColors: Record<string, Color> = {
    A: "red",
    B: "yellow",
    C: "green",
    D: "gray",
    E: "blue",
  };

  const speakerToSide: Record < string, "pro" | "contra" | "undecided"> = {
    A: "contra",
    B: "pro",
    C: "contra",
    D: "pro",
    E: "undecided",
  };
  const debateScript = debateData.debate_script ?? [];
  const argumentsIntro = debateData["Arguments Intro"] ?? [];

    const argumentBubbles = useMemo(() => {
      return debateScript
        .filter((msg) => msg.speaker !== "E") // Filtere Speaker E (blau) heraus
        .map((msg) => ({
      color: speakerColors[msg.speaker as keyof typeof speakerColors],
      side: speakerToSide[msg.speaker as keyof typeof speakerToSide],
      text: msg.text,
      id: msg.id,
      speaker: msg.speaker,
    }));
  }, [debateScript]);

   // Check ob alle Argumente gesagt wurden
    useEffect(() => {
      if (
        hasStarted &&
        visibleBubbles >= argumentBubbles.length &&
        argumentBubbles.length > 0 &&
        !isTyping &&
        currentTypingText === undefined &&
        !showDebateFinished &&
        !showTimeExpired
      ) {
        setShowDebateFinished(true);
      }
    }, [visibleBubbles, argumentBubbles.length, hasStarted, isTyping, currentTypingText, showDebateFinished, showTimeExpired]);
  

  // Initiale Chat-History mit Arguments Intro Nachrichten
  // Reihenfolge: B, D, A, C (yellow, gray, red, green) - ohne E (blue)
  const speakerOrder: SpeakerKey[] = ["B", "D", "A", "C"];
  const initialChatHistory: ChatMessage[] = useMemo(() => {
    const sortedIntro = [...argumentsIntro]
      .filter((msg) => msg.speaker !== "E") // Filtere blauen Sprecher (E) heraus
      .sort((a, b) => {
      const indexA = speakerOrder.indexOf(a.speaker as SpeakerKey);
      const indexB = speakerOrder.indexOf(b.speaker as SpeakerKey);
      return indexA - indexB;
    });
    const messages: ChatMessage[] = sortedIntro.map((msg, index) => ({
      id: index + 1,
      type: "bot" as const,
      color: speakerColors[msg.speaker as keyof typeof speakerColors],
      text: msg.text,
      side: speakerToSide[msg.speaker as keyof typeof speakerToSide],
      isComplete: true,
      isIntro: true
    }));
    
    // Füge User-Nachricht vom Intro hinzu, falls vorhanden
    if (userIntroMessage) {
      messages.push({
        id: Date.now(),
        type: "user",
        text: userIntroMessage,
        isComplete: true,
        isIntro: true
      });
    }
    
    return messages;
  }, [argumentsIntro, userIntroMessage]);

  // Setze initiale chatHistory wenn noch leer
  useEffect(() => {
    if (chatHistory.length === 0 && initialChatHistory.length > 0) {
      setChatHistory(initialChatHistory);
    }
  }, [initialChatHistory]);



  const typewriterEffect = (text: string, color: Color, side: "pro" | "contra" | "undecided", speaker: string, audioId: number) => {
    const words = text.split(" ");
    let wordCount = pausedWordCountRef.current || 0;
    pausedWordCountRef.current = 0;
    
    // Reset completion tracking
    textFinishedRef.current = false;
    audioFinishedRef.current = false;
    
    // Speichere aktuelle Bubble-Daten für Skip
    currentBubbleRef.current = { text, color, side };
    
    // Funktion die aufgerufen wird, wenn Text ODER Audio fertig ist
    // Bubble wird erst entfernt wenn BEIDE fertig sind
    const checkBothFinished = () => {
      if (textFinishedRef.current && audioFinishedRef.current) {
        setCurrentTypingText(undefined);
        setIsSpeaking(false); 
        currentBubbleRef.current = null;
        setChatHistory(prev => [...prev, {
          id: Date.now(),
          type: "bot",
          color: color,
          text: text,
          side: side,
          isComplete: true
        }]);
        setVisibleBubbles(prev => prev + 1);
      }
    };
    
    if (wordCount === 0){
      setCurrentTypingText("");
    }
    
    // Starte Audio-Playback mit onEnded Callback
    setIsSpeaking(true);
    play({
      section: 'debate_script',
      speaker: speaker,
      id: audioId,
      lang: language,
      onEnded: () => {
        audioFinishedRef.current = true;
        checkBothFinished();
      }
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
        // Text ist fertig - markiere und prüfe ob Audio auch fertig ist
        textFinishedRef.current = true;
        checkBothFinished();
      }
    }, TYPEWRITER_SPEED[speaker] ?? 380);
  };

  // Starte automatisch die erste Nachricht beim Laden
  useEffect(() => {
    if (!hasStarted) return;
    if (!hasStartedRef.current) {
      hasStartedRef.current = true;
      if (!argumentBubbles.length) return;
        const firstBubble = argumentBubbles[0];
      setCurrentSpeaker(firstBubble.color);
      setIsTyping(true);
      
      setTimeout(() => {
        setIsTyping(false);
        typewriterEffect(firstBubble.text, firstBubble.color, firstBubble.side, firstBubble.speaker, firstBubble.id);
      }, 1500);
    }
    
    return () => {
      stopPlaying();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasStarted]);

  useEffect(() => {
    scrollToBottom();
  }, [chatHistory, isTyping]);

  const handleContinue = () => {
    if (!hasStarted) {
      onStart();
      return;
    }

    const isBusy = isTyping || currentTypingText !== undefined;

    if (visibleBubbles < argumentBubbles.length && !isBusy) {
      const nextBubble = argumentBubbles[visibleBubbles];
      setCurrentSpeaker(nextBubble.color);
      setIsTyping(true);
      
      setTimeout(() => {
        setIsTyping(false);
        typewriterEffect(nextBubble.text, nextBubble.color, nextBubble.side, nextBubble.speaker, nextBubble.id);
      }, 1500);
    } else if (visibleBubbles >= argumentBubbles.length && !isBusy) {
      onExit();
    }
  };

  const handleTimeExpiredContinue = () => {
    if (typingIntervalRef.current) {
      clearInterval(typingIntervalRef.current);
      typingIntervalRef.current = null;
    }
    stopPlaying();
    setIsSpeaking(false);
    setIsTyping(false);
    setCurrentTypingText(undefined);
    currentBubbleRef.current = null;
    onExit();
  }

  const handleSendMessage = () => {
    if (!inputText.trim()) return;
    
    setChatHistory(prev => [...prev, {
      id: Date.now(),
      type: "user",
      text: inputText.trim(),
      isComplete: true
    }]);

    setInputText("");
    setHasUserSentOpinion(true);
    
    onSend();
  };

  return (
    <div className="screen active-debate-screen">
      <LanguageToggle />
      <ExitWarningModal 
        isOpen={showExitWarning} 
        onConfirm={handleExitConfirm} 
        onCancel={handleExitCancel} 
      />
      {/* Timer abgelaufen Popup */}
      {showTimeExpired && (
        <div className="start-debate-modal-overlay">
          <div className="start-debate-modal"style={{padding: 0, overflow: "hidden"}}>
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
            <p style={{fontSize: "18px"}}>{t("timeExpiredFinish")}</p>
            <button className="start-debate-btn" onClick={() => {setShowTimeExpired(false); handleTimeExpiredContinue();}}>
              {t("continue")}
            </button>
          </div>
        </div>
        </div>
      )}
      {/* Debatte beendet Popup */}
      {showDebateFinished && (
        <div className="start-debate-modal-overlay">
          <div className="start-debate-modal" style={{padding: 0, overflow: "hidden"}}>
             <div style={{
              background: "linear-gradient(135deg, #ede9fe 0%, #ddd6fe 100%)",
              padding: "1.25rem 1.5rem",
              borderRadius: "1.5rem 1.5rem 0 0",
              marginBottom: "0.5rem"
            }}>
            <p style={{fontSize: "20px", fontWeight: "600", margin: 0, color: "#5b21b6"}}>{t("debateFinishedTitle")}</p>
            </div>
            <div style={{padding: "0rem 0.5rem 1.5rem 0.5rem"}}>
            <p style={{fontSize: "16px"}}>{t("debateFinishedText")}</p>
            <button className="start-debate-btn" onClick={() => {setShowDebateFinished(false); onExit();}}>
              {t("continue")}
            </button>
          </div>
        </div>
        </div>
      )}
      <div className="top-exit-row" style={{marginBottom: "0px"}}>
        <span className="timer-display">{timeLeft}</span>
        <div className="top-buttons-row">
          <MuteButton isMuted={isMuted} onToggle={toggleMute} />
          <button className="exit-btn" onClick={handleExitClick}>
            {t("exit")}
          </button>
        </div>
      </div>

      <header className="screen-header" style={{marginBottom: "10px", marginTop: "0px"}}>
        <p className="subtitle" style={{marginTop: "0px"}}>{t("healthInsurance")}</p>
      </header>

      {/* Chat-History - chronologisch */}
      <section className="debate-arguments">
        {chatHistory.map((msg) => (
          <div 
            key={msg.id} 
            className={`argument-box ${msg.type === "bot" ? `argument-${msg.color}` : "argument-user"}${msg.isIntro ? " argument-intro" : ""}`}
          >
            {msg.isIntro && <span className="intro-label">{msg.type === "user" ? "Du" : "Intro"}</span>}
            <span className={msg.type === "bot" ? "argument-label" : "argument-text"}>
              {msg.text}
            </span>
            {msg.type === "bot" && (
              <button 
                className="report-btn" 
                title="Diese Aussage als möglicherweise falsch oder irreführend melden"
                onClick={() => alert(`Nachricht gemeldet `)}
              >
                ⚠️
              </button>
            )}
          </div>
        ))}
        
        <div ref={messagesEndRef} />
      </section>

      {/* Pro vs Contra stage */}
      <section className="active-debate-stage" style={{
        borderRadius: "24px",
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
        <div className="arguments-stage" style={{paddingTop: "0px", height:"450px"}}>
          <CandidateCard 
            color="yellow" 
            hasMic={hasStarted && currentSpeaker === "yellow" && (isTyping || isSpeaking) && visibleBubbles < argumentBubbles.length}
            isTyping={hasStarted && isTyping && currentSpeaker === "yellow"}
            bubbleText={hasStarted && currentSpeaker === "yellow" ? currentTypingText : undefined}
            isSpeaking={hasStarted && currentSpeaker === "yellow" && isSpeaking && visibleBubbles < argumentBubbles.length}
            isPaused={showExitWarning}
            bubbleLabel="• Prämien sind für viele Familien kaum mehr tragbar.
• Lösung liegt in Solidarität, gezielter Entlastung und fairer Verteilung von Kosten.
• Nicht im Abbau von Leistungen."
          />
          <CandidateCard 
            color="gray" 
            hasMic={hasStarted && currentSpeaker === "gray" && (isTyping || isSpeaking) && visibleBubbles < argumentBubbles.length}
            isTyping={hasStarted && isTyping && currentSpeaker === "gray"}
            bubbleText={hasStarted && currentSpeaker === "gray" ? currentTypingText : undefined}
            isSpeaking={hasStarted && currentSpeaker === "gray" && isSpeaking && visibleBubbles < argumentBubbles.length}
            isPaused={showExitWarning}
            bubbleLabel="• Keine aussergewöhnlich hohen Gesundheitskosten.
• Es braucht kein pauschales Sparen, sondern gezielte Eingriffe bei Überversorgungen und Ineffizienzen."
          />
          <CandidateCard 
            color="red" 
            hasMic={currentSpeaker === "red" && (isTyping || isSpeaking) && visibleBubbles < argumentBubbles.length}
            isTyping={isTyping && currentSpeaker === "red"}
            bubbleText={currentSpeaker === "red" ? currentTypingText : undefined}
            isSpeaking={hasStarted && currentSpeaker === "red" && isSpeaking && visibleBubbles < argumentBubbles.length}
            isPaused={showExitWarning}
            bubbleLabel="• Steigende Prämien sind Folge von explodierenden Kosten durch immer mehr Behandlungen.
• Es braucht Steuerungsmöglichkeiten für Krankenkassen.
• Ziel: Prämien senken durch Kostenkontrolle."
          />
          <CandidateCard 
            color="green" 
            hasMic={currentSpeaker === "green" && (isTyping || isSpeaking) && visibleBubbles < argumentBubbles.length}
            isTyping={isTyping && currentSpeaker === "green"}
            bubbleText={currentSpeaker === "green" ? currentTypingText : undefined}
            isSpeaking={hasStarted && currentSpeaker === "green" && isSpeaking && visibleBubbles < argumentBubbles.length}
            isPaused={showExitWarning}
            bubbleLabel="• Das System ist widersprüchlich: Hervorragende Medizin, aber oft zu viel davon.
• Es gibt unnötige Untersuchungen und Eingriffe, die weder Patienten noch dem System nützen."
          />
        </div>
      </section>

      {/* Modal Overlay für Start Debate nach User-Input */}
      {!hasStarted && (
        <div className="start-debate-modal-overlay">
          <div className="start-debate-modal" style={{padding: 0, overflow: "hidden"}}>
            <div style={{
              background: "linear-gradient(135deg, #ede9fe 0%, #ddd6fe 100%)",
              padding: "1.25rem 1.5rem",
              borderRadius: "1.5rem 1.5rem 0 0",
              marginBottom: "0.5rem"
            }}>
            <p style={{fontSize: "20px", fontWeight: "600", margin: 0, color: "#5b21b6"}}>{t("readyText1")}</p>
            </div>
            <div style={{padding: "0rem 0.5rem 1rem 0.5rem"}}>
            <h2 className="modal-title" style={{fontSize: "22px", marginTop: "5px"}}>{t("ready")}</h2>
            <p className="modal-text" style={{fontSize: "16px", marginBottom: "2px"}}>{t("readyText2")}</p>
            <p className="modal-text" style={{fontSize: "16px", marginTop: "0px"}}>{t("readyText3")}</p>
            <button className="start-debate-btn" onClick={handleContinue}>
              {t("startDebate")}
            </button>
          </div>
        </div>
        </div>
      )}

      {/* Zeige normalen Button nur wenn Modal nicht sichtbar ist */}
        {(hasStarted || !hasUserSentOpinion) && (
          <div className="footer-end-row" style={{marginTop: "5px", marginBottom:"0px"}}>
            <button 
              className="con-primary-btn" 
              onClick={handleContinue}
              disabled={hasStarted && (isTyping || currentTypingText !== undefined)}
            >
              {!hasStarted ? t("startDebate") : visibleBubbles < argumentBubbles.length ? t("next") : t("continue")}
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
          </div>
        )}

      {/* Prominenter User Input Bereich */}
      <footer className="debate-input-footer active-input-footer" style={{marginTop:"0px"}}>
        {/* Aufforderung zur Teilnahme */}
        <div className="participation-prompt">
          <span className="prompt-text">{t('activeInput')}</span>
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
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
          />
          <button 
            className={"send-btn active-send-btn" + (inputText.trim() ? " active" : "")}
            onClick={handleSendMessage}
            disabled={!inputText.trim()}
          >
            {t("send")}
          </button>
        </div>
      </footer>
    </div>
  );
};

export default ActiveDebateScreen;