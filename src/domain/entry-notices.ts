export interface EntryNotice {
  id: string;
  message: string;
  version: number;
}

export const ENTRY_NOTICES = [
  {
    id: 'qr-main',
    message: '你是通过二维码进入的，建议换用支持 NFC 的手机碰一碰访问',
    version: 1
  }
] as const satisfies readonly EntryNotice[];

const entryNoticeById = new Map<string, EntryNotice>(
  ENTRY_NOTICES.map((notice) => [notice.id, notice])
);

export function resolveEntryNotice(search: string) {
  const entryId = new URLSearchParams(search).get('entry');
  return entryId ? entryNoticeById.get(entryId) : undefined;
}

export function getEntryNoticeStorageKey(notice: Pick<EntryNotice, 'id' | 'version'>) {
  return `yousa-entry-notice-seen:${notice.id}:v${notice.version}`;
}
