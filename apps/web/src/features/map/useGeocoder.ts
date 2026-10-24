import { useCallback, useRef, useState } from "react";
import { reverseGeocode, searchAddress, type GeocodeResult } from "./geocode";

/**
 * 地點欄位共用的地址轉換：點地圖／拖曳標記 → 反查地址；輸入地址按搜尋 → 定位。
 * 後發的請求會取消前一個，避免舊結果蓋掉新結果；失敗只提示，不阻擋使用者手動填寫。
 */
export function useGeocoder(handlers: {
  onAddress: (result: Pick<GeocodeResult, "addressText" | "district">) => void;
  onLocated: (location: { latitude: number; longitude: number }) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const controllerRef = useRef<AbortController | null>(null);
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  const run = useCallback(async (task: (signal: AbortSignal) => Promise<void>) => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setBusy(true);
    setError(null);
    try {
      await task(controller.signal);
    } catch (cause) {
      if (!controller.signal.aborted) setError("地址服務暫時無法使用，請手動輸入地址並選擇行政區。");
      void cause;
    } finally {
      if (controllerRef.current === controller) setBusy(false);
    }
  }, []);

  const lookupAddress = useCallback(
    (latitude: number, longitude: number) =>
      run(async (signal) => {
        const result = await reverseGeocode(latitude, longitude, signal);
        if (signal.aborted) return;
        if (result) handlersRef.current.onAddress(result);
        else setError("這個位置不在台北市範圍內，或查不到地址。請確認標記位置，或手動輸入地址。");
      }),
    [run],
  );

  const locateAddress = useCallback(
    (query: string) => {
      const trimmed = query.trim();
      if (!trimmed) return Promise.resolve();
      return run(async (signal) => {
        const result = await searchAddress(trimmed, signal);
        if (signal.aborted) return;
        if (!result) {
          setError("在台北市找不到這個地址，請換個寫法（例如加上路名與門牌），或直接點地圖選擇。");
          return;
        }
        handlersRef.current.onLocated({ latitude: result.latitude, longitude: result.longitude });
        handlersRef.current.onAddress(result);
      });
    },
    [run],
  );

  return { busy, error, lookupAddress, locateAddress };
}
