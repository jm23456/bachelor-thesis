import React, { useEffect, useRef, useState, useMemo } from "react";
import CandidateCard from "../components/CandidateCard";
import MuteButton from "../components/MuteButton";
import EmojiReactions from "../components/EmojiReactions";
import ExitWarningModal from "../components/ExitWarningModal";
import type { ChatMessage, EmojiReaction, BotReaction } from "../types/types";
import useAudioPlayback from "../hooks/useAudioPlayback";
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
  const messagesSinceUserInput = useRef(0);
  const [showUrgentPrompt, setShowUrgentPrompt] = useState(false);
  const [hasUserSentOpinion, setHasUserSentOpinion] = useState(false);
  const [showExitWarning, setShowExitWarning] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const hasStartedRef = useRef(false);
  const typingIntervalRef = useRef<number | null>(null);
  const currentBubbleRef = useRef<{text: string, color: Color, side: "pro" | "contra" | "undecided", botReactions?: BotReaction[]} | null>(null);
  const isPausedRef = useRef(false);
  const pausedWordCountRef = useRef(0);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const { t, language } = useLanguage();
  const [showTimeExpired, setShowTimeExpired] = useState(false);
  const [showDebateFinished, setShowDebateFinished] = useState(false);
  const [currentBotReactions, setCurrentBotReactions] = useState<BotReaction[]>([]);

  type Color = "red" | "yellow" | "green" | "gray" | "blue";


    type SpeakerKey = "A" | "B" | "C" | "D" | "E" | "SYSTEM";

  type DebateScriptItem = {
    id: number;
    speaker: SpeakerKey;
    text: string;
    reactions?: { from: string; emoji: string }[];
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
    stopPlaying();
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
    setCurrentBotReactions([]); // Reaktionen löschen
    
    // Zeige den vollständigen Text des aktuellen Bots an
    if (currentBubbleRef.current) {
      const { text, color, side, botReactions } = currentBubbleRef.current;
      setCurrentTypingText(undefined);
      setChatHistory(prev => [...prev, {
        id: Date.now(),
        type: "bot",
        color: color,
        text: text,
        side: side,
        isComplete: true,
        botReactions: botReactions
      }]);
      setVisibleBubbles(prev => prev + 1);
      currentBubbleRef.current = null;
      
      // Zähle auch für den urgent prompt
      messagesSinceUserInput.current += 1;
      if (messagesSinceUserInput.current >= 4 && !showUrgentPrompt) {
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
      botReactions: msg.reactions
        ?.filter(r => r.from !== "E") // Filtere Reaktionen von Speaker E heraus
        .map(r => ({
          from: r.from,
          emoji: r.emoji,
          color: speakerColors[r.from as keyof typeof speakerColors]
        })) || []
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



  const typewriterEffect = (text: string, color: Color, side: "pro" | "contra" | "undecided", id: number, speaker: string, botReactions?: BotReaction[]) => {
    const words = text.split(" ");
    let wordCount = pausedWordCountRef.current || 0;
    pausedWordCountRef.current = 0;
    
    // Speichere aktuelle Bubble-Daten für Skip
    currentBubbleRef.current = { text, color, side, botReactions };
    
    if (wordCount === 0) {
      setCurrentTypingText("");
      setCurrentBotReactions([]); // Reaktionen erst später anzeigen
    }
    
    // Starte Audio Playback
    setIsSpeaking(true);
    play({ 
      section: 'debate_script',
      speaker: speaker, 
      id: id, 
      lang: language, 
    });
    
    typingIntervalRef.current = window.setInterval(() => {
      // Pausiere wenn isPausedRef true ist
      if (isPausedRef.current) {
        pausedWordCountRef.current = wordCount;
        return;
      }
      
      wordCount++;
      
      // Zeige Reaktionen gestaffelt (nie gleichzeitig, nie später als 3. Satz)
      if (botReactions && botReactions.length > 0) {
        const currentText = words.slice(0, wordCount).join(" ");
        const sentences = currentText.split(/[.!?]+/).filter(s => s.trim().length > 0);
        const totalSentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0).length;
        
        // Prüfe ob wir gerade einen Satz abgeschlossen haben
        if (currentText.match(/[.!?]\s*$/)) {
          const currentSentence = sentences.length;
          
          // Bestimme welche Reaktionen noch nicht angezeigt wurden
          const pendingReactions = botReactions.filter(
            reaction => !currentBotReactions.some(r => r.from === reaction.from && r.emoji === reaction.emoji)
          );
          
          if (pendingReactions.length > 0) {
            // Bei <= 3 Sätzen: Alle beim 2. Satz (aber gestaffelt)
            // Bei > 3 Sätzen: Erste beim 2., Rest beim 3. Satz
            if (totalSentences <= 3) {
              // Wenige Sätze: Eine Reaktion pro Satz (ab Satz 2)
              if (currentSentence >= 2 && pendingReactions.length > 0) {
                const reactionIndex = currentSentence - 2; // Satz 2 = Index 0, Satz 3 = Index 1
                if (reactionIndex < pendingReactions.length) {
                  setCurrentBotReactions(prev => [...prev, pendingReactions[reactionIndex]]);
                }
              }
            } else {
              // Mehr Sätze: Verteile auf Satz 2 und 3
              if (currentSentence === 2 && pendingReactions.length > 0) {
                // Erste Reaktion beim 2. Satz
                setCurrentBotReactions(prev => [...prev, pendingReactions[0]]);
              } else if (currentSentence === 3 && pendingReactions.length > 0) {
                // Restliche Reaktionen beim 3. Satz
                setCurrentBotReactions(prev => [...prev, pendingReactions[0]]);
              }
            }
          }
        }
      }
      
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
        setCurrentBotReactions([]); // Reaktionen löschen
        setChatHistory(prev => [...prev, {
          id: Date.now(),
          type: "bot",
          color: color,
          text: text,
          side: side,
          isComplete: true,
          botReactions: botReactions
        }]);
        setVisibleBubbles(prev => prev + 1);
        
        // Zähle Bot-Nachrichten und zeige nach 4 die dringende Aufforderung
        messagesSinceUserInput.current += 1;
        if (messagesSinceUserInput.current >= 4 && !showUrgentPrompt) {
          setShowUrgentPrompt(true);
        }
      }
    }, 380);
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
        typewriterEffect(firstBubble.text, firstBubble.color, firstBubble.side, firstBubble.id, firstBubble.speaker, firstBubble.botReactions);
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

      // Emoji-Reaktion zu einer Nachricht hinzufügen
    const handleReaction = (messageId: number, emoji: EmojiReaction) => {
      setChatHistory(prev => prev.map(msg => {
        if (msg.id === messageId) {
          const currentReactions = msg.reactions || [];
          // Toggle: Wenn Emoji bereits vorhanden, entfernen, sonst hinzufügen
          const hasReaction = currentReactions.includes(emoji);
          const newReactions = hasReaction
            ? currentReactions.filter(r => r !== emoji)
            : [...currentReactions, emoji];
          return { ...msg, reactions: newReactions };
        }
        return msg;
      }));
    };

  const handleContinue = () => {
    if (!hasStarted) {
      onStart();
      return;
    }

    // Reset urgent prompt wenn User auf Continue klickt
    if (showUrgentPrompt) {
      setShowUrgentPrompt(false);
      messagesSinceUserInput.current = 0;
    }

    const isBusy = isTyping || currentTypingText !== undefined;

    if (visibleBubbles < argumentBubbles.length && !isBusy) {
      const nextBubble = argumentBubbles[visibleBubbles];
      setCurrentSpeaker(nextBubble.color);
      setIsTyping(true);
      
      setTimeout(() => {
        setIsTyping(false);
        typewriterEffect(nextBubble.text, nextBubble.color, nextBubble.side, nextBubble.id, nextBubble.speaker, nextBubble.botReactions);
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
    
    const wasUrgentPrompt = showUrgentPrompt;
    
    setChatHistory(prev => [...prev, {
      id: Date.now(),
      type: "user",
      text: inputText.trim(),
      isComplete: true
    }]);

    setInputText("");
    
    // Reset urgent prompt nach User-Input
    setShowUrgentPrompt(false);
    messagesSinceUserInput.current = 0;
    setHasUserSentOpinion(true);
    
    onSend();
    
    // Wenn urgentPrompt aktiv war, automatisch Continue ausführen
    if (wasUrgentPrompt && hasStarted) {
      setTimeout(() => {
        const isBusy = isTyping || currentTypingText !== undefined;
        if (visibleBubbles < argumentBubbles.length && !isBusy) {
          const nextBubble = argumentBubbles[visibleBubbles];
          setCurrentSpeaker(nextBubble.color);
          setIsTyping(true);
          
          setTimeout(() => {
            setIsTyping(false);
            typewriterEffect(nextBubble.text, nextBubble.color, nextBubble.side);
          }, 1500);
        }
      }, 500);
    }
  };

  return (
    <div className={`screen active-debate-screen ${showUrgentPrompt ? "prompt-active" : ""}`}>
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
              <>
                {/* Bot-Reaktionen aus dem Script */}
                {msg.botReactions && msg.botReactions.length > 0 && (
                  <div className="bot-reactions">
                    {msg.botReactions.map((reaction, idx) => (
                      <span 
                        key={idx} 
                        className={`bot-reaction bot-reaction-${reaction.color}`}
                        title={`Reaktion von ${reaction.from}`}
                      >
                        {reaction.emoji}
                      </span>
                    ))}
                  </div>
                )}
                {!msg.isIntro && (
                  <EmojiReactions 
                    reactions={msg.reactions || []} 
                    onReact={(emoji) => handleReaction(msg.id, emoji)} 
                  />
                )}
                <button 
                  className="report-btn" 
                  title={t("flag")}
                  onClick={() => alert(`Nachricht gemeldet`)}
                >
                  ⚠️
                </button>
              </>
            )}
          </div>
        ))}
        
        <div ref={messagesEndRef} />
      </section>

      {/* Pro vs Contra stage */}
      <section className={`active-debate-stage ${showUrgentPrompt ? "stage-minimized-light" : ""}`} style={{
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
        <div className="arguments-stage">
          <CandidateCard 
            color="yellow" 
            hasMic={hasStarted && currentSpeaker === "yellow" && (isTyping || isSpeaking) && !showUrgentPrompt && visibleBubbles < argumentBubbles.length}
            isTyping={hasStarted && isTyping && currentSpeaker === "yellow"}
            bubbleText={hasStarted && currentSpeaker === "yellow" ? currentTypingText : undefined}
            isSpeaking={hasStarted && currentSpeaker === "yellow" && isSpeaking && !showUrgentPrompt && visibleBubbles < argumentBubbles.length}
            isPaused={showExitWarning}
            reactionEmoji={currentBotReactions.find(r => r.color === "yellow")?.emoji}
            bubbleLabel="• Prämien sind für viele Familien kaum mehr tragbar.
• Lösung liegt in Solidarität, gezielter Entlastung und fairer Verteilung von Kosten.
• Nicht im Abbau von Leistungen."
          />
          <CandidateCard 
            color="gray" 
            hasMic={hasStarted && currentSpeaker === "gray" && (isTyping || isSpeaking) && !showUrgentPrompt && visibleBubbles < argumentBubbles.length}
            isTyping={hasStarted && isTyping && currentSpeaker === "gray"}
            bubbleText={hasStarted && currentSpeaker === "gray" ? currentTypingText : undefined}
            isSpeaking={hasStarted && currentSpeaker === "gray" && isSpeaking && !showUrgentPrompt && visibleBubbles < argumentBubbles.length}
            isPaused={showExitWarning}
            reactionEmoji={currentBotReactions.find(r => r.color === "gray")?.emoji}
            bubbleLabel="• Keine aussergewöhnlich hohen Gesundheitskosten.
• Es braucht kein pauschales Sparen, sondern gezielte Eingriffe bei Überversorgungen und Ineffizienzen."
          />
          <CandidateCard 
            color="red" 
            hasMic={currentSpeaker === "red" && (isTyping || isSpeaking) && !showUrgentPrompt && visibleBubbles < argumentBubbles.length}
            isTyping={isTyping && currentSpeaker === "red"}
            bubbleText={currentSpeaker === "red" ? currentTypingText : undefined}
            isSpeaking={hasStarted && currentSpeaker === "red" && isSpeaking && !showUrgentPrompt && visibleBubbles < argumentBubbles.length}
            isPaused={showExitWarning}
            reactionEmoji={currentBotReactions.find(r => r.color === "red")?.emoji}
            bubbleLabel="• Steigende Prämien sind Folge von explodierenden Kosten durch immer mehr Behandlungen.
• Es braucht Steuerungsmöglichkeiten für Krankenkassen.
• Ziel: Prämien senken durch Kostenkontrolle."
          />
          <CandidateCard 
            color="green" 
            hasMic={currentSpeaker === "green" && (isTyping || isSpeaking) && !showUrgentPrompt && visibleBubbles < argumentBubbles.length}
            isTyping={isTyping && currentSpeaker === "green"}
            bubbleText={currentSpeaker === "green" ? currentTypingText : undefined}
            isSpeaking={hasStarted && currentSpeaker === "green" && isSpeaking && !showUrgentPrompt && visibleBubbles < argumentBubbles.length}
            isPaused={showExitWarning}
            reactionEmoji={currentBotReactions.find(r => r.color === "green")?.emoji}
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

      {/* Leichtes Overlay für "It's your turn" urgent prompt */}
      {showUrgentPrompt && (
        <div className="urgent-prompt-overlay-light"></div>
      )}
              {/* Zeige normalen Button nur wenn Modal nicht sichtbar ist */}
        {(hasStarted || !hasUserSentOpinion) && (
          <div className="footer-end-row">
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
      <footer className="debate-input-footer active-input-footer">
        {/* Aufforderung zur Teilnahme */}
        <div className={`participation-prompt ${showUrgentPrompt ? "urgent" : ""}`}>
          {showUrgentPrompt ? (
            <span className="urgent-text">{t("urgentPrompt")}</span>
          ) : (
            <span className="prompt-text">{t('activeInput')}</span>
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