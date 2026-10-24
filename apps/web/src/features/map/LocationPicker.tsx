import { useEffect, useRef } from "react";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { DISTRICT_VIEWS } from "./districtViews";

export interface PickedLocation {
  latitude: number;
  longitude: number;
}

const TAIPEI_CENTER: [number, number] = [121.5637, 25.0375];

/**
 * 點擊地圖或拖曳標記來選擇地點。底圖暫用 OpenStreetMap 公開 raster tiles，
 * 只適合 dev／低流量（OSM tile usage policy）；正式 tile provider 與 geocoder 的
 * 契約待 plan.md Phase 0 決定，Phase 6 會一併換成正式圖層。
 */
export function LocationPicker({
  value,
  onChange,
  className,
  focusDistrict,
}: {
  value: PickedLocation | null;
  onChange: (location: PickedLocation) => void;
  className?: string;
  /** 選了行政區就把地圖移到該區；不會動標記。 */
  focusDistrict?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markerRef = useRef<maplibregl.Marker | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    if (!containerRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: {
        version: 8,
        sources: {
          osm: {
            type: "raster",
            tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
            tileSize: 256,
            attribution: "© OpenStreetMap contributors",
          },
        },
        layers: [{ id: "osm", type: "raster", source: "osm" }],
      },
      center: TAIPEI_CENTER,
      zoom: 12,
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "bottom-right");
    map.on("click", (event) => {
      onChangeRef.current({ latitude: event.lngLat.lat, longitude: event.lngLat.lng });
    });
    mapRef.current = map;
    return () => {
      markerRef.current?.remove();
      markerRef.current = null;
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !value) return;
    const lngLat: [number, number] = [value.longitude, value.latitude];
    if (!markerRef.current) {
      const marker = new maplibregl.Marker({ color: "#D65B37", draggable: true }).setLngLat(lngLat).addTo(map);
      marker.on("dragend", () => {
        const { lat, lng } = marker.getLngLat();
        onChangeRef.current({ latitude: lat, longitude: lng });
      });
      markerRef.current = marker;
    } else {
      markerRef.current.setLngLat(lngLat);
    }
    map.easeTo({ center: lngLat, zoom: Math.max(map.getZoom(), 15) });
  }, [value?.latitude, value?.longitude]);

  useEffect(() => {
    const view = focusDistrict ? DISTRICT_VIEWS[focusDistrict] : undefined;
    if (view) mapRef.current?.easeTo({ center: view.center, zoom: view.zoom });
  }, [focusDistrict]);

  return (
    <div className={className ?? "relative h-[300px] border-[1.5px] border-ink"}>
      <div ref={containerRef} className="h-full w-full" role="application" aria-label="選擇地點的地圖，點擊或拖曳標記調整位置" />
      {!value && (
        <p className="pointer-events-none absolute left-3 top-3 m-0 border-[1.5px] border-ink bg-card px-2.5 py-1.5 font-body text-xs">
          點擊地圖選擇地點，或使用「使用目前位置」
        </p>
      )}
    </div>
  );
}
