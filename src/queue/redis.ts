import Redis from "ioredis";

let _connection: Redis | null = null;
let _lastErrorLog = 0;
const ERROR_LOG_THROTTLE_MS = 30000;

export function getRedisConnection(): Redis {
  if (_connection) return _connection;

  const url = process.env.REDIS_URL;
  if (!url) {
    throw new Error("REDIS_URL environment variable is required for queue service");
  }

  _connection = new Redis(url, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    retryStrategy(times: number) {
      const delay = Math.min(times * 2000, 60000);
      if (times <= 3) {
        console.log(`[redis] Reconnecting in ${delay}ms (attempt ${times})`);
      }
      return delay;
    },
    keepAlive: 30000,
    lazyConnect: true,
  });

  _connection.on("connect", () => console.log("[redis] Connected"));
  _connection.on("error", (err) => {
    const now = Date.now();
    if (now - _lastErrorLog > ERROR_LOG_THROTTLE_MS) {
      console.warn("[redis] Error:", err.message);
      _lastErrorLog = now;
    }
  });
  _connection.on("close", () => {});

  return _connection;
}

export function isRedisConfigured(): boolean {
  return !!process.env.REDIS_URL;
}

export async function closeRedis(): Promise<void> {
  if (_connection) {
    await _connection.quit();
    _connection = null;
  }
}
