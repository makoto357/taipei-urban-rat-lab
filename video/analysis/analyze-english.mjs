import { chromium } from "../../node_modules/@playwright/test/index.mjs";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const audio = fs
  .readFileSync(new URL("../public/audio/bgm.mp3", import.meta.url))
  .toString("base64");
const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  const result = await page.evaluate(async (base64) => {
    const context = new AudioContext();
    const binary = atob(base64);
    const decoded = await context.decodeAudioData(
      Uint8Array.from(binary, (c) => c.charCodeAt(0)).buffer,
    );
    const hop = 0.01;
    const samples = decoded.getChannelData(0);
    const step = Math.round(hop * decoded.sampleRate);
    const rms = [];
    for (let from = 0; from + step < samples.length; from += step) {
      let square = 0;
      for (let i = from; i < from + step; i += 4) square += samples[i] ** 2;
      rms.push(Math.sqrt(square / Math.ceil(step / 4)));
    }
    const onset = rms.map((v, i) => Math.max(0, v - (rms[i - 1] ?? v)));
    const at = (seconds) => {
      const n = seconds / hop;
      const i = Math.floor(n);
      return (onset[i] ?? 0) * (1 - (n - i)) + (onset[i + 1] ?? 0) * (n - i);
    };
    const duration = Math.min(125, decoded.duration);
    const candidates = [];
    // Fit a continuous pulse grid over the whole edit, rather than rounding
    // the beat period to the old 20 ms analysis hop (which implied 125 BPM).
    for (let bpm = 115; bpm <= 135; bpm += 0.02) {
      const beat = 60 / bpm;
      let best = { score: 0, offset: 0 };
      for (let offset = 0; offset < beat; offset += 0.01) {
        let sum = 0;
        let count = 0;
        for (let t = offset; t < duration; t += beat) {
          sum += at(t) + 0.5 * at(t - 0.01) + 0.5 * at(t + 0.01);
          count++;
        }
        const score = sum / count;
        if (score > best.score) best = { score, offset };
      }
      candidates.push({ bpm, ...best });
    }
    candidates.sort((a, b) => b.score - a.score);
    const best = candidates[0];
    const beat = 60 / best.bpm;
    const bars = [];
    for (
      let start = best.offset, i = 0;
      start < decoded.duration;
      start += beat * 4, i++
    ) {
      const energy = rms.slice(
        Math.floor(start / hop),
        Math.floor((start + beat * 4) / hop),
      );
      const meanRms = energy.reduce((a, b) => a + b, 0) / energy.length;
      bars.push({
        index: i,
        startSeconds: +start.toFixed(4),
        meanRms: +meanRms.toFixed(5),
      });
    }
    const changes = bars
      .slice(2)
      .map((bar, i) => ({
        bar: bar.index,
        time: bar.startSeconds,
        ratio: +(
          bar.meanRms /
          Math.max(0.0001, (bars[i].meanRms + bars[i + 1].meanRms) / 2)
        ).toFixed(3),
      }))
      .filter(({ time, ratio }) => time < 125 && (ratio < 0.65 || ratio > 1.5));
    await context.close();
    return {
      source: "public/audio/bgm.mp3",
      durationSeconds: decoded.duration,
      analyzedSeconds: duration,
      method:
        "10 ms energy onset, continuous 115–135 BPM phase fit across first 125 seconds",
      grid: {
        bpm: +best.bpm.toFixed(2),
        beatSeconds: beat,
        offsetSeconds: +best.offset.toFixed(3),
      },
      note: "Pulse-grid fit, not an automatic determination of musical downbeats. Energy changes guide editorial cuts.",
      candidates: candidates
        .slice(0, 5)
        .map((c) => ({ ...c, bpm: +c.bpm.toFixed(2) })),
      changes,
      bars,
    };
  }, audio);
  const out = new URL("./fun-time.en-2min.analysis.json", import.meta.url);
  fs.writeFileSync(out, JSON.stringify(result, null, 2) + "\n");
  console.log(
    JSON.stringify(
      {
        output: fileURLToPath(out),
        grid: result.grid,
        changes: result.changes,
      },
      null,
      2,
    ),
  );
} finally {
  await browser.close();
}
