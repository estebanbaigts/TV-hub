import React from "react";
import {
  AbsoluteFill,
  Img,
  interpolate,
  Sequence,
  staticFile,
  useCurrentFrame,
} from "remotion";
import { Backdrop, Caption, clamp, easeOut, FONT, Slam, usePop } from "./ui";

/* 1 — Hook: two words slam in on the beat. */
export const Hook: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill>
      <Backdrop
        strength={interpolate(frame % 35, [0, 20], [0.45, 0.15], clamp)}
      />
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
        {frame < 35 ? (
          <Slam text="Every app." size={190} />
        ) : (
          <Slam text="One screen." size={190} delay={35} />
        )}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/* 2 — Reveal: the home screen tilts up into place. */
export const Reveal: React.FC = () => {
  const frame = useCurrentFrame();
  const p = usePop(0, 18, 90);
  const services = [
    "Netflix",
    "Prime Video",
    "Disney+",
    "CANAL+",
    "Crunchyroll",
    "Xbox",
    "Luna",
    "Spotify",
  ];
  return (
    <AbsoluteFill>
      <Backdrop />
      <div
        style={{
          position: "absolute",
          top: 70,
          left: 0,
          right: 0,
          textAlign: "center",
          fontFamily: FONT,
          fontSize: 84,
          fontWeight: 800,
          letterSpacing: "-0.035em",
          color: "#f5f5f7",
          opacity: interpolate(frame, [4, 16], [0, 1], clamp),
        }}
      >
        Your TV, finally premium.
      </div>
      <AbsoluteFill
        style={{
          perspective: 1800,
          justifyContent: "flex-end",
          alignItems: "center",
          paddingBottom: 40,
        }}
      >
        <Img
          src={staticFile("accueil.png")}
          style={{
            width: 1500,
            borderRadius: 26,
            boxShadow:
              "0 0 0 1px rgba(255,255,255,.14), 0 40px 120px rgba(0,0,0,.8)",
            rotate: `x ${interpolate(p, [0, 1], [32, 0])}deg`,
            scale: String(
              interpolate(frame, [0, 30, 120], [0.7, 0.93, 0.98], {
                ...clamp,
                easing: easeOut,
              }),
            ),
            translate: `0px ${interpolate(p, [0, 1], [260, 0])}px`,
            opacity: interpolate(frame, [0, 8], [0, 1], clamp),
          }}
        />
      </AbsoluteFill>
      {/* Service names stream across the top of the screenshot. */}
      <div
        style={{
          position: "absolute",
          top: 196,
          left: 0,
          right: 0,
          display: "flex",
          justifyContent: "center",
          gap: 18,
        }}
      >
        {services.map((s, i) => {
          const d = 36 + i * 5;
          return (
            <div
              key={s}
              style={{
                fontFamily: FONT,
                fontSize: 30,
                fontWeight: 700,
                color: "#111",
                background: "#f5f5f7",
                borderRadius: 30,
                padding: "10px 24px",
                opacity: interpolate(
                  frame,
                  [d, d + 6, 100, 112],
                  [0, 1, 1, 0],
                  clamp,
                ),
                translate: `0px ${interpolate(frame, [d, d + 10], [30, 0], { ...clamp, easing: easeOut })}px`,
              }}
            >
              {s}
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

/* 3 — Spotlight: slow push into the cinematic hero. */
export const Spotlight: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ backgroundColor: "#050506", overflow: "hidden" }}>
      <Img
        src={staticFile("streaming.png")}
        style={{
          width: 1920,
          height: 1080,
          transformOrigin: "30% 35%",
          scale: String(
            interpolate(frame, [0, 105], [1.08, 1.3], {
              ...clamp,
              easing: easeOut,
            }),
          ),
        }}
      />
      <Caption text="A cinematic spotlight." />
    </AbsoluteFill>
  );
};

/* 4 — Games: the camera dives onto the Resume tile. */
export const Games: React.FC = () => {
  const frame = useCurrentFrame();
  // Resume tile centre in the 1920×1080 screenshot → moved to (960, 470) while zooming.
  const s = interpolate(frame, [8, 60], [1, 1.9], {
    ...clamp,
    easing: easeOut,
  });
  const P = { x: 245, y: 867 };
  const k = (s - 1) / 0.9;
  const tx = k * (960 - P.x * 1.9);
  const ty = k * (470 - P.y * 1.9);
  return (
    <AbsoluteFill style={{ backgroundColor: "#050506", overflow: "hidden" }}>
      <Img
        src={staticFile("jeux.png")}
        style={{
          width: 1920,
          height: 1080,
          transformOrigin: "0 0",
          translate: `${tx}px ${ty}px`,
          scale: String(s),
        }}
      />
      <Caption text="Resume in one click." delay={34} />
    </AbsoluteFill>
  );
};

/* 5 — Quick cuts on the beat. */
const Cut: React.FC<{ img: string; text: string }> = ({ img, text }) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ backgroundColor: "#050506", overflow: "hidden" }}>
      <Img
        src={staticFile(img)}
        style={{
          width: 1920,
          height: 1080,
          opacity: 0.32,
          scale: String(
            interpolate(frame, [0, 30], [1.12, 1.02], {
              ...clamp,
              easing: easeOut,
            }),
          ),
        }}
      />
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
        <Slam text={text} size={150} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
export const QuickCuts: React.FC = () => (
  <AbsoluteFill>
    <Sequence durationInFrames={30} name="Honest">
      <Cut img="non-detectee.png" text="Never a fake launch." />
    </Sequence>
    <Sequence from={30} durationInFrames={30} name="Apps">
      <Cut img="toutes.png" text="All your apps." />
    </Sequence>
    <Sequence from={60} durationInFrames={30} name="Private">
      <Cut img="reglages.png" text="Zero tracking." />
    </Sequence>
  </AbsoluteFill>
);

/* 6 — Install: the command types itself. */
export const Install: React.FC = () => {
  const frame = useCurrentFrame();
  const cmd = "./scripts/install.sh";
  const typed = cmd.slice(
    0,
    Math.floor(interpolate(frame, [10, 36], [0, cmd.length], clamp)),
  );
  const ok = usePop(44, 12, 200);
  return (
    <AbsoluteFill>
      <Backdrop color="48,209,88" strength={0.18} />
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
        <div
          style={{
            fontFamily: FONT,
            fontSize: 96,
            fontWeight: 800,
            letterSpacing: "-0.035em",
            color: "#f5f5f7",
            opacity: interpolate(frame, [0, 8], [0, 1], clamp),
          }}
        >
          One command.
        </div>
        <div
          style={{
            marginTop: 50,
            width: 1100,
            padding: "40px 54px",
            borderRadius: 26,
            background: "#141417",
            boxShadow:
              "0 0 0 1px rgba(255,255,255,.1), 0 30px 90px rgba(0,0,0,.6)",
            fontFamily: '"SF Mono", Menlo, monospace',
            fontSize: 52,
            color: "#f5f5f7",
          }}
        >
          <span style={{ color: "#30d158" }}>$ </span>
          {typed}
          <span
            style={{
              opacity: frame < 44 && Math.floor(frame / 8) % 2 === 0 ? 1 : 0,
            }}
          >
            ▍
          </span>
          <div
            style={{
              marginTop: 18,
              color: "#30d158",
              fontWeight: 700,
              opacity: interpolate(ok, [0, 0.5], [0, 1], clamp),
              translate: `0px ${interpolate(ok, [0, 1], [24, 0])}px`,
            }}
          >
            ✓ Installed on your TV
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/* 7 — End card. */
export const End: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill>
      <Backdrop strength={0.35} />
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
        <Slam text="Accueil+" size={220} />
        <div
          style={{
            marginTop: 20,
            fontFamily: FONT,
            fontSize: 52,
            fontWeight: 600,
            color: "rgba(245,245,247,.82)",
            opacity: interpolate(frame, [12, 22], [0, 1], clamp),
          }}
        >
          For Samsung &amp; LG TVs
        </div>
        <div
          style={{
            marginTop: 34,
            fontFamily: FONT,
            fontSize: 40,
            color: "rgba(245,245,247,.55)",
            opacity: interpolate(frame, [22, 32], [0, 1], clamp),
          }}
        >
          github.com/estebanbaigts/TV-hub
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
