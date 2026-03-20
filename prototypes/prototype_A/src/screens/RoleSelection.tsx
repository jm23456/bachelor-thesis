import React, { useState } from "react";
import type { Role } from "../types/types";
import CandidateCardIntro from "../components/CandidateCardIntro";
import "../App.css";
import LanguageToggle from "../components/LanguageToggle";
import { useLanguage } from "../hooks/useLanguage";


interface RoleSelectionProps {
  role: Role;
  setRole: (value: Role) => void;
  selectedTopic: string;
  setSelectedTopic: (value: string) => void;
  customTopic: string;
  setCustomTopic: (value: string) => void;
  onContinue: () => void;
}


const RoleSelection: React.FC<RoleSelectionProps> = ({
  role,
  setRole,
  selectedTopic,
  setSelectedTopic,
  customTopic,
  setCustomTopic,
  onContinue,
}) => {
  const { t, language } = useLanguage();
  const roles: { id: Role; label: string; description: string }[] = [
   /* {
      id: "WATCH",
      label: "Only observe the debate",
      description: "You observe and follow the arguments.",
    },*/
    {
      id: "COMMENT",
      label: t("comment"),
      description: "You can send questions and short comments.",
    },
    {
      id: "ACTIVE",
      label: t("active"),
      description: "You participate as if you were one side.",
    },
  ];
  

  const handleRoleSelect = (selectedRole: Role) => {
    setRole(selectedRole);
  };
  const HEALTH_INSURANCE_TOPIC = t("healthInsurance");

  const topics = [t("bilateral"), HEALTH_INSURANCE_TOPIC, t("atom")];
  const [customTopicConfirmed, setCustomTopicConfirmed] = useState(false);

  const handleTopicSelect = (topic: string) => {
    setSelectedTopic(topic);
    setCustomTopic("");
    setCustomTopicConfirmed(false);
  };

  const handleConfirmCustomTopic = () => {
    if (customTopic.trim()) {
      setSelectedTopic("");
      setCustomTopicConfirmed(true);
    }
  };

  const canContinue = role && (selectedTopic || customTopicConfirmed);

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
        <div className="intro-stage">
          {/* Pro Side */}
            <div className="introcandidates-row-left">
              <CandidateCardIntro color="yellow" />
              <CandidateCardIntro color="gray" />
            </div>

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


      <header className="screen-header" style={{marginBottom: "30px", marginTop: "0px"}}>
        <p className="subtitle">{t("title")}</p>
        <p className="intro-text">
          {t("introText")}
        </p>
      </header>

      <div className="screen" style={{
      boxShadow: "0 2px 10px rgba(80, 60, 160, 0.2), 0 8px 24px rgba(80, 60, 160, 0.12), 0 0 80px rgba(80, 60, 160, 0.08)",
      paddingLeft: "40px",
      paddingRight: "40px",
      paddingBottom: "15px",
      paddingTop: "5px",

      background: "#F9F8FD",
      margin: "0px auto",
      maxWidth: "860px",
      height: "auto",
      borderRadius: "24px"
    }}>
      <section className="role-title">
        <h2>{t("chooseRole")}</h2>
        <div className="button-grid">
          {roles.map((r) => (
            <button
              key={r.id ?? "NONE"}
              className={
                "primary-btn outline" + (role === r.id ? " primary-btn-active" : "")
              }
              onClick={() => handleRoleSelect(r.id)}
            >
              {r.label}
            </button>
          ))}
        </div>
      </section>
      <section className="role-title">
        <h2>{t("chooseTopic")}</h2>
        <div className="button-grid-horizontal">
          {topics.map((topic) => {
            const isHealthTopic = topic === HEALTH_INSURANCE_TOPIC;
            return (
              <button
                key={topic}
                className={
                  "topic-btn outline" +
                  ` lang-${language}` +
                  (selectedTopic === topic && !customTopic
                  ? " topic-btn-active"
                  : "")
              }
              onClick={() => {if (isHealthTopic) {
                handleTopicSelect(topic);}
              }}
              disabled={!isHealthTopic}
            >
              {topic}
            </button>
          );})}
        </div>

        <h3>{t("owntopic")}</h3>
        
        <div className="custom-topic-row">
          <input
            className={"text-input" + (customTopicConfirmed ? " confirmed" : "")}
            placeholder={t("topicPlaceholder")}
            value={customTopic}
            disabled 
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  setCustomTopic(e.target.value);
                  setCustomTopicConfirmed(false);
                  setSelectedTopic("");
            }}
            onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                      if (e.key === "Enter" && customTopic.trim()) {
                        e.preventDefault();
                        handleConfirmCustomTopic();
                      }
                    }}
            />
            <button 
              className={"send-btn" + (customTopic.trim() && !customTopicConfirmed ? " active" : "")}
              onClick={handleConfirmCustomTopic}
              disabled={!customTopic.trim() || customTopicConfirmed}
            >
              {customTopicConfirmed ? "✓" : "Enter"}
            </button>
          </div>
      </section>

      <div className="footer-end-row" style={{marginBottom: "0px"}}>
        <button 
          className="con-primary-btn" 
          onClick={onContinue}
          disabled={!canContinue}
        >
          {t("continue")}
        </button>
      </div>
      </div>
    </div>
  );
};

export default RoleSelection;