import { DISTRICTS } from "../report/steps";

/**
 * 地址 ⇄ 座標轉換，暫用 OpenStreetMap Nominatim 公開服務（usage policy：低流量、
 * 每秒 1 次、不可自動完成）。只適合 dev／低流量；正式 geocoder 的契約待 plan.md
 * Phase 0 決定。使用者點地圖或按「搜尋」時才會呼叫，座標／地址因此會傳給第三方。
 */
const NOMINATIM = "https://nominatim.openstreetmap.org";
/** 台北市大致範圍 [west, north, east, south]，搜尋時限定在此範圍內。 */
const TAIPEI_VIEWBOX = "121.45,25.22,121.67,24.95";

export interface GeocodeResult {
  latitude: number;
  longitude: number;
  addressText: string;
  district: string | null;
}

interface NominatimAddress {
  city_district?: string;
  suburb?: string;
  district?: string;
  road?: string;
  house_number?: string;
  neighbourhood?: string;
  city?: string;
  county?: string;
  amenity?: string;
  shop?: string;
  building?: string;
}
interface NominatimItem {
  lat: string;
  lon: string;
  display_name: string;
  name?: string;
  address?: NominatimAddress;
}

const districtOf = (address: NominatimAddress | undefined): string | null => {
  const candidates = [address?.city_district, address?.suburb, address?.district];
  return candidates.find((c): c is string => !!c && (DISTRICTS as readonly string[]).includes(c)) ?? null;
};

/** 組成「信義區松高路 12 號」這種台灣慣用寫法；沒有路名時退回 Nominatim 的名稱。 */
const addressTextOf = (item: NominatimItem, district: string | null): string => {
  const { address } = item;
  if (address?.road) {
    // OSM 的台灣門牌常已帶「號」，先去掉再補，避免變成「13號號」。
    const number = address.house_number ? `${address.house_number.replace(/號$/, "")}號` : "";
    return `${district ?? ""}${address.road}${number}`;
  }
  const place = item.name || address?.amenity || address?.shop || address?.building;
  if (place) return `${district ?? ""}${place}`;
  return item.display_name.split(",").slice(0, 3).join(" ").trim();
};

const toResult = (item: NominatimItem): GeocodeResult => {
  const district = districtOf(item.address);
  return {
    latitude: Number(item.lat),
    longitude: Number(item.lon),
    addressText: addressTextOf(item, district),
    district,
  };
};

const get = async <T>(path: string, params: Record<string, string>, signal?: AbortSignal): Promise<T> => {
  const query = new URLSearchParams({ format: "jsonv2", addressdetails: "1", "accept-language": "zh-TW", ...params });
  const response = await fetch(`${NOMINATIM}${path}?${query}`, { signal });
  if (!response.ok) throw new Error(`geocoder ${response.status}`);
  return response.json() as Promise<T>;
};

/** 座標 → 地址。座標不在台北市（找不到行政區）時回傳 null，由呼叫端決定要不要提示。 */
export async function reverseGeocode(
  latitude: number,
  longitude: number,
  signal?: AbortSignal,
): Promise<GeocodeResult | null> {
  const item = await get<NominatimItem & { error?: string }>(
    "/reverse",
    { lat: String(latitude), lon: String(longitude), zoom: "18" },
    signal,
  );
  if (item.error) return null;
  const result = toResult(item);
  return result.district ? { ...result, latitude, longitude } : null;
}

/** 地址／地標 → 座標，只在台北市範圍內找。 */
export async function searchAddress(query: string, signal?: AbortSignal): Promise<GeocodeResult | null> {
  const find = async (q: string) => {
    const items = await get<NominatimItem[]>(
      "/search",
      { q, countrycodes: "tw", viewbox: TAIPEI_VIEWBOX, bounded: "1", limit: "1" },
      signal,
    );
    return items[0] ? toResult(items[0]) : null;
  };
  const exact = await find(query);
  if (exact) return exact;
  // OSM 的門牌涵蓋不全：找不到時退到路名層級（定位會落在該路上，使用者可再拖曳標記微調）。
  const roadOnly = query.replace(/(?:之\d+)?\d+(?:之\d+)?號.*$/, "").replace(/^台北市/, "").trim();
  if (roadOnly && roadOnly !== query) {
    await new Promise((resolve) => setTimeout(resolve, 1100)); // Nominatim 限制每秒 1 次
    const fallback = await find(roadOnly);
    // Nominatim 會模糊比對（「火星路」可能回「光復南路」），路名對不上就當作找不到。
    const road = roadOnly.replace(/^.{2}區/, "");
    return fallback && road && fallback.addressText.includes(road) ? fallback : null;
  }
  return null;
}
