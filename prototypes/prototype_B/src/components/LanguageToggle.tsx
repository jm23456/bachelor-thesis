import { useLanguage } from "../hooks/useLanguage";

const LanguageToggle = () => {
    const { language, toggleLanguage } = useLanguage();

    return (
        <button 
            onClick={toggleLanguage} 
            style={{ 
                position: 'absolute', 
                top: 20, right: 40,
                padding: '8px 12px',
                borderRadius: '8px',
                fontWeight: 600,}}>
            {language === 'de' ? '🌐 EN' : '🌐 DE'}
        </button>
    );
};

export default LanguageToggle;