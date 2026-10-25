export const FPS = 30;

// Nikita Kondrashev – Fun Time：自動分析的主節拍網格約 125 BPM。
export const BEAT_SECONDS = 60 / 125;
export const BGM_TRIM_FRAMES = 0;
export const beatF = (beat: number) => Math.round(beat * BEAT_SECONDS * FPS);
export const barF = (bar: number) => beatF(bar * 4);

const shot = (fromBar: number, toBar: number) => ({
  from: barF(fromBar),
  duration: barF(toBar) - barF(fromBar),
});

export const SHOTS = {
  question: shot(0, 2),
  problem: shot(2, 4),
  brand: shot(4, 6),
  fieldRecords: shot(6, 9),
  movementStudy: shot(9, 12),
  connectivityGraph: shot(12, 15),
  knowledge: shot(15, 18),
  movementLayers: shot(18, 21),
  dataTabs: shot(21, 24),
  priorityIndex: shot(24, 27),
  boundaries: shot(27, 29),
  outro: shot(29, 31),
} as const;

export const TOTAL_FRAMES = barF(31);
