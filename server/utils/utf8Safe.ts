/**
 * UTF-8 safe text sanitizer for transcription pipeline
 * Removes problematic Unicode characters that break Buffer/FFmpeg/JSON
 * while preserving emojis and valid Unicode text
 */
export function utf8Safe(text: string | null | undefined): string {
  if (!text) return "";

  return text
    .normalize("NFC")
    .replace(/[\u2028\u2029]/g, "\n")
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, "");
}
