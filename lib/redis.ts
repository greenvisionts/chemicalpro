// lib/redis.ts — Redis singleton for caching
import Redis from 'ioredis'

const globalForRedis = globalThis as unknown as { redis: Redis | undefined }

export const redis =
  globalForRedis.redis ??
  new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: 3,
    enableReadyCheck: false,
    lazyConnect: true,
  })

if (process.env.NODE_ENV !== 'production') globalForRedis.redis = redis

// Cache helpers
export async function getCache<T>(key: string): Promise<T | null> {
  try {
    const data = await redis.get(key)
    return data ? JSON.parse(data) : null
  } catch {
    return null
  }
}

export async function setCache(key: string, value: unknown, ttlSeconds = 3600): Promise<void> {
  try {
    await redis.setex(key, ttlSeconds, JSON.stringify(value))
  } catch {
    // Silent fail — cache miss is acceptable
  }
}

export async function invalidateCache(pattern: string): Promise<void> {
  try {
    const keys = await redis.keys(pattern)
    if (keys.length > 0) await redis.del(...keys)
  } catch {}
}

export const CACHE_KEYS = {
  chemical: (slug: string) => `chem:${slug}`,
  category: (slug: string) => `cat:${slug}`,
  search: (q: string, page: number) => `search:${q}:${page}`,
  homepage: (platform: string) => `home:${platform}`,
  productIndex: (platform: string, page: number) => `prodidx:${platform}:${page}`,
  rfqCount: () => 'rfq:count',
  featuredProducts: (platform: string) => `featured:${platform}`,
}
