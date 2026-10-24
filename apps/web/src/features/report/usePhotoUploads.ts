import { useCallback, useRef, useState } from "react";
import { collection, doc, onSnapshot, serverTimestamp, setDoc } from "firebase/firestore";
import { ref, uploadBytesResumable, type UploadTask } from "firebase/storage";
import { db, storage } from "../../lib/firebase";

export const MAX_PHOTOS = 3;
export const MAX_PHOTO_BYTES = 8 * 1024 * 1024;
export const ACCEPTED_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];

export type PhotoUploadStatus =
  | "uploading"
  | "processing"
  | "clean"
  | "rejected"
  | "upload_error";

export interface PhotoUpload {
  mediaId: string;
  fileName: string;
  storagePath: string;
  progress: number;
  status: PhotoUploadStatus;
}

/**
 * 對應 plan.md §3 media：client 先建立 `media/{mediaId}` Firestore 文件
 * （scanStatus: 'pending'），再把檔案上傳到同一路徑 `staging/{uid}/{mediaId}`；
 * apps/functions 的 processUpload（Storage onObjectFinalized）接手做格式驗證、
 * 縮圖、EXIF 移除，再把這份文件更新成 'clean' 或 'rejected'。這裡用 onSnapshot
 * 訂閱同一份文件，把後端處理結果同步回 UI。
 */
export function usePhotoUploads(uid: string | null) {
  const [photos, setPhotos] = useState<PhotoUpload[]>([]);
  const tasksRef = useRef<Map<string, UploadTask>>(new Map());
  const unsubscribersRef = useRef<Map<string, () => void>>(new Map());

  const removePhoto = useCallback((mediaId: string) => {
    tasksRef.current.get(mediaId)?.cancel();
    tasksRef.current.delete(mediaId);
    unsubscribersRef.current.get(mediaId)?.();
    unsubscribersRef.current.delete(mediaId);
    setPhotos((current) => current.filter((p) => p.mediaId !== mediaId));
  }, []);

  const addPhoto = useCallback(
    async (file: File) => {
      if (!uid) return;
      const mediaId = doc(collection(db, "media")).id;
      const storagePath = `staging/${uid}/${mediaId}`;

      setPhotos((current) => [
        ...current,
        { mediaId, fileName: file.name, storagePath, progress: 0, status: "uploading" },
      ]);

      try {
        await setDoc(doc(db, "media", mediaId), {
          ownerUid: uid,
          storagePath,
          originalContentType: file.type,
          originalBytes: file.size,
          scanStatus: "pending",
          moderationStatus: "private",
          exifStripped: false,
          createdAt: serverTimestamp(),
          schemaVersion: 1,
        });
      } catch {
        setPhotos((current) =>
          current.map((p) => (p.mediaId === mediaId ? { ...p, status: "upload_error" } : p)),
        );
        return;
      }

      const unsubscribe = onSnapshot(doc(db, "media", mediaId), (snapshot) => {
        const data = snapshot.data();
        if (!data || data.scanStatus === "pending") return;
        setPhotos((current) =>
          current.map((p) =>
            p.mediaId === mediaId
              ? { ...p, status: data.scanStatus === "clean" ? "clean" : "rejected" }
              : p,
          ),
        );
      });
      unsubscribersRef.current.set(mediaId, unsubscribe);

      const task = uploadBytesResumable(ref(storage, storagePath), file, { contentType: file.type });
      tasksRef.current.set(mediaId, task);

      task.on(
        "state_changed",
        (snapshot) => {
          const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
          setPhotos((current) =>
            current.map((p) => (p.mediaId === mediaId ? { ...p, progress } : p)),
          );
        },
        () => {
          setPhotos((current) =>
            current.map((p) => (p.mediaId === mediaId ? { ...p, status: "upload_error" } : p)),
          );
        },
        () => {
          setPhotos((current) =>
            current.map((p) =>
              p.mediaId === mediaId && p.status === "uploading"
                ? { ...p, status: "processing", progress: 100 }
                : p,
            ),
          );
        },
      );
    },
    [uid],
  );

  const retryPhoto = useCallback(
    (mediaId: string, file: File) => {
      removePhoto(mediaId);
      void addPhoto(file);
    },
    [addPhoto, removePhoto],
  );

  /** 送出通報前使用：是否所有照片都已離開 uploading/processing 狀態（送出前必須等照片處理完成）。 */
  const allSettled = photos.every((p) => p.status === "clean" || p.status === "rejected" || p.status === "upload_error");
  const cleanStoragePaths = photos.filter((p) => p.status === "clean").map((p) => p.storagePath);

  return { photos, addPhoto, removePhoto, retryPhoto, allSettled, cleanStoragePaths };
}
