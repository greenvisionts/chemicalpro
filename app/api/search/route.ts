// app/api/search/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { searchChemicals, autocomplete } from '@/lib/search'
import { getCache, setCache } from '@/lib/redis'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q') || ''
  const cas = searchParams.get('cas') || ''
  const formula = searchParams.get('formula') || ''
  const category = searchParams.get('category') || ''
  const industry = searchParams.get('industry') || ''
  const platform = searchParams.get('platform') || 'CHEMICALPRO'
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '20')
  const mode = searchParams.get('mode') || 'full' // full | suggest

  // Autocomplete mode
  if (mode === 'suggest' && q.length >= 2) {
    const suggestions = await autocomplete(q, platform)
    return NextResponse.json({ suggestions })
  }

  // Cache key for full search
  const cacheKey = `search:${platform}:${q}:${cas}:${formula}:${category}:${industry}:${page}`
  const cached = await getCache<object>(cacheKey)
  if (cached) return NextResponse.json(cached)

  let results

  try {
    // Try Elasticsearch first
    results = await searchChemicals({ query: q, casNumber: cas, formula, category, industry, platform, page, limit })
  } catch {
    // Fallback to Postgres full-text if Elasticsearch is down
    const where: any = {
      isActive: true,
      platform,
      OR: q ? [
        { productName: { contains: q, mode: 'insensitive' } },
        { casNumber: { contains: q } },
        { shortDescription: { contains: q, mode: 'insensitive' } },
        { synonyms: { some: { name: { contains: q, mode: 'insensitive' } } } },
      ] : undefined,
    }
    if (category) where.category = { slug: category }

    const [items, total] = await Promise.all([
      db.chemical.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        include: { category: { select: { name: true, slug: true } } },
        orderBy: [{ isFeatured: 'desc' }, { viewCount: 'desc' }],
      }),
      db.chemical.count({ where }),
    ])
    results = { results: items, total, page, limit }
  }

  // Log search for analytics
  await db.searchLog.create({
    data: { query: q || cas || formula, platform, results: results.total },
  }).catch(() => {})

  await setCache(cacheKey, results, 600)
  return NextResponse.json(results)
}
