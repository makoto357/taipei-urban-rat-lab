import React from "react";
import {AbsoluteFill, Easing, interpolate, useCurrentFrame} from "remotion";
import {
  C,
  CLAMP,
  Kicker,
  MockChip,
  Paper,
  RevealWords,
  SceneCopy,
  Screenshot,
  LAND,
  ramp,
} from "./theme";

export const Question: React.FC = () => {
  const frame = useCurrentFrame();
  const line = ramp(frame, 24, 54, Easing.out(Easing.cubic));
  return (
    <Paper>
      <Screenshot
        src="home.png"
        style={{
          position: "absolute",
          left: 750,
          top: 190,
          width: 1080,
          height: 694,
          transform: `rotate(${2.2 - 2.2 * ramp(frame, 0, 36)}deg) scale(${1.05 - .05 * ramp(frame, 0, 36)})`,
        }}
      />
      <div style={{position: "absolute", left: 90, top: 150, width: 850}}>
        <Kicker>城市觀察 / URBAN ECOLOGY</Kicker>
        <RevealWords
          words={["城市裡的", "老鼠，", "都在哪裡？"]}
          start={8}
          gap={5}
          colors={[undefined, C.accent, undefined]}
          style={{fontSize: 104, fontWeight: 900, lineHeight: 1.15, marginTop: 60}}
        />
        <div style={{width: 580, height: 12, marginTop: 40, background: C.accent, transformOrigin: "left", transform: `scaleX(${line})`}} />
      </div>
    </Paper>
  );
};

export const Problem: React.FC = () => {
  const frame = useCurrentFrame();
  const neq = ramp(frame, 24, 40, LAND);
  return (
    <Paper>
      <AbsoluteFill style={{alignItems: "center", justifyContent: "center"}}>
        <div style={{fontSize: 43, fontWeight: 700, color: C.muted, marginBottom: 34}}>一筆民眾通報，代表一次被記錄的觀察</div>
        <div style={{display: "flex", alignItems: "center", gap: 55, fontSize: 108, fontWeight: 900}}>
          <div style={{padding: "28px 42px", border: `4px solid ${C.ink}`, background: C.card}}>看見鼠跡</div>
          <div style={{fontSize: 170, color: C.accent, transform: `scale(${neq}) rotate(${6 * (1 - neq)}deg)`}}>≠</div>
          <div style={{padding: "28px 42px", border: `4px solid ${C.ink}`, background: C.card}}>知道鼠群</div>
        </div>
        <RevealWords
          words={["通報量不能直接當成鼠口數量、疾病風險或已確認活動範圍"]}
          start={44}
          style={{fontSize: 40, fontWeight: 700, color: C.accentDark, marginTop: 52}}
        />
      </AbsoluteFill>
    </Paper>
  );
};

export const Brand: React.FC = () => {
  const frame = useCurrentFrame();
  const land = ramp(frame, 2, 18, LAND);
  return (
    <Paper color={C.accent}>
      <AbsoluteFill style={{alignItems: "center", justifyContent: "center"}}>
        <div
          style={{
            padding: "45px 72px 52px",
            border: `5px solid ${C.ink}`,
            background: C.card,
            boxShadow: `0 ${18 + 28 * (1 - land)}px 0 ${C.ink}`,
            transform: `translateY(${-90 * (1 - land)}px) scale(${.8 + .2 * land}) rotate(${-2 + 2 * land}deg)`,
          }}
        >
          <div style={{fontSize: 118, lineHeight: 1, fontWeight: 900}}>臺北都市鼠患觀測實驗室</div>
          <div style={{fontSize: 61, lineHeight: 1, fontWeight: 900, letterSpacing: ".055em", marginTop: 32}}>TAIPEI URBAN RAT LAB</div>
        </div>
        <RevealWords
          words={["讓不同來源的城市證據，", "可以被區分、比較與追溯"]}
          start={28}
          style={{fontSize: 45, fontWeight: 900, marginTop: 78, color: C.card}}
        />
      </AbsoluteFill>
    </Paper>
  );
};

const MapScene: React.FC<{
  src: string;
  number: string;
  title: string[];
  body: string[];
  active: number;
  chip?: string;
}> = ({src, number, title, body, active, chip}) => {
  const frame = useCurrentFrame();
  const image = ramp(frame, 0, 28, Easing.out(Easing.cubic));
  return (
    <Paper>
      <Screenshot
        src={src}
        style={{
          position: "absolute",
          left: 800,
          top: 200,
          width: 1060,
          height: 681,
          transform: `translateX(${100 * (1 - image)}px)`,
          opacity: ramp(frame, 0, 10),
        }}
      />
      <SceneCopy number={number} title={title} body={body} active={active} y={270} />
      {chip && <MockChip style={{right: 105, top: 100}}>{chip}</MockChip>}
    </Paper>
  );
};

export const FieldRecords: React.FC = () => {
  const frame = useCurrentFrame();
  const survey = ramp(frame, 2, 22, LAND);
  const publicReport = ramp(frame, 12, 32, LAND);
  const scroll = ramp(frame, 42, 156, Easing.inOut(Easing.cubic));
  return (
    <Paper>
      <div style={{position: "absolute", left: 90, right: 90, top: 60, display: "flex", alignItems: "flex-end", justifyContent: "space-between"}}>
        <div>
          <Kicker>01 / 現場證據</Kicker>
          <RevealWords words={["民眾通報，", "與現場調查相互補充"]} start={4} style={{fontSize: 70, fontWeight: 900, marginTop: 28}} />
        </div>
        <div style={{width: 520, fontSize: 29, lineHeight: 1.5, fontWeight: 700, color: C.muted}}>
          民眾提供城市線索；調查人員用標準化表單，留下可比較的現場證據。
        </div>
      </div>
      <Screenshot
        src="official-survey.png"
        style={{position: "absolute", left: 90, top: 420, width: 820, height: 527, transform: `translateY(${70 * (1 - survey)}px) rotate(${-1.5 + 1.5 * survey}deg)`, opacity: survey}}
        imageStyle={{height: "auto", objectFit: "contain", transform: `translateY(${-520 * scroll}px)`}}
      />
      <Screenshot
        src="report-public.png"
        style={{position: "absolute", right: 90, top: 420, width: 820, height: 527, transform: `translateY(${70 * (1 - publicReport)}px) rotate(${1.5 - 1.5 * publicReport}deg)`, opacity: publicReport}}
        imageStyle={{height: "auto", objectFit: "contain", transform: `translateY(${-135 * scroll}px)`}}
      />
      <div style={{position: "absolute", left: 130, top: 390, padding: "8px 18px", background: C.accent, border: `2px solid ${C.ink}`, fontSize: 25, fontWeight: 900}}>鼠跡調查</div>
      <div style={{position: "absolute", right: 130, top: 390, padding: "8px 18px", background: C.yellow, border: `2px solid ${C.ink}`, fontSize: 25, fontWeight: 900}}>民眾通報</div>
    </Paper>
  );
};

export const ModelInputs: React.FC = () => (
  <MapScene
    src="map-risk.png"
    number="02 / 選擇因子"
    title={["觀測是觀測，", "環境是環境"]}
    body={["民眾通報與政府調查各權重 3；", "食物來源與躲藏空間各權重 1。"]}
    active={0}
    chip="3 : 3 : 1 : 1 為 MVP 可調參數"
  />
);

export const MovementStudy: React.FC = () => {
  const frame = useCurrentFrame();
  const one = ramp(frame, 12, 28, LAND);
  return (
    <Paper>
      <div style={{position: "absolute", left: 95, top: 80}}><Kicker>為什麼要看「連通」？</Kicker></div>
      <div style={{position: "absolute", left: 95, top: 220, width: 920}}>
        <RevealWords words={["都市溝鼠的近親，", "常聚集在很小的範圍"]} start={4} gap={6} style={{fontSize: 76, lineHeight: 1.2, fontWeight: 900}} />
        <div style={{marginTop: 46, fontSize: 34, lineHeight: 1.55, fontWeight: 700, color: C.muted}}>
          Vancouver 研究基於 605 隻鼠、1,246 組近親配對。<br />
          這支持「街廓尺度與都市阻隔可能重要」的研究假說。
        </div>
      </div>
      <div style={{position: "absolute", right: 105, top: 190, width: 670, height: 610, border: `4px solid ${C.ink}`, background: C.card, boxShadow: `14px 14px 0 ${C.ink}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", transform: `scale(${.72 + .28 * one}) rotate(${3 * (1 - one)}deg)`}}>
        <div style={{fontSize: 210, lineHeight: .9, fontWeight: 900, color: C.accentDark}}>1%</div>
        <div style={{fontSize: 39, fontWeight: 900, marginTop: 30}}>的近親配對跨越不同街廓</div>
        <div style={{fontSize: 27, fontWeight: 700, color: C.muted, marginTop: 20}}>75% 的近親捕獲距離 ≤ 33 m</div>
      </div>
      <div style={{position: "absolute", left: 95, bottom: 65, padding: "10px 18px", background: C.ink, color: C.card, fontSize: 22, fontWeight: 700}}>
        Byers et al. 2021 · DOI 10.1111/eva.13049 · Vancouver 研究，不是臺北校正參數
      </div>
    </Paper>
  );
};

export const ConnectivityGraph: React.FC = () => {
  const frame = useCurrentFrame();
  const trace = ramp(frame, 10, 42, Easing.out(Easing.cubic));
  const blocks = [
    {label: "A", text: "高鼠患", x: 60, y: 45, color: "#B85A4B"},
    {label: "B", text: "鄰近", x: 685, y: 45, color: "#C7934D"},
    {label: "C", text: "間接相鄰", x: 1310, y: 45, color: "#C5AF7A"},
    {label: "D", text: "較低關聯", x: 60, y: 455, color: "#A3ABB0"},
    {label: "E", text: "較低關聯", x: 685, y: 455, color: "#A3ABB0"},
    {label: "F", text: "較低關聯", x: 1310, y: 455, color: "#A3ABB0"},
  ];
  return (
    <Paper>
      <div style={{position: "absolute", left: 75, top: 45}}><Kicker>03 / SPATIAL CONNECTIVITY GRAPH</Kicker></div>
      <RevealWords words={["從高鼠患街廓，", "找出值得優先調查的鄰近街廓"]} start={2} style={{position: "absolute", left: 75, top: 145, fontSize: 61, fontWeight: 900}} />
      <div style={{position: "absolute", right: 75, top: 165, width: 430, fontSize: 25, lineHeight: 1.45, fontWeight: 700, color: C.muted}}>
        色階是與 A 的相對空間關聯示意，<br />不代表實測鼠患密度。
      </div>
      <div style={{position: "absolute", left: 55, top: 290, width: 1810, height: 730, overflow: "hidden", border: `4px solid ${C.ink}`, borderRadius: 34, background: "#0D1111", boxShadow: `12px 12px 0 ${C.ink}`}}>
        <div style={{position: "absolute", left: 555, top: 0, width: 74, height: 730, background: "#626A6E", borderRadius: 34}} />
        <div style={{position: "absolute", left: 1180, top: 0, width: 74, height: 730, background: "#626A6E", borderRadius: 34}} />
        <div style={{position: "absolute", left: 0, top: 325, width: 1810, height: 82, background: "#626A6E", borderRadius: 34}} />
        <div style={{position: "absolute", left: 36, right: 36, top: 343, height: 48, background: "#4E565D", borderTop: "3px solid #737B80", borderBottom: "3px solid #737B80", color: C.card, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 31, fontWeight: 900}}>
          主要道路 / 強阻隔
        </div>
        <svg width="1810" height="730" style={{position: "absolute", inset: 0, zIndex: 2}}>
          <path d="M490 165 H1310" fill="none" stroke="#FFF" strokeWidth="11" strokeDasharray="23 18" strokeDashoffset={820 * (1 - trace)} />
          <path d="M275 285 V455" fill="none" stroke="#FFF" strokeWidth="11" strokeDasharray="23 18" strokeDashoffset={170 * (1 - trace)} />
          <path d="M235 332 L315 400 M315 332 L235 400" fill="none" stroke="#B83B35" strokeWidth="18" />
        </svg>
        {blocks.map((block, index) => {
          const enter = ramp(frame, 2 + index * 3, 17 + index * 3, LAND);
          return (
            <div key={block.label} style={{position: "absolute", left: block.x, top: block.y, width: 430, height: 240, zIndex: 3, border: "4px solid #CBD0D2", borderRadius: 24, background: block.color, boxShadow: "inset 0 0 0 2px rgba(0,0,0,.25)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "#202428", opacity: enter, transform: `scale(${.86 + .14 * enter})`}}>
              <div style={{fontSize: 77, lineHeight: 1, fontWeight: 900}}>{block.label}</div>
              <div style={{fontSize: 39, fontWeight: 700, marginTop: 27}}>{block.text}</div>
            </div>
          );
        })}
      </div>
    </Paper>
  );
};

export const RoadDecay: React.FC = () => {
  const frame = useCurrentFrame();
  const result = ramp(frame, 24, 42, LAND);
  return (
    <Paper>
      <div style={{position: "absolute", left: 110, right: 110, top: 80, textAlign: "center"}}>
        <Kicker>04 / DISTANCE DECAY</Kicker>
        <RevealWords words={["距離越遠、道路越寬，", "連通權重越低"]} start={3} style={{justifyContent: "center", fontSize: 72, lineHeight: 1.2, fontWeight: 900, marginTop: 34}} />
      </div>
      <div style={{position: "absolute", left: 180, top: 390, width: 1040, padding: "50px 65px", border: `4px solid ${C.ink}`, background: C.card, boxShadow: `12px 12px 0 ${C.ink}`}}>
        <div style={{fontSize: 67, fontWeight: 900, fontFamily: "ui-monospace, monospace"}}>Wᵢⱼ = e<sup>−dᵢⱼ / 50</sup> × Bᵢⱼ</div>
        <div style={{marginTop: 36, display: "flex", gap: 20, alignItems: "center", fontSize: 31, fontWeight: 700}}>
          <span style={{padding: "12px 18px", background: C.yellow, border: `2px solid ${C.ink}`}}>30 m</span>
          <span>×</span>
          <span style={{padding: "12px 18px", background: C.accent, border: `2px solid ${C.ink}`}}>10 m 寬道路：0.60</span>
          <span>=</span>
          <span style={{fontSize: 54, color: C.accentDark, transform: `scale(${.7 + .3 * result})`}}>0.329</span>
        </div>
      </div>
      <div style={{position: "absolute", right: 120, top: 420, width: 460, padding: "38px", border: `4px solid ${C.ink}`, background: C.ink, color: C.card, boxShadow: `12px 12px 0 ${C.accent}`}}>
        <div style={{fontSize: 38, fontWeight: 900, color: C.yellow}}>這不是 32.9%</div>
        <div style={{fontSize: 29, lineHeight: 1.55, fontWeight: 700, marginTop: 25}}>它是相對連通權重，<br />不是鼠患傳播、穿越或感染機率。</div>
      </div>
      <div style={{position: "absolute", left: 180, bottom: 95, fontSize: 25, color: C.muted, fontWeight: 700}}>λ = 50 m 與道路權重均為待臺北實測校正的 heuristic</div>
    </Paper>
  );
};

export const MovementLayers: React.FC = () => {
  const frame = useCurrentFrame();
  const hop = ramp(frame, 12, 34, Easing.out(Easing.cubic));
  return (
    <Paper>
      <div style={{position: "absolute", left: 90, top: 65}}><Kicker>05 / 向外搜尋最多 2 HOPS</Kicker></div>
      <RevealWords words={["地面與地下，", "是兩套不同連通圖"]} start={4} style={{position: "absolute", left: 90, top: 175, fontSize: 72, fontWeight: 900}} />
      <div style={{position: "absolute", left: 90, right: 90, top: 355, display: "flex", gap: 35}}>
        {[
          {label: "地面", color: C.yellow, text: "街廓距離 × 道路阻隔", sub: "搜尋 100 m 內候選街廓"},
          {label: "地下", color: C.teal, text: "污水／雨水人孔與管線", sub: "管網分開，不猜測水流方向"},
        ].map((item, index) => (
          <div key={item.label} style={{flex: 1, minHeight: 430, padding: "38px 45px", border: `4px solid ${C.ink}`, background: C.card, boxShadow: `10px 10px 0 ${C.ink}`, transform: `translateY(${45 * (1 - ramp(frame, 9 + index * 8, 27 + index * 8, LAND))}px)`}}>
            <div style={{display: "inline-block", padding: "10px 20px", border: `3px solid ${C.ink}`, background: item.color, fontSize: 34, fontWeight: 900}}>{item.label}</div>
            <div style={{fontSize: 43, lineHeight: 1.4, fontWeight: 900, marginTop: 35}}>{item.text}</div>
            <div style={{fontSize: 27, lineHeight: 1.5, fontWeight: 700, color: C.muted, marginTop: 22}}>{item.sub}</div>
            <div style={{marginTop: 34, display: "flex", alignItems: "center", gap: 15, fontSize: 31, fontWeight: 900}}>
              <span>A</span><span style={{height: 8, flex: hop, background: item.color, border: `2px solid ${C.ink}`}} /><span>B</span><span style={{height: 8, flex: hop, background: item.color, border: `2px solid ${C.ink}`}} /><span>C</span>
            </div>
          </div>
        ))}
      </div>
      <div style={{position: "absolute", left: 330, right: 330, bottom: 65, padding: "12px 18px", textAlign: "center", background: C.ink, color: C.card, fontSize: 26, fontWeight: 900}}>
        每條路徑權重相乘；同一目的地取最高權重路徑，不重複加總
      </div>
    </Paper>
  );
};

export const DataTabs: React.FC = () => {
  const frame = useCurrentFrame();
  const slides = [
    {
      src: "map-observations.png",
      label: "TAB 01 / 鼠跡分佈",
      title: "先把觀測來源分開",
      body: "民眾通報與政府調查各權重 3；點位、日期與資料狀態可以分別檢查。",
      color: C.accent,
      start: 0,
      end: 90,
    },
    {
      src: "map-environment.png",
      label: "TAB 02 / 環境因子",
      title: "再比較環境條件",
      body: "食物來源與躲藏空間各權重 1；它們是待驗證因子，不是已證實成因。",
      color: C.yellow,
      start: 80,
      end: 173,
    },
  ];

  return (
    <Paper>
      <div style={{position: "absolute", left: 75, top: 55}}><Kicker>09 / DATA TABS</Kicker></div>
      <RevealWords words={["切換鼠跡與環境，", "看清模型用了什麼"]} start={2} style={{position: "absolute", left: 75, top: 145, fontSize: 60, fontWeight: 900}} />
      {slides.map((slide, index) => {
        const enter = ramp(frame, slide.start, slide.start + 12, LAND);
        const leave = ramp(frame, slide.end - 10, slide.end, Easing.in(Easing.cubic));
        const active = enter * (1 - leave);
        return (
          <React.Fragment key={slide.src}>
            <Screenshot
              src={slide.src}
              style={{position: "absolute", left: 75, top: 270, width: 1240, height: 797, opacity: active, transform: `translateX(${28 * (1 - enter) - 20 * leave}px)`}}
            />
            <div style={{position: "absolute", right: 75, top: 305, width: 465, padding: "32px", border: `3px solid ${C.ink}`, background: C.card, boxShadow: `9px 9px 0 ${C.ink}`, opacity: active, transform: `translateY(${35 * (1 - enter)}px)`}}>
              <div style={{display: "inline-block", padding: "9px 16px", border: `2px solid ${C.ink}`, background: slide.color, fontSize: 25, fontWeight: 900}}>{slide.label}</div>
              <div style={{fontSize: 43, lineHeight: 1.28, fontWeight: 900, marginTop: 28}}>{slide.title}</div>
              <div style={{fontSize: 27, lineHeight: 1.55, fontWeight: 700, color: C.muted, marginTop: 24}}>{slide.body}</div>
              <div style={{display: "flex", gap: 9, marginTop: 30}}>
                {slides.map((_, dot) => <div key={dot} style={{width: dot === index ? 44 : 14, height: 14, border: `2px solid ${C.ink}`, background: dot === index ? slide.color : "transparent"}} />)}
              </div>
            </div>
          </React.Fragment>
        );
      })}
    </Paper>
  );
};

const levels = [
  {label: "L1", color: C.accentDark, text: "相對最高"},
  {label: "L2", color: C.accent, text: "相對較高"},
  {label: "L3", color: "#E99843", text: "相對中等"},
  {label: "L4", color: C.yellow, text: "相對較低"},
  {label: "L5", color: "#F8E8A8", text: "相對最低"},
];

export const PriorityIndex: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <Paper>
      <Screenshot src="map-risk.png" style={{position: "absolute", left: 75, top: 206, width: 1040, height: 669, opacity: ramp(frame, 0, 12)}} />
      <div style={{position: "absolute", right: 80, top: 90, width: 660, padding: "42px", border: `4px solid ${C.ink}`, background: C.card, boxShadow: `12px 12px 0 ${C.ink}`}}>
        <Kicker>06 / 優先調查指數</Kicker>
        <div style={{fontSize: 59, lineHeight: 1.2, fontWeight: 900, marginTop: 35}}>最後得到的是<br />相對分級</div>
        <div style={{marginTop: 32, display: "flex", flexDirection: "column", gap: 10}}>
          {levels.map((level, index) => {
            const enter = ramp(frame, 13 + index * 4, 25 + index * 4, LAND);
            return <div key={level.label} style={{display: "grid", gridTemplateColumns: "90px 90px 1fr", alignItems: "center", gap: 14, opacity: enter, transform: `translateX(${35 * (1 - enter)}px)`}}><div style={{height: 38, background: level.color, border: `2px solid ${C.ink}`}} /><strong style={{fontSize: 29}}>{level.label}</strong><span style={{fontSize: 24, fontWeight: 700}}>{level.text}</span></div>;
          })}
        </div>
        <div style={{marginTop: 32, padding: "18px", background: C.yellow, border: `3px solid ${C.ink}`, fontSize: 27, lineHeight: 1.45, fontWeight: 900}}>
          L1 ≠ 已驗證高鼠患<br />
          未分級 ≠ 安全
        </div>
      </div>
    </Paper>
  );
};

export const Boundaries: React.FC = () => {
  const frame = useCurrentFrame();
  const cards = [
    {label: "現在可以", color: C.teal, text: "找出與已知鼠跡較連通的街廓\n安排優先調查"},
    {label: "仍需校正", color: C.yellow, text: "道路阻隔、距離衰減、地下通道\n需要臺北現場與基因資料"},
    {label: "不能宣稱", color: C.accent, text: "鼠口數、真實遷移率\n病原體傳播或感染機率"},
  ];
  return (
    <Paper>
      <div style={{position: "absolute", left: 110, right: 110, top: 90, textAlign: "center"}}>
        <Kicker>研究邊界 / WHAT THIS MODEL MEANS</Kicker>
        <RevealWords words={["把模型當成調查工具，", "不是真相機器"]} start={2} style={{justifyContent: "center", fontSize: 69, fontWeight: 900, marginTop: 38}} />
      </div>
      <div style={{position: "absolute", left: 95, right: 95, top: 440, display: "flex", gap: 30}}>
        {cards.map((card, index) => {
          const enter = ramp(frame, 12 + index * 7, 27 + index * 7, LAND);
          return <div key={card.label} style={{flex: 1, minHeight: 340, padding: "32px", border: `3px solid ${C.ink}`, background: C.card, boxShadow: `9px 9px 0 ${C.ink}`, opacity: enter, transform: `translateY(${60 * (1 - enter)}px)`}}><div style={{display: "inline-block", padding: "8px 15px", border: `2px solid ${C.ink}`, background: card.color, fontSize: 28, fontWeight: 900}}>{card.label}</div><div style={{whiteSpace: "pre-line", fontSize: 32, lineHeight: 1.55, fontWeight: 700, marginTop: 30}}>{card.text}</div></div>;
        })}
      </div>
    </Paper>
  );
};

export const Observations: React.FC = () => (
  <MapScene
    src="map-observations.png"
    number="01 / 分清證據"
    title={["民眾通報，", "不等於現場調查"]}
    body={["圓點與方塊分開呈現，", "來源、日期與資料狀態都能追溯。"]}
    active={0}
    chip="市府調查為模擬資料"
  />
);

export const Environment: React.FC = () => (
  <MapScene
    src="map-environment.png"
    number="02 / 疊上環境"
    title={["食物、躲藏空間，", "都回到同一張地圖"]}
    body={["市場、餐館、垃圾桶、公園與管線，", "用來比較可能的環境條件。"]}
    active={1}
  />
);

export const Connections: React.FC = () => (
  <MapScene
    src="map-risk.png"
    number="03 / 提出假設"
    title={["從街廓到地下，", "探索可能的連通"]}
    body={["道路、污水與雨水分開計算；", "它們是研究假設，不是鼠群移動證據。"]}
    active={2}
    chip="實驗性規則模型"
  />
);

export const Report: React.FC = () => {
  const frame = useCurrentFrame();
  const enter = ramp(frame, 0, 24, LAND);
  return (
    <Paper>
      <SceneCopy
        number="04 / 市民參與"
        title={["用手機，", "留下鼠跡線索"]}
        body={["選擇類型、標記地點、確認公開方式；", "通報通過審核後才進入公開地圖。"]}
        active={3}
        y={260}
      />
      <div style={{position: "absolute", left: 1215, top: 50, width: 525, height: 980, padding: 14, borderRadius: 58, background: C.ink, transform: `translateY(${100 * (1 - enter)}px) rotate(${3 * (1 - enter)}deg)`, boxShadow: "18px 24px 0 rgba(0,0,0,.2)"}}>
        <Screenshot src="report-mobile.png" radius={43} style={{width: "100%", height: "100%", border: 0, boxShadow: "none"}} />
      </div>
    </Paper>
  );
};

export const Knowledge: React.FC = () => (
  <MapScene
    src="literature.png"
    number="05 / 回到來源"
    title={["研究整理，", "每一篇都能回查"]}
    body={["方法、發現與限制分開閱讀，", "不讓一句數字取代完整證據。"]}
    active={4}
  />
);

const disclosureCards = [
  {label: "真實來源", color: C.accent, text: "開放資料與民眾通報\n保留來源與授權狀態"},
  {label: "專案衍生", color: C.teal, text: "街廓連通與相對分級\n不是實地觀測"},
  {label: "模擬資料", color: C.yellow, text: "調查、防治與研究紀錄\n只供功能與研究展示"},
];

export const Disclosure: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <Paper>
      <div style={{position: "absolute", left: 120, right: 120, top: 100, textAlign: "center"}}>
        <Kicker>資料揭露 / DATA PROVENANCE</Kicker>
        <RevealWords words={["先說清楚資料，", "再討論城市問題"]} start={6} style={{justifyContent: "center", fontSize: 82, fontWeight: 900, marginTop: 55}} />
      </div>
      <div style={{position: "absolute", left: 120, right: 120, top: 480, display: "flex", gap: 34}}>
        {disclosureCards.map((card, index) => {
          const enter = ramp(frame, 22 + index * 9, 40 + index * 9, LAND);
          return (
            <div key={card.label} style={{flex: 1, minHeight: 330, padding: "34px", border: `3px solid ${C.ink}`, background: C.card, boxShadow: `9px 9px 0 ${C.ink}`, transform: `translateY(${85 * (1 - enter)}px)`, opacity: ramp(frame, 20 + index * 9, 27 + index * 9)}}>
              <div style={{display: "inline-block", padding: "8px 16px", border: `2px solid ${C.ink}`, background: card.color, fontSize: 29, fontWeight: 900}}>{card.label}</div>
              <div style={{whiteSpace: "pre-line", fontSize: 37, lineHeight: 1.55, fontWeight: 700, marginTop: 35}}>{card.text}</div>
            </div>
          );
        })}
      </div>
    </Paper>
  );
};

export const Outro: React.FC = () => {
  const frame = useCurrentFrame();
  const settle = ramp(frame, 4, 34, LAND);
  const items = [
    {src: "map-risk.png", x: 70, y: 90, w: 610, h: 392, r: -4},
    {src: "report-public.png", x: 1290, y: 90, w: 560, h: 360, r: 4},
    {src: "official-survey.png", x: 70, y: 680, w: 610, h: 392, r: 3},
    {src: "map-observations.png", x: 1290, y: 700, w: 560, h: 360, r: -3},
  ];
  return (
    <Paper>
      {items.map((item, index) => {
        const enter = ramp(frame, 2 + index * 7, 20 + index * 7, LAND);
        const dx = item.x < 900 ? -260 : 260;
        const dy = item.y < 500 ? -160 : 160;
        return (
          <Screenshot
            key={item.src + index}
            src={item.src}
            style={{position: "absolute", left: item.x, top: item.y, width: item.w, height: item.h, transform: `translate(${dx * (1 - enter)}px, ${dy * (1 - enter)}px) rotate(${item.r}deg)`, opacity: enter}}
          />
        );
      })}
      <AbsoluteFill style={{alignItems: "center", justifyContent: "center"}}>
        <div style={{padding: "45px 60px", border: `5px solid ${C.ink}`, background: C.card, boxShadow: `0 ${16 + 28 * (1 - settle)}px 0 ${C.ink}`, transform: `scale(${.7 + .3 * settle}) rotate(${-2 + 2 * settle}deg)`, textAlign: "center"}}>
          <div style={{fontSize: 92, fontWeight: 900}}>TAIPEI RAT LAB</div>
          <div style={{fontSize: 38, fontWeight: 900, color: C.accentDark, marginTop: 18}}>讓城市線索，成為可驗證的調查優先順序</div>
        </div>
        <div style={{position: "absolute", bottom: 52, padding: "10px 22px", background: C.ink, color: C.card, fontSize: 24, fontWeight: 700, opacity: ramp(frame, 38, 52)}}>
          研究與展演用原型・非官方系統・部分資料為模擬
        </div>
      </AbsoluteFill>
    </Paper>
  );
};
