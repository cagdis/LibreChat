const DEFAULT_MAX_FILE_PREVIEW_BYTES = 512 * 1024;

/**
 * Resolve the maximum serialized preview payload from the environment.
 *
 * The default keeps the existing cache and transport budget. Operators can
 * raise it for rich office documents whose inline HTML contains embedded
 * images or other large data URLs.
 */
export function resolveMaxFilePreviewBytes(value: string | undefined): number {
  if (value == null || value.trim() === '') {
    return DEFAULT_MAX_FILE_PREVIEW_BYTES;
  }

  const parsed = Math.floor(Number(value));
  return Number.isFinite(parsed) && parsed >= 1 ? parsed : DEFAULT_MAX_FILE_PREVIEW_BYTES;
}

export const MAX_FILE_PREVIEW_BYTES: number = resolveMaxFilePreviewBytes(
  process.env.FILE_PREVIEW_MAX_OUTPUT_BYTES,
);
