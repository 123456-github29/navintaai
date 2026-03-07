// export function sanitizeText(input: string | null | undefined): string {
//   if (!input) return "";
//   return input
//     .normalize("NFC")
//     .replace(/[\u2028\u2029]/g, "\n")
//     .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, "")
//     .trim();
// }

// export function deepSanitize<T>(obj: T): T {
//   if (obj === null || obj === undefined) {
//     return obj;
//   }
//   if (typeof obj === "string") {
//     return ensureByteSafe(obj) as T;
//   }
//   if (Array.isArray(obj)) {
//     return obj.map((item) => deepSanitize(item)) as T;
//   }
//   if (typeof obj === "object") {
//     const result: Record<string, unknown> = {};
//     for (const key in obj) {
//       if (Object.prototype.hasOwnProperty.call(obj, key)) {
//         result[key] = deepSanitize((obj as Record<string, unknown>)[key]);
//       }
//     }
//     return result as T;
//   }
//   return obj;
// }

// export function ensureByteSafe(text: string | null | undefined): string {
//   if (!text) return "";

//   // Normalize to NFC (composed form) - preserves Unicode characters properly
//   let result = text.normalize("NFC");

//   // Replace problematic line/paragraph separators with regular newlines
//   result = result.replace(/[\u2028\u2029]/g, '\n');

//   // Strip only dangerous control characters (keep printable Unicode)
//   // Remove: NULL, SOH-BS (0x00-0x08), VT, FF (0x0B-0x0C), SO-US (0x0E-0x1F), DEL, C1 controls (0x7F-0x9F)
//   let finalResult = '';
//   for (let i = 0; i < result.length; i++) {
//     const charCode = result.charCodeAt(i);
//     // Skip dangerous control characters only
//     if ((charCode >= 0x00 && charCode <= 0x08) ||
//         (charCode >= 0x0B && charCode <= 0x0C) ||
//         (charCode >= 0x0E && charCode <= 0x1F) ||
//         (charCode >= 0x7F && charCode <= 0x9F)) {
//       continue;
//     }
//     // Keep ALL other characters including Unicode > 255
//     finalResult += result[i];
//   }

//   return finalResult;
// }

// export function safeBufferFrom(
//   text: string | null | undefined,
//   encoding: BufferEncoding = "utf8"
// ): Buffer {
//   try {
//     const sanitized = ensureByteSafe(text);
//     return Buffer.from(sanitized, encoding);
//   } catch (error) {
//     console.error(
//       "[safeBufferFrom] Failed to create buffer, input length:",
//       text?.length ?? 0
//     );
//     return Buffer.from("", encoding);
//   }
// }

// export function safeJsonStringify(data: unknown): string {
//   const sanitized = deepSanitize(data);
//   return JSON.stringify(sanitized);
// }

export function sanitize(input: string | null | undefined): string {
  if (!input) return "";

  let result = input.normalize("NFC");
  result = result.replace(/[\u2028\u2029]/g, "\n");

  let out = "";
  for (let i = 0; i < result.length; i++) {
    const c = result.charCodeAt(i);
    if (
      (c >= 0x00 && c <= 0x08) ||
      (c >= 0x0b && c <= 0x0c) ||
      (c >= 0x0e && c <= 0x1f) ||
      (c >= 0x7f && c <= 0x9f)
    )
      continue;
    out += result[i];
  }

  return out.trim();
}

export function deepSanitize<T>(obj: T): T {
  if (obj === null || obj === undefined) return obj as T;
  if (typeof obj === "string") return sanitize(obj) as T;
  if (obj instanceof Date) return obj;
  if (Array.isArray(obj)) return obj.map(deepSanitize) as T;

  if (typeof obj === "object") {
    const out: any = {};
    for (const k in obj) out[k] = deepSanitize((obj as any)[k]);
    return out;
  }

  return obj;
}

export function safeBufferFrom(text: string | null | undefined) {
  return Buffer.from(sanitize(text), "utf8");
}

export function safeJsonStringify(data: unknown) {
  return JSON.stringify(deepSanitize(data));
}

// Alias for backward compatibility
export const ensureByteSafe = sanitize;
