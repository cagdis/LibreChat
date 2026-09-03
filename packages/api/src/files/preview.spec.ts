import { MAX_FILE_PREVIEW_BYTES, resolveMaxFilePreviewBytes } from './preview';

const DEFAULT_MAX_FILE_PREVIEW_BYTES = 512 * 1024;

describe('resolveMaxFilePreviewBytes', () => {
  it('uses the existing 512 KB default when unset or blank', () => {
    expect(resolveMaxFilePreviewBytes(undefined)).toBe(DEFAULT_MAX_FILE_PREVIEW_BYTES);
    expect(resolveMaxFilePreviewBytes('')).toBe(DEFAULT_MAX_FILE_PREVIEW_BYTES);
    expect(resolveMaxFilePreviewBytes('   ')).toBe(DEFAULT_MAX_FILE_PREVIEW_BYTES);
  });

  it('accepts positive byte values and floors fractions', () => {
    expect(resolveMaxFilePreviewBytes('1048576')).toBe(1048576);
    expect(resolveMaxFilePreviewBytes('1048576.9')).toBe(1048576);
  });

  it('falls back for invalid and non-positive values', () => {
    expect(resolveMaxFilePreviewBytes('nope')).toBe(DEFAULT_MAX_FILE_PREVIEW_BYTES);
    expect(resolveMaxFilePreviewBytes('0')).toBe(DEFAULT_MAX_FILE_PREVIEW_BYTES);
    expect(resolveMaxFilePreviewBytes('-1')).toBe(DEFAULT_MAX_FILE_PREVIEW_BYTES);
  });

  it('keeps the module-level value aligned with the environment', () => {
    expect(MAX_FILE_PREVIEW_BYTES).toBe(
      resolveMaxFilePreviewBytes(process.env.FILE_PREVIEW_MAX_OUTPUT_BYTES),
    );
  });
});
