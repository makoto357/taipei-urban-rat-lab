import { bundle } from "@remotion/bundler";
import { getCompositions, openBrowser, renderStill } from "@remotion/renderer";
import { chromium } from "../../node_modules/@playwright/test/index.mjs";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const out = path.join(root, "out/en-2min");
fs.mkdirSync(out, { recursive: true });
const content = JSON.parse(
  fs.readFileSync(path.join(root, "src/en-2min/content.json"), "utf8"),
);
const grid = JSON.parse(
  fs.readFileSync(
    path.join(root, "analysis/fun-time.en-2min.analysis.json"),
    "utf8",
  ),
).grid;
const frame = (bar) => Math.round(((bar * 240) / grid.bpm) * 30);
const serveUrl = await bundle({
  entryPoint: path.join(root, "src/en-2min/index.tsx"),
  publicDir: path.join(root, "public"),
});
const browser = await openBrowser("chrome", {
  chromiumOptions: { gl: "angle" },
});
const rendered = [];
try {
  const compositions = await getCompositions(serveUrl, {
    puppeteerInstance: browser,
  });
  fs.writeFileSync(
    path.join(out, "compositions.json"),
    JSON.stringify(
      compositions.map(({ id, width, height, fps, durationInFrames }) => ({
        id,
        width,
        height,
        fps,
        durationInFrames,
      })),
      null,
      2,
    ) + "\n",
  );
  const composition = compositions.find(
    ({ id }) => id === "TaipeiRatLabEnglish2Min",
  );
  for (const scene of content.scenes) {
    const f =
      frame(scene.fromBar) +
      Math.round((frame(scene.toBar) - frame(scene.fromBar)) * 0.65);
    const output = path.join(out, `preview-${scene.id}.png`);
    await renderStill({
      serveUrl,
      composition,
      frame: f,
      output,
      imageFormat: "png",
      puppeteerInstance: browser,
    });
    rendered.push({ label: scene.chapter, file: output });
    console.log(`Previewed ${scene.id} at frame ${f}`);
  }
} finally {
  await browser.close({ silent: true });
}
const sheetBrowser = await chromium.launch();
try {
  const page = await sheetBrowser.newPage({
    viewport: { width: 1920, height: 5 * 320 },
    deviceScaleFactor: 1,
  });
  await page.setContent(
    `<style>*{box-sizing:border-box}body{margin:0;background:#141414;font-family:Arial,sans-serif;color:#fff}.grid{display:grid;grid-template-columns:repeat(3,640px)}.item{height:320px;padding:10px}img{display:block;width:620px;height:279px;object-fit:contain;background:#333}.label{height:20px;font-size:16px;padding-top:5px}</style><div class="grid">${rendered.map((r) => `<div class="item"><img src="data:image/png;base64,${fs.readFileSync(r.file).toString("base64")}"><div class="label">${r.label}</div></div>`).join("")}</div>`,
    { waitUntil: "load" },
  );
  await page.screenshot({ path: path.join(out, "storyboard.png") });
} finally {
  await sheetBrowser.close();
}
console.log("Storyboard: " + path.join(out, "storyboard.png"));
