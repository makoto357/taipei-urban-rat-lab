import React from "react";
import {
  AbsoluteFill,
  Easing,
  Img,
  OffthreadVideo,
  staticFile,
  useCurrentFrame,
} from "remotion";
import { C, HEADING, Paper, ramp } from "../theme";
import modelRecording from "../../public/en-2min/risk-model-demo.json";
import type { Scene } from "./timing";

const inkBorder = `3px solid ${C.ink}`;
const shadow = `9px 9px 0 ${C.ink}`;
const Badge: React.FC<{
  children: React.ReactNode;
  color?: string;
  style?: React.CSSProperties;
}> = ({ children, color = C.card, style }) => (
  <div
    style={{
      display: "inline-block",
      background: color,
      border: inkBorder,
      padding: "10px 18px",
      fontSize: 23,
      fontWeight: 900,
      letterSpacing: ".045em",
      ...style,
    }}
  >
    {children}
  </div>
);

const Enter: React.FC<{
  children: React.ReactNode;
  delay?: number;
  style?: React.CSSProperties;
}> = ({ children, delay = 0, style }) => {
  const f = useCurrentFrame();
  const t = ramp(f, delay, delay + 22, Easing.out(Easing.cubic));
  return (
    <div
      style={{
        opacity: t,
        transform: `translateY(${26 * (1 - t)}px)`,
        ...style,
      }}
    >
      {children}
    </div>
  );
};

const Capture: React.FC<{
  file: string;
  scroll?: number;
  x?: number;
  y?: number;
  width?: number;
  label?: string;
  opacity?: number;
}> = ({
  file,
  scroll = 0,
  x = 740,
  y = 205,
  width = 1092,
  label,
  opacity = 1,
}) => {
  const frame = useCurrentFrame();
  const movement = ramp(frame, 45, 175, Easing.inOut(Easing.cubic));
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width,
        height: (width * 9) / 14,
        border: inkBorder,
        background: C.card,
        boxShadow: shadow,
        opacity,
      }}
    >
      <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
        <Img
          src={staticFile(file)}
          style={{
            display: "block",
            width: "100%",
            height: scroll ? "auto" : "100%",
            objectFit: "cover",
            transform: scroll
              ? `translateY(${-movement * scroll}px)`
              : undefined,
          }}
        />
      </div>
      {label && (
        <Badge
          color={C.yellow}
          style={{
            position: "absolute",
            top: -24,
            left: 22,
            maxWidth: width - 44,
            fontSize: 20,
          }}
        >
          {label}
        </Badge>
      )}
    </div>
  );
};

const Copy: React.FC<{ scene: Scene; children?: React.ReactNode }> = ({
  scene,
  children,
}) => (
  <div style={{ position: "absolute", left: 76, top: 204, width: 600 }}>
    <Enter>
      <h1
        style={{
          fontSize: scene.id === "model" ? 56 : 66,
          lineHeight: 1.05,
          letterSpacing: "-.045em",
          whiteSpace: "pre-line",
          margin: 0,
          fontWeight: 900,
        }}
      >
        {scene.title}
      </h1>
    </Enter>
    <Enter delay={10}>
      <p
        style={{
          fontSize: scene.id === "model" ? 27 : 31,
          lineHeight: 1.48,
          color: C.muted,
          margin: "30px 0 0",
          maxWidth: 570,
          fontWeight: 700,
        }}
      >
        {scene.description}
      </p>
    </Enter>
    <div style={{ marginTop: 32 }}>{children}</div>
  </div>
);

const MiniRow: React.FC<{
  title: string;
  detail: string;
  color?: string;
  delay?: number;
}> = ({ title, detail, color = C.card, delay = 18 }) => (
  <Enter delay={delay} style={{ marginBottom: 14 }}>
    <div
      style={{
        border: inkBorder,
        padding: "16px 20px",
        background: color,
        boxShadow: "5px 5px 0 #000",
      }}
    >
      <div style={{ fontSize: 27, fontWeight: 900 }}>{title}</div>
      <div
        style={{
          fontSize: 23,
          lineHeight: 1.45,
          marginTop: 7,
          color: C.muted,
          fontWeight: 700,
        }}
      >
        {detail}
      </div>
    </div>
  </Enter>
);

const Map: React.FC<{
  scene: Scene;
  file: string;
  label?: string;
  children?: React.ReactNode;
}> = ({ scene, file, label, children }) => (
  <>
    <Copy scene={scene}>{children}</Copy>
    <Capture file={file} label={label} />
  </>
);

const Opening: React.FC<{ scene: Scene }> = ({ scene }) => (
  <>
    <div style={{ position: "absolute", left: 76, top: 209, width: 620 }}>
      <Enter>
        <h1
          style={{
            margin: 0,
            fontSize: 92,
            fontWeight: 900,
            lineHeight: 1.025,
            letterSpacing: "-.05em",
          }}
        >
          {scene.title.split("\n").map((line, i, lines) => (
            <span
              key={line}
              style={{
                display: "block",
                color: i === lines.length - 1 ? C.accent : C.ink,
              }}
            >
              {line}
            </span>
          ))}
        </h1>
      </Enter>
      <Enter delay={12}>
        <div
          style={{ width: 116, height: 9, background: C.accent, marginTop: 29 }}
        />
        <p
          style={{
            margin: "27px 0 0",
            fontSize: 30,
            fontWeight: 700,
            lineHeight: 1.48,
            color: C.muted,
            whiteSpace: "pre-line",
          }}
        >
          {scene.description}
        </p>
      </Enter>
    </div>
    <Enter
      delay={24}
      style={{ position: "absolute", left: 76, top: 780, width: 600 }}
    >
      <div style={{ borderLeft: `6px solid ${C.accent}`, paddingLeft: 23 }}>
        <div style={{ fontSize: 27, fontWeight: 900 }}>
          An observation is a clue.
        </div>
        <div
          style={{
            fontSize: 24,
            fontWeight: 700,
            lineHeight: 1.5,
            color: C.muted,
            marginTop: 12,
            maxWidth: 535,
          }}
        >
          Reporting activity does not directly measure rat abundance.
        </div>
      </div>
    </Enter>
    <Enter delay={8} style={{ position: "absolute", left: 760, top: 214 }}>
      <div
        style={{
          width: 1080,
          height: (1080 * 9) / 14,
          border: inkBorder,
          background: C.card,
          boxShadow: "12px 12px 0 #000",
        }}
      >
        <Img
          src={staticFile("en-2min/home.png")}
          style={{
            display: "block",
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
        />
      </div>
    </Enter>
    <div
      style={{
        position: "absolute",
        left: 760,
        right: 80,
        top: 952,
        display: "flex",
        alignItems: "center",
        gap: 24,
      }}
    >
      <div style={{ flex: 1, height: 2, background: C.ink }} />
      <div
        style={{
          fontSize: 22,
          fontWeight: 900,
          letterSpacing: ".075em",
          color: C.accentDark,
        }}
      >
        TAIPEI, TAIWAN / URBAN ECOLOGY
      </div>
    </div>
  </>
);

const Graph: React.FC<{ scene: Scene }> = ({ scene }) => {
  const f = useCurrentFrame();
  const blocks = [
    { id: "A", label: "Evidence source", x: 40, y: 25, color: "#B85A4B" },
    { id: "B", label: "Neighbour", x: 650, y: 25, color: "#C7934D" },
    { id: "C", label: "Indirect neighbour", x: 1260, y: 25, color: "#C5AF7A" },
    { id: "D", label: "Lower association", x: 40, y: 350, color: "#A3ABB0" },
    { id: "E", label: "Lower association", x: 650, y: 350, color: "#A3ABB0" },
    { id: "F", label: "Lower association", x: 1260, y: 350, color: "#A3ABB0" },
  ];
  return (
    <>
      <Enter style={{ position: "absolute", left: 76, top: 145 }}>
        <h1 style={{ fontSize: 65, letterSpacing: "-.035em", margin: 0 }}>
          Nearby blocks connect in different ways.
        </h1>
      </Enter>
      <div
        style={{
          position: "absolute",
          left: 76,
          top: 238,
          fontSize: 28,
          color: C.muted,
          fontWeight: 700,
        }}
      >
        Conceptual example · Colours show association with A, not measured rat
        density.
      </div>
      <div
        style={{
          position: "absolute",
          left: 76,
          right: 76,
          top: 305,
          height: 590,
          background: "#101716",
          border: inkBorder,
          borderRadius: 20,
          overflow: "hidden",
          boxShadow: shadow,
        }}
      >
        {[568, 1178].map((x) => (
          <div
            key={x}
            style={{
              position: "absolute",
              left: x,
              top: 0,
              width: 48,
              height: "100%",
              background: "#626A6E",
            }}
          />
        ))}
        <div
          style={{
            position: "absolute",
            top: 255,
            width: "100%",
            height: 65,
            background: "#4E565D",
            color: "#fff",
            textAlign: "center",
            fontWeight: 900,
            fontSize: 30,
            padding: 9,
          }}
        >
          MAJOR ROAD / STRONGER BARRIER
        </div>
        <svg
          width="1768"
          height="590"
          style={{ position: "absolute", inset: 0 }}
        >
          <path
            d="M450 122 H1260"
            fill="none"
            stroke="#fff"
            strokeWidth="8"
            strokeDasharray="19 13"
            strokeDashoffset={810 * (1 - ramp(f, 24, 65))}
          />
          <path
            d="M255 220 V350"
            fill="none"
            stroke="#fff"
            strokeWidth="7"
            strokeDasharray="12 14"
            opacity=".5"
          />
          <path
            d="M227 266 L283 313 M283 266 L227 313"
            stroke="#D65B37"
            strokeWidth="13"
          />
        </svg>
        {blocks.map((b, i) => (
          <Enter
            key={b.id}
            delay={i * 5}
            style={{ position: "absolute", left: b.x, top: b.y }}
          >
            <div
              style={{
                width: 430,
                height: 195,
                border: "3px solid #CFD3D1",
                borderRadius: 15,
                background: b.color,
                textAlign: "center",
                color: "#202428",
                padding: 20,
              }}
            >
              <div style={{ fontSize: 66, fontWeight: 900, lineHeight: 1 }}>
                {b.id}
              </div>
              <div style={{ fontSize: 29, fontWeight: 700, marginTop: 22 }}>
                {b.label}
              </div>
            </div>
          </Enter>
        ))}
      </div>
    </>
  );
};

const Network: React.FC<{
  label: string;
  color: string;
  dashed?: boolean;
  delay?: number;
}> = ({ label, color, dashed, delay = 0 }) => {
  const frame = useCurrentFrame();
  return (
    <Enter delay={delay} style={{ marginBottom: 15 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 18,
          fontSize: 22,
          fontWeight: 900,
        }}
      >
        <div style={{ width: 140 }}>{label}</div>
        <svg width="335" height="42">
          <path
            d="M18 21 H317"
            stroke={color}
            strokeWidth="5"
            strokeDasharray={dashed ? "10 7" : undefined}
            strokeDashoffset={180 * (1 - ramp(frame, delay + 5, delay + 35))}
          />
          {[18, 168, 317].map((x) => (
            <circle
              key={x}
              cx={x}
              cy="21"
              r="10"
              fill={C.card}
              stroke={color}
              strokeWidth="4"
            />
          ))}
        </svg>
      </div>
    </Enter>
  );
};

const Model: React.FC<{ scene: Scene }> = ({ scene }) => {
  const f = useCurrentFrame();
  const reveal = ramp(f, 140, 158);
  return (
    <>
      <Copy scene={scene}>
        <MiniRow
          title="3 : 3 : 1 : 1"
          detail="Reports · surveys · food · shelter / exploratory weights"
          color={C.yellow}
        />
        <div style={{ margin: "27px 0 15px" }}>
          <Network label="SURFACE" color={C.accent} delay={40} />
          <Network label="SEWER" color={C.teal} delay={70} />
          <Network label="STORMWATER" color={C.purple} dashed delay={95} />
        </div>
        <div
          style={{
            fontSize: 22,
            lineHeight: 1.5,
            color: C.muted,
            fontWeight: 700,
          }}
        >
          Up to two links; strongest path retained.
          <br />
          Only observation factors propagate.
        </div>
      </Copy>
      <Capture
        file="en-2min/model-local.png"
        label="Base factors / spatial propagation off"
        opacity={1 - reveal}
      />
      <Capture
        file="en-2min/model.png"
        label="Spatial propagation enabled / relative ranking"
        opacity={reveal}
      />
      <div
        style={{
          position: "absolute",
          right: 60,
          bottom: 110,
          width: 1020,
          background: C.card,
          border: inkBorder,
          padding: "18px 24px",
          opacity: ramp(f, 210, 230),
        }}
      >
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          {[C.accentDark, C.accent, "#E99843", C.yellow, "#F8E8A8"].map(
            (color, i) => (
              <div
                key={color}
                style={{
                  flex: 1,
                  background: color,
                  border: inkBorder,
                  textAlign: "center",
                  fontSize: 26,
                  fontWeight: 900,
                  padding: 8,
                }}
              >
                L{i + 1}
              </div>
            ),
          )}
        </div>
        <div style={{ fontSize: 21, fontWeight: 700, marginTop: 12 }}>
          Relative priorities—not population or infection estimates.
          <br />
          Relative to the selected factors. Unrated does not mean safe.
        </div>
      </div>
    </>
  );
};

const ModelExplainer: React.FC<{ scene: Scene }> = ({ scene }) => {
  const frame = useCurrentFrame();
  const phases = modelRecording.phases;
  const label =
    frame >= phases.limits
      ? "Scroll to data sources and limits"
      : frame >= phases.simulator
        ? "Switch ground / underground modes"
        : frame >= phases.example
          ? "Click a factor / inspect the result"
          : "Model explainer / scroll through the rules";
  return (
    <>
      <Copy scene={scene}>
        <MiniRow
          title="01 / Read the rules"
          detail="Trace model inputs to their data sources."
          color={frame < phases.example ? C.yellow : C.card}
        />
        <MiniRow
          title="02 / Try an example"
          detail="Switch factors and connectivity modes."
          color={
            frame >= phases.example && frame < phases.limits ? C.teal : C.card
          }
          delay={28}
        />
        <MiniRow
          title="03 / Check the limits"
          detail="Separate observations, derived scores, and mock data."
          color={frame >= phases.limits ? "#D9D0E4" : C.card}
          delay={45}
        />
        <div
          style={{
            fontSize: 23,
            fontWeight: 700,
            color: C.muted,
            marginTop: 25,
          }}
        >
          Interactive examples use synthetic values.
        </div>
      </Copy>
      <div
        style={{
          position: "absolute",
          left: 740,
          top: 205,
          width: 1092,
          height: (1092 * 9) / 14,
          border: inkBorder,
          background: C.card,
          boxShadow: shadow,
        }}
      >
        <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
          <OffthreadVideo
            muted
            src={staticFile("en-2min/risk-model-demo.mp4")}
            style={{
              display: "block",
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />
        </div>
        <Badge
          color={C.yellow}
          style={{ position: "absolute", left: 22, top: -24, fontSize: 20 }}
        >
          {label}
        </Badge>
      </div>
    </>
  );
};

const ResearchOverview: React.FC<{ scene: Scene }> = ({ scene }) => {
  const frame = useCurrentFrame();
  const change = ramp(frame, 100, 118);
  return (
    <>
      <Copy scene={scene}>
        {[
          { label: "Sampling", color: C.teal },
          { label: "Capture–mark–recapture", color: C.card },
          { label: "Genetic relationships", color: "#D9D0E4" },
        ].map((item, i) => (
          <Enter
            key={item.label}
            delay={12 + i * 8}
            style={{ marginBottom: 15 }}
          >
            <div
              style={{
                background: item.color,
                border: inkBorder,
                padding: "17px 20px",
                fontSize: 29,
                fontWeight: 900,
                boxShadow: "5px 5px 0 #000",
              }}
            >
              {item.label}
            </div>
          </Enter>
        ))}
        <div
          style={{
            fontSize: 23,
            fontWeight: 700,
            lineHeight: 1.45,
            color: C.muted,
            marginTop: 23,
          }}
        >
          Simulated research layers; links do not show actual routes.
        </div>
      </Copy>
      <Capture
        file="en-2min/research-daan.png"
        label="Field research / simulated demonstration"
        opacity={1 - change}
      />
      <Capture
        file="en-2min/genetics-daan.png"
        label="Relatedness / simulated demonstration"
        opacity={change}
      />
    </>
  );
};

const LongTerm: React.FC<{ scene: Scene }> = ({ scene }) => {
  const cards = [
    {
      no: "01",
      title: "Establish\na baseline",
      text: "Document survey methods and sampling effort.",
      color: C.yellow,
    },
    {
      no: "02",
      title: "Repeat\nfieldwork",
      text: "Return across seasons and after interventions.",
      color: C.teal,
    },
    {
      no: "03",
      title: "Compare\nthe evidence",
      text: "Account for changing effort and conditions.",
      color: "#B8ACCD",
    },
    {
      no: "04",
      title: "Test and\ncalibrate",
      text: "Refine assumptions using independent field evidence.",
      color: "#E99843",
    },
  ];
  return (
    <>
      <Enter style={{ position: "absolute", left: 76, top: 155 }}>
        <h1
          style={{
            fontSize: 84,
            lineHeight: 1,
            margin: 0,
            letterSpacing: "-.045em",
          }}
        >
          Repeat. Compare. Refine.
        </h1>
      </Enter>
      <Badge
        color={C.yellow}
        style={{ position: "absolute", left: 80, top: 280 }}
      >
        PROPOSED RESEARCH WORKFLOW
      </Badge>
      <div
        style={{
          position: "absolute",
          left: 76,
          right: 76,
          top: 410,
          display: "flex",
          gap: 28,
        }}
      >
        {cards.map((card, i) => (
          <Enter key={card.no} delay={i * 12} style={{ flex: 1 }}>
            <div
              style={{
                background: C.card,
                border: inkBorder,
                boxShadow: shadow,
                height: 385,
                padding: 28,
              }}
            >
              <Badge color={card.color}>{card.no}</Badge>
              <h2
                style={{
                  fontSize: 38,
                  lineHeight: 1.15,
                  whiteSpace: "pre-line",
                  margin: "26px 0 20px",
                  letterSpacing: "-.025em",
                }}
              >
                {card.title}
              </h2>
              <div
                style={{
                  fontSize: 25,
                  lineHeight: 1.45,
                  color: C.muted,
                  fontWeight: 700,
                }}
              >
                {card.text}
              </div>
            </div>
          </Enter>
        ))}
      </div>
      <div
        style={{
          position: "absolute",
          left: 80,
          top: 849,
          fontSize: 28,
          fontWeight: 900,
          color: C.accentDark,
        }}
      >
        The next research step: validate locally, then update the model.
      </div>
    </>
  );
};

const Brand: React.FC<{ scene: Scene }> = ({ scene }) => (
  <AbsoluteFill
    style={{
      alignItems: "center",
      justifyContent: "center",
      paddingBottom: 110,
    }}
  >
    <Enter>
      <div
        style={{
          background: C.card,
          border: "5px solid #000",
          boxShadow: "0 16px 0 #000",
          marginTop: 140,
          padding: "50px 180px",
          textAlign: "center",
        }}
      >
        <h1
          aria-label="Taipei Rat Lab"
          style={{
            margin: 0,
            fontSize: 132,
            fontWeight: 900,
            lineHeight: 0.98,
            letterSpacing: "-.045em",
            whiteSpace: "pre-line",
          }}
        >
          {scene.title}
        </h1>
      </div>
    </Enter>
    <Enter delay={20} style={{ display: "flex", gap: 18, marginTop: 80 }}>
      {["COMMUNITY", "FIELDWORK", "SPATIAL DATA", "RESEARCH"].map(
        (label, i) => (
          <Badge key={label} color={[C.yellow, C.teal, "#B8ACCD", C.card][i]}>
            {label}
          </Badge>
        ),
      )}
    </Enter>
  </AbsoluteFill>
);

const Outro: React.FC<{ scene: Scene }> = ({ scene }) => (
  <>
    <div
      style={{
        position: "absolute",
        left: 76,
        right: 76,
        top: 180,
        display: "flex",
        gap: 25,
      }}
    >
      {[
        "en-2min/observations.png",
        "tex/report-public.png",
        "en-2min/research.png",
      ].map((file, i) => (
        <Enter key={file} delay={i * 5} style={{ flex: 1 }}>
          <Img
            src={staticFile(file)}
            style={{
              display: "block",
              width: "100%",
              height: 320,
              objectFit: "cover",
              objectPosition: "top",
              border: inkBorder,
              boxShadow: shadow,
            }}
          />
        </Enter>
      ))}
    </div>
    <Enter
      delay={18}
      style={{
        position: "absolute",
        left: 76,
        right: 76,
        top: 580,
        textAlign: "center",
      }}
    >
      <div
        style={{
          fontSize: 81,
          fontWeight: 900,
          lineHeight: 1.05,
          letterSpacing: "-.045em",
        }}
      >
        Better evidence. Better questions.
      </div>
      <div
        style={{
          fontSize: 43,
          fontWeight: 900,
          marginTop: 20,
          color: C.accentDark,
        }}
      >
        {scene.description}
      </div>
      <div
        style={{
          fontSize: 34,
          fontWeight: 900,
          marginTop: 26,
          letterSpacing: ".04em",
          textTransform: "uppercase",
        }}
      >
        {scene.title}
      </div>
    </Enter>
    <Enter
      delay={40}
      style={{
        position: "absolute",
        left: 76,
        right: 76,
        top: 885,
        textAlign: "center",
        borderTop: `2px solid ${C.ink}`,
        color: C.accentDark,
        padding: "40px 24px",
        fontWeight: 400,
        fontSize: 24,
        lineHeight: 1.45,
      }}
    >
      Research prototype · Not an official government system
      <br />
      Survey, sampling, CMR, and genetic demonstration data are simulated.
    </Enter>
  </>
);

export const ScenePicture: React.FC<{ scene: Scene; index: number }> = ({
  scene,
  index,
}) => {
  const frame = useCurrentFrame();
  let picture: React.ReactNode;
  switch (scene.id) {
    case "question":
      picture = <Opening scene={scene} />;
      break;
    case "brand":
      picture = <Brand scene={scene} />;
      break;
    case "citizen":
      picture = (
        <>
          <Copy scene={scene}>
            <MiniRow
              title="01 / What did you observe?"
              detail="Observation type and optional photographs"
            />
            <MiniRow
              title="02 / Where and when?"
              detail="Location, observation date, and time"
              delay={42}
            />
            <MiniRow
              title="03 / Review and privacy"
              detail="Review before public display"
              delay={80}
              color={C.yellow}
            />
          </Copy>
          <Capture
            file="tex/report-public.png"
            scroll={190}
            label="Citizen report / form preview"
          />
        </>
      );
      break;
    case "survey":
      picture = (
        <>
          <Copy scene={scene}>
            <MiniRow
              title="Standardised field evidence"
              detail="Survey date, method, and findings"
            />
            <MiniRow
              title="One visit is a snapshot."
              detail="No signs found does not establish absence."
              color={C.yellow}
              delay={60}
            />
          </Copy>
          <Capture
            file="tex/official-survey.png"
            scroll={650}
            label="Field survey / demonstration form"
          />
          <Badge
            color={C.yellow}
            style={{ position: "absolute", left: 80, top: 823 }}
          >
            SURVEY DEMO DATA ARE SIMULATED
          </Badge>
        </>
      );
      break;
    case "observations":
      picture = (
        <Map
          scene={scene}
          file="en-2min/observations.png"
          label="Observations tab"
        >
          <MiniRow
            title="● Community reports"
            detail="What residents observed and reported"
            color="#F3D1BE"
          />
          <MiniRow
            title="■ Government surveys"
            detail="Structured field findings / simulated demo data"
            color={C.yellow}
            delay={45}
          />
        </Map>
      );
      break;
    case "environment":
      picture = (
        <Map
          scene={scene}
          file="en-2min/environment.png"
          label="Environment tab"
        >
          <MiniRow
            title="Food and shelter"
            detail="Markets, restaurants, waste facilities, parks"
            color="#D5E0CB"
          />
          <MiniRow
            title="Infrastructure"
            detail="Sewer and stormwater networks"
            color={C.teal}
            delay={45}
          />
          <div
            style={{
              fontSize: 23,
              fontWeight: 700,
              color: C.muted,
              marginTop: 28,
            }}
          >
            Contextual variables to investigate; locally unvalidated predictors.
          </div>
        </Map>
      );
      break;
    case "literature": {
      const change = ramp(frame, 100, 118);
      picture = (
        <>
          <Copy scene={scene}>
            <MiniRow
              title="Search and filter"
              detail="Find relevant research and technical guidance."
            />
            <MiniRow
              title="Read beyond a headline"
              detail="Methods, findings, limitations, original sources"
              color={C.teal}
              delay={40}
            />
          </Copy>
          <Capture
            file="en-2min/literature.png"
            label="Literature library"
            opacity={1 - change}
          />
          <Capture
            file="en-2min/literature-detail.png"
            label="Research detail / source links"
            opacity={change}
          />
        </>
      );
      break;
    }
    case "connectivity":
      picture = <Graph scene={scene} />;
      break;
    case "model":
      picture = <Model scene={scene} />;
      break;
    case "modelExplainer":
      picture = <ModelExplainer scene={scene} />;
      break;
    case "researchOverview":
      picture = <ResearchOverview scene={scene} />;
      break;
    case "longTerm":
      picture = <LongTerm scene={scene} />;
      break;
    case "outro":
      picture = <Outro scene={scene} />;
      break;
    default:
      throw new Error(`Unknown English scene: ${scene.id}`);
  }
  return (
    <Paper color={scene.id === "brand" ? C.accent : C.paper}>
      <div style={{ fontFamily: HEADING, fontWeight: 700 }}>
        <div
          style={{
            position: "absolute",
            top: 51,
            left: 76,
            right: 76,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Badge>{scene.chapter}</Badge>
          <div
            style={{ fontSize: 21, fontWeight: 900, letterSpacing: ".08em" }}
          >
            TAIPEI RAT LAB / {String(index + 1).padStart(2, "0")}
          </div>
        </div>
        {picture}
      </div>
    </Paper>
  );
};
