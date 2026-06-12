// app/chemical/[slug]/page.tsx — Individual product page
import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { getCache, setCache, CACHE_KEYS } from '@/lib/redis'
import { generateChemicalMeta, generateProductSchema, generateChemicalFAQSchema, generateBreadcrumbSchema, SITE_CONFIG } from '@/lib/seo'

interface Props { params: { slug: string }; searchParams: { platform?: string } }

// Generate static paths for top products at build time
export async function generateStaticParams() {
  const chemicals = await db.chemical.findMany({
    where: { isActive: true, isFeatured: true },
    select: { slug: true },
    take: 500,
  })
  return chemicals.map(c => ({ slug: c.slug }))
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const platform = searchParams.platform || 'CHEMICALPRO'
  const chemical = await getChemical(params.slug)
  if (!chemical) return { title: 'Chemical Not Found' }

  const meta = generateChemicalMeta(chemical, platform)
  const site = SITE_CONFIG[platform as keyof typeof SITE_CONFIG]

  return {
    title: meta.title,
    description: meta.description,
    keywords: meta.keywords,
    openGraph: {
      title: meta.title,
      description: meta.description,
      url: meta.canonical,
      siteName: site.name,
      type: 'website',
      images: [{ url: meta.ogImage, width: 1200, height: 630, alt: chemical.productName }],
    },
    twitter: { card: 'summary_large_image', title: meta.title, description: meta.description },
    alternates: { canonical: meta.canonical },
    robots: { index: true, follow: true, 'max-snippet': -1, 'max-image-preview': 'large' },
  }
}

async function getChemical(slug: string) {
  const cacheKey = CACHE_KEYS.chemical(slug)
  const cached = await getCache(cacheKey)
  if (cached) return cached as any

  const chemical = await db.chemical.findUnique({
    where: { slug },
    include: {
      category: true,
      documents: { where: { isPublic: true }, orderBy: { type: 'asc' } },
      synonyms: true,
      suppliers: {
        include: { supplier: true },
        where: { isActive: true },
        take: 10,
      },
    },
  })

  if (chemical) {
    await setCache(cacheKey, chemical, 3600)
    await db.chemical.update({ where: { id: chemical.id }, data: { viewCount: { increment: 1 } } }).catch(() => {})
  }

  return chemical
}

const GHS_ICONS: Record<string, string> = {
  'GHS01': '💥', 'GHS02': '🔥', 'GHS03': '🔴', 'GHS04': '⛽',
  'GHS05': '⚗️', 'GHS06': '☠️', 'GHS07': '⚠️', 'GHS08': '🫁', 'GHS09': '🌊',
}

export default async function ChemicalPage({ params, searchParams }: Props) {
  const platform = searchParams.platform || 'CHEMICALPRO'
  const chemical = await getChemical(params.slug)
  if (!chemical) notFound()

  const site = SITE_CONFIG[platform as keyof typeof SITE_CONFIG]
  const isCP = platform === 'CHEMICALPRO'
  const accent = isCP ? '#7c3aed' : '#0284c7'
  const accentLight = isCP ? '#f5f3ff' : '#f0f9ff'
  const accentBorder = isCP ? '#ddd6fe' : '#bae6fd'

  const productSchema = generateProductSchema(chemical, platform)
  const faqSchema = generateChemicalFAQSchema(chemical)
  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: 'Home', url: site.domain },
    { name: 'Products', url: `${site.domain}/product-index` },
    { name: chemical.category?.name || 'Chemical', url: `${site.domain}/category/${chemical.category?.slug}` },
    { name: chemical.productName, url: `${site.domain}/chemical/${chemical.slug}` },
  ])

  const docs = {
    SDS: chemical.documents.find((d:any) => d.type === 'SDS' || d.type === 'MSDS'),
    TDS: chemical.documents.find((d:any) => d.type === 'TDS'),
    COA: chemical.documents.find((d:any) => d.type === 'COA'),
    SPEC: chemical.documents.find((d:any) => d.type === 'SPECIFICATION'),
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />

      <div style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', color: '#1a1a1a', background: '#fff' }}>

        {/* Breadcrumb */}
        <nav style={{ background: accentLight, borderBottom: `1px solid ${accentBorder}`, padding: '10px 20px', fontSize: '12px', color: '#888' }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <a href="/" style={{ color: accent, textDecoration: 'none' }}>Home</a> ›{' '}
            <a href="/product-index" style={{ color: accent, textDecoration: 'none' }}>Products</a> ›{' '}
            <a href={`/category/${chemical.category?.slug}`} style={{ color: accent, textDecoration: 'none' }}>{chemical.category?.name}</a> ›{' '}
            <span>{chemical.productName}</span>
          </div>
        </nav>

        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '32px 20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '32px' }}>

            {/* LEFT — Main Content */}
            <div>
              {/* Product Header */}
              <div style={{ marginBottom: '24px' }}>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '10px' }}>
                  <span style={{ background: accentLight, color: accent, fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '8px', border: `1px solid ${accentBorder}` }}>{chemical.category?.name}</span>
                  {chemical.isExportReady && <span style={{ background: '#f0fdf4', color: '#166534', fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '8px', border: '1px solid #bbf7d0' }}>🚢 Export Ready</span>}
                  {chemical.isFeatured && <span style={{ background: '#fef3c7', color: '#92400e', fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '8px' }}>⭐ Featured</span>}
                </div>
                <h1 style={{ fontSize: '36px', fontWeight: 900, color: '#111', lineHeight: 1.1, marginBottom: '8px' }}>{chemical.productName}</h1>
                {chemical.iupacName && <p style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>IUPAC: <em>{chemical.iupacName}</em></p>}
                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', fontSize: '14px', color: '#555', marginBottom: '14px' }}>
                  {chemical.casNumber && <span>CAS: <strong style={{ color: '#111' }}>{chemical.casNumber}</strong></span>}
                  {chemical.molecularFormula && <span>Formula: <strong style={{ color: '#111', fontFamily: 'monospace' }}>{chemical.molecularFormula}</strong></span>}
                  {chemical.molecularWeight && <span>MW: <strong style={{ color: '#111' }}>{chemical.molecularWeight} g/mol</strong></span>}
                  {chemical.ecNumber && <span>EC: <strong style={{ color: '#111' }}>{chemical.ecNumber}</strong></span>}
                </div>
                <p style={{ fontSize: '16px', color: '#444', lineHeight: 1.7 }}>{chemical.shortDescription}</p>
              </div>

              {/* GHS Hazard Information */}
              {(chemical.hazardClass || chemical.ghs?.length > 0) && (
                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px', padding: '16px', marginBottom: '24px' }}>
                  <div style={{ fontWeight: 700, color: '#dc2626', marginBottom: '8px', fontSize: '14px' }}>⚠️ Hazard Information (GHS)</div>
                  <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '8px' }}>
                    {chemical.ghs?.map((g: string) => <span key={g} title={g} style={{ fontSize: '24px' }}>{GHS_ICONS[g] || '⚠️'}</span>)}
                  </div>
                  <div style={{ fontSize: '13px', color: '#555' }}>
                    <strong>Hazard Class:</strong> {chemical.hazardClass} &nbsp;·&nbsp;
                    <strong>Signal Word:</strong> {chemical.signalWord || 'Warning'}
                    {chemical.unNumber && <> &nbsp;·&nbsp; <strong>UN No:</strong> {chemical.unNumber}</>}
                  </div>
                </div>
              )}

              {/* Documents — COA, MSDS, TDS, SDS */}
              <div style={{ marginBottom: '28px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#111', marginBottom: '14px', borderLeft: `4px solid ${accent}`, paddingLeft: '12px' }}>📋 Technical Documents</h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: '12px' }}>
                  {[
                    { key: 'SDS', icon: '🛡️', label: 'Safety Data Sheet (SDS/MSDS)', desc: 'GHS format — hazards, handling, emergency response' },
                    { key: 'TDS', icon: '📊', label: 'Technical Data Sheet (TDS)', desc: 'Specifications, purity, physical properties' },
                    { key: 'COA', icon: '🔬', label: 'Certificate of Analysis (COA)', desc: 'Batch-specific analytical test report' },
                    { key: 'SPEC', icon: '📋', label: 'Product Specification', desc: 'Detailed quality specifications and grades' },
                  ].map(({ key, icon, label, desc }) => (
                    <div key={key} style={{ background: accentLight, border: `1px solid ${accentBorder}`, borderRadius: '10px', padding: '16px' }}>
                      <div style={{ fontWeight: 700, color: '#111', marginBottom: '4px' }}>{icon} {label}</div>
                      <div style={{ fontSize: '12px', color: '#666', marginBottom: '12px' }}>{desc}</div>
                      {(docs as any)[key] ? (
                        <a href={(docs as any)[key].fileUrl} target="_blank" rel="noopener noreferrer"
                          style={{ background: accent, color: '#fff', padding: '7px 14px', borderRadius: '7px', fontSize: '12px', fontWeight: 700, textDecoration: 'none', display: 'inline-block' }}>
                          ⬇️ Download {key}
                        </a>
                      ) : (
                        <a href={`/rfq?product=${encodeURIComponent(chemical.productName)}&type=${key}_REQUEST`}
                          style={{ background: '#fff', color: accent, padding: '7px 14px', borderRadius: '7px', fontSize: '12px', fontWeight: 700, textDecoration: 'none', display: 'inline-block', border: `1px solid ${accent}` }}>
                          📩 Request {key}
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Physical & Chemical Properties */}
              <div style={{ marginBottom: '28px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#111', marginBottom: '14px', borderLeft: `4px solid ${accent}`, paddingLeft: '12px' }}>⚗️ Physical & Chemical Properties</h2>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                    <tbody>
                      {[
                        ['Appearance', chemical.appearance],
                        ['Density', chemical.density],
                        ['Melting Point', chemical.meltingPoint],
                        ['Boiling Point', chemical.boilingPoint],
                        ['Flash Point', chemical.flashPoint],
                        ['Solubility', chemical.solubility],
                        ['pH', chemical.pH],
                        ['Vapour Pressure', chemical.vapourPressure],
                        ['LogP', chemical.logP],
                        ['Storage', chemical.storageConditions],
                        ['Shelf Life', chemical.shelfLife],
                      ].filter(([,v]) => v).map(([k,v]) => (
                        <tr key={k as string}>
                          <td style={{ padding: '9px 14px', background: accentLight, fontWeight: 600, color: '#555', width: '35%', borderBottom: `1px solid ${accentBorder}` }}>{k as string}</td>
                          <td style={{ padding: '9px 14px', color: '#333', borderBottom: `1px solid ${accentBorder}` }}>{v as string}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Purity Grades */}
              {chemical.purityGrades?.length > 0 && (
                <div style={{ marginBottom: '28px' }}>
                  <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#111', marginBottom: '14px', borderLeft: `4px solid ${accent}`, paddingLeft: '12px' }}>🏷️ Available Grades & Packaging</h2>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
                    {chemical.purityGrades.map((g: string) => (
                      <span key={g} style={{ background: accentLight, border: `1px solid ${accentBorder}`, color: accent, padding: '6px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: 600 }}>{g}</span>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {chemical.packagingOptions?.map((p: string) => (
                      <span key={p} style={{ background: '#f9fafb', border: '1px solid #e5e7eb', color: '#555', padding: '5px 12px', borderRadius: '7px', fontSize: '12px' }}>📦 {p}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Applications */}
              {chemical.applications?.length > 0 && (
                <div style={{ marginBottom: '28px' }}>
                  <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#111', marginBottom: '14px', borderLeft: `4px solid ${accent}`, paddingLeft: '12px' }}>🔬 Applications & Uses</h2>
                  <ul style={{ paddingLeft: '20px' }}>
                    {chemical.applications.map((a: string, i: number) => (
                      <li key={i} style={{ marginBottom: '6px', color: '#444', fontSize: '14px', lineHeight: 1.6 }}>{a}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Industries */}
              {chemical.industries?.length > 0 && (
                <div style={{ marginBottom: '28px' }}>
                  <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#111', marginBottom: '14px', borderLeft: `4px solid ${accent}`, paddingLeft: '12px' }}>🏭 Industries</h2>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {chemical.industries.map((ind: string) => (
                      <a key={ind} href={`/industry/${ind.toLowerCase().replace(/\s+/g,'-')}/${chemical.slug}`}
                        style={{ background: accentLight, color: accent, border: `1px solid ${accentBorder}`, padding: '7px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, textDecoration: 'none' }}>
                        {ind}
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Synonyms */}
              {chemical.synonyms?.length > 0 && (
                <div style={{ marginBottom: '28px' }}>
                  <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#111', marginBottom: '12px', borderLeft: `4px solid ${accent}`, paddingLeft: '12px' }}>🏷️ Synonyms & Trade Names</h2>
                  <p style={{ fontSize: '14px', color: '#555', lineHeight: 1.7 }}>
                    {chemical.synonyms.map((s: any) => s.name).join(' · ')}
                  </p>
                </div>
              )}

              {/* FAQ */}
              <div style={{ marginBottom: '28px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#111', marginBottom: '14px', borderLeft: `4px solid ${accent}`, paddingLeft: '12px' }}>❓ Frequently Asked Questions</h2>
                {[
                  { q: `What is ${chemical.productName}?`, a: chemical.longDescription || chemical.shortDescription },
                  { q: `What is the CAS number of ${chemical.productName}?`, a: chemical.casNumber ? `The CAS number of ${chemical.productName} is ${chemical.casNumber}.` : 'Contact us for CAS number details.' },
                  { q: `What is the molecular formula of ${chemical.productName}?`, a: chemical.molecularFormula ? `The molecular formula is ${chemical.molecularFormula} with a molecular weight of ${chemical.molecularWeight || 'N/A'} g/mol.` : 'Contact us for molecular formula.' },
                  { q: `Where can I buy ${chemical.productName} in bulk?`, a: `Submit an RFQ on ${site.name} to get competitive quotes from verified manufacturers and exporters. Our team responds within 2 hours.` },
                  { q: `Is MSDS available for ${chemical.productName}?`, a: `Yes. Safety Data Sheet (SDS/MSDS), Technical Data Sheet (TDS) and Certificate of Analysis (COA) for ${chemical.productName} are available. Click Request MSDS above or submit an RFQ.` },
                ].map(({ q, a }, i) => (
                  <details key={i} style={{ border: `1px solid ${accentBorder}`, borderRadius: '9px', padding: '14px 18px', marginBottom: '8px', background: '#fff' }}>
                    <summary style={{ fontWeight: 700, cursor: 'pointer', color: '#111', fontSize: '15px' }}>{q}</summary>
                    <p style={{ color: '#555', fontSize: '14px', marginTop: '10px', lineHeight: 1.65 }}>{a}</p>
                  </details>
                ))}
              </div>

              {/* Country Links */}
              <div style={{ marginBottom: '28px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#111', marginBottom: '14px', borderLeft: `4px solid ${accent}`, paddingLeft: '12px' }}>🌍 {chemical.productName} by Country</h2>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {['India','USA','Germany','UK','Australia','UAE','Brazil','South Africa','Kenya','Nigeria','Indonesia','Vietnam','France'].map(country => (
                    <a key={country} href={`/${country.toLowerCase().replace(/\s+/g,'-')}/${chemical.slug}`}
                      style={{ background: '#f9fafb', border: '1px solid #e5e7eb', color: '#444', padding: '5px 12px', borderRadius: '7px', fontSize: '12px', textDecoration: 'none' }}>
                      {country}
                    </a>
                  ))}
                </div>
              </div>
            </div>

            {/* RIGHT — Sidebar */}
            <div>
              {/* RFQ Form */}
              <div style={{ background: `linear-gradient(135deg, ${isCP ? '#1e1b4b' : '#0c4a6e'}, ${isCP ? '#312e81' : '#0369a1'})`, borderRadius: '16px', padding: '24px', marginBottom: '20px', color: '#fff' }}>
                <div style={{ fontSize: '18px', fontWeight: 800, marginBottom: '6px' }}>Get Price & Quote</div>
                <div style={{ fontSize: '13px', opacity: .8, marginBottom: '20px' }}>Response within 2 hours · Free samples available</div>
                <form action="/api/rfq" method="POST" id="rfq-form" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <input type="hidden" name="productName" value={chemical.productName} />
                  <input type="hidden" name="chemicalId" value={chemical.id} />
                  <input type="hidden" name="casNumber" value={chemical.casNumber || ''} />
                  <input type="hidden" name="platform" value={platform} />
                  <input name="buyerName" placeholder="Your Name *" required style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,.3)', background: 'rgba(255,255,255,.1)', color: '#fff', fontSize: '13px', outline: 'none' }} />
                  <input name="buyerEmail" type="email" placeholder="Email *" required style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,.3)', background: 'rgba(255,255,255,.1)', color: '#fff', fontSize: '13px', outline: 'none' }} />
                  <input name="buyerPhone" placeholder="Phone / WhatsApp *" required style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,.3)', background: 'rgba(255,255,255,.1)', color: '#fff', fontSize: '13px', outline: 'none' }} />
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input name="quantity" type="number" placeholder="Qty *" required style={{ flex: 1, padding: '10px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,.3)', background: 'rgba(255,255,255,.1)', color: '#fff', fontSize: '13px', outline: 'none' }} />
                    <select name="unit" style={{ flex: 1, padding: '10px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,.3)', background: 'rgba(255,255,255,.1)', color: '#fff', fontSize: '13px', outline: 'none' }}>
                      <option value="kg">kg</option>
                      <option value="MT">MT</option>
                      <option value="L">Litre</option>
                      <option value="g">gram</option>
                    </select>
                  </div>
                  <input name="buyerCountry" placeholder="Country *" required style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,.3)', background: 'rgba(255,255,255,.1)', color: '#fff', fontSize: '13px', outline: 'none' }} />
                  <select name="requestType" style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,.3)', background: 'rgba(255,255,255,.1)', color: '#fff', fontSize: '13px', outline: 'none' }}>
                    <option value="PRICE_QUOTE">Price Quote</option>
                    <option value="SAMPLE_REQUEST">Sample Request</option>
                    <option value="BULK_SUPPLY">Bulk Supply</option>
                    <option value="SDS_REQUEST">Request SDS/MSDS</option>
                    <option value="TDS_REQUEST">Request TDS</option>
                    <option value="COA_REQUEST">Request COA</option>
                    <option value="OEM_INQUIRY">OEM / Private Label</option>
                  </select>
                  <button type="submit" style={{ background: accent, color: '#fff', padding: '12px', borderRadius: '9px', fontWeight: 800, fontSize: '15px', border: 'none', cursor: 'pointer' }}>
                    Submit RFQ →
                  </button>
                </form>
                <a href={`https://wa.me/${site.whatsapp}?text=Hi%2C%20I%20need%20${encodeURIComponent(chemical.productName)}%20CAS%20${encodeURIComponent(chemical.casNumber||'')}`}
                  target="_blank"
                  style={{ display: 'block', background: '#25D366', color: '#fff', padding: '11px', borderRadius: '9px', fontWeight: 700, fontSize: '14px', textDecoration: 'none', textAlign: 'center', marginTop: '10px' }}>
                  💬 WhatsApp Enquiry
                </a>
              </div>

              {/* Quick Info */}
              <div style={{ border: `1px solid ${accentBorder}`, borderRadius: '12px', padding: '18px', marginBottom: '16px', background: accentLight }}>
                <div style={{ fontWeight: 700, color: '#111', marginBottom: '12px' }}>Quick Info</div>
                {[
                  ['Category', chemical.category?.name],
                  ['CAS Number', chemical.casNumber],
                  ['EC Number', chemical.ecNumber],
                  ['HS Code', chemical.hsCode],
                  ['UN Number', chemical.unNumber],
                  ['Min. Order', chemical.minOrderQty || 'Contact us'],
                  ['Lead Time', chemical.leadTime || 'Contact us'],
                ].filter(([,v]) => v).map(([k,v]) => (
                  <div key={k as string} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', padding: '5px 0', borderBottom: `1px solid ${accentBorder}` }}>
                    <span style={{ color: '#666', fontWeight: 600 }}>{k as string}</span>
                    <span style={{ color: '#111', fontWeight: 500 }}>{v as string}</span>
                  </div>
                ))}
              </div>

              {/* Certifications */}
              <div style={{ border: '1px solid #e5e7eb', borderRadius: '12px', padding: '18px', background: '#fff' }}>
                <div style={{ fontWeight: 700, color: '#111', marginBottom: '12px' }}>Certifications</div>
                {[
                  ['GMP Certified', true],
                  ['ISO 9001:2015', true],
                  ['REACH Registered', chemical.reachRegistered],
                  ['FDA Approved', chemical.fdaApproved],
                  ['Kosher', chemical.kosherCertified],
                  ['Halal', chemical.halalCertified],
                ].filter(([,v]) => v).map(([k]) => (
                  <div key={k as string} style={{ fontSize: '13px', padding: '4px 0', color: '#166534' }}>✅ {k as string}</div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
