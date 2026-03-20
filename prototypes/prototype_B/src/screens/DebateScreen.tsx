import React, { useEffect, useRef, useState, useMemo } from "react";
import CandidateCard from "../components/CandidateCard";
import MuteButton from "../components/MuteButton";
import ExitWarningModal from "../components/ExitWarningModal";
import useAudioPlayback from "../hooks/useAudioPlayback";
import type { Role, DebateMessage, ChatMessage } from "../types/types";
import "../App.css";
import LanguageToggle from '../components/LanguageToggle';
import { useLanguage } from '../hooks/useLanguage';
import mockDebateDE from '../../debate_text/mockDebate.de.json';
import mockDebateEN from '../../debate_text/mockDebate.en.json';

interface DebateScreenProps {
  topicTitle: string;
  role: Role;
  messages: DebateMessage[];
  timeLeft: string;
  inputText: string;
  setInputText: (value: string) => void;
  onSend: () => void;
  onExit: () => void;
  hasStarted: boolean;
  onStart: () => void;
  setIsPaused: (value: boolean) => void;
}

const DebateScreen: React.FC<DebateScreenProps> = ({
  topicTitle,
  timeLeft,
  inputText,
  setInputText,
  onSend,
  onExit,
  hasStarted,
  onStart,
  setIsPaused
}) => {
  type Color = "red" | "yellow" | "green" | "gray" | "blue";
  const { t, language } = useLanguage();
  const [visibleBubbles, setVisibleBubbles] = useState(0);
  const [isTyping, setIsTyping] = useState(false);
  const [currentSpeaker, setCurrentSpeaker] = useState<Color>("yellow");
  const [currentTypingText, setCurrentTypingText] = useState<string | undefined>(undefined);
  const [showExitWarning, setShowExitWarning] = useState(false);
  const hasStartedRef = useRef(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingIntervalRef = useRef<number | null>(null);
  const currentBubbleRef = useRef<{text: string, color: Color, side: "pro" | "contra" | "undecided"} | null>(null);
  const isPausedRef = useRef(false);
  const pausedWordCountRef = useRef(0);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [showTimeExpired, setShowTimeExpired] = useState(false);
  const [showDebateFinished, setShowDebateFinished] = useState(false);
  const [showUrgentPrompt, setShowUrgentPrompt] = useState(false);
  const [isInitialPrompt, setIsInitialPrompt] = useState(true);
  const messagesSinceUserInput = useRef(0);

  type SpeakerKey = "A" | "B" | "C" | "D" | "E" | "SYSTEM";

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
    setIsSpeaking(false);
    setIsTyping(false);
    setCurrentTypingText(undefined);
    currentBubbleRef.current = null;
    onExit();
  };

  const handleExitCancel = () => {
    setShowExitWarning(false);
    setIsPaused(false);
    isPausedRef.current = false;
    resumePlaying();
  };

  // Skip function - überspringt nur den aktuellen Bot (stoppt Sprechen, zeigt vollen Text)
  const handleSkip = () => {
    if (typingIntervalRef.current) {
      clearInterval(typingIntervalRef.current);
      typingIntervalRef.current = null;
    }
    stopPlaying();
    setIsSpeaking(false);
    
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
      
      // Zähle auch für den urgent prompt
      messagesSinceUserInput.current += 1;
      if (messagesSinceUserInput.current >= 4) {
        setShowUrgentPrompt(true);
      }
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
  }, [stopPlaying]);

  // Auto-scroll zur neuesten Nachricht
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
    return debateScript.map((msg) => ({
    color: speakerColors[msg.speaker as keyof typeof speakerColors],
    side: speakerToSide[msg.speaker as keyof typeof speakerToSide],
    text: msg.text,
    speaker: msg.speaker,
    id: msg.id,
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
  // Reihenfolge: B, D, C, A, E (yellow, gray, blue, red, green)
  const speakerOrder: SpeakerKey[] = ["B", "D", "E", "A", "C"];
  const initialChatHistory: ChatMessage[] = useMemo(() => {
    const sortedIntro = [...argumentsIntro].sort((a, b) => {
      const indexA = speakerOrder.indexOf(a.speaker as SpeakerKey);
      const indexB = speakerOrder.indexOf(b.speaker as SpeakerKey);
      return indexA - indexB;
    });
    return sortedIntro.map((msg, index) => ({
      id: index + 1,
      type: "bot" as const,
      color: speakerColors[msg.speaker as keyof typeof speakerColors],
      text: msg.text,
      side: speakerToSide[msg.speaker as keyof typeof speakerToSide],
      isComplete: true,
      isIntro: true
    }));
  }, [argumentsIntro]);

  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);

  // Setze initiale chatHistory wenn noch leer
  useEffect(() => {
    if (chatHistory.length === 0 && initialChatHistory.length > 0) {
      setChatHistory(initialChatHistory);
    }
  }, [initialChatHistory]);

  // Typewriter-Effekt: Text Wort für Wort in der Chatbot-Bubble aufbauen
  const typewriterEffect = (text: string, color: Color, side: "pro" | "contra" | "undecided", speaker: string, id: number) => {
    const words = text.split(" ");
    let wordCount = pausedWordCountRef.current || 0;
    pausedWordCountRef.current = 0;
    
    // Speichere aktuelle Bubble-Daten für Skip
    currentBubbleRef.current = { text, color, side };
    
    // Start mit leerem Text in der Bubble
    if (wordCount === 0){
      setCurrentTypingText("");}
    
    // Starte Audio Playback
    setIsSpeaking(true);
    play({ 
      section: 'debate_script',
      speaker, 
      id,
      lang: language 
    });
    
    
    typingIntervalRef.current = window.setInterval(() => {
      if (isPausedRef.current) {  
        pausedWordCountRef.current = wordCount;
        return;
      }
      wordCount++;
      
      if (wordCount <= words.length) {
        // Text aus den ersten wordCount Wörtern
        const newText = words.slice(0, wordCount).join(" ");
        setCurrentTypingText(newText);
      } else {
        if (typingIntervalRef.current) {
          clearInterval(typingIntervalRef.current);
          typingIntervalRef.current = null;
        }
        // Fertig! Füge zur Chat-History hinzu und lösche Bubble-Text
        setCurrentTypingText(undefined);
        currentBubbleRef.current = null;
        setIsSpeaking(false);
        setChatHistory(prev => [...prev, {
          id: Date.now(),
          type: "bot",
          color: color,
          text: text,
          side: side,
          isComplete: true
        }]);
        setVisibleBubbles(prev => prev + 1);
        
        // Zähle Nachrichten seit letztem User-Input für urgent prompt
        messagesSinceUserInput.current += 1;
        if (messagesSinceUserInput.current >= 4) {
          setShowUrgentPrompt(true);
        }
      }
    }, 380);
  };

  // Starte automatisch die erste Nachricht beim Laden - aber nur wenn kein initialer Prompt aktiv ist
  useEffect(() => {
    if(!hasStarted) return;
    if (!hasStartedRef.current) {
      hasStartedRef.current = true;
      // Nicht automatisch starten wenn initialer Prompt noch aktiv ist
      if (isInitialPrompt) return;
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

  // Zeige den initialen Prompt wenn die Debatte startet
  useEffect(() => {
    if (hasStarted && isInitialPrompt && !showUrgentPrompt) {
      setShowUrgentPrompt(true);
    }
  }, [hasStarted, isInitialPrompt, showUrgentPrompt]);

  // Auto-scroll wenn sich chatHistory oder isTyping ändert
  useEffect(() => {
    scrollToBottom();
  }, [chatHistory, isTyping]);

    const handleContinue = () => {
    if (!hasStarted) {
      onStart();
      // showUrgentPrompt wird durch useEffect gesetzt wenn hasStarted true wird
      return;
    }
    
    // Reset urgent prompt wenn User auf Continue klickt
    if (showUrgentPrompt) {
      const wasInitialPrompt = isInitialPrompt;
      setShowUrgentPrompt(false);
      setIsInitialPrompt(false);
      messagesSinceUserInput.current = 0;
      
      // Wenn es der initiale Prompt war, starte den ersten Chatbot
      if (wasInitialPrompt && visibleBubbles === 0) {
        const firstBubble = argumentBubbles[0];
        if (firstBubble) {
          setCurrentSpeaker(firstBubble.color);
          setIsTyping(true);
          
          setTimeout(() => {
            setIsTyping(false);
            typewriterEffect(firstBubble.text, firstBubble.color, firstBubble.side, firstBubble.speaker, firstBubble.id);
          }, 1500);
        }
        return;
      }
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
  }


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
  // User-Nachricht senden und in Chat-History einfügen
  const handleSendMessage = () => {
    if (!inputText.trim()) return;
    
    const wasInitialPrompt = isInitialPrompt;
    
    setChatHistory(prev => [...prev, {
      id: Date.now(),
      type: "user",
      text: inputText.trim(),
      isComplete: true
    }]);
    
    // Reset urgent prompt nach User-Input
    setShowUrgentPrompt(false);
    setIsInitialPrompt(false);
    messagesSinceUserInput.current = 0;
    
    onSend();
    
    // Wenn es der initiale Prompt war und Debatte gestartet, starte den ersten Chatbot
    if (wasInitialPrompt && hasStarted && visibleBubbles === 0) {
      setTimeout(() => {
        const firstBubble = argumentBubbles[0];
        if (firstBubble) {
          setCurrentSpeaker(firstBubble.color);
          setIsTyping(true);
          
          setTimeout(() => {
            setIsTyping(false);
            typewriterEffect(firstBubble.text, firstBubble.color, firstBubble.side, firstBubble.speaker, firstBubble.id);
          }, 1500);
        }
      }, 500);
    }
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
            {msg.isIntro && <span className="intro-label">Intro</span>}
            <span className={msg.type === "bot" ? "argument-label" : "argument-text"}>
              {msg.text}
            </span>
            {msg.type === "bot" && (
              <button 
                className="report-btn" 
                title={t("flag")}
                onClick={() => alert(`Nachricht gemeldet`)}
              >
                ⚠️
              </button>
            )}
          </div>
        ))}
        
        {/* Auto-scroll Anker */}
        <div ref={messagesEndRef} />
      </section>

      {/* Pro vs Contra stage */}
      <section className="debate-stage" style={{
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
        <div className="arguments-stage" style={{gap: "100px"}}>
          <CandidateCard 
            color="yellow" 
            hasMic={hasStarted && currentSpeaker === "yellow" && (isTyping || isSpeaking) && visibleBubbles < argumentBubbles.length}
            isTyping={hasStarted && isTyping && currentSpeaker === "yellow"}
            bubbleText={hasStarted && currentSpeaker === "yellow" ? currentTypingText : undefined}
            isSpeaking={hasStarted && currentSpeaker === "yellow" && isSpeaking && visibleBubbles < argumentBubbles.length}
            isPaused={showExitWarning}
            bubbleLabel="• Prämien sind für Viele kaum mehr tragbar.
• Lösung liegt in Solidarität, gezielter Entlastung und fairer Verteilung von Kosten.
• Nicht im Abbau von Leistungen."
          />
          <CandidateCard 
            color="gray" 
            hasMic={hasStarted && currentSpeaker === "gray" && (isTyping || isSpeaking)&& visibleBubbles < argumentBubbles.length}
            isTyping={hasStarted && isTyping && currentSpeaker === "gray"}
            bubbleText={hasStarted && currentSpeaker === "gray" ? currentTypingText : undefined}
            isSpeaking={hasStarted && currentSpeaker === "gray" && isSpeaking && visibleBubbles < argumentBubbles.length}
            isPaused={showExitWarning}
            bubbleLabel="• Keine aussergewöhnlich hohen Gesundheitskosten.
                          • Es braucht kein pauschales Sparen, sondern gezielte Eingriffe bei Überversorgungen und Ineffizienzen."
          />
          <CandidateCard 
            color="blue" 
            hasMic={hasStarted && currentSpeaker === "blue" && (isTyping || isSpeaking) && visibleBubbles < argumentBubbles.length}
            isTyping={hasStarted && isTyping && currentSpeaker === "blue"}
            bubbleText={hasStarted && currentSpeaker === "blue" ? currentTypingText : undefined}
            isSpeaking={hasStarted && currentSpeaker === "blue" && isSpeaking && visibleBubbles < argumentBubbles.length}
            isPaused={showExitWarning}
            bubbleLabel="• Prämien steigen stärker als Löhne.
• Gefühl von Ineffizienz und unklarer Verantwortung.
• Erwartung: Nachvollziehbarer Umgang mit Beiträgen."
          />
          <CandidateCard 
            color="red" 
            hasMic={hasStarted && currentSpeaker === "red" && (isTyping || isSpeaking) && visibleBubbles < argumentBubbles.length}
            isTyping={hasStarted && isTyping && currentSpeaker === "red"}
            bubbleText={hasStarted && currentSpeaker === "red" ? currentTypingText : undefined}
            isSpeaking={hasStarted && currentSpeaker === "red" && isSpeaking && visibleBubbles < argumentBubbles.length}
            isPaused={showExitWarning}
            bubbleLabel="• Steigende Prämien sind Folge von explodierenden Kosten durch immer mehr Behandlungen.
• Es braucht Steuerungsmöglichkeiten für Krankenkassen.
• Ziel: Prämien senken durch Kostenkontrolle."
          />
          <CandidateCard 
            color="green" 
            hasMic={hasStarted && currentSpeaker === "green" && (isTyping || isSpeaking) && visibleBubbles < argumentBubbles.length}
            isTyping={hasStarted && isTyping && currentSpeaker === "green"}
            bubbleText={hasStarted && currentSpeaker === "green" ? currentTypingText : undefined}
            isSpeaking={hasStarted && currentSpeaker === "green" && isSpeaking && visibleBubbles < argumentBubbles.length}
            isPaused={showExitWarning}
            bubbleLabel="• Das System ist widersprüchlich: Hervorragende Medizin, aber oft zu viel davon.
• Es gibt unnötige Untersuchungen und Eingriffe, die weder Patienten noch dem System nützen."
          />
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
            <p style={{fontSize: "20px", fontWeight: "600", margin: 0, color: "#5b21b6"}}>{t("readyText1")}</p>
            </div>
            <div style={{padding: "0rem 0.5rem 1rem 0.5rem"}}>
            <h2 className="modal-title" style={{fontSize: "22px", marginTop: "5px"}}>{t("ready")}</h2>
            <p className="modal-text" style={{fontSize: "16px", marginBottom: "2px"}}>{t("readyText")}</p>
            <p className="modal-text" style={{fontSize: "16px", marginTop: "0px"}}>{t("readyText4")}</p>
            <button className="start-debate-btn" onClick={onStart}>
              {t("startDebate")}
            </button>
          </div>
        </div>
        </div>
      )}

      {/* Leichtes Overlay für "It's your turn" urgent prompt */}
      {showUrgentPrompt && (
        <div className="urgent-prompt-overlay-light"></div>
      )}

      {/* Input area */}
      <footer className="debate-input-footer" style={{marginTop: "10px"}}>
        {/* Urgent Prompt - nur wenn aktiv */}
        {showUrgentPrompt && (
          <div className="participation-prompt urgent">
            <span className="urgent-text">{isInitialPrompt ? t("initialPrompt") : t("urgentPrompt")}</span>
          </div>
        )}
        <div className="custom-topic-row" style={{marginTop: "10px"}}>
          <input
            className="text-input flex-1"
            placeholder={t("inputPlaceholder")}
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
            className={"send-btn" + (inputText.trim() ? " active" : "")}
            onClick={handleSendMessage}
            disabled={!inputText.trim()}
          >
            {t("send")}
          </button>
        </div>
        {hasStarted && (
          <div className="action-row">
            <button 
              className="con-primary-btn" 
              onClick={handleContinue}
              disabled={isTyping || currentTypingText !== undefined}
            >
              {visibleBubbles < argumentBubbles.length ? t("continue") : t("finishDebate")}
            </button>
            {(isTyping || currentTypingText !== undefined) ? (
              <button 
                className="skip-icon-btn" 
                onClick={handleSkip}
                title={t("skipSpeaker")}
              >
                ⏭
              </button> 
            ) : (
              <div className="skip-icon-placeholder"></div>
            )}
          </div>
        )}
      </footer>
    </div>
  );
};


export default DebateScreen;