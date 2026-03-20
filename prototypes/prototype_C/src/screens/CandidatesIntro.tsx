import React, {useState} from "react";
import CandidateCard from "../components/CandidateCard";
import "../App.css";

interface CandidatesIntroProps {
  onNext: () => void;
  onExit: () => void;
  activeBot: number;
  setActiveBot: (i: number) => void;
  totalBots: number;
  onContinue: () => void;
  onFinalContinue: () => void;
  hasStarted: boolean;
  onStart: () => void;
}

const CandidatesIntro: React.FC<CandidatesIntroProps> = ({
  onExit,
  activeBot,
  setActiveBot,
  totalBots,
  onContinue,
  onFinalContinue,
  hasStarted,
  onStart,
}) => {

  const [spokenBots, setSpokenBots] = useState<number[]>([0]); // Der erste Bot hat schon gesprochen
  
  const handleNext = () => {
    // Füge den aktuellen Bot zu spokenBots hinzu
    if (!hasStarted) {
      onStart();
      return;
    }
    if (!spokenBots.includes(activeBot)) {
      setSpokenBots([...spokenBots, activeBot]);
    }
      
    if (activeBot < totalBots - 1) {
      setActiveBot(activeBot + 1);   
      onContinue();                  
    } else {
      onFinalContinue();
      setActiveBot(0);          
    }
  };

  const proBots = [
    { color: "yellow", label: "Introduction" },
    { color: "gray", label: "Introduction" },
  ];

  const contraBots = [
    { color: "red", label: "Introduction" },
    { color: "green", label: "Introduction" },
  ];

  return (
    <div className="screen">
      <div className="top-exit-row">
        <button className="exit-btn" onClick={onExit}>
          Exit
        </button>
      </div>
      <header className="screen-header">
        <p className="subtitle">Introduction of the candidates</p>
      </header>

      <section className="screen-body">
        <div className="arguments-stage">
          {/* Pro Side */}
          <div className="arguments-side pro-side">
            <div className="side-title">Pro</div>
            <div className="candidates-row">
              {proBots.map((bot, i) => {
                const seq = 0 + i;
                return (
                  <CandidateCard
                    key={i}
                    color={bot.color as "yellow" | "gray" | "red" | "green"}
                    hasMic={hasStarted && activeBot === seq}
                    showBubble={hasStarted && (activeBot === seq || spokenBots.includes(seq))}
                    bubbleLabel={bot.label}
                  />
                );
              })}
            </div>
          </div>

          {/* Contra Side */}
          <div className="arguments-side contra-side">
            <div className="side-title">Contra</div>
            <div className="candidates-row">
              {contraBots.map((bot, i) => {
                const seq = proBots.length + i;
                return (
                  <CandidateCard
                    key={i}
                    color={bot.color as "yellow" | "gray" | "red" | "green"}
                    hasMic={hasStarted && activeBot === seq}
                    showBubble={hasStarted && (activeBot === seq || spokenBots.includes(seq))}
                    bubbleLabel={hasStarted ? bot.label : ""}
                  />
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <footer className="footer-end-row">
        <button className="con-primary-btn" onClick={handleNext}>
          {activeBot < totalBots -1 ? "Next Speaker": "Continue"}
        </button>
      </footer>
    </div>
  );
};

export default CandidatesIntro;