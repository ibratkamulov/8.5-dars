"use client";

import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { Language } from "@fastresult/shared";
import { t, type TKey } from "./i18n";

type LangContextType = {
  lang: Language;
  setLang: (l: Language) => void;
  copy: (key: TKey) => string;
};

const LangContext = createContext<LangContextType>({
  lang: "uz",
  setLang: () => undefined,
  copy: (key) => t("uz", key),
});

export function LangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Language>("uz");

  useEffect(() => {
    const saved = localStorage.getItem("fr_lang") as Language | null;
    if (saved && ["uz", "ru", "en"].includes(saved)) setLangState(saved);
  }, []);

  const setLang = useCallback((l: Language) => {
    setLangState(l);
    localStorage.setItem("fr_lang", l);
  }, []);

  const copy = useCallback((key: TKey) => t(lang, key), [lang]);

  return <LangContext.Provider value={{ lang, setLang, copy }}>{children}</LangContext.Provider>;
}

export const useLang = () => useContext(LangContext);
