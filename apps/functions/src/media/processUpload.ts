import {
  MediaRecordConverter,
  type MediaRecord,
} from '@taipei-rat-lab/contracts';
import { Timestamp } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import { onObjectFinalized } from 'firebase-functions/v2/storage';
import sharp from 'sharp';

import { adminDb, adminStorage, toAdminConverter } from '../admin.js';
import {
  detectSupportedImageType,
  isWithinByteLimit,
  isWithinPixelLimit,
  MAX_IMAGE_EDGE,
  MAX_IMAGE_PIXELS,
} from './image.js';
import { isExpectedExistingMedia } from './record.js';

const STAGING_PATH = /^staging\/([^/]+)\/([^/]+)$/u;

const bytesFrom = (size: number): number => Number.isSafeInteger(size) && size >= 0 ? size : 0;

export const processUpload = onObjectFinalized({
  region: 'asia-east1',
  memory: '1GiB',
  timeoutSeconds: 120,
  maxInstances: 2,
  concurrency: 1,
}, async (event) => {
  const object = event.data;
  const match = STAGING_PATH.exec(object.name);
  if (match === null) return;

  const [, ownerUid, mediaId] = match;
  if (ownerUid === undefined || mediaId === undefined) return;

  const source = adminStorage.bucket(object.bucket).file(object.name, {
    generation: String(object.generation),
  });
  const mediaRef = adminDb.collection('media').doc(mediaId).withConverter(toAdminConverter(MediaRecordConverter));
  const originalBytes = bytesFrom(object.size);
  const now = Timestamp.now();

  const initialRecord = (await mediaRef.get()).data();
  if (!isExpectedExistingMedia(initialRecord, ownerUid, object.name)) {
    logger.error('Skipped staged media with a conflicting record owner or path.', { mediaId, ownerUid });
    return;
  }

  const writeRejectedRecord = async (): Promise<void> => {
    const existing = await mediaRef.get();
    const existingRecord = existing.data();
    if (!isExpectedExistingMedia(existingRecord, ownerUid, object.name)) {
      logger.error('Skipped rejected media update with a conflicting record owner or path.', { mediaId, ownerUid });
      return;
    }
    const rejected: MediaRecord = {
      ownerUid,
      ...(existingRecord?.reportId !== undefined
        ? { reportId: existingRecord.reportId }
        : {}),
      storagePath: object.name,
      originalContentType: object.contentType ?? 'application/octet-stream',
      originalBytes,
      scanStatus: 'rejected',
      moderationStatus: 'rejected',
      exifStripped: false,
      createdAt: existingRecord?.createdAt ?? now,
      schemaVersion: 1,
    };
    await mediaRef.set(rejected);
  };

  try {
    if (!isWithinByteLimit(originalBytes)) {
      await writeRejectedRecord();
      return;
    }
    const [input] = await source.download();
    const inputType = detectSupportedImageType(input);
    if (inputType === undefined) {
      await writeRejectedRecord();
      return;
    }

    const decoded = sharp(input, { limitInputPixels: MAX_IMAGE_PIXELS, failOn: 'error' });
    const metadata = await decoded.metadata();
    if (
      metadata.width === undefined
      || metadata.height === undefined
      || !isWithinPixelLimit(metadata.width, metadata.height)
    ) {
      await writeRejectedRecord();
      return;
    }

    const { data: sanitized, info } = await decoded
      .rotate()
      .resize({ width: MAX_IMAGE_EDGE, height: MAX_IMAGE_EDGE, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 85 })
      .toBuffer({ resolveWithObject: true });

    await adminStorage.bucket(object.bucket).file(`sanitized/${ownerUid}/${mediaId}.webp`).save(sanitized, {
      contentType: 'image/webp',
      resumable: false,
      metadata: { cacheControl: 'private, no-store' },
    });

    const existing = await mediaRef.get();
    const existingRecord = existing.data();
    if (!isExpectedExistingMedia(existingRecord, ownerUid, object.name)) {
      logger.error('Skipped clean media update with a conflicting record owner or path.', { mediaId, ownerUid });
      return;
    }
    const clean: MediaRecord = {
      ownerUid,
      ...(existingRecord?.reportId !== undefined
        ? { reportId: existingRecord.reportId }
        : {}),
      storagePath: object.name,
      originalContentType: inputType,
      processedContentType: 'image/webp',
      originalBytes,
      processedBytes: sanitized.byteLength,
      width: info.width,
      height: info.height,
      scanStatus: 'clean',
      moderationStatus: 'private',
      exifStripped: true,
      createdAt: existingRecord?.createdAt ?? now,
      schemaVersion: 1,
    };
    await mediaRef.set(clean);
  } catch (error) {
    logger.warn('Rejected staged media during secure processing.', {
      mediaId,
      ownerUid,
      message: error instanceof Error ? error.message : 'unknown error',
    });
    await writeRejectedRecord();
  }
});
