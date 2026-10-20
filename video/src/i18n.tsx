import React, { createContext, useContext } from "react";

export type Lang = "en" | "fr";

const TEXT = {
  en: {
    hook1: "Every app.",
    hook2: "One screen.",
    reveal: "Your TV, finally premium.",
    spotlight: "A cinematic spotlight.",
    games: "Resume in one click.",
    cut1: "Never a fake launch.",
    cut2: "All your apps.",
    cut3: "Zero tracking.",
    install: "One command.",
    installed: "✓ Installed on your TV",
    end: "For Samsung & LG TVs",
  },
  fr: {
    hook1: "Toutes vos apps.",
    hook2: "Un seul écran.",
    reveal: "Votre TV, enfin premium.",
    spotlight: "Le meilleur, à la une.",
    games: "Reprenez en un clic.",
    cut1: "Rien de simulé.",
    cut2: "Tout est là.",
    cut3: "Zéro pistage.",
    install: "Une seule commande.",
    installed: "✓ Installé sur votre TV",
    end: "Pour TV Samsung et LG",
  },
} as const;

export type Key = keyof (typeof TEXT)["en"];

const LangContext = createContext<Lang>("en");

export const LangProvider: React.FC<{
  lang: Lang;
  children: React.ReactNode;
}> = ({ lang, children }) => (
  <LangContext.Provider value={lang}>{children}</LangContext.Provider>
);

export const useT = () => {
  const lang = useContext(LangContext);
  return (k: Key) => TEXT[lang][k];
};
