import analysis from "../../analysis/fun-time.en-2min.analysis.json";
import content from "./content.json";

export const FPS = 30;
export const BPM = analysis.grid.bpm;
export const BGM_OFFSET_FRAMES = Math.round(analysis.grid.offsetSeconds * FPS);
export const barFrame = (bar: number) =>
  Math.round(((bar * 4 * 60) / BPM) * FPS);
export const BGM_END_FRAME = barFrame(60);
export const BGM_FADE_OUT_FRAMES = FPS;
export const SCENES = content.scenes.map((scene) => ({
  ...scene,
  from: barFrame(scene.fromBar),
  duration: barFrame(scene.toBar) - barFrame(scene.fromBar),
}));
export const TOTAL_FRAMES =
  SCENES[SCENES.length - 1].from + SCENES[SCENES.length - 1].duration;
export type Scene = (typeof SCENES)[number];
