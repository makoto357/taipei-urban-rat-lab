import { chromium } from "../../node_modules/@playwright/test/index.mjs";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const base = process.env.VIDEO_BASE_URL ?? "http://127.0.0.1:4173";
const mode = process.argv[2] ?? "all";
if (!["all", "homepage", "risk-model"].includes(mode)) {
  throw new Error("Capture mode must be all, homepage, or risk-model.");
}
if (!["127.0.0.1", "localhost"].includes(new URL(base).hostname)) {
  throw new Error(
    "English video capture requires a local site with repository data.",
  );
}
const out = new URL("../public/en-2min/", import.meta.url);
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch();
const assets = [];
try {
  const context = await browser.newContext({
    viewport: { width: 1680, height: 1080 },
    deviceScaleFactor: 1,
    colorScheme: "light",
  });
  // A fresh context is signed out. Block cloud data/auth/storage requests:
  // maps use repository snapshots; this script never submits any form.
  await context.route(
    /https:\/\/(?:firestore\.googleapis\.com|identitytoolkit\.googleapis\.com|securetoken\.googleapis\.com|firebasestorage\.googleapis\.com)\//,
    (route) => route.abort(),
  );
  const page = await context.newPage();
  const capture = async (name, source) => {
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: fileURLToPath(new URL(name + ".png", out)) });
    assets.push({
      name,
      source,
      viewport: [page.viewportSize().width, page.viewportSize().height],
      capturedAt: new Date().toISOString(),
      privateCloudRequests: "blocked",
    });
    console.log("Captured " + name);
  };
  if (mode !== "risk-model") {
    await page.setViewportSize({ width: 1344, height: 864 });
    await page.goto(base + "/", { waitUntil: "domcontentloaded" });
    await page
      .getByRole("heading", { level: 1, name: /城市裡的老鼠/ })
      .waitFor();
    await page.evaluate(async () => {
      await document.fonts.ready;
      await Promise.all(Array.from(document.images, (image) => image.decode()));
      const figure = document.querySelector("main figure");
      const background = figure && getComputedStyle(figure).backgroundImage;
      const url = background?.match(/url\(["']?(.*?)["']?\)/)?.[1];
      if (url) {
        const image = new Image();
        image.src = url;
        await image.decode();
      }
    });
    await page.waitForTimeout(1400);
    await capture("home", "/; updated homepage, top of page");
  }
  await page.setViewportSize({ width: 1680, height: 1080 });
  if (mode === "all") {
    for (const [name, topic] of [
      ["observations", "observations"],
      ["environment", "environment"],
      ["research", "distribution"],
      ["comparison", "comparison"],
      ["model", "risk"],
    ]) {
      await page.goto(`${base}/map?topic=${topic}`, {
        waitUntil: "domcontentloaded",
      });
      await page.getByRole("tab", { selected: true }).waitFor();
      await page.locator(".maplibregl-canvas").waitFor();
      await page.waitForTimeout(9000);
      await page.getByRole("tablist").scrollIntoViewIfNeeded();
      await page.evaluate(() => window.scrollBy(0, -30));
      await page.waitForTimeout(800);
      await capture(name, `/map?topic=${topic}`);
      if (topic === "distribution") {
        // A separate static framing, not an animated zoom in the video.
        await page
          .getByRole("combobox", { name: "行政區篩選", exact: true })
          .selectOption("大安區");
        await page.waitForTimeout(2600);
        await capture(
          "research-daan",
          "/map?topic=distribution; Daan district selected",
        );
        await page
          .getByRole("checkbox", { name: "標記再捕 CMR", exact: true })
          .uncheck();
        await page.waitForTimeout(700);
        await capture(
          "genetics-daan",
          "/map?topic=distribution; Daan district; genetic layers only",
        );
      }
      if (topic === "risk") {
        for (const label of ["地面移動", "下水道移動"]) {
          const checkbox = page.getByRole("checkbox", {
            name: label,
            exact: true,
          });
          await checkbox.uncheck();
        }
        await page.waitForTimeout(900);
        await capture(
          "model-local",
          "/map?topic=risk; surface and underground off",
        );
      }
    }
    await page.goto(base + "/literature", { waitUntil: "domcontentloaded" });
    await page.getByRole("heading", { name: "鼠患研究與防治知識" }).waitFor();
    await page.waitForTimeout(600);
    await capture("literature", "/literature");
    const index = await page.request
      .get(base + "/literature/index.json")
      .then((r) => r.json());
    const article = index.resources.find(
      (r) => r.resourceType === "research_article",
    );
    if (!article) throw new Error("No research article available");
    await page.goto(`${base}/literature/${article.id}`, {
      waitUntil: "domcontentloaded",
    });
    await page.locator(".literature-content").waitFor();
    await page.waitForTimeout(400);
    await capture("literature-detail", `/literature/${article.id}`);
    await page.locator(".literature-content").scrollIntoViewIfNeeded();
    await page.waitForTimeout(400);
    await capture(
      "literature-methods",
      `/literature/${article.id}; article body`,
    );
  }
  if (mode === "all" || mode === "risk-model") {
    await page.setViewportSize({ width: 1344, height: 864 });
    await page.goto(base + "/risk-model", { waitUntil: "domcontentloaded" });
    await page.locator("#risk-model-title").waitFor();
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(700);
    await capture("risk-model-overview", "/risk-model");
    await page
      .locator("#factors")
      .evaluate((section) =>
        window.scrollTo(
          0,
          section.getBoundingClientRect().top + window.scrollY + 30,
        ),
      );
    await page.waitForTimeout(300);
    await capture("risk-model-factors", "/risk-model#factors");
    const example = page
      .getByRole("group", { name: "選擇範例計分因子" })
      .locator("..");
    await example.evaluate((section) =>
      window.scrollTo(
        0,
        section.getBoundingClientRect().top + window.scrollY - 50,
      ),
    );
    await page.waitForTimeout(300);
    await capture(
      "risk-model-example",
      "/risk-model#factors; interactive example, all factors selected",
    );
    await example.getByRole("checkbox", { name: /食物來源/ }).uncheck();
    await page.waitForTimeout(300);
    await capture(
      "risk-model-example-changed",
      "/risk-model#factors; illustrative food factor deselected",
    );
    await page
      .locator("#limitations")
      .evaluate((section) =>
        window.scrollTo(
          0,
          section.getBoundingClientRect().top + window.scrollY + 25,
        ),
      );
    await page.waitForTimeout(300);
    await capture("risk-model-limits", "/risk-model#limitations");
  }
  const manifestUrl = new URL("manifest.json", out);
  const previous = fs.existsSync(manifestUrl)
    ? JSON.parse(fs.readFileSync(manifestUrl, "utf8"))
    : { assets: [] };
  const capturedNames = new Set(assets.map(({ name }) => name));
  fs.writeFileSync(
    manifestUrl,
    JSON.stringify(
      {
        capturedAt: new Date().toISOString(),
        assets: [
          ...previous.assets.filter(({ name }) => !capturedNames.has(name)),
          ...assets,
        ],
      },
      null,
      2,
    ) + "\n",
  );
} finally {
  await browser.close();
}
