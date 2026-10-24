import React from "react";
import {
  AbsoluteFill,
  Easing,
  Img,
  interpolate,
  staticFile,
  useCurrentFrame,
} from "remotion";

export const C = {
  paper: "#F4EEDD",
  card: "#FDF9ED",
  ink: "#000000",
  accent: "#D65B37",
  accentDark: "#9E352F",
  muted: "#6B6658",
  unknown: "#D7D4CC",
  green: "#3E7B66",
  teal: "#8CC3BD",
  purple: "#776A97",
  yellow: "#F2CC67",
};

export const HEADING = '"Noto Sans TC", "PingFang TC", sans-serif';
export const BODY = '"Noto Sans TC", "PingFang TC", sans-serif';
export const CLAMP = {
  extrapolateLeft: "clamp",
  extrapolateRight: "clamp",
} as const;
export const EASE = Easing.bezier(0.25, 0.46, 0.45, 0.94);
export const LAND = Easing.bezier(0.34, 1.35, 0.44, 1);

export const ramp = (
  frame: number,
  from: number,
  to: number,
  easing: (value: number) => number = EASE,
) => interpolate(frame, [from, to], [0, 1], {...CLAMP, easing});

if (typeof document !== "undefined") {
  const id = "taipei-rat-lab-video-fonts";
  if (!document.getElementById(id)) {
    const style = document.createElement("style");
    style.id = id;
    style.textContent = `
      @font-face { font-family: "Noto Sans TC"; src: url("${staticFile("fonts/noto-700.woff2")}") format("woff2"); font-weight: 700; font-display: block; }
      @font-face { font-family: "Noto Sans TC"; src: url("${staticFile("fonts/noto-900.woff2")}") format("woff2"); font-weight: 900; font-display: block; }
    `;
    document.head.appendChild(style);
  }
}

export const Paper: React.FC<{children?: React.ReactNode; color?: string}> = ({
  children,
  color = C.paper,
}) => (
  <AbsoluteFill
    style={{
      backgroundColor: color,
      backgroundImage:
        "radial-gradient(circle at 20% 18%, rgba(253,249,237,.9), transparent 34%), repeating-linear-gradient(0deg, rgba(0,0,0,.018) 0, rgba(0,0,0,.018) 1px, transparent 1px, transparent 5px)",
      color: C.ink,
      fontFamily: HEADING,
      overflow: "hidden",
    }}
  >
    {children}
  </AbsoluteFill>
);

export const Kicker: React.FC<{children: React.ReactNode}> = ({children}) => (
  <div
    style={{
      display: "inline-flex",
      alignItems: "center",
      minHeight: 52,
      padding: "0 22px",
      border: `3px solid ${C.ink}`,
      background: C.card,
      color: C.accentDark,
      fontSize: 25,
      fontWeight: 900,
      letterSpacing: ".08em",
      boxShadow: `7px 7px 0 ${C.ink}`,
    }}
  >
    {children}
  </div>
);

export const RevealWords: React.FC<{
  words: string[];
  start?: number;
  gap?: number;
  style?: React.CSSProperties;
  colors?: Array<string | undefined>;
}> = ({words, start = 0, gap = 4, style, colors}) => {
  const frame = useCurrentFrame();
  return (
    <div style={{display: "flex", flexWrap: "wrap", ...style}}>
      {words.map((word, index) => {
        const progress = ramp(frame, start + index * gap, start + index * gap + 16, Easing.out(Easing.cubic));
        return (
          <span
            key={`${word}-${index}`}
            style={{
              display: "inline-block",
              whiteSpace: "pre",
              opacity: progress,
              transform: `translateY(${34 * (1 - progress)}px)`,
              filter: `blur(${8 * (1 - progress)}px)`,
              color: colors?.[index],
            }}
          >
            {word}
          </span>
        );
      })}
    </div>
  );
};

export const Screenshot: React.FC<{
  src: string;
  style?: React.CSSProperties;
  imageStyle?: React.CSSProperties;
  radius?: number;
  fit?: React.CSSProperties["objectFit"];
  position?: React.CSSProperties["objectPosition"];
}> = ({src, style, imageStyle, radius = 0, fit = "cover", position = "center"}) => (
  <div
    style={{
      position: "relative",
      border: `3px solid ${C.ink}`,
      borderRadius: radius,
      background: C.card,
      boxShadow: `12px 12px 0 ${C.ink}`,
      ...style,
    }}
  >
    <div style={{position: "absolute", inset: 0, overflow: "hidden", borderRadius: Math.max(0, radius - 3), contain: "paint"}}>
      <Img src={staticFile(`tex/${src}`)} style={{display: "block", width: "100%", height: "100%", objectFit: fit, objectPosition: position, ...imageStyle}} />
    </div>
  </div>
);

export const Progress: React.FC<{active: number; total?: number}> = ({active, total = 5}) => (
  <div style={{display: "flex", gap: 10}}>
    {Array.from({length: total}).map((_, index) => (
      <div
        key={index}
        style={{
          width: index === active ? 46 : 15,
          height: 15,
          border: `2px solid ${C.ink}`,
          background: index === active ? C.accent : index < active ? C.ink : "transparent",
        }}
      />
    ))}
  </div>
);

export const SceneCopy: React.FC<{
  number: string;
  title: string[];
  body: string[];
  active: number;
  x?: number;
  y?: number;
  width?: number;
}> = ({number, title, body, active, x = 70, y = 250, width = 760}) => {
  const frame = useCurrentFrame();
  const enter = ramp(frame, 3, 20, LAND);
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width,
        padding: "34px 40px 40px",
        border: `3px solid ${C.ink}`,
        background: C.card,
        boxShadow: `9px 9px 0 ${C.ink}`,
        opacity: ramp(frame, 2, 8),
        transform: `translateY(${55 * (1 - enter)}px)`,
      }}
    >
      <div style={{display: "flex", alignItems: "center", justifyContent: "space-between"}}>
        <Kicker>{number}</Kicker>
        <Progress active={active} />
      </div>
      <RevealWords words={title} start={8} style={{fontSize: 66, fontWeight: 900, lineHeight: 1.22, marginTop: 34}} />
      <RevealWords
        words={body}
        start={20}
        gap={3}
        style={{fontFamily: BODY, fontSize: 34, fontWeight: 700, lineHeight: 1.55, marginTop: 24, color: C.muted}}
      />
    </div>
  );
};

export const MockChip: React.FC<{children?: React.ReactNode; style?: React.CSSProperties}> = ({
  children = "模擬資料",
  style,
}) => (
  <div
    style={{
      position: "absolute",
      padding: "7px 16px",
      border: `2px solid ${C.ink}`,
      background: C.yellow,
      fontSize: 23,
      fontWeight: 900,
      ...style,
    }}
  >
    {children}
  </div>
);
