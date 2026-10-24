import assert from "node:assert/strict";
import { afterEach, test } from "node:test";

import { reverseGeocode, searchAddress } from "../src/features/map/geocode.ts";

const realFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = realFetch; });
const respond = (body) => { globalThis.fetch = async () => ({ ok: true, json: async () => body }); };

test("reverse geocoding builds a Taiwanese address without doubling 號", async () => {
  respond({ lat: "25.06", lon: "121.53", display_name: "x", address: { city_district: "中山區", road: "建國北路186巷", house_number: "13號" } });
  const result = await reverseGeocode(25.06, 121.53);
  assert.equal(result.addressText, "中山區建國北路186巷13號");
  assert.equal(result.district, "中山區");
});

test("reverse geocoding outside Taipei districts returns null", async () => {
  respond({ lat: "24.15", lon: "120.67", display_name: "x", address: { city_district: "西屯區", road: "臺灣大道" } });
  assert.equal(await reverseGeocode(24.15, 120.67), null);
});

test("reverse geocoding keeps the clicked coordinates, not the snapped ones", async () => {
  respond({ lat: "25.0001", lon: "121.0001", display_name: "x", address: { suburb: "信義區", road: "松高路" } });
  const result = await reverseGeocode(25.04, 121.56);
  assert.deepEqual([result.latitude, result.longitude], [25.04, 121.56]);
});

test("search with no hit and no number to strip returns null", async () => {
  respond([]);
  assert.equal(await searchAddress("不存在的地標"), null);
});

test("search rejects a fuzzy road-level fallback that names a different road", async () => {
  let calls = 0;
  globalThis.fetch = async () => ({
    ok: true,
    json: async () => (calls++ === 0 ? [] : [{ lat: "25.04", lon: "121.55", display_name: "x", address: { city_district: "大安區", road: "光復南路" } }]),
  });
  assert.equal(await searchAddress("火星路99號"), null);
});
