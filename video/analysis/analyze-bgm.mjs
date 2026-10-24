import {chromium} from "../../node_modules/@playwright/test/index.mjs";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const input = path.resolve(HERE, "../public/audio/bgm.mp3");
const output = path.resolve(HERE, "fun-time.analysis.json");
const audioBase64 = fs.readFileSync(input).toString("base64");

const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  const result = await page.evaluate(async (base64) => {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

    const context = new AudioContext();
    const decoded = await context.decodeAudioData(bytes.buffer);
    const sampleRate = decoded.sampleRate;
    const channels = Array.from({length: decoded.numberOfChannels}, (_, i) => decoded.getChannelData(i));
    const hopSeconds = 0.02;
    const windowSeconds = 0.06;
    const hop = Math.round(sampleRate * hopSeconds);
    const window = Math.round(sampleRate * windowSeconds);
    const count = Math.floor((decoded.length - window) / hop);
    const rms = new Array(count).fill(0);

    for (let index = 0; index < count; index++) {
      const start = index * hop;
      let sum = 0;
      for (let offset = 0; offset < window; offset += 4) {
        let mixed = 0;
        for (const channel of channels) mixed += channel[start + offset] ?? 0;
        mixed /= channels.length;
        sum += mixed * mixed;
      }
      rms[index] = Math.sqrt(sum / Math.ceil(window / 4));
    }

    const logEnergy = rms.map((value) => Math.log10(value + 1e-6));
    const onset = logEnergy.map((value, index) => {
      if (index < 3) return 0;
      const baseline = (logEnergy[index - 1] + logEnergy[index - 2] + logEnergy[index - 3]) / 3;
      return Math.max(0, value - baseline);
    });
    const smoothed = onset.map((value, index) =>
      value + (onset[index - 1] ?? 0) * 0.55 + (onset[index + 1] ?? 0) * 0.55,
    );

    const maxAnalyzeSeconds = Math.min(90, decoded.duration);
    const maxIndex = Math.floor(maxAnalyzeSeconds / hopSeconds);
    const candidates = [];
    for (let lag = Math.round(60 / 190 / hopSeconds); lag <= Math.round(60 / 75 / hopSeconds); lag++) {
      let score = 0;
      let normA = 0;
      let normB = 0;
      for (let i = lag; i < maxIndex; i++) {
        score += smoothed[i] * smoothed[i - lag];
        normA += smoothed[i] * smoothed[i];
        normB += smoothed[i - lag] * smoothed[i - lag];
      }
      candidates.push({
        lag,
        bpm: 60 / (lag * hopSeconds),
        score: score / Math.sqrt(normA * normB || 1),
      });
    }
    candidates.sort((a, b) => b.score - a.score);
    const distinct = [];
    for (const candidate of candidates) {
      if (distinct.every((item) => Math.abs(item.bpm - candidate.bpm) > 3)) distinct.push(candidate);
      if (distinct.length === 8) break;
    }

    const best = distinct[0];
    let bestPhase = 0;
    let bestPhaseScore = -Infinity;
    for (let phase = 0; phase < best.lag; phase++) {
      let score = 0;
      for (let i = phase; i < maxIndex; i += best.lag) {
        score += smoothed[i] + 0.45 * (smoothed[i - 1] ?? 0) + 0.45 * (smoothed[i + 1] ?? 0);
      }
      if (score > bestPhaseScore) {
        bestPhaseScore = score;
        bestPhase = phase;
      }
    }

    const beatSeconds = best.lag * hopSeconds;
    const offsetSeconds = bestPhase * hopSeconds;
    const barSeconds = beatSeconds * 4;
    const bars = [];
    for (let start = offsetSeconds; start < Math.min(70, decoded.duration); start += barSeconds) {
      const from = Math.max(0, Math.floor(start / hopSeconds));
      const to = Math.min(count, Math.floor((start + barSeconds) / hopSeconds));
      const energy = rms.slice(from, to);
      const attacks = smoothed.slice(from, to);
      const meanRms = energy.reduce((sum, value) => sum + value, 0) / Math.max(1, energy.length);
      const onsetStrength = attacks.reduce((sum, value) => sum + value, 0);
      bars.push({
        index: bars.length,
        startSeconds: Number(start.toFixed(3)),
        endSeconds: Number(Math.min(start + barSeconds, decoded.duration).toFixed(3)),
        meanRms: Number(meanRms.toFixed(5)),
        onsetStrength: Number(onsetStrength.toFixed(4)),
      });
    }

    const sortedRms = [...rms.slice(0, Math.floor(Math.min(60, decoded.duration) / hopSeconds))].sort((a, b) => a - b);
    const percentile = (p) => sortedRms[Math.min(sortedRms.length - 1, Math.floor(sortedRms.length * p))];
    await context.close();
    return {
      source: "public/audio/bgm.mp3",
      durationSeconds: Number(decoded.duration.toFixed(3)),
      sampleRate,
      channels: decoded.numberOfChannels,
      analysis: {hopSeconds, windowSeconds, analyzedSeconds: maxAnalyzeSeconds},
      tempoCandidates: distinct.map(({bpm, score}) => ({bpm: Number(bpm.toFixed(2)), score: Number(score.toFixed(4))})),
      selectedGrid: {
        bpm: Number(best.bpm.toFixed(2)),
        beatSeconds: Number(beatSeconds.toFixed(4)),
        offsetSeconds: Number(offsetSeconds.toFixed(3)),
      },
      rmsPercentilesFirst60Seconds: {
        p10: Number(percentile(0.1).toFixed(5)),
        p50: Number(percentile(0.5).toFixed(5)),
        p90: Number(percentile(0.9).toFixed(5)),
      },
      bars,
    };
  }, audioBase64);

  fs.writeFileSync(output, `${JSON.stringify(result, null, 2)}\n`);
  console.log(JSON.stringify(result, null, 2));
} finally {
  await browser.close();
}
