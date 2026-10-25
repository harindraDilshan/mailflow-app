import IORedis from "ioredis";
import { createHash } from "crypto";

const g = globalThis as unknown as { __rl?: IORedis };

function redis() {
  if (!g.__rl) {
    const url = (process.env.REDIS_URL ?? "redis://127.0.0.1:6379").replace(
      "redis://localhost",
      "redis://127.0.0.1"
    );
    g.__rl = new IORedis(url, {
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
    });
  }
  return g.__rl;
}

// "At most `limit` calls per `windowSec` seconds for this id."
// The id is hashed, so no email or IP address is stored in readable form.
export async function rateLimit(name: string, id: string, limit: number, windowSec: number) {
  const key = `rl:${name}:${createHash("sha1").update(id).digest("hex").slice(0, 20)}`;
  try {
    const res = await redis().multi().incr(key).expire(key, windowSec, "NX").ttl(key).exec();
    const count = Number(res?.[0]?.[1] ?? 0);
    const ttl = Number(res?.[2]?.[1] ?? windowSec);
    return { ok: count <= limit, retryAfter: Math.max(ttl, 1) };
  } catch (e) {
    console.error("Rate limiter unavailable", e);
    return { ok: true, retryAfter: 0 }; // if Redis is down we allow the request
  }
}
