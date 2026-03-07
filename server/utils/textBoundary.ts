import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

export function normalizeText(text: string): string {
  if (!text) return "";
  return text.normalize("NFC");
}

export function safeFilename(text: string): string {
  if (!text) return "unnamed";
  return text
    .normalize("NFKD")
    .replace(/[^\w.-]+/g, "_")
    .slice(0, 100);
}

export function safeShellText(text: string): string {
  if (!text) return "";
  return text.replace(/["'`$\\]/g, "");
}

export async function writeTempTextFile(text: string): Promise<string> {
  const id = crypto.randomUUID();
  const file = path.join("/tmp", `${id}.txt`);
  await fs.writeFile(file, normalizeText(text), "utf8");
  return file;
}

export async function cleanupTempFile(filePath: string): Promise<void> {
  try {
    await fs.unlink(filePath);
  } catch {
  }
}
