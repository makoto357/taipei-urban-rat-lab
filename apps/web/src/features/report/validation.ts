import { ACCEPTED_PHOTO_TYPES, MAX_PHOTO_BYTES } from "./usePhotoUploads";

export function photoFileError(file: File): string | null {
  if (!ACCEPTED_PHOTO_TYPES.includes(file.type)) {
    return "只接受 JPEG、PNG 或 WebP 格式的照片。";
  }
  if (file.size > MAX_PHOTO_BYTES) {
    return "照片檔案超過 8 MB，請重新選擇。";
  }
  return null;
}

/** 觀察日期／時間不能是不合理的未來（plan.md Phase 4）：允許 5 分鐘內的時鐘誤差。 */
export function isObservedAtReasonable(observedAt: Date): boolean {
  return observedAt.getTime() <= Date.now() + 5 * 60 * 1000;
}
