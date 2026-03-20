import React, { useState } from 'react';
import ExitWarningModal from '../components/ExitWarningModal';
import "../App.css";
import LanguageToggle from '../components/LanguageToggle';
import { useLanguage } from '../hooks/useLanguage';

interface TopicIntroProps {
  topicTitle: string;
  onNext: () => void;
  onExit: () => void;
}

const TopicIntro: React.FC<TopicIntroProps> = ({ topicTitle, onNext, onExit }) => {
  const { t, language } = useLanguage();
  const [showExitWarning, setShowExitWarning] = useState(false);

  const handleExitClick = () => {
    setShowExitWarning(true);
  };

  const handleExitConfirm = () => {
    setShowExitWarning(false);
    onExit();
  };

  const handleExitCancel = () => {
    setShowExitWarning(false);
  };

  const image = language === "de"
    ? import.meta.env.BASE_URL + "Infografik_Praemien.png"
    : import.meta.env.BASE_URL + "Infografik.en.png";

  return (
    <section className="screen-body">
      <LanguageToggle />
    <div className="screen-wrapper">
      <ExitWarningModal 
        isOpen={showExitWarning} 
        onConfirm={handleExitConfirm} 
        onCancel={handleExitCancel} 
      />
      <div className="exit-btn-outside">
        <button className="exit-btn" onClick={handleExitClick}>
          {t("exit")}
        </button>
      </div>
      <div className="screen" style={{
        boxShadow: "0 10px 40px rgba(80, 60, 160, 0.2), 0 8px 24px rgba(80, 60, 160, 0.12), 0 0 80px rgba(80, 60, 160, 0.08)",
        padding: "24px 40px",
        margin: "0 auto",
        maxWidth: "1000px",
        borderRadius: "24px"
      }}>
        <header className="screen-header" style={{marginBottom: "30px"}}>
          <h4 style={{ fontSize: "28px", textAlign: "center", marginBottom: "5px" }}>{t("topicIntro")}</h4>
          <p className="subtitle" style={{ marginTop: "10px"}}>{t("healthInsurance")}</p>
          <h2 style={{ textAlign: "center", marginTop: "30px" }}>{t("topicIntroH")}</h2>
        </header>
        <section className="screen-body scrollable">
          <div className="topic-intro-content">
            <div className="topic-intro-image">
              <img src={image} alt="Infografik Prämien" />
            </div>
            <div className="topic-intro-text">
              <p>
                {t("topicIntroText1")}
              </p>
              <p> 
                {t("topicIntroText2")}
              </p>
              <p style={{ marginBottom: "35px" }}>
                {t("topicIntroText3")}
              </p>
              <button className="con-primary-btn" onClick={onNext}>
                {t("next")}
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
    </section>
  );
};

export default TopicIntro;