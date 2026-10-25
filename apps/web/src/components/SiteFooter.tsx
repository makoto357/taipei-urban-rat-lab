import { Link } from "react-router-dom";

export function SiteFooter() {
  return (
    <footer className="mt-auto bg-ink text-card">
      <div className="mx-auto flex max-w-container flex-wrap items-center justify-between gap-8 px-4 py-9 sm:px-10">
        <div className="flex gap-10">
          <div className="flex flex-col gap-2 border-r border-card pr-10">
            <span className="font-label text-sm tracking-[0.1em] text-activity-l2">EXPLORE</span>
            <Link to="/map" className="text-sm text-card no-underline">
              地圖探索
            </Link>
            <Link to="/risk-model" className="text-sm text-card no-underline">
              風險模型
            </Link>
            <Link to="/report" className="text-sm text-card no-underline">
              鼠跡通報
            </Link>
            <Link to="/literature" className="text-sm text-card no-underline">
              知識小站
            </Link>
          </div>
          <div className="flex flex-col gap-2 border-r border-card pr-10">
            <span className="font-label text-sm tracking-[0.1em] text-activity-l2">ACCESS</span>
            <a href="#" className="text-sm text-card no-underline">
              GitHub
            </a>
            <Link to="/official" className="text-sm text-card no-underline">
              Staff Portal
            </Link>
          </div>
        </div>
        <div
          role="note"
          className="flex max-w-[360px] items-center gap-3.5 rounded-sm border-2 border-activity-l2 bg-activity-l1 px-[22px] py-4 text-ink"
        >
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#000000" strokeWidth={2} aria-hidden="true">
            <path d="M12 3 L22 20 H2 Z" strokeLinejoin="round" />
            <path d="M12 10v5M12 17.5v.5" />
          </svg>
          <p className="m-0 text-[13px] leading-[1.6]">
            本站為研究及展演用原型，
            <br />
            非台北市政府通報系統。
          </p>
        </div>
      </div>
    </footer>
  );
}
