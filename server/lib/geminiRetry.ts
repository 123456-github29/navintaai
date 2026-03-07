export async function retryWithBackoff<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      const isRateLimit = error?.message?.includes("429") || error?.message?.includes("rate_limit") || error?.status === 429;
      if (isRateLimit && attempt < maxRetries) {
        const delay = Math.min(1000 * Math.pow(2, attempt) + Math.random() * 1000, 15000);
        console.log(`[ai] Rate limited (429), retrying in ${Math.round(delay)}ms (attempt ${attempt + 1}/${maxRetries})`);
        await new Promise(r => setTimeout(r, delay));
        continue;
      }
      throw error;
    }
  }
  throw new Error("Unreachable");
}
