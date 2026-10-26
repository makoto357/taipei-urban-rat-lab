import type { ReactNode } from "react";

interface PageHeadingProps {
  label: string;
  englishLabel: string;
  title: ReactNode;
  description: string;
  titleId?: string;
  /** Add the content divider used by the report and literature pages. */
  divider?: boolean;
}

/** Shared intro for the four public pages; owns typography, spacing and wrapping. */
export function PageHeading({
  label,
  englishLabel,
  title,
  description,
  titleId,
  divider = false,
}: PageHeadingProps) {
  return (
    <header
      aria-labelledby={titleId}
      className={`flex min-w-0 flex-wrap items-end gap-x-8 gap-y-2 pb-5 pt-6 sm:pt-8 ${divider ? "border-b-2 border-ink" : ""}`}
    >
      <div className="min-w-0">
        <p className="m-0 mb-1.5 text-[15px] font-bold text-accent-text">
          {label}{" "}
          <span className="font-label font-normal tracking-[0.1em]">
            / {englishLabel}
          </span>
        </p>
        <h1
          id={titleId}
          className="m-0 text-[clamp(36px,5vw,46px)] font-black leading-[1.2]"
        >
          {title}
        </h1>
      </div>
      <p className="m-0 mb-2 min-w-0 flex-[1_1_420px] text-[15px] leading-[1.7]">
        {description}
      </p>
    </header>
  );
}
