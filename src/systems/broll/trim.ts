export function computeSuggestedTrim(
  clipDurationMs: number,
  targetDurationMs: number
): { inMs: number; outMs: number } {
  if (clipDurationMs <= 0 || targetDurationMs <= 0) {
    return { inMs: 0, outMs: Math.min(clipDurationMs, targetDurationMs) };
  }

  if (clipDurationMs <= targetDurationMs) {
    return { inMs: 0, outMs: clipDurationMs };
  }

  const availableWindow = clipDurationMs - targetDurationMs;

  const minOffset = Math.min(200, availableWindow);
  const maxOffset = Math.min(600, availableWindow);

  const startOffset = minOffset + Math.floor(Math.random() * (maxOffset - minOffset + 1));
  const inMs = Math.min(startOffset, availableWindow);
  const outMs = Math.min(inMs + targetDurationMs, clipDurationMs);

  return { inMs, outMs };
}
