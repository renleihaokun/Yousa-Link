import { describe, expect, it } from 'vitest';
import {
  getEntryNoticeStorageKey,
  resolveEntryNotice
} from '../../src/domain/entry-notices';

describe('entry notices', () => {
  it('resolves a configured entry alongside unrelated query parameters', () => {
    expect(resolveEntryNotice('?campaign=tour&entry=qr-main')).toEqual({
      id: 'qr-main',
      message: '你是通过二维码进入的，建议换用支持 NFC 的手机碰一碰访问',
      version: 1
    });
  });

  it('rejects missing, unknown, and untrusted entry values', () => {
    expect(resolveEntryNotice('')).toBeUndefined();
    expect(resolveEntryNotice('?entry=nfc-future')).toBeUndefined();
    expect(resolveEntryNotice('?entry=%3Cscript%3Ealert(1)%3C%2Fscript%3E')).toBeUndefined();
  });

  it('includes the entry version in its storage key', () => {
    expect(getEntryNoticeStorageKey({ id: 'qr-main', version: 1 }))
      .toBe('yousa-entry-notice-seen:qr-main:v1');
    expect(getEntryNoticeStorageKey({ id: 'qr-main', version: 2 }))
      .toBe('yousa-entry-notice-seen:qr-main:v2');
  });
});
