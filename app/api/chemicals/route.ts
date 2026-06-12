// app/api/chemicals/route.ts — Chemical listing API
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCache, setCache, CACHE_KEYS } from '@/lib/redis'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const platform = searchParams.get('platform') || 'CHEMICALPRO'
  const category = searchParams.get('category')
  const page = parseInt(searchParams.get('page') || '1')
  const limit = Math.min(parseInt(searchParams.get('limit') || '24'), 100)
  const featured = searchParams.get('featured') === 'true'

  const cacheKey = CACHE_KEYS.productIndex(platform, page)
  const cached = await getCache(cacheKey)
  if (cached) return NextResponse.json(cached)

  const where: any = { isActive: true, platform }
  if (category) where.category = { slug: category }
  if (featured) where.isFeatured = true

  const [chemicals, total] = await Promise.all([
    db.chemical.findMany({
      where,
      orderBy: [{ isFeatured: 'desc' }, { viewCount: 'desc' }],
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true, slug: true, productName: true, casNumber: true,
        molecularFormula: true, shortDescription: true, category: { select: { name: true, slug: true } },
        purityGrades: true, applications: true, hazardClass: true, isFeatured: true,
        tags: true, isExportReady: true,
      },
    }),
    db.chemical.count({ where }),
  ])

  const result = { chemicals, total, page, limit, pages: Math.ceil(total / limit) }
  await setCache(cacheKey, result, 1800)
  return NextResponse.json(result)
}
