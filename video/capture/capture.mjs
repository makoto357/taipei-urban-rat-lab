import {chromium} from "../../node_modules/@playwright/test/index.mjs";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(HERE, "../public/tex");
const BASE = process.env.VIDEO_BASE_URL ?? "http://127.0.0.1:4173";
const MODE = process.argv[2] ?? "all";

fs.mkdirSync(OUT, {recursive: true});

const browser = await chromium.launch();

const settle = async (page, ms = 2400) => {
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(ms);
};

const desktop = async () => {
  const page = await browser.newPage({
    viewport: {width: 1680, height: 1080},
    deviceScaleFactor: 2,
    colorScheme: "light",
  });

  await page.goto(`${BASE}/`, {waitUntil: "domcontentloaded"});
  await page.getByRole("heading", {name: /城市裡的老鼠/}).waitFor();
  await settle(page, 1600);
  await page.screenshot({path: path.join(OUT, "home.png")});

  await page.goto(`${BASE}/map`, {waitUntil: "domcontentloaded"});
  await page.getByRole("heading", {name: "老鼠都在哪裡？"}).waitFor();
  await page.locator(".maplibregl-canvas").waitFor();
  await settle(page, 4500);
  await page.evaluate(() => window.scrollTo(0, 190));
  await page.waitForTimeout(600);
  await page.getByRole("tab", {name: /鼠跡分佈/}).click();
  await settle(page, 2800);
  await page.screenshot({path: path.join(OUT, "map-observations.png")});

  await page.getByRole("tab", {name: /環境因子/}).click();
  await settle(page, 3200);
  await page.screenshot({path: path.join(OUT, "map-environment.png")});

  await page.getByRole("tab", {name: /風險模型/}).click();
  await settle(page, 4200);
  await page.getByText("空間傳遞", {exact: true}).scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);
  await page.screenshot({path: path.join(OUT, "map-risk.png")});

  await page.goto(`${BASE}/literature`, {waitUntil: "domcontentloaded"});
  await page.getByRole("heading", {name: "鼠患研究與防治知識"}).waitFor();
  await settle(page, 1800);
  await page.evaluate(() => window.scrollTo(0, 120));
  await page.waitForTimeout(300);
  await page.screenshot({path: path.join(OUT, "literature.png")});

  await page.close();
};

const mobile = async () => {
  const page = await browser.newPage({
    viewport: {width: 540, height: 1000},
    deviceScaleFactor: 3,
    colorScheme: "light",
    isMobile: true,
    hasTouch: true,
  });
  await page.goto(`${BASE}/report?video-preview=1`, {waitUntil: "domcontentloaded"});
  await page.getByRole("heading", {name: "發現鼠跡？告訴我們。"}).waitFor();
  await settle(page, 1800);
  await page.evaluate(() => window.scrollTo(0, 120));
  await page.waitForTimeout(300);
  await page.screenshot({path: path.join(OUT, "report-mobile.png")});
  await page.close();
};

const official = async () => {
  const page = await browser.newPage({
    viewport: {width: 1680, height: 1080},
    deviceScaleFactor: 2,
    colorScheme: "light",
  });

  await page.goto(`${BASE}/report?video-preview=1`, {waitUntil: "domcontentloaded"});
  await page.getByRole("heading", {name: "發現鼠跡？告訴我們。"}).waitFor();
  await settle(page, 1800);
  await page.screenshot({path: path.join(OUT, "report-public.png"), fullPage: true});

  // Dev server 會從 gitignored 的 apps/web/.env.local 預填市府測試帳號。
  // Capture 腳本只操作畫面，不讀取、複製或輸出帳密。
  await page.goto(`${BASE}/login`, {waitUntil: "domcontentloaded"});
  await page.getByRole("button", {name: /我是市府／合作單位人員/}).click();
  await page.getByRole("heading", {name: "市府／合作單位登入"}).waitFor();
  await page.getByRole("button", {name: "登入", exact: true}).click();
  await page.waitForURL(/\/official(?:\?.*)?$/, {timeout: 20_000});

  await page.goto(`${BASE}/official/record`, {waitUntil: "domcontentloaded"});
  await page.getByRole("heading", {name: "新增紀錄"}).waitFor();
  await page.getByRole("tab", {name: "鼠跡調查"}).waitFor();
  await settle(page, 2400);
  await page.screenshot({path: path.join(OUT, "official-survey.png"), fullPage: true});

  await page.getByRole("tab", {name: "投藥紀錄"}).click();
  await settle(page, 900);
  await page.screenshot({path: path.join(OUT, "official-bait.png")});
  await page.close();
};

try {
  if (MODE === "all" || MODE === "desktop") await desktop();
  if (MODE === "all" || MODE === "mobile") await mobile();
  if (MODE === "official") await official();
  console.log(`Captured video textures in ${OUT}`);
} finally {
  await browser.close();
}
