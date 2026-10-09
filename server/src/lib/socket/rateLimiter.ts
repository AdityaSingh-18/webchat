interface RateLimiterOptions {
  limit: number;
  windowMs: number;
}

interface RateLimitBucket {
  count: number;
  resetAt: number;
}

export const createRateLimiter = ({
  limit,
  windowMs,
}: RateLimiterOptions) => {
  const buckets = new Map<string, RateLimitBucket>();

  const cleanup = setInterval(() => {
    const now = Date.now();

    for (const [key, bucket] of buckets) {
      if (bucket.resetAt <= now) {
        buckets.delete(key);
      }
    }
  }, windowMs);

  cleanup.unref();

  return {
    check: (key: string) => {
      const now = Date.now();
      const bucket = buckets.get(key);

      if (!bucket || bucket.resetAt <= now) {
        buckets.set(key, {
          count: 1,
          resetAt: now + windowMs,
        });

        return true;
      }

      if (bucket.count >= limit) {
        return false;
      }

      bucket.count += 1;
      return true;
    },
  };
};