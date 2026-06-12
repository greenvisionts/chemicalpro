// app/[country]/[slug]/page.tsx — Country-specific product pages
import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { generateCountryMeta, generateProductSchema, generateBreadcrumbSchema, SITE_CONFIG } from '@/lib/seo'

const COUNTRY_MAP: Record<string, { name: string; flag: string; currency: string; language: string; regulations: string; marketSize: string; ports: string }> = {
  india:         { name:'India',          flag:'🇮🇳', currency:'INR', language:'English, Hindi',   regulations:'CPCB, BIS, CIBRC',              marketSize:'$220 billion chemicals market', ports:'Mumbai, Nhava Sheva, Chennai' },
  usa:           { name:'United States',  flag:'🇺🇸', currency:'USD', language:'English',          regulations:'EPA, OSHA, FDA',                marketSize:'$620 billion chemicals market', ports:'Los Angeles, Houston, New York' },
  germany:       { name:'Germany',        flag:'🇩🇪', currency:'EUR', language:'German, English',  regulations:'REACH, ChemG, GefStoffV',        marketSize:'€200 billion chemicals market', ports:'Hamburg, Bremen, Rotterdam' },
  uk:            { name:'United Kingdom', flag:'🇬🇧', currency:'GBP', language:'English',          regulations:'UK REACH, HSE, CHIP',            marketSize:'£50 billion chemicals market',  ports:'Felixstowe, Southampton, London' },
  australia:     { name:'Australia',      flag:'🇦🇺', currency:'AUD', language:'English',          regulations:'AICIS, WorkSafe, TGA',           marketSize:'A$40 billion chemicals market',  ports:'Melbourne, Sydney, Brisbane' },
  uae:           { name:'UAE',            flag:'🇦🇪', currency:'USD', language:'Arabic, English',  regulations:'ESMA, MOIAT, MOH',              marketSize:'$25 billion chemicals hub',      ports:'Jebel Ali, Abu Dhabi, Sharjah' },
  brazil:        { name:'Brazil',         flag:'🇧🇷', currency:'BRL', language:'Portuguese, Eng.', regulations:'ANVISA, IBAMA, INMETRO',        marketSize:'R$700 billion chemicals market', ports:'Santos, Paranaguá, Itajaí' },
  'south-africa':{ name:'South Africa',   flag:'🇿🇦', currency:'ZAR', language:'English, Zulu',    regulations:'SABS, DFFE, DoH',               marketSize:'R120 billion chemicals market',  ports:'Durban, Cape Town, Port Elizabeth' },
  kenya:         { name:'Kenya',          flag:'🇰🇪', currency:'KES', language:'Swahili, English', regulations:'KEBS, NEMA, PPB',               marketSize:'$3 billion chemicals import',    ports:'Mombasa' },
  nigeria:       { name:'Nigeria',        flag:'🇳🇬', currency:'NGN', language:'English',          regulations:'NAFDAC, SON, DPR',              marketSize:'$8 billion chemicals import',    ports:'Apapa Lagos, Tin Can Island' },
  indonesia:     { name:'Indonesia',      flag:'🇮🇩', currency:'IDR', language:'Bahasa, English',  regulations:'BPOM, Kementan, KLHK',          marketSize:'$20 billion chemicals market',   ports:'Tanjung Priok, Surabaya' },
  vietnam:       { name:'Vietnam',        flag:'🇻🇳', currency:'VND', language:'Vietnamese, Eng.', regulations:'MARD, MOH, MONRE',              marketSize:'$8 billion chemicals import',    ports:'Ho Chi Minh City, Haiphong' },
  bangladesh:    { name:'Bangladesh',     flag:'🇧🇩', currency:'BDT', language:'Bengali, English', regulations:'DGDA, DAE, BSTI',               marketSize:'$5 billion chemicals import',    ports:'Chittagong, Dhaka ICD' },
  france:        { name:'France',         flag:'🇫🇷', currency:'EUR', language:'French, English',  regulations:'REACH, ECHA, ANSES',            marketSize:'€80 billion chemicals market',   ports:'Le Havre, Marseille, Dunkirk' },
  netherlands:   { name:'Netherlands',    flag:'🇳🇱', currency:'EUR', language:'Dutch, English',   regulations:'REACH, ChemieF, ECHA',          marketSize:'€70 billion chemicals hub',      ports:'Rotterdam, Amsterdam' },
  canada:        { name:'Canada',         flag:'🇨🇦', currency:'CAD', language:'English, French',  regulations:'CEPA, HC, PMRA',                marketSize:'C$90 billion chemicals market',  ports:'Vancouver, Montreal, Halifax' },
  china:         { name:'China',          flag:'🇨🇳', currency:'CNY', language:'Mandarin, Eng.',   regulations:'MEP, AQSIQ, SEPA',              marketSize:'$1.5 trillion chemicals market', ports:'Shanghai, Ningbo, Guangzhou' },
  japan:         { name:'Japan',          flag:'🇯🇵', currency:'JPY', language:'Japanese, Eng.',   regulations:'CSCL, PRTR, MHLW',              marketSize:'¥30 trillion chemicals market',  ports:'Yokohama, Kobe, Nagoya' },
  mexico:        { name:'Mexico',         flag:'🇲🇽', currency:'MXN', language:'Spanish, Eng.',    regulations:'SEMARNAT, COFEPRIS, NOM',       marketSize:'$50 billion chemicals market',   ports:'Manzanillo, Veracruz, Altamira' },
  'saudi-arabia':{ name:'Saudi Arabia',   flag:'🇸🇦', currency:'SAR', language:'Arabic, English',  regulations:'SFDA, SEEC, SASO',              marketSize:'$20 billion chemicals import',   ports:'Jeddah, Jubail, Dammam' },
  turkey:        { name:'Turkey',         flag:'🇹🇷', currency:'TRY', language:'Turkish, English', regulations:'KKS, THKK, ÇSGB',              marketSize:'$40 billion chemicals market',   ports:'Istanbul, Mersin, Izmir' },
  pakistan:      { name:'Pakistan',       flag:'🇵🇰', currency:'PKR', language:'Urdu, English',    regulations:'PCSIR, DRAP, EPA Pakistan',     marketSize:'$5 billion chemicals import',    ports:'Karachi, Port Qasim' },
}

interface Props { params: { country: string; slug: string }; searchParams: { platform?: string } }

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const countryInfo = COUNTRY_MAP[params.country]
  if (!countryInfo) return { title: 'Not Found' }

  const chemical = await db.chemical.findUnique({ where: { slug: params.slug }, select: { productName: true, casNumber: true, shortDescription: true } })
  if (!chemical) return { title: 'Not Found' }

  const platform = searchParams.platform || 'CHEMICALPRO'
  const meta = generateCountryMeta(chemical, params.country, countryInfo.name, platform)
  return {
    title: meta.title,
    description: meta.description,
    keywords: meta.keywords,
    alternates: { canonical: meta.canonical },
    openGraph: { title: meta.title, description: meta.description, type: 'website' },
  }
}

export default async function CountryProductPage({ params, searchParams }: Props) {
  const countryInfo = COUNTRY_MAP[params.country]
  if (!countryInfo) notFound()

  const platform = searchParams.platform || 'CHEMICALPRO'
  const site = SITE_CONFIG[platform as keyof typeof SITE_CONFIG]
  const isCP = platform === 'CHEMICALPRO'
  const accent = isCP ? '#7c3aed' : '#0284c7'

  const chemical = await db.chemical.findUnique({
    where: { slug: params.slug, isActive: true },
    include: { category: true, documents: { where: { isPublic: true } }, synonyms: { take: 10 } },
  })
  if (!chemical) notFound()

  const breadcrumbs = [
    { name: 'Home', url: site.domain },
    { name: `${countryInfo.name}`, url: `${site.domain}/${params.country}` },
    { name: chemical.productName, url: `${site.domain}/${params.country}/${chemical.slug}` },
  ]

  const schemas = [
    generateBreadcrumbSchema(breadcrumbs),
    generateProductSchema(chemical, platform),
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: [
        { '@type': 'Question', name: `Where to buy ${chemical.productName} in ${countryInfo.name}?`, acceptedAnswer: { '@type': 'Answer', text: `${site.name} connects buyers in ${countryInfo.name} with verified manufacturers and exporters. Submit an RFQ to get competitive quotes with delivery to ${countryInfo.ports}.` } },
        { '@type': 'Question', name: `What is the import duty on ${chemical.productName} in ${countryInfo.name}?`, acceptedAnswer: { '@type': 'Answer', text: `Import duty rates vary by HS Code and trade agreements. ${chemical.hsCode ? `HS Code: ${chemical.hsCode}.` : ''} Contact us for ${countryInfo.name}-specific customs and regulatory information.` } },
        { '@type': 'Question', name: `What are the regulations for ${chemical.productName} in ${countryInfo.name}?`, acceptedAnswer: { '@type': 'Answer', text: `In ${countryInfo.name}, chemical products are regulated by ${countryInfo.regulations}. ${site.name} provides compliant documentation including SDS, COA, and TDS.` } },
      ],
    },
  ]

  return (
    <>
      {schemas.map((s, i) => <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(s) }} />)}
      <div style={{ fontFamily: '-apple-system, sans-serif', color: '#1a1a1a', background: '#fff' }}>

        {/* Hero */}
        <div style={{ background: `linear-gradient(135deg, ${isCP ? '#1e1b4b' : '#0c4a6e'}, ${isCP ? '#312e81' : '#0369a1'})`, color: '#fff', padding: '48px 20px' }}>
          <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
            <nav style={{ fontSize: '12px', opacity: .7, marginBottom: '16px' }}>
              <a href="/" style={{ color: '#fff', textDecoration: 'none' }}>Home</a> ›{' '}
              <a href={`/${params.country}`} style={{ color: '#fff', textDecoration: 'none' }}>{countryInfo.flag} {countryInfo.name}</a> ›{' '}
              {chemical.productName}
            </nav>
            <div style={{ fontSize: '32px', marginBottom: '10px' }}>{countryInfo.flag}</div>
            <h1 style={{ fontSize: '40px', fontWeight: 900, lineHeight: 1.1, marginBottom: '12px' }}>
              {chemical.productName} Supplier in {countryInfo.name}
            </h1>
            <p style={{ fontSize: '16px', opacity: .85, marginBottom: '20px', maxWidth: '600px' }}>
              {chemical.casNumber && `CAS ${chemical.casNumber} · `}
              Verified manufacturers and exporters in {countryInfo.name}. {countryInfo.marketSize}. FOB / CIF delivery.
            </p>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <a href={`/rfq?product=${encodeURIComponent(chemical.productName)}&country=${countryInfo.name}`}
                style={{ background: accent, color: '#fff', padding: '12px 24px', borderRadius: '9px', fontWeight: 800, textDecoration: 'none' }}>
                📋 Request Quote
              </a>
              <a href={`/chemical/${chemical.slug}`}
                style={{ background: 'rgba(255,255,255,.15)', color: '#fff', padding: '12px 24px', borderRadius: '9px', fontWeight: 700, textDecoration: 'none', border: '1px solid rgba(255,255,255,.3)' }}>
                📄 Full Product Page
              </a>
            </div>
          </div>
        </div>

        <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '40px 20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '28px' }}>
            <div>
              {/* Country Market Info */}
              <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '24px', marginBottom: '28px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '16px' }}>{countryInfo.flag} {countryInfo.name} Market Information</h2>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  {[
                    ['Market Size', countryInfo.marketSize],
                    ['Currency', countryInfo.currency],
                    ['Language', countryInfo.language],
                    ['Regulations', countryInfo.regulations],
                    ['Main Ports', countryInfo.ports],
                    ['HS Code', chemical.hsCode || 'Contact for HS code'],
                  ].map(([k,v]) => (
                    <div key={k} style={{ padding: '10px 14px', background: '#fff', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                      <div style={{ fontSize: '11px', color: '#888', fontWeight: 600, textTransform: 'uppercase', marginBottom: '4px' }}>{k}</div>
                      <div style={{ fontSize: '14px', color: '#111', fontWeight: 600 }}>{v}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Product Details */}
              <div style={{ marginBottom: '28px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '14px', borderLeft: `4px solid ${accent}`, paddingLeft: '12px' }}>
                  {chemical.productName} — Product Details
                </h2>
                <p style={{ fontSize: '15px', color: '#444', lineHeight: 1.7, marginBottom: '14px' }}>{chemical.shortDescription}</p>
                {chemical.applications?.length > 0 && (
                  <div>
                    <div style={{ fontWeight: 700, color: '#111', marginBottom: '8px' }}>Applications in {countryInfo.name}:</div>
                    <ul style={{ paddingLeft: '20px' }}>
                      {chemical.applications.slice(0, 5).map((a: string, i: number) => <li key={i} style={{ color: '#555', fontSize: '14px', marginBottom: '4px' }}>{a}</li>)}
                    </ul>
                  </div>
                )}
              </div>

              {/* Documents */}
              <div style={{ marginBottom: '28px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '14px', borderLeft: `4px solid ${accent}`, paddingLeft: '12px' }}>📋 Documents for {countryInfo.name} Import</h2>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  {['SDS / MSDS', 'Technical Data Sheet (TDS)', 'Certificate of Analysis (COA)', 'Country of Origin Certificate'].map(doc => (
                    <div key={doc} style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '9px', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '13px', fontWeight: 600, color: '#444' }}>📄 {doc}</span>
                      <a href={`/rfq?product=${encodeURIComponent(chemical.productName)}&type=SDS_REQUEST`}
                        style={{ fontSize: '11px', color: accent, fontWeight: 700, textDecoration: 'none' }}>Request →</a>
                    </div>
                  ))}
                </div>
              </div>

              {/* FAQs */}
              <div>
                <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '14px', borderLeft: `4px solid ${accent}`, paddingLeft: '12px' }}>FAQs — {chemical.productName} in {countryInfo.name}</h2>
                {[
                  [`Where to buy ${chemical.productName} in ${countryInfo.name}?`, `${site.name} connects buyers in ${countryInfo.name} with verified manufacturers and exporters. Submit an RFQ for competitive quotes with delivery to ${countryInfo.ports}.`],
                  [`What documents are needed to import ${chemical.productName} into ${countryInfo.name}?`, `Documents typically needed: SDS/MSDS (GHS compliant), COA, TDS, Packing List, Commercial Invoice, COO. Additional documents may be required by ${countryInfo.regulations}.`],
                  [`What is the lead time for ${chemical.productName} delivery to ${countryInfo.name}?`, `Typical lead time: 7-21 days by sea, 3-7 days by air. Express delivery available for urgent requirements. Contact us for exact lead times.`],
                ].map(([q, a], i) => (
                  <details key={i} style={{ border: '1px solid #e5e7eb', borderRadius: '9px', padding: '14px 18px', marginBottom: '8px' }}>
                    <summary style={{ fontWeight: 700, cursor: 'pointer', color: '#111', fontSize: '14px' }}>{q}</summary>
                    <p style={{ color: '#555', fontSize: '13px', marginTop: '10px', lineHeight: 1.65 }}>{a}</p>
                  </details>
                ))}
              </div>
            </div>

            {/* Sidebar */}
            <div>
              <div style={{ background: `linear-gradient(135deg, ${isCP ? '#1e1b4b' : '#0c4a6e'}, ${isCP ? '#4c1d95' : '#0369a1'})`, borderRadius: '14px', padding: '22px', color: '#fff', marginBottom: '16px' }}>
                <div style={{ fontWeight: 800, fontSize: '16px', marginBottom: '4px' }}>Get Quote for {countryInfo.name}</div>
                <div style={{ fontSize: '12px', opacity: .8, marginBottom: '16px' }}>FOB Mumbai · CIF {countryInfo.ports.split(',')[0]}</div>
                <a href={`/rfq?product=${encodeURIComponent(chemical.productName)}&country=${countryInfo.name}`}
                  style={{ display: 'block', background: accent, color: '#fff', padding: '11px', borderRadius: '9px', fontWeight: 800, fontSize: '14px', textDecoration: 'none', textAlign: 'center', marginBottom: '8px' }}>
                  📋 Submit RFQ
                </a>
                <a href={`https://wa.me/${site.whatsapp}?text=Hi%2C%20I%20need%20${encodeURIComponent(chemical.productName)}%20in%20${encodeURIComponent(countryInfo.name)}`}
                  target="_blank"
                  style={{ display: 'block', background: '#25D366', color: '#fff', padding: '11px', borderRadius: '9px', fontWeight: 700, fontSize: '14px', textDecoration: 'none', textAlign: 'center' }}>
                  💬 WhatsApp
                </a>
              </div>

              {/* Other countries */}
              <div style={{ border: '1px solid #e5e7eb', borderRadius: '12px', padding: '18px' }}>
                <div style={{ fontWeight: 700, color: '#111', marginBottom: '12px', fontSize: '14px' }}>Same product in other countries:</div>
                {Object.entries(COUNTRY_MAP).filter(([k]) => k !== params.country).slice(0, 10).map(([code, info]) => (
                  <a key={code} href={`/${code}/${chemical.slug}`}
                    style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '7px 0', borderBottom: '1px solid #f1f5f9', textDecoration: 'none', color: '#444', fontSize: '13px' }}>
                    <span>{info.flag}</span>
                    <span>{chemical.productName} in {info.name}</span>
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
