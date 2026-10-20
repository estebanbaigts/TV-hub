import React from "react";
import {
  AbsoluteFill,
  Easing,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

export const FONT =
  '-apple-system, "SF Pro Display", "Helvetica Neue", Arial, sans-serif';
export const BG = "#050506";
export const clamp = {
  extrapolateLeft: "clamp",
  extrapolateRight: "clamp",
} as const;
export const easeOut = Easing.bezier(0.16, 1, 0.3, 1);

/** Spring 0 → 1 starting at `delay` frames. */
export const usePop = (delay = 0, damping = 14, stiffness = 170) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: frame - delay, fps, config: { damping, stiffness } });
};

/** Dark backdrop with a soft coloured glow. */
export const Backdrop: React.FC<{ color?: string; strength?: number }> = ({
  color = "90,110,255",
  strength = 0.25,
}) => (
  <AbsoluteFill
    style={{
      backgroundColor: BG,
      backgroundImage: `radial-gradient(ellipse 1300px 760px at 50% 10%, rgba(${color},${strength}), rgba(5,5,6,0) 70%)`,
    }}
  />
);

/** Big headline that slams in (scale + fade). */
export const Slam: React.FC<{
  text: string;
  size?: number;
  delay?: number;
  color?: string;
}> = ({ text, size = 150, delay = 0, color = "#f5f5f7" }) => {
  const p = usePop(delay, 12, 220);
  return (
    <div
      style={{
        fontFamily: FONT,
        fontSize: size,
        fontWeight: 800,
        letterSpacing: "-0.04em",
        color,
        textAlign: "center",
        opacity: interpolate(p, [0, 0.6], [0, 1], clamp),
        scale: String(interpolate(p, [0, 1], [1.5, 1])),
        textShadow: "0 10px 60px rgba(0,0,0,.6)",
      }}
    >
      {text}
    </div>
  );
};

/** Caption over a darkened lower band. */
export const Caption: React.FC<{ text: string; delay?: number }> = ({
  text,
  delay = 6,
}) => {
  const p = usePop(delay, 16, 160);
  return (
    <AbsoluteFill
      style={{
        justifyContent: "flex-end",
        alignItems: "center",
        paddingBottom: 110,
      }}
    >
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(180deg, rgba(5,5,6,0) 45%, rgba(5,5,6,.92) 100%)",
        }}
      />
      <div
        style={{
          fontFamily: FONT,
          fontSize: 96,
          fontWeight: 800,
          letterSpacing: "-0.035em",
          color: "#f5f5f7",
          opacity: interpolate(p, [0, 0.5], [0, 1], clamp),
          translate: `0px ${interpolate(p, [0, 1], [70, 0])}px`,
        }}
      >
        {text}
      </div>
    </AbsoluteFill>
  );
};
