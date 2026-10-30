import { env } from '../config/env.js';
import { redis } from '../config/redis.js';

const HOUR_IN_SECONDS = 60 * 60;

export function getCurrentHourStart(date = new Date()) {
  const current = new Date(date);
  current.setMinutes(0, 0, 0);
  current.setSeconds(0, 0);
  current.setMilliseconds(0);
  return current;
}

export async function checkSenderRateLimit(senderId: string) {
  const hourStart = getCurrentHourStart();
  const key = `rate-limit:${senderId}:${hourStart.getTime()}`;
  const count = await redis.incr(key);

  if (count === 1) {
    await redis.expire(key, HOUR_IN_SECONDS);
  }

  const limit = Number(env.MAX_EMAILS_PER_HOUR_PER_SENDER ?? 100);
  const resetAt = new Date(hourStart.getTime() + HOUR_IN_SECONDS * 1000);

  return {
    allowed: count <= limit,
    firstExceeded: count === limit + 1,
    count,
    limit,
    resetAt,
    retryDelayMs: Math.max(0, resetAt.getTime() - Date.now())
  };
}
