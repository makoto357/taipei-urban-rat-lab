import { Link } from "react-router-dom";
import { SiteHeader } from "../components/SiteHeader";
import { SiteFooter } from "../components/SiteFooter";
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

const HOW_TO_READ = [
  { en: "ACTIVITY", zh: "觀測活動", body: "這裡觀察到多少鼠跡或處置紀錄。" },
  { en: "COVERAGE", zh: "資料涵蓋", body: "這裡被調查得多完整、多近期。" },
  { en: "EVIDENCE", zh: "證據可信度", body: "資料來源與查核方式，能不能支持這個判讀。" },
] as const;

export function HomePage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-container px-10">
        <Hero />
        <DataSnapshot />
        <PublicDesk />
        <HowToRead />
        <About />
      </main>
      <SiteFooter />
    </>
  );
}

function Hero() {
  return (
    <section className="flex flex-wrap items-center gap-10 border-b-[3px] border-ink py-12 pb-14">
      <div className="flex min-w-0 flex-[1_1_420px] flex-col gap-5">
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
        <div className="mt-2 flex flex-wrap gap-4">
          <Link
            to="/map"
            className="inline-flex min-h-[52px] items-center gap-2.5 border-2 border-ink bg-ink px-9 text-lg font-bold text-card no-underline"
          >
            探索鼠患地圖 <span aria-hidden="true">↗</span>
          </Link>
          <Link
            to="/report"
            className="inline-flex min-h-[52px] items-center gap-2.5 border-2 border-ink bg-card px-9 text-lg font-bold text-ink no-underline"
          >
            通報鼠跡 <span aria-hidden="true">↗</span>
          </Link>
        </div>
      </div>
      <figure className="m-0 min-w-0 flex-[1.25_1_520px]">
        {/* TODO: 插畫來源見 docs/design/assets/illustrations/hero-rat-map.png */}
        <img
          src="/assets/illustrations/hero-rat-map.png"
          alt="插畫：一隻黑色老鼠從人孔探出頭，背景是有淡水河與台北 101 的彩色城市地圖"
          className="block aspect-[1122/521] w-full object-cover"
        />
      </figure>
    </section>
  );
}

function DataSnapshot() {
  return (
    <section
      aria-labelledby="snapshot"
      className="flex flex-wrap items-center gap-x-12 gap-y-5 border-b-2 border-ink py-8"
    >
      <div className="flex flex-[0_1_220px] flex-col gap-1">
        <h2 id="snapshot" className="m-0 text-[28px] font-black">
          即時摘要
        </h2>
        <span className="font-label text-[13px] tracking-[0.1em]">DATA SNAPSHOT</span>
      </div>
      <dl className="m-0 grid flex-[999_1_560px] grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">
        <div className="border-[1.5px] border-ink bg-card px-[18px] py-3.5">
          <dt className="font-body text-[13px]">近 30 天已查核鼠跡</dt>
          <dd className="m-0 mt-1.5 text-[28px] font-black">
            [數量] <span className="text-[15px] font-bold">筆</span>
          </dd>
        </div>
        <div className="border-[1.5px] border-ink bg-card px-[18px] py-3.5">
          <dt className="font-body text-[13px]">資料涵蓋期間</dt>
          <dd className="m-0 mt-1.5 text-[22px] font-black leading-[1.6]">[YYYY/MM] – [YYYY/MM]</dd>
        </div>
        <div className="border-[1.5px] border-ink bg-card px-[18px] py-3.5">
          <dt className="font-body text-[13px]">最後更新</dt>
          <dd className="m-0 mt-1.5 text-[22px] font-black leading-[1.6]">[YYYY/MM/DD]</dd>
        </div>
      </dl>
      <p className="m-0 flex-[1_1_100%] font-body text-xs text-[#4A463C]">
        「已查核」指經市府人員現場確認的鼠跡；資料不足時，這裡不顯示數字。
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
      <div className="grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-5">
        {DESK_ITEMS.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className="flex flex-col gap-3.5 border-r-2 border-t-2 border-ink bg-paper px-[26px] pb-[26px] pt-[22px] text-ink no-underline"
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

function HowToRead() {
  return (
    <section aria-labelledby="howto" className="flex flex-col gap-7 border-b-2 border-ink py-14">
      <div className="flex items-baseline gap-3.5">
        <h2 id="howto" className="m-0 text-[38px] font-black">
          如何判讀
        </h2>
        <span className="font-label text-sm tracking-[0.1em]">HOW TO READ</span>
      </div>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-5">
        {HOW_TO_READ.map((item) => (
          <div key={item.en} className="flex flex-col gap-2 border-t-2 border-ink px-[22px] py-5">
            <span className="font-label text-[13px] tracking-[0.1em] text-accent-text">{item.en}</span>
            <h3 className="m-0 text-[22px] font-black">{item.zh}</h3>
            <p className="m-0 font-body text-sm leading-[1.75]">{item.body}</p>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-x-8 gap-y-5 border-2 border-ink bg-card px-6 py-[22px]">
        <div className="flex flex-[1_1_320px] flex-col gap-2.5">
          <span className="self-start border-[1.5px] border-ink px-2.5 py-0.5 font-label text-xs tracking-[0.1em]">
            EXAMPLE 範例
          </span>
          <p className="m-0 text-[17px] font-bold leading-[1.7]">
            某街廓近 30 天有 2 筆已查核鼠跡，但最近一次全面調查距今 8 個月。
          </p>
          <p className="m-0 font-body text-sm leading-[1.75]">解讀：這裡確實有鼠跡，但調查不夠新，無法判斷整體狀況是否改善。</p>
        </div>
        <dl className="m-0 grid flex-[1_1_260px] grid-cols-[auto_1fr] content-center gap-x-4 gap-y-2 font-body text-sm">
          <dt className="font-medium">觀測活動</dt>
          <dd className="m-0">有紀錄</dd>
          <dt className="font-medium">資料涵蓋</dt>
          <dd className="m-0">低</dd>
          <dt className="font-medium">證據可信度</dt>
          <dd className="m-0">中</dd>
        </dl>
      </div>
      <ul className="m-0 list-disc pl-5 font-body text-sm leading-[1.9]">
        <li>
          <strong className="font-medium">沒有資料，不代表沒有老鼠</strong>，可能只是還沒被調查。
        </li>
        <li>
          <strong className="font-medium">「已移除」只代表該次處置完成</strong>，不代表現場已經安全。
        </li>
        <li>每筆資料都會標示來源與日期，請一併參考。</li>
      </ul>
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
