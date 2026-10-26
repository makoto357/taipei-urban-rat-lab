import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { PublicSnapshotSchema, type PublicSnapshot } from "@taipei-rat-lab/contracts";
import { SiteHeader } from "../components/SiteHeader";
import { SiteFooter } from "../components/SiteFooter";
import { db } from "../lib/firebase";
import { KnowledgeDeskIcon, MapDeskIcon, ReportDeskIcon } from "../features/home/DeskIcons";

const DESK_ITEMS = [
  {
    num: "01",
    to: "/map",
    title: "地圖",
    Icon: MapDeskIcon,
    description: (
      <>
        查看鼠跡與防治紀錄，
        <br />
        從地圖認識城市環境。
      </>
    ),
  },
  {
    num: "02",
    to: "/report",
    title: "通報",
    Icon: ReportDeskIcon,
    description: (
      <>
        回報你看到的鼠跡，
        <br />
        讓更多市民了解現況。
      </>
    ),
  },
  {
    num: "03",
    to: "/literature",
    title: "知識",
    Icon: KnowledgeDeskIcon,
    description: (
      <>
        認識鼠類與防治研究，
        <br />
        從知識出發打造更宜居的城市。
      </>
    ),
  },
] as const;

export function HomePage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-container px-4 sm:px-10">
        <Hero />
        <DataSnapshot />
        <PublicDesk />
        <About />
      </main>
      <SiteFooter />
    </>
  );
}

function Hero() {
  return (
    <section className="grid gap-10 border-b-[3px] border-ink py-12 pb-14 lg:grid-cols-[minmax(0,4fr)_minmax(0,5fr)] lg:items-stretch">
      <div className="flex min-w-0 flex-col gap-5">
        <p className="m-0 text-[15px] font-bold text-accent-text">
          城市觀察 <span className="font-label font-normal tracking-[0.1em]">/ URBAN ECOLOGY</span>
        </p>
        <h1 className="m-0 text-[clamp(44px,5.6vw,76px)] font-black leading-[1.15] tracking-[0.02em]">
          城市裡的老鼠，
          <br />
          <span className="text-accent">都在哪裡？</span>
        </h1>
        <p className="m-0 max-w-[30em] text-[17px] leading-[1.8]">
          結合市民通報、現場調查與都市空間研究，讓鼠跡觀測與防治紀錄更透明，讓防治行動更有依據。
        </p>
        <p className="m-0 max-w-[34em] font-body text-[13px] leading-[1.7] text-[#4A463C]">
          本站呈現的是已登錄的觀測紀錄與資料涵蓋範圍，不是即時的鼠患風險預測。
        </p>
        <div className="mt-2 grid grid-cols-1 gap-4 min-[400px]:grid-cols-2 sm:flex sm:flex-wrap">
          <Link
            to="/map"
            className="button-primary min-h-[52px] w-full gap-2.5 px-9 text-lg sm:w-auto"
          >
            探索地圖 <span aria-hidden="true">↗</span>
          </Link>
          <Link
            to="/report"
            className="button-secondary min-h-[52px] w-full gap-2.5 px-9 text-lg sm:w-auto"
          >
            通報鼠跡 <span aria-hidden="true">↗</span>
          </Link>
        </div>
      </div>
      <figure
        role="img"
        aria-label="插畫：一隻黑色老鼠從人孔探出頭，背景是有淡水河與台北 101 的彩色城市地圖"
        className="relative m-0 aspect-[1122/615] min-w-0 overflow-hidden border border-ink bg-cover bg-center lg:aspect-auto lg:h-full"
        style={{ backgroundImage: "url('/assets/images/main-bg.png')" }}
      >
        <img
          src="/assets/images/main-rat.png"
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute bottom-[18%] left-[18%] w-[45%] max-w-none select-none"
        />
      </figure>
    </section>
  );
}

const pad = (n: number) => String(n).padStart(2, "0");
const formatMonth = (date: Date) => `${date.getFullYear()}/${pad(date.getMonth() + 1)}`;
const formatDay = (date: Date) => `${formatMonth(date)}/${pad(date.getDate())}`;

type SnapshotState = { status: "loading" } | { status: "ready"; data: PublicSnapshot | null };

/** 讀 publicStats/snapshot（Functions 彙總的計數，任何人可讀）；沒有文件或讀取失敗就顯示「尚無資料」。 */
function usePublicSnapshot(): SnapshotState {
  const [state, setState] = useState<SnapshotState>({ status: "loading" });
  useEffect(() => {
    let live = true;
    getDoc(doc(db, "publicStats", "snapshot"))
      .then((snapshot) => {
        const parsed = snapshot.exists() ? PublicSnapshotSchema.safeParse(snapshot.data()) : null;
        if (live) setState({ status: "ready", data: parsed?.success ? parsed.data : null });
      })
      .catch(() => live && setState({ status: "ready", data: null }));
    return () => {
      live = false;
    };
  }, []);
  return state;
}

function DataSnapshot() {
  const state = usePublicSnapshot();
  const data = state.status === "ready" ? state.data : null;
  const empty = state.status === "ready" && data === null;
  const placeholder = state.status === "loading" ? "載入中…" : "尚無資料";
  const start = data?.coverageStart?.toDate();
  const end = data?.coverageEnd?.toDate();

  return (
    <section
      aria-labelledby="snapshot"
      className="grid items-center gap-x-12 gap-y-5 border-b-2 border-ink py-8 lg:grid-cols-[220px_minmax(0,1fr)]"
    >
      <div className="flex flex-col gap-1">
        <h2 id="snapshot" className="m-0 text-[28px] font-black">
          即時摘要
        </h2>
        <span className="font-label text-[13px] tracking-[0.1em]">DATA SNAPSHOT</span>
      </div>
      <dl className="m-0 grid grid-cols-1 md:grid-cols-3">
        <div className="border-t border-ink px-[18px] py-3.5 md:border-r md:border-t-0">
          <dt className="font-body text-[13px]">近 30 天已查核鼠跡</dt>
          <dd className="m-0 mt-1.5 text-[28px] font-black">
            {data ? (
              <>
                {data.verifiedTraces30d.toLocaleString("zh-TW")} <span className="text-[15px] font-bold">筆</span>
              </>
            ) : (
              <span className="text-[22px] text-muted">{placeholder}</span>
            )}
          </dd>
        </div>
        <div className="border-t border-ink px-[18px] py-3.5 md:border-r md:border-t-0">
          <dt className="font-body text-[13px]">資料涵蓋期間</dt>
          <dd className="m-0 mt-1.5 text-[22px] font-black leading-[1.6]">
            {start && end ? `${formatMonth(start)} – ${formatMonth(end)}` : <span className="text-muted">{placeholder}</span>}
          </dd>
        </div>
        <div className="border-t border-ink px-[18px] py-3.5 md:border-t-0">
          <dt className="font-body text-[13px]">最後更新</dt>
          <dd className="m-0 mt-1.5 text-[22px] font-black leading-[1.6]">
            {data ? formatDay(data.updatedAt.toDate()) : <span className="text-muted">{placeholder}</span>}
          </dd>
        </div>
      </dl>
      <p className="m-0 font-body text-xs text-[#4A463C] lg:col-span-2">
        「已查核」指經市府人員現場確認的鼠跡。數字是目前已登錄的筆數，不代表全市實際狀況。
        {empty && "目前還沒有可公開的查核資料。"}
      </p>
    </section>
  );
}

function PublicDesk() {
  return (
    <section aria-labelledby="desk" className="border-b-2 border-ink py-14">
      <div className="mb-7 flex items-baseline gap-3.5">
        <h2 id="desk" className="m-0 text-[38px] font-black">
          參與城市觀察
        </h2>
        <span className="font-label text-sm tracking-[0.1em]">PUBLIC DESK</span>
      </div>
      <div className="grid grid-cols-1 gap-5 min-[900px]:grid-cols-3">
        {DESK_ITEMS.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className="flex flex-col gap-3.5 border-r-2 border-t border-ink bg-paper px-[26px] pb-[26px] pt-[22px] text-ink no-underline"
          >
            <div className="flex items-start justify-between">
              <span className="font-label text-base text-accent-text">{item.num}</span>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#000000" strokeWidth={2.2} aria-hidden="true">
                <path d="M4 12h16M14 6l6 6-6 6" />
              </svg>
            </div>
            <div className="flex items-center gap-5">
              <item.Icon />
              <div>
                <h3 className="m-0 mb-2 text-[30px] font-black">{item.title}</h3>
                <p className="m-0 text-[15px] leading-[1.7]">{item.description}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

function About() {
  return (
    <section aria-labelledby="about" className="flex flex-wrap gap-x-16 gap-y-6 py-14 pb-[72px]">
      <div className="flex flex-[0_1_300px] items-baseline gap-3.5">
        <h2 id="about" className="m-0 text-[38px] font-black">
          關於這個計畫
        </h2>
        <span className="font-label text-sm tracking-[0.1em]">ABOUT</span>
      </div>
      <p className="m-0 min-w-0 flex-[1_1_520px] text-base leading-[1.9]">
        臺北都市鼠患觀測計畫（Taipei Rat Lab）致力於探索都市鼠患與城市環境之間的關係。我們結合民眾通報、市府現場調查、防治紀錄與都市空間資料，建立公開透明的鼠患資訊平台。透過互動地圖，民眾可以查詢鼠跡分布、環境條件與投藥資訊，也能回報日常生活中的觀察，參與城市環境監測。同時，我們整理都市鼠類生態、公共衛生與國內外研究成果，讓更多人理解鼠患形成的複雜因素。我們希望從持續累積的觀測資料出發，促進市民參與、科學研究與公共治理之間的對話，探索更有效、安全且有科學依據的都市鼠患防治方式。
      </p>
    </section>
  );
}
