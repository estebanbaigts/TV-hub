import React from "react";
import { AbsoluteFill, Html5Audio, Sequence, staticFile } from "remotion";
import { Lang, LangProvider } from "./i18n";
import {
  End,
  Games,
  Hook,
  Install,
  QuickCuts,
  Reveal,
  Spotlight,
} from "./scenes";

/* Hard cuts on the beat (120 BPM = 15 frames). Keep in sync with scripts/make_music.py (CUTS). */
export const SCENES = [
  { name: "Hook", frames: 75, C: Hook },
  { name: "Reveal", frames: 120, C: Reveal },
  { name: "Spotlight", frames: 105, C: Spotlight },
  { name: "Games", frames: 105, C: Games },
  { name: "Quick cuts", frames: 90, C: QuickCuts },
  { name: "Install", frames: 75, C: Install },
  { name: "End", frames: 75, C: End },
];
export const TOTAL = SCENES.reduce((a, s) => a + s.frames, 0);

export const Trailer: React.FC<{ lang: Lang }> = ({ lang }) => {
  let from = 0;
  return (
    <LangProvider lang={lang}>
      <AbsoluteFill style={{ backgroundColor: "#050506" }}>
        {SCENES.map(({ name, frames, C }) => {
          const seq = (
            <Sequence
              key={name}
              name={name}
              from={from}
              durationInFrames={frames}
            >
              <C />
            </Sequence>
          );
          from += frames;
          return seq;
        })}
        <Html5Audio src={staticFile("music.wav")} />
      </AbsoluteFill>
    </LangProvider>
  );
};
