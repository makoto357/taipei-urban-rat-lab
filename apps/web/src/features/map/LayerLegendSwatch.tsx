import { legendSwatchClass, type MapLayer } from "./mapTopics";

interface LayerLegendSwatchProps {
  layer: Pick<MapLayer, "shape" | "color" | "lineWidth">;
  size?: number;
}

export function LayerLegendSwatch({
  layer,
  size = 18,
}: LayerLegendSwatchProps) {
  if (layer.shape === "star") {
    return (
      <span
        aria-hidden="true"
        className="inline-flex h-[24px] w-[24px] flex-none items-center justify-center text-[28px] leading-none [-webkit-text-stroke:1px_#000]"
        style={{ color: layer.color }}
      >
        ★
      </span>
    );
  }

  if (layer.shape === "triangle") {
    return (
      <span
        aria-hidden="true"
        className="inline-flex h-[24px] w-[24px] flex-none items-center justify-center text-[25px] leading-none [-webkit-text-stroke:1px_#000]"
        style={{ color: layer.color }}
      >
        ▲
      </span>
    );
  }

  if (layer.shape === "pipe" || layer.shape === "dashed-pipe") {
    return (
      <span
        aria-hidden="true"
        className="relative inline-block h-[18px] w-[24px] flex-none"
      >
        <span
          className="absolute left-0 right-0 top-1/2 h-[2px] -translate-y-1/2 bg-center"
          style={{
            backgroundImage:
              layer.shape === "dashed-pipe"
                ? `repeating-linear-gradient(to right, ${layer.color} 0 5px, transparent 5px 9px)`
                : `linear-gradient(${layer.color}, ${layer.color})`,
          }}
        />
        <span className="absolute left-1/2 top-1/2 h-[11px] w-[11px] -translate-x-1/2 -translate-y-1/2 rounded-full border-[1.5px] border-ink bg-card" />
      </span>
    );
  }

  if (layer.shape === "line-dot") {
    return (
      <span
        aria-hidden="true"
        className="relative inline-block h-[18px] w-9 flex-none"
      >
        <span
          className="absolute left-0 right-0 top-1/2 h-[3px] -translate-y-1/2"
          style={{ backgroundColor: layer.color }}
        />
        <span
          className="absolute left-1/2 top-1/2 h-[15px] w-[15px] -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-ink"
          style={{ backgroundColor: layer.color }}
        />
      </span>
    );
  }

  if (layer.shape === "solid-line" || layer.shape === "dashed-line") {
    const lineWidth = layer.lineWidth ?? 4;
    return (
      <span
        aria-hidden="true"
        className="inline-block h-[18px] w-9 flex-none bg-center bg-no-repeat"
        style={{
          backgroundImage:
            layer.shape === "dashed-line"
              ? `repeating-linear-gradient(to right, ${layer.color} 0 9px, transparent 9px 18px)`
              : `linear-gradient(${layer.color}, ${layer.color})`,
          backgroundSize: `100% ${lineWidth}px`,
        }}
      />
    );
  }

  const style =
    layer.shape === "ring" || layer.shape === "square-outline"
      ? { width: size, height: size, borderColor: layer.color }
      : {
          width: size,
          height: size,
          background: layer.color,
          borderColor: "#000000",
        };

  return (
    <span
      aria-hidden="true"
      className={`inline-block box-border flex-none ${legendSwatchClass(layer.shape)}`}
      style={style}
    />
  );
}
