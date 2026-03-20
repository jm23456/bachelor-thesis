import { useContext } from "react";
import {LanguageContext} from "../i18n/LanguageContext";

export const useLanguage = () => {
    const context = useContext(LanguageContext);
    if (!context) {
        throw new Error("useLanguage must be used within a LanguageProvider");
    }
    return context;
};  