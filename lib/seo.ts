// lib/seo.ts — Complete SEO automation engine
import type { Chemical, Supplier } from '@prisma/client'

export const SITE_CONFIG = {
  CHEMICALPRO: {
    name: 'ChemicalPro',
    domain: 'https://www.chemicalpro.in',
    tagline: 'Global Chemical Marketplace & Search Engine',
    description: 'World\'s largest chemical database. Search 100,000+ chemicals by name, CAS number, formula. Suppliers, exporters, importers. COA, MSDS, TDS documents.',
    phone: '+91-9890550271',
    whatsapp: '919890550271',
    email: 'admin@fertilizerindia.com',
    address: 'Plot No. 6, Survey No. 599/2, Nashik 422206, Maharashtra, India',
    gst: '27AAIFG3238J1Z9',
    color: '#7c3aed',
  },
  PHARMACLOUD: {
    name: 'PharmaCloud',
    domain: 'https://www.pharmacloud.in',
    tagline: 'Global Pharmaceutical Chemical Marketplace',
    description: 'Find pharmaceutical APIs, excipients, intermediates and nutraceutical raw materials. Verified GMP suppliers. COA, MSDS, TDS. Global export.',
    phone: '+91-9890550271',
    whatsapp: '919890550271',
    email: 'admin@fertilizerindia.com',
    address: 'Plot No. 6, Survey No. 599/2, Nashik 422206, Maharashtra, India',
    gst: '27AAIFG3238J1Z9',
    color: '#0284c7',
  },
}

// ── Chemical Page Meta ─────────────────────────────────────────────────────
export function generateChemicalMeta(chemical: any, platform = 'CHEMICALPRO') {
  const site = SITE_CONFIG[platform as keyof typeof SITE_CONFIG]
  const cas = chemical.casNumber ? ` CAS ${chemical.casNumber}` : ''
  const formula = chemical.molecularFormula ? ` (${chemical.molecularFormula})` : ''

  return {
    title: chemical.seoTitle || `${chemical.productName}${cas} — Supplier, Exporter, Price | ${site.name}`,
    description: chemical.seoDescription || `${chemical.productName}${formula}${cas}. Buy from verified suppliers. Get price, MSDS, COA, TDS. Global export. ${chemical.applications?.slice(0,2).join(', ')}. Request free quote.`,
    keywords: [
      chemical.productName.toLowerCase(),
      `${chemical.productName.toLowerCase()} supplier`,
      `${chemical.productName.toLowerCase()} manufacturer india`,
      `${chemical.productName.toLowerCase()} price`,
      `${chemical.productName.toLowerCase()} exporter`,
      chemical.casNumber ? `cas ${chemical.casNumber}` : null,
      chemical.casNumber ? `${chemical.casNumber} supplier` : null,
      `buy ${chemical.productName.toLowerCase()}`,
      `${chemical.productName.toLowerCase()} msds`,
      `${chemical.productName.toLowerCase()} tds`,
      ...(chemical.seoKeywords || []),
    ].filter(Boolean).join(', '),
    canonical: `${site.domain}/chemical/${chemical.slug}`,
    ogImage: chemical.ogImage || `${site.domain}/og-default.jpg`,
    ogType: 'product',
  }
}

// ── Country Page Meta ──────────────────────────────────────────────────────
export function generateCountryMeta(chemical: any, country: string, countryName: string, platform = 'CHEMICALPRO') {
  const site = SITE_CONFIG[platform as keyof typeof SITE_CONFIG]
  return {
    title: `${chemical.productName} Supplier in ${countryName} — Price, Exporter | ${site.name}`,
    description: `Buy ${chemical.productName} in ${countryName}. Verified suppliers, exporters and importers. ${chemical.casNumber ? `CAS ${chemical.casNumber}.` : ''} Request quote, COA, MSDS. Fast delivery to ${countryName}.`,
    keywords: `${chemical.productName.toLowerCase()} ${countryName.toLowerCase()}, buy ${chemical.productName.toLowerCase()} ${countryName.toLowerCase()}, ${chemical.productName.toLowerCase()} supplier ${countryName.toLowerCase()}, ${chemical.productName.toLowerCase()} exporter ${countryName.toLowerCase()}`,
    canonical: `${site.domain}/${country.toLowerCase()}/${chemical.slug}`,
  }
}

// ── Industry Page Meta ─────────────────────────────────────────────────────
export function generateIndustryMeta(chemical: any, industry: string, industryName: string, platform = 'CHEMICALPRO') {
  const site = SITE_CONFIG[platform as keyof typeof SITE_CONFIG]
  return {
    title: `${chemical.productName} for ${industryName} Industry — Uses, Grades, Suppliers | ${site.name}`,
    description: `${chemical.productName} applications in ${industryName} industry. Grades, specifications, approved suppliers. ${chemical.casNumber ? `CAS ${chemical.casNumber}.` : ''} Get COA, TDS, MSDS. Request bulk supply.`,
    canonical: `${site.domain}/industry/${industry}/${chemical.slug}`,
  }
}

// ── JSON-LD Schema Generators ──────────────────────────────────────────────

export function generateProductSchema(chemical: any, platform = 'CHEMICALPRO') {
  const site = SITE_CONFIG[platform as keyof typeof SITE_CONFIG]
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: chemical.productName,
    description: chemical.shortDescription,
    identifier: chemical.casNumber ? [
      { '@type': 'PropertyValue', name: 'CAS Number', value: chemical.casNumber },
      { '@type': 'PropertyValue', name: 'Molecular Formula', value: chemical.molecularFormula },
    ] : undefined,
    offers: {
      '@type': 'AggregateOffer',
      priceCurrency: 'USD',
      availability: 'https://schema.org/InStock',
      seller: {
        '@type': 'Organization',
        name: site.name,
        url: site.domain,
      },
    },
    additionalProperty: [
      chemical.casNumber && { '@type': 'PropertyValue', name: 'CAS Number', value: chemical.casNumber },
      chemical.molecularFormula && { '@type': 'PropertyValue', name: 'Molecular Formula', value: chemical.molecularFormula },
      chemical.molecularWeight && { '@type': 'PropertyValue', name: 'Molecular Weight', value: `${chemical.molecularWeight} g/mol` },
      chemical.hazardClass && { '@type': 'PropertyValue', name: 'Hazard Class', value: chemical.hazardClass },
    ].filter(Boolean),
  }
}

export function generateChemicalFAQSchema(chemical: any) {
  const cas = chemical.casNumber ? ` (CAS ${chemical.casNumber})` : ''
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: `What is ${chemical.productName}${cas}?`,
        acceptedAnswer: { '@type': 'Answer', text: chemical.shortDescription },
      },
      {
        '@type': 'Question',
        name: `What is the CAS number of ${chemical.productName}?`,
        acceptedAnswer: { '@type': 'Answer', text: chemical.casNumber ? `The CAS number of ${chemical.productName} is ${chemical.casNumber}.` : 'Contact us for CAS number information.' },
      },
      {
        '@type': 'Question',
        name: `What are the uses of ${chemical.productName}?`,
        acceptedAnswer: { '@type': 'Answer', text: chemical.applications?.join(', ') || 'Contact us for detailed application information.' },
      },
      {
        '@type': 'Question',
        name: `Where can I buy ${chemical.productName} in bulk?`,
        acceptedAnswer: { '@type': 'Answer', text: `You can buy ${chemical.productName} in bulk from ChemicalPro. We connect you with verified manufacturers, exporters and suppliers globally. Submit an RFQ for a competitive quote.` },
      },
      {
        '@type': 'Question',
        name: `Is MSDS/SDS available for ${chemical.productName}?`,
        acceptedAnswer: { '@type': 'Answer', text: `Yes. Safety Data Sheet (SDS/MSDS), Technical Data Sheet (TDS), and Certificate of Analysis (COA) for ${chemical.productName} are available for download. You can also request them via our RFQ form.` },
      },
    ],
  }
}

export function generateOrganizationSchema(platform = 'CHEMICALPRO') {
  const site = SITE_CONFIG[platform as keyof typeof SITE_CONFIG]
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: site.name,
    url: site.domain,
    logo: `${site.domain}/logo.png`,
    description: site.description,
    address: {
      '@type': 'PostalAddress',
      streetAddress: 'Plot No. 6, Survey No. 599/2, Airport Road, Janori',
      addressLocality: 'Nashik',
      addressRegion: 'Maharashtra',
      postalCode: '422206',
      addressCountry: 'IN',
    },
    contactPoint: {
      '@type': 'ContactPoint',
      telephone: site.phone,
      contactType: 'sales',
      availableLanguage: ['English', 'Hindi'],
    },
    sameAs: [
      'https://www.fertilizerindia.com',
      'https://www.agripeople.in',
    ],
  }
}

export function generateBreadcrumbSchema(items: { name: string; url: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  }
}

// ── Sitemap URL generators ─────────────────────────────────────────────────
export function generateSitemapUrls(chemicals: any[], platform = 'CHEMICALPRO') {
  const site = SITE_CONFIG[platform as keyof typeof SITE_CONFIG]
  const base = site.domain
  const urls: { url: string; lastmod: string; priority: string; changefreq: string }[] = []

  chemicals.forEach(c => {
    const lastmod = c.updatedAt?.toISOString().split('T')[0] || new Date().toISOString().split('T')[0]
    // Core product page
    urls.push({ url: `${base}/chemical/${c.slug}`, lastmod, priority: '0.9', changefreq: 'weekly' })
    // Document pages
    urls.push({ url: `${base}/sds/${c.slug}`, lastmod, priority: '0.7', changefreq: 'monthly' })
    urls.push({ url: `${base}/msds/${c.slug}`, lastmod, priority: '0.7', changefreq: 'monthly' })
    urls.push({ url: `${base}/tds/${c.slug}`, lastmod, priority: '0.7', changefreq: 'monthly' })
    urls.push({ url: `${base}/coa/${c.slug}`, lastmod, priority: '0.7', changefreq: 'monthly' })
    // CAS page
    if (c.casNumber) urls.push({ url: `${base}/cas/${c.casNumber}`, lastmod, priority: '0.8', changefreq: 'monthly' })
    // Supplier/exporter/trader pages
    urls.push({ url: `${base}/supplier/${c.slug}`, lastmod, priority: '0.7', changefreq: 'weekly' })
    urls.push({ url: `${base}/exporter/${c.slug}`, lastmod, priority: '0.7', changefreq: 'weekly' })
    urls.push({ url: `${base}/uses/${c.slug}`, lastmod, priority: '0.6', changefreq: 'monthly' })
  })

  return urls
}
