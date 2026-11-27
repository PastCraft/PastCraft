interface RateLimitBucket {
  timestamps: number[];
}

const globalForRateLimit = globalThis as unknown as {
  __pastcraftRateLimitBuckets?: Map<string, RateLimitBucket>;
};

function getBuckets(): Map<string, RateLimitBucket> {
  if (!globalForRateLimit.__pastcraftRateLimitBuckets) {
    globalForRateLimit.__pastcraftRateLimitBuckets = new Map();
  }
  return globalForRateLimit.__pastcraftRateLimitBuckets;
}

export function clearRateLimits(): void {
  getBuckets().clear();
}

export function checkSlidingWindowRateLimit(
  key: string,
  limit: number,
  windowMs: number
): { allowed: boolean; retryAfterSeconds: number } {
  const now = Date.now();
  const buckets = getBuckets();
  const bucket = buckets.get(key) ?? { timestamps: [] };
  const cutoff = now - windowMs;

  bucket.timestamps = bucket.timestamps.filter((ts) => ts > cutoff);

  if (bucket.timestamps.length >= limit) {
    const oldestInWindow = bucket.timestamps[0] ?? now;
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((oldestInWindow + windowMs - now) / 1000)
    );
    buckets.set(key, bucket);
    return { allowed: false, retryAfterSeconds };
  }

  bucket.timestamps.push(now);
  buckets.set(key, bucket);
  return { allowed: true, retryAfterSeconds: 0 };
}
