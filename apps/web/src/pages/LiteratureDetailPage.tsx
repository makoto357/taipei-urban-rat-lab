import { useEffect, type MouseEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { SiteHeader } from "../components/SiteHeader";
import { SiteFooter } from "../components/SiteFooter";
import { TYPE_COLORS, TYPE_LABELS, useLiteratureDetail } from "../features/literature/data";
import "../features/literature/literature.css";

/** 文獻詳情頁，對應 Knowledge.dc.html 的詳情視圖。contentHtml 於 build 時已 sanitize。 */
export function LiteratureDetailPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const state = useLiteratureDetail(id);

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [id]);

  // 站內連結（build 時已改寫成 /literature/<id>#<section>）走 client-side 導覽，不整頁重載。
  const onContentClick = (event: MouseEvent<HTMLDivElement>) => {
    const anchor = (event.target as HTMLElement).closest<HTMLAnchorElement>("a[data-resource-id]");
    if (!anchor || event.metaKey || event.ctrlKey || event.shiftKey) return;
    event.preventDefault();
    navigate(anchor.getAttribute("href") ?? "/literature");
  };

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-container flex-1 px-4 pb-12 pt-6 sm:px-10 sm:pb-[72px] sm:pt-8">
        <Link to="/literature" className="inline-flex min-h-11 items-center font-bold">← 回文獻列表</Link>

        {state.status === "loading" && <p className="mt-6 font-body">載入中…</p>}
        {state.status === "error" && (
          <p role="alert" className="mt-6 font-body">找不到這篇文獻，或資料暫時無法載入。</p>
        )}

        {state.status === "ready" && (() => {
          const item = state.data;
          const prev = item.navigation.find((n) => n.relation === "previous");
          const next = item.navigation.find((n) => n.relation === "next");
          return (
            <div className="mt-4 grid min-w-0 grid-cols-1 gap-6 sm:gap-10 lg:grid-cols-[minmax(0,1fr)_300px]">
              <article className="min-w-0">
                <header className="flex min-w-0 flex-col gap-3 break-words border-b-[3px] border-ink pb-6">
                  <div className="flex flex-wrap items-center gap-2 text-[13px]">
                    <span
                      className="tag border-[1.5px] border-ink px-2 py-0.5 font-bold"
                      style={{ background: TYPE_COLORS[item.resourceType] }}
                    >
                      {TYPE_LABELS[item.resourceType]}
                    </span>
                    <span className="font-label">{item.year ?? "無年份"}</span>
                  </div>
                  <h1 className="m-0 text-[28px] font-black leading-[1.3] sm:text-[34px]">{item.title}</h1>
                  {item.fullTitle !== item.title && (
                    <p className="m-0 font-body text-[15px] text-muted">{item.fullTitle}</p>
                  )}
                  <p className="m-0 font-body text-sm">{item.authorsText}　{item.publicationText}</p>
                  <ul className="m-0 flex list-none flex-wrap gap-1.5 p-0">
                    {item.tags.map((tag) => (
                      <li key={tag} className="tag max-w-full border border-ink px-2 py-0.5 text-xs">{tag}</li>
                    ))}
                  </ul>
                </header>

                <div className="mt-8" onClick={onContentClick}>
                  <p className="m-0 mb-3 font-body text-xs text-muted sm:hidden">表格與圖表可左右滑動查看。</p>
                  <div className="literature-content" dangerouslySetInnerHTML={{ __html: item.contentHtml }} />
                </div>

                <p className="warning-card mt-8 border-l-4 border-accent bg-activity-l1 p-4 font-body text-sm leading-[1.8]">
                  這是人工整理的重點，不是原文全文，也可能有遺漏或詮釋上的落差。引用或做決策前，請回到原始來源確認。
                </p>

                <nav aria-label="上下篇文獻" className="mt-8 grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2">
                  {prev ? (
                    <Link to={`/literature/${prev.resourceId}`} className="min-w-0 break-words border-t border-ink py-4 no-underline">
                      <span className="block font-label text-xs text-muted">← 上一篇</span>
                      <span className="font-bold">{prev.title}</span>
                    </Link>
                  ) : null}
                  {next && (
                    <Link to={`/literature/${next.resourceId}`} className="min-w-0 break-words border-t border-ink py-4 no-underline sm:col-start-2 sm:text-right">
                      <span className="block font-label text-xs text-muted">下一篇 →</span>
                      <span className="font-bold">{next.title}</span>
                    </Link>
                  )}
                </nav>
              </article>

              <aside className="grid min-w-0 grid-cols-1 gap-6 self-start break-words sm:grid-cols-2 lg:sticky lg:top-6 lg:flex lg:max-h-[calc(100dvh-3rem)] lg:flex-col lg:overflow-y-auto">
                <section aria-labelledby="lit-sources" className="border-2 border-ink bg-card p-5">
                  <h2 id="lit-sources" className="m-0 mb-3 text-base font-black">原始來源</h2>
                  <ul className="m-0 flex list-none flex-col gap-2 p-0 text-sm">
                    {item.sourceLinks.map((link, i) =>
                      "url" in link ? (
                        <li key={i}>
                          <a href={link.url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 max-w-full items-center">{link.label}</a>
                        </li>
                      ) : null,
                    )}
                  </ul>
                </section>
                <nav aria-labelledby="lit-toc" className="border-2 border-ink bg-card p-5">
                  <h2 id="lit-toc" className="m-0 mb-3 text-base font-black">章節目錄</h2>
                  <ol className="m-0 flex list-none flex-col gap-2 p-0 text-sm">
                    {item.sections.map((section) => (
                      <li key={section.id}>
                        <a href={`#${section.id}`} className="inline-flex min-h-11 max-w-full items-center">{section.title}</a>
                      </li>
                    ))}
                  </ol>
                </nav>
              </aside>
            </div>
          );
        })()}
      </main>
      <SiteFooter />
    </>
  );
}
