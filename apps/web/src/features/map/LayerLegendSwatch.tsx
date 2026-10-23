import { legendSwatchClass, type MapLayer } from "./mapTopics";

export function LayerLegendSwatch({ layer, size = 18 }: { layer: Pick<MapLayer, "shape" | "color">; size?: number }) {
  const style =
    layer.shape === "ring"
      ? { width: size, height: size, borderColor: layer.color }
      : { width: size, height: size, background: layer.color, borderColor: "#000000" };

  return <span aria-hidden="true" className={`inline-block flex-none box-border ${legendSwatchClass(layer.shape)}`} style={style} />;
}
