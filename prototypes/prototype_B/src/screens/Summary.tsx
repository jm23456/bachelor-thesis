import React, { useState } from 'react';
import CandidateCardIntro from '../components/CandidateCardIntro';
import "../App.css";
import LanguageToggle from '../components/LanguageToggle';
import { useLanguage } from '../hooks/useLanguage';

interface SummaryProps {
  topicTitle: string;
  onStartAnother: () => void;
}

const Summary: React.FC<SummaryProps> = ({onStartAnother }) => {
  const { t } = useLanguage();
  const [showSummaryIntro, setShowSummaryIntro] = useState(true);

  return (
    <div className="screen" style={{
     boxShadow: "0 20px 60px rgba(80, 60, 160, 0.15),0 8px 24px rgba(80, 60, 160, 0.10)",
  paddingTop: "24px",
  paddingBottom: "40px",
      margin: "32px auto",
      maxWidth: "1000px",
      borderRadius: "24px"
    }}>
      <section className="screen-body">
        <LanguageToggle />
        <div className="intro-stage" style={{paddingBottom: "0px"}}>
          {/* Pro Side */}
            <div className="introcandidates-row-left">
              <CandidateCardIntro color="yellow" />
              <CandidateCardIntro color="gray" />
            </div>

          {/* Undecided - Blue Bot (Mitte) */}
          <div className="introcandidates-row-center">
            <CandidateCardIntro color="blue" />
          </div>

        {/* Contra Side */}
          <div className="introcandidates-row-right">
            <CandidateCardIntro color="red" />
            <CandidateCardIntro color="green" />
          </div>
        </div>
      </section>
      <header className="screen-header" style={{marginBottom: "4px", marginTop: "0px"}}>
        <p className="subtitle">{t("summary")}</p> 
        <p className="intro-text" style={{marginTop: "0px"}}>{t("debatedShowed")}</p>
      </header>

    <div className="screen" style={{
      boxShadow: "0 2px 10px rgba(80, 60, 160, 0.2), 0 8px 24px rgba(80, 60, 160, 0.12), 0 0 80px rgba(80, 60, 160, 0.08)",
      paddingTop: "32px",
      paddingBottom: "10px",
      background: "#F9F8FD",
      margin: "0px auto",
      maxWidth: "800px",
      height: "auto",
      borderRadius: "24px"
    }}>
      <section className="screen-body scrollable" style={{maxWidth: "600px", margin: "0 auto", padding: "0 32px"}}>
        <p> {t("summary1")}</p>
        <p>{t("summary2")}</p>
        <p>• <strong>{t("summary31")}</strong> {t("summary3")}</p>
      </section>

      <footer className="footer-end-row" style= {{ marginTop: "30px", textAlign: "center" , marginBottom: "10px"  }}>
        <button className="con-primary-btn" onClick={onStartAnother}>
          {t("startNewRound")}
        </button>
      </footer>
    </div>

    {/* Summary Intro Modal */}
    {showSummaryIntro && (
      <div className="start-debate-modal-overlay">
        <div className="start-debate-modal" style={{padding: 0, overflow: "hidden"}}>
          <div style={{
            background: "linear-gradient(135deg, #ede9fe 0%, #ddd6fe 100%)",
            padding: "1.25rem 1.5rem",
            borderRadius: "1.5rem 1.5rem 0 0",
            marginBottom: "0.5rem"
          }}>
            <p style={{fontSize: "20px", fontWeight: "600", margin: 0, color: "#5b21b6"}}>{t("summaryIntroRound")}</p>
          </div>
          <div style={{padding: "0rem 0.5rem 1.5rem 0.5rem"}}>
            <h2 className="modal-title" style={{fontSize: "22px", marginTop: "5px"}}>{t("summaryIntroTitle")}</h2>
            <p className="modal-text" style={{fontSize: "16px", marginTop: "0px"}}>{t("summaryIntroText")}</p>
            <button className="start-debate-btn" onClick={() => setShowSummaryIntro(false)}>
              {t("continue")}
            </button>
          </div>
        </div>
      </div>
    )}
    </div>
  );
};

export default Summary;