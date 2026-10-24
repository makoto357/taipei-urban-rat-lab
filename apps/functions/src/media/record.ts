import type { MediaRecord } from '@taipei-rat-lab/contracts';

export const isExpectedExistingMedia = (
  record: Pick<MediaRecord, 'ownerUid' | 'storagePath'> | undefined,
  ownerUid: string,
  storagePath: string,
): boolean =>
  record === undefined || (record.ownerUid === ownerUid && record.storagePath === storagePath);
