// app/api/sitemap/route.ts — XML sitemap generator
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { SITE_CONFIG } from '@/lib/seo'

const COUNTRIES = ['india','usa','germany','uk','australia','uae','brazil','south-africa','kenya','nigeria','indonesia','vietnam','bangladesh','france','netherlands','canada','japan','south-korea','mexico','argentina','colombia','pakistan','egypt','turkey','thailand','philippines','malaysia','singapore','saudi-arabia','iran','iraq','ukraine','poland','spain','italy','netherlands','belgium','sweden','switzerland']

const INDUSTRIES = ['pharmaceutical','agriculture','paints-coatings','water-treatment','textile','food-beverage','mining','cosmetics','electronics','rubber','adhesives','cleaning','oil-gas','automotive']

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const platform = searchParams.get('platform') || 'CHEMICALPRO'
  const type = searchParams.get('type') || 'index'
  const page = parseInt(searchParams.get('page') || '1')
  const LIMIT = 1000

  const site = SITE_CONFIG[platform as keyof typeof SITE_CONFIG]
  const base = site.domain

  if (type === 'index') {
    // Sitemap index — points to all sub-sitemaps
    const totalChemicals = await db.chemical.count({ where: { isActive: true, platform } })
    const chemicalPages = Math.ceil(totalChemicals / LIMIT)

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap><loc>${base}/api/sitemap?type=static&platform=${platform}</loc><lastmod>${new Date().toISOString().split('T')[0]}</lastmod></sitemap>
  <sitemap><loc>${base}/api/sitemap?type=categories&platform=${platform}</loc><lastmod>${new Date().toISOString().split('T')[0]}</lastmod></sitemap>
  ${Array.from({length: chemicalPages}, (_,i) => `<sitemap><loc>${base}/api/sitemap?type=chemicals&platform=${platform}&page=${i+1}</loc><lastmod>${new Date().toISOString().split('T')[0]}</lastmod></sitemap>`).join('\n  ')}
  <sitemap><loc>${base}/api/sitemap?type=countries&platform=${platform}</loc><lastmod>${new Date().toISOString().split('T')[0]}</lastmod></sitemap>
  <sitemap><loc>${base}/api/sitemap?type=industries&platform=${platform}</loc><lastmod>${new Date().toISOString().split('T')[0]}</lastmod></sitemap>
</sitemapindex>`
    return new NextResponse(xml, { headers: { 'Content-Type': 'application/xml' } })
  }

  if (type === 'chemicals') {
    const chemicals = await db.chemical.findMany({
      where: { isActive: true, platform },
      skip: (page - 1) * LIMIT,
      take: LIMIT,
      select: { slug: true, casNumber: true, updatedAt: true },
      orderBy: { updatedAt: 'desc' },
    })

    const urls = chemicals.flatMap(c => {
      const lastmod = c.updatedAt.toISOString().split('T')[0]
      const urls = [
        `<url><loc>${base}/chemical/${c.slug}</loc><lastmod>${lastmod}</lastmod><changefreq>weekly</changefreq><priority>0.9</priority></url>`,
        `<url><loc>${base}/supplier/${c.slug}</loc><lastmod>${lastmod}</lastmod><changefreq>weekly</changefreq><priority>0.7</priority></url>`,
        `<url><loc>${base}/exporter/${c.slug}</loc><lastmod>${lastmod}</lastmod><changefreq>weekly</changefreq><priority>0.7</priority></url>`,
        `<url><loc>${base}/msds/${c.slug}</loc><lastmod>${lastmod}</lastmod><changefreq>monthly</changefreq><priority>0.7</priority></url>`,
        `<url><loc>${base}/tds/${c.slug}</loc><lastmod>${lastmod}</lastmod><changefreq>monthly</changefreq><priority>0.7</priority></url>`,
        `<url><loc>${base}/coa/${c.slug}</loc><lastmod>${lastmod}</lastmod><changefreq>monthly</changefreq><priority>0.7</priority></url>`,
        `<url><loc>${base}/uses/${c.slug}</loc><lastmod>${lastmod}</lastmod><changefreq>monthly</changefreq><priority>0.6</priority></url>`,
        `<url><loc>${base}/applications/${c.slug}</loc><lastmod>${lastmod}</lastmod><changefreq>monthly</changefreq><priority>0.6</priority></url>`,
      ]
      if (c.casNumber) urls.push(`<url><loc>${base}/cas/${c.casNumber}</loc><lastmod>${lastmod}</lastmod><changefreq>monthly</changefreq><priority>0.8</priority></url>`)
      return urls
    })

    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>`
    return new NextResponse(xml, { headers: { 'Content-Type': 'application/xml' } })
  }

  if (type === 'countries') {
    const chemicals = await db.chemical.findMany({
      where: { isActive: true, platform },
      select: { slug: true, updatedAt: true },
    })

    const urls = chemicals.flatMap(c =>
      COUNTRIES.map(country =>
        `<url><loc>${base}/${country}/${c.slug}</loc><lastmod>${c.updatedAt.toISOString().split('T')[0]}</lastmod><changefreq>monthly</changefreq><priority>0.6</priority></url>`
      )
    )

    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>`
    return new NextResponse(xml, { headers: { 'Content-Type': 'application/xml' } })
  }

  if (type === 'industries') {
    const chemicals = await db.chemical.findMany({
      where: { isActive: true, platform },
      select: { slug: true, updatedAt: true },
    })

    const urls = chemicals.flatMap(c =>
      INDUSTRIES.map(ind =>
        `<url><loc>${base}/industry/${ind}/${c.slug}</loc><lastmod>${c.updatedAt.toISOString().split('T')[0]}</lastmod><changefreq>monthly</changefreq><priority>0.6</priority></url>`
      )
    )

    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>`
    return new NextResponse(xml, { headers: { 'Content-Type': 'application/xml' } })
  }

  // Static pages sitemap
  const staticUrls = [
    { url: base, priority: '1.0', freq: 'daily' },
    { url: `${base}/product-index`, priority: '0.9', freq: 'daily' },
    { url: `${base}/search`, priority: '0.9', freq: 'weekly' },
    { url: `${base}/rfq`, priority: '0.9', freq: 'weekly' },
    { url: `${base}/export`, priority: '0.8', freq: 'weekly' },
    { url: `${base}/blog`, priority: '0.7', freq: 'weekly' },
    { url: `${base}/about`, priority: '0.6', freq: 'monthly' },
    { url: `${base}/contact`, priority: '0.6', freq: 'monthly' },
    { url: `${base}/msds`, priority: '0.7', freq: 'weekly' },
    { url: `${base}/tds`, priority: '0.7', freq: 'weekly' },
    { url: `${base}/coa`, priority: '0.7', freq: 'weekly' },
  ]

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${staticUrls.map(u => `<url><loc>${u.url}</loc><changefreq>${u.freq}</changefreq><priority>${u.priority}</priority></url>`).join('\n')}\n</urlset>`
  return new NextResponse(xml, { headers: { 'Content-Type': 'application/xml' } })
}
