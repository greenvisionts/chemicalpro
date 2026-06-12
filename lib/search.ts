// lib/search.ts — Elasticsearch integration
import { Client } from '@elastic/elasticsearch'

export const elastic = new Client({
  node: process.env.ELASTICSEARCH_URL || 'http://localhost:9200',
  auth: process.env.ELASTICSEARCH_API_KEY
    ? { apiKey: process.env.ELASTICSEARCH_API_KEY }
    : undefined,
})

export const CHEMICAL_INDEX = 'chemicals'
export const PHARMA_INDEX = 'pharma_products'

// ── Index Mapping ──────────────────────────────────────────────────────────
export const CHEMICAL_MAPPING = {
  mappings: {
    properties: {
      id:               { type: 'keyword' },
      slug:             { type: 'keyword' },
      platform:         { type: 'keyword' },
      productName:      { type: 'text', analyzer: 'standard', fields: { keyword: { type: 'keyword' }, suggest: { type: 'search_as_you_type' } } },
      casNumber:        { type: 'keyword' },
      ecNumber:         { type: 'keyword' },
      inchiKey:         { type: 'keyword' },
      molecularFormula: { type: 'keyword' },
      iupacName:        { type: 'text', analyzer: 'standard' },
      synonyms:         { type: 'text', analyzer: 'standard', fields: { keyword: { type: 'keyword' } } },
      category:         { type: 'keyword' },
      subcategory:      { type: 'keyword' },
      industries:       { type: 'keyword' },
      applications:     { type: 'text', analyzer: 'standard' },
      shortDescription: { type: 'text', analyzer: 'standard' },
      tags:             { type: 'keyword' },
      purityGrades:     { type: 'keyword' },
      hazardClass:      { type: 'keyword' },
      isActive:         { type: 'boolean' },
      isFeatured:       { type: 'boolean' },
      viewCount:        { type: 'integer' },
      createdAt:        { type: 'date' },
    },
  },
  settings: {
    analysis: {
      analyzer: {
        chemical_analyzer: {
          type: 'custom',
          tokenizer: 'standard',
          filter: ['lowercase', 'synonym_filter', 'stemmer'],
        },
      },
      filter: {
        synonym_filter: {
          type: 'synonym',
          synonyms: [
            'ipa, isopropyl alcohol, 2-propanol, rubbing alcohol',
            'dcm, dichloromethane, methylene chloride',
            'thf, tetrahydrofuran',
            'dmf, dimethylformamide, n,n-dimethylformamide',
            'naoh, caustic soda, sodium hydroxide, lye',
            'h2so4, sulfuric acid, sulphuric acid, oil of vitriol',
            'hcl, hydrochloric acid, muriatic acid',
            'paracetamol, acetaminophen, tylenol',
            'ibuprofen, advil, brufen, nurofen',
            'amoxicillin, amoxil, trimox',
          ],
        },
      },
    },
  },
}

// ── Search Function ────────────────────────────────────────────────────────
export interface SearchParams {
  query?: string
  casNumber?: string
  formula?: string
  category?: string
  industry?: string
  country?: string
  supplierType?: string
  platform?: string
  page?: number
  limit?: number
  sortBy?: 'relevance' | 'name' | 'newest' | 'popular'
}

export async function searchChemicals(params: SearchParams) {
  const {
    query, casNumber, formula, category, industry,
    platform = 'CHEMICALPRO', page = 1, limit = 20, sortBy = 'relevance',
  } = params

  const from = (page - 1) * limit
  const mustClauses: object[] = [{ term: { platform } }, { term: { isActive: true } }]
  const shouldClauses: object[] = []

  // CAS number exact match — highest priority
  if (casNumber) {
    mustClauses.push({ term: { casNumber: casNumber.trim() } })
  }

  // Molecular formula
  if (formula) {
    mustClauses.push({ term: { molecularFormula: formula.trim() } })
  }

  // Category filter
  if (category) {
    mustClauses.push({ term: { category } })
  }

  // Industry filter
  if (industry) {
    mustClauses.push({ term: { industries: industry } })
  }

  // Full-text search across multiple fields
  if (query && query.length > 1) {
    shouldClauses.push(
      // Exact product name match gets highest boost
      { term: { 'productName.keyword': { value: query, boost: 10 } } },
      // CAS number partial match
      { prefix: { casNumber: { value: query, boost: 8 } } },
      // Search-as-you-type for autocomplete
      { multi_match: { query, type: 'bool_prefix', fields: ['productName.suggest', 'iupacName', 'synonyms'], boost: 6 } },
      // Full-text across all fields
      { multi_match: { query, fields: ['productName^4', 'iupacName^3', 'synonyms^3', 'casNumber^5', 'applications^2', 'shortDescription^1'], fuzziness: 'AUTO' } }
    )
  }

  const sort = sortBy === 'relevance' ? ['_score']
    : sortBy === 'popular' ? [{ viewCount: 'desc' }]
    : sortBy === 'newest' ? [{ createdAt: 'desc' }]
    : [{ 'productName.keyword': 'asc' }]

  const esQuery = {
    index: CHEMICAL_INDEX,
    from,
    size: limit,
    query: {
      bool: {
        must: mustClauses,
        should: shouldClauses.length > 0 ? shouldClauses : undefined,
        minimum_should_match: shouldClauses.length > 0 ? 1 : 0,
      },
    },
    sort,
    highlight: {
      fields: {
        productName: {},
        shortDescription: { fragment_size: 150, number_of_fragments: 1 },
        applications: { fragment_size: 100, number_of_fragments: 1 },
      },
    },
    aggs: {
      categories: { terms: { field: 'category', size: 20 } },
      industries: { terms: { field: 'industries', size: 20 } },
      hazardClasses: { terms: { field: 'hazardClass', size: 10 } },
    },
  }

  const response = await elastic.search(esQuery)
  const hits = response.hits.hits as any[]

  return {
    total: typeof response.hits.total === 'number' ? response.hits.total : response.hits.total?.value ?? 0,
    page,
    limit,
    results: hits.map(h => ({
      ...h._source,
      _score: h._score,
      _highlights: h.highlight,
    })),
    aggregations: response.aggregations,
  }
}

// ── Autocomplete ───────────────────────────────────────────────────────────
export async function autocomplete(query: string, platform = 'CHEMICALPRO') {
  if (!query || query.length < 2) return []

  const response = await elastic.search({
    index: CHEMICAL_INDEX,
    size: 8,
    query: {
      bool: {
        must: [{ term: { platform } }, { term: { isActive: true } }],
        should: [
          { multi_match: { query, type: 'bool_prefix', fields: ['productName.suggest^3', 'synonyms^2'] } },
          { prefix: { casNumber: { value: query, boost: 5 } } },
        ],
        minimum_should_match: 1,
      },
    },
    _source: ['slug', 'productName', 'casNumber', 'category', 'molecularFormula'],
  })

  return (response.hits.hits as any[]).map(h => h._source)
}

// ── Index Single Chemical ──────────────────────────────────────────────────
export async function indexChemical(chemical: any) {
  return elastic.index({
    index: CHEMICAL_INDEX,
    id: chemical.id,
    document: {
      id: chemical.id,
      slug: chemical.slug,
      platform: chemical.platform,
      productName: chemical.productName,
      iupacName: chemical.iupacName,
      casNumber: chemical.casNumber,
      ecNumber: chemical.ecNumber,
      molecularFormula: chemical.molecularFormula,
      synonyms: chemical.synonyms?.map((s: any) => s.name) || [],
      category: chemical.category?.slug,
      subcategory: chemical.subcategory,
      industries: chemical.industries,
      applications: chemical.applications,
      shortDescription: chemical.shortDescription,
      tags: chemical.tags,
      purityGrades: chemical.purityGrades,
      hazardClass: chemical.hazardClass,
      isActive: chemical.isActive,
      isFeatured: chemical.isFeatured,
      viewCount: chemical.viewCount,
      createdAt: chemical.createdAt,
    },
  })
}

// ── Bulk Index ─────────────────────────────────────────────────────────────
export async function bulkIndexChemicals(chemicals: any[]) {
  const ops = chemicals.flatMap(c => [
    { index: { _index: CHEMICAL_INDEX, _id: c.id } },
    { /* document */ ...c },
  ])
  return elastic.bulk({ operations: ops, refresh: true })
}
