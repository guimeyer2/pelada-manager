import { createContext, useContext, useState } from "react";
import { translations } from "./translations";

const LangContext = createContext();

export function LangProvider({ children }) {
  const [lang, setLang] = useState(
    () => localStorage.getItem("pelada_lang") || "en"
  );

  function toggle() {
    const next = lang === "en" ? "pt" : "en";
    setLang(next);
    localStorage.setItem("pelada_lang", next);
  }

  function t(key) {
    const parts = key.split(".");
    let val = translations[lang];
    for (const k of parts) val = val?.[k];
    return val ?? key;
  }

  return (
    <LangContext.Provider value={{ lang, toggle, t }}>
      {children}
    </LangContext.Provider>
  );
}

export const useLang = () => useContext(LangContext);
