import React from 'react';
import "../App.css";
import { useLanguage } from '../hooks/useLanguage';

interface ExitWarningModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const ExitWarningModal: React.FC<ExitWarningModalProps> = ({ isOpen, onConfirm, onCancel }) => {
  const { t } = useLanguage();
  if (!isOpen) return null;

  return (
    <div className="exit-warning-modal-overlay">
      <div className="exit-warning-modal" style={{padding: 0, overflow: "hidden"}}>
        <div style={{
              background: "#FEE2E2",
              padding: "1rem 1rem",
              borderRadius: "1.5rem 1.5rem 0 0",
              marginBottom: "0.5rem"
            }}>
        <p style={{fontSize: "20px", fontWeight: "600", margin: 0, color: "#D32F2F"}}>{t("exit2")}</p>
        </div>
        <div style={{padding: "0rem 1.5rem 1rem 0.5rem"}}>
          <p style={{fontSize: "17px"}}>{t("exitSure")}</p>
          <div className="exit-modal-buttons">
            <button className="exit-cancel-btn" onClick={onCancel}>
              {t("cancel")}
            </button>
            <button className="exit-confirm-btn" onClick={onConfirm}>
              {t("leave")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExitWarningModal;
