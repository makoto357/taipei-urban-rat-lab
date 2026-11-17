import { chromium } from "../../node_modules/@playwright/test/index.mjs";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const base = process.env.VIDEO_BASE_URL ?? "http://127.0.0.1:4173";
assert.ok(
  ["localhost", "127.0.0.1"].includes(new URL(base).hostname),
  "Use a local site",
);
const content = JSON.parse(
  fs.readFileSync(path.join(root, "src/en-2min/content.json"), "utf8"),
);
const grid = JSON.parse(
  fs.readFileSync(
    path.join(root, "analysis/fun-time.en-2min.analysis.json"),
    "utf8",
  ),
).grid;
const scene = content.scenes.find((s) => s.id === "modelExplainer");
const barFrame = (bar) => Math.round(((bar * 240) / grid.bpm) * 30);
const count = barFrame(scene.toBar) - barFrame(scene.fromBar);
const width = 1344;
const height = 864;
const out = path.join(root, "public/en-2min");
const scratch = fs.mkdtempSync(path.join(os.tmpdir(), "rat-lab-model-motion-"));
const require = createRequire(import.meta.url);
const packageName = `@remotion/compositor-${process.platform}-${process.arch}${process.platform === "win32" ? "-msvc" : ""}`;
const binaryDir = path.dirname(require.resolve(packageName));
const binary = (name) =>
  path.join(binaryDir, name + (process.platform === "win32" ? ".exe" : ""));
const binaryEnv = {
  ...process.env,
  ...(process.platform === "darwin" ? { DYLD_LIBRARY_PATH: binaryDir } : {}),
};
const events = [];
const frameFiles = [];
const browser = await chromium.launch();
const scaleFrame = (frame) => Math.round((frame / 629) * count);
const phases = {
  example: scaleFrame(174),
  simulator: scaleFrame(244),
  limits: scaleFrame(435),
};
const actions = {
  factor: scaleFrame(198),
  underground: scaleFrame(360),
  ground: scaleFrame(408),
};
const ease = (x) => 0.5 - 0.5 * Math.cos(Math.PI * Math.max(0, Math.min(1, x)));
try {
  const context = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: 1,
    colorScheme: "light",
  });
  await context.route(
    /https:\/\/(?:firestore\.googleapis\.com|identitytoolkit\.googleapis\.com|securetoken\.googleapis\.com|firebasestorage\.googleapis\.com)\//,
    (route) => route.abort(),
  );
  const page = await context.newPage();
  await page.goto(base + "/risk-model", { waitUntil: "domcontentloaded" });
  await page.locator("#risk-model-title").waitFor();
  await page.evaluate(() => document.fonts.ready);
  const example = page
    .getByRole("group", { name: "選擇範例計分因子" })
    .locator("..");
  const food = example.getByRole("checkbox", { name: /食物來源/ });
  const modes = page.getByRole("group", { name: "選擇空間連通模式" });
  const underground = modes.getByRole("button", {
    name: "下水道移動",
    exact: true,
  });
  const ground = modes.getByRole("button", { name: "地面移動", exact: true });
  const documentY = (locator) =>
    locator.evaluate((el) => el.getBoundingClientRect().top + window.scrollY);
  const positions = {
    top: 0,
    factors: Math.max(0, (await documentY(page.locator("#factors"))) + 25),
    example: Math.max(0, (await documentY(example)) - 26),
    simulator: Math.max(0, (await documentY(modes.locator("../.."))) - 28),
    limits: Math.max(0, (await documentY(page.locator("#limitations"))) + 20),
  };
  const scrolls = [
    {
      start: scaleFrame(24),
      end: scaleFrame(90),
      from: positions.top,
      to: positions.factors,
    },
    {
      start: scaleFrame(126),
      end: phases.example,
      from: positions.factors,
      to: positions.example,
    },
    {
      start: phases.simulator,
      end: scaleFrame(318),
      from: positions.example,
      to: positions.simulator,
    },
    {
      start: phases.limits,
      end: scaleFrame(510),
      from: positions.simulator,
      to: positions.limits,
    },
  ];
  // Capture-only pointer feedback. Actual DOM controls receive every click;
  // this overlay neither changes application state nor intercepts input.
  await page.evaluate(() => {
    const cursor = document.createElement("div");
    cursor.setAttribute("aria-hidden", "true");
    cursor.style.cssText =
      "position:fixed;left:0;top:0;width:30px;height:40px;pointer-events:none;z-index:2147483647;transform:translate(1230px,100px)";
    cursor.innerHTML =
      '<div style="position:absolute;left:-16px;top:-16px;width:40px;height:40px;border:3px solid #D65B37;border-radius:50%;opacity:0"></div><svg width="30" height="40" viewBox="0 0 30 40"><path d="M3 2 L3 30 L11 23 L17 36 L23 33 L17 21 L28 20 Z" fill="#fffbf0" stroke="#14182b" stroke-width="2.5" stroke-linejoin="round"/></svg>';
    document.body.appendChild(cursor);
    document.addEventListener("pointermove", (event) => {
      cursor.style.transform = `translate(${event.clientX}px,${event.clientY}px)`;
    });
    document.addEventListener("pointerdown", () => {
      cursor.firstElementChild.animate(
        [
          { opacity: 0.9, transform: "scale(.5)" },
          { opacity: 0, transform: "scale(1.4)" },
        ],
        { duration: 350 },
      );
    });
  });
  const centre = async (locator) => {
    const box = await locator.boundingBox();
    assert.ok(
      box && box.y >= 0 && box.y + box.height <= height,
      "Control must be visible",
    );
    return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  };
  let pointer = { x: 1230, y: 100 };
  let target = null;
  const move = async (p) => {
    await page.mouse.move(p.x, p.y);
    pointer = p;
  };
  for (let frame = 0; frame < count; frame++) {
    let y = 0;
    for (const s of scrolls) {
      if (frame >= s.start)
        y =
          s.from +
          (s.to - s.from) * ease((frame - s.start) / (s.end - s.start));
    }
    await page.evaluate(
      (top) => window.scrollTo({ top, behavior: "instant" }),
      y,
    );
    for (const [name, start, end, control] of [
      ["factor", scaleFrame(178), actions.factor, food],
      ["underground", scaleFrame(334), actions.underground, underground],
      ["ground", scaleFrame(386), actions.ground, ground],
    ]) {
      if (frame === start)
        target = {
          name,
          start,
          end,
          from: { ...pointer },
          to: await centre(control),
        };
      if (target?.name === name && frame >= start && frame < end) {
        const t = ease((frame - start) / Math.max(1, end - start - 1));
        await move({
          x: target.from.x + (target.to.x - target.from.x) * t,
          y: target.from.y + (target.to.y - target.from.y) * t,
        });
      }
    }
    if (frame === actions.factor) {
      const before = await example.locator("output").innerText();
      await food.uncheck();
      assert.equal(await food.isChecked(), false);
      const after = await example.locator("output").innerText();
      assert.notEqual(
        before,
        after,
        "Factor toggle must change the displayed example score",
      );
      events.push({
        frame,
        kind: "checkbox",
        target: "food source",
        before,
        after,
      });
    }
    if (frame === actions.underground || frame === actions.ground) {
      const button = frame === actions.underground ? underground : ground;
      await button.click();
      assert.equal(await button.getAttribute("aria-pressed"), "true");
      events.push({
        frame,
        kind: "button",
        target:
          frame === actions.underground ? "underground mode" : "ground mode",
        pressed: true,
      });
    }
    const file = path.join(
      scratch,
      `frame-${String(frame).padStart(5, "0")}.jpg`,
    );
    await page.screenshot({ path: file, type: "jpeg", quality: 88 });
    frameFiles.push(file);
    const preview =
      frame === 10
        ? "overview"
        : frame === actions.factor + 8
          ? "weights"
          : frame === actions.underground + 8
            ? "underground"
            : frame === scaleFrame(540)
              ? "limits"
              : null;
    if (preview)
      await page.screenshot({
        path: path.join(out, `risk-model-demo-${preview}.png`),
      });
    if (frame % 90 === 0)
      console.log(`Captured model motion ${frame}/${count}`);
  }
  const video = path.join(out, "risk-model-demo.mp4");
  execFileSync(
    binary("ffmpeg"),
    [
      "-hide_banner",
      "-loglevel",
      "error",
      "-y",
      "-framerate",
      "30",
      "-i",
      path.join(scratch, "frame-%05d.jpg"),
      "-c:v",
      "libx264",
      "-preset",
      "medium",
      "-crf",
      "18",
      "-pix_fmt",
      "yuv420p",
      "-an",
      "-movflags",
      "+faststart",
      video,
    ],
    { env: binaryEnv, cwd: binaryDir, stdio: "inherit" },
  );
  const media = JSON.parse(
    execFileSync(
      binary("ffprobe"),
      [
        "-v",
        "error",
        "-show_entries",
        "stream=codec_type,width,height,nb_frames,r_frame_rate:format=duration",
        "-of",
        "json",
        video,
      ],
      { env: binaryEnv, cwd: binaryDir, encoding: "utf8" },
    ),
  );
  const videoTrack = media.streams.find((s) => s.codec_type === "video");
  assert.equal(Number(videoTrack.nb_frames), count);
  assert.equal(videoTrack.width, width);
  assert.equal(videoTrack.height, height);
  assert.equal(videoTrack.r_frame_rate, "30/1");
  assert.ok(!media.streams.some((s) => s.codec_type === "audio"));
  fs.writeFileSync(
    path.join(out, "risk-model-demo.json"),
    JSON.stringify(
      {
        source: "/risk-model",
        capturedAt: new Date().toISOString(),
        kind: "real_ui_frame_capture",
        fps: 30,
        frames: count,
        durationSeconds: count / 30,
        viewport: [width, height],
        audio: false,
        privateCloudRequests: "blocked",
        pointer: "capture-only visual feedback",
        phases,
        scrolls,
        events,
      },
      null,
      2,
    ) + "\n",
  );
  for (const file of frameFiles) fs.unlinkSync(file);
  fs.rmdirSync(scratch);
  console.log(
    `Recorded ${count} frames / ${(count / 30).toFixed(2)}s; verified ${events.length} real control interactions.`,
  );
} finally {
  await browser.close();
}
