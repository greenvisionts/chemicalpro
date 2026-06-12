# ChemicalPro + PharmaCloud Platform

World's largest chemical marketplace and search engine.

## Architecture

```
Next.js 14 (App Router)
PostgreSQL 16        — primary database
Prisma ORM           — database client
Redis 7              — caching layer
Elasticsearch 8      — full-text + CAS search
Nginx                — reverse proxy + SSL
Docker               — containerised deployment
Cloudflare CDN       — global CDN + DDoS protection
```

## Scale Targets

| Metric | Target |
|--------|--------|
| Chemical products | 100,000+ |
| CAS records | 500,000+ |
| SEO pages generated | 10,000,000+ |
| Monthly visitors | 1,000,000+ |
| Search response | <50ms |
| Page load (LCP) | <1.2s |

## URL Structure

### ChemicalPro.in
```
/chemical/{slug}              — Product page
/cas/{cas-number}             — CAS number lookup
/category/{slug}              — Category listing
/supplier/{slug}              — Supplier directory for product
/exporter/{slug}              — Exporter directory
/importer/{slug}              — Importer directory
/trader/{slug}                — Trader directory
/distributor/{slug}           — Distributor directory
/uses/{slug}                  — Application guide
/applications/{slug}          — Application page
/msds/{slug}                  — MSDS page (SEO)
/sds/{slug}                   — SDS page (SEO)
/tds/{slug}                   — TDS page (SEO)
/coa/{slug}                   — COA page (SEO)
/grade/{slug}                 — Grade specifications
/industries/{slug}            — Industry use page
/{country}/{slug}             — Country-specific pages (40+ countries)
/industry/{industry}/{slug}   — Industry-specific pages (15 industries)
/product-index                — Full searchable catalog
/search                       — Search engine
/rfq                          — RFQ submission
/export                       — Export portal
/sitemap.xml                  — Auto-generated sitemap index
```

### PharmaCloud.in
Same structure, platform=PHARMACLOUD

## SEO Page Generation Math

For 100,000 chemicals:
- Core product pages:    100,000
- CAS pages:             100,000
- MSDS/SDS pages:        100,000
- TDS pages:             100,000
- COA pages:             100,000
- Uses pages:            100,000
- Applications pages:    100,000
- Supplier pages:        100,000
- Exporter pages:        100,000
- Country pages (40):  4,000,000
- Industry pages (15): 1,500,000
─────────────────────────────────
TOTAL:               ~6,900,000 pages

## Quick Start

### 1. Clone and setup
```bash
git clone https://github.com/greenvisionts/chemicalpro
cd chemicalpro
cp .env.example .env
# Edit .env with your credentials
```

### 2. Start with Docker
```bash
docker-compose up -d
```

### 3. Run migrations
```bash
docker-compose exec app npx prisma migrate deploy
docker-compose exec app npm run db:seed
```

### 4. Create Elasticsearch index
```bash
docker-compose exec app npm run search:index
```

### 5. Import chemicals
```bash
# Prepare your CSV with columns: productName, casNumber, category, description, applications, industries, ...
docker-compose exec app npm run import:chemicals /data/chemicals.csv
```

## CSV Import Format

```csv
productName,casNumber,ecNumber,molecularFormula,category,description,applications,industries,purityGrades,packagingOptions,synonyms
Isopropyl Alcohol,67-63-0,200-661-7,C3H8O,Solvents,Colourless flammable liquid...,"Pharma solvent,Sanitizer","Pharmaceutical,Cosmetics","99%,Technical","25L can,200L drum","IPA;2-Propanol;Rubbing Alcohol"
Acetone,67-64-1,200-662-2,C3H6O,Solvents,Colourless volatile liquid...,"Paint solvent,Lab use","Pharma,Paints","99.5%,Technical","200L drum,IBC tank","Propanone;Dimethyl ketone"
```

## API Endpoints

```
GET  /api/chemicals              — List products (paginated)
GET  /api/search?q={query}       — Full-text search
GET  /api/search?q={q}&mode=suggest — Autocomplete
GET  /api/chemicals/{slug}       — Single product
POST /api/rfq                    — Submit RFQ
GET  /api/rfq                    — List RFQs (admin)
GET  /api/sitemap?type=index     — Sitemap index
GET  /api/sitemap?type=chemicals — Products sitemap
GET  /api/sitemap?type=countries — Country pages sitemap
```

## Admin Panel

Access at `/admin` (requires ADMIN_SECRET cookie).

Features:
- Product CRUD with rich editor
- Bulk CSV/Excel import
- Elasticsearch reindex
- RFQ management + email
- Supplier management
- SEO audit
- Analytics dashboard
- Document upload (SDS, TDS, COA)

## Production Deployment

### Render.com (recommended for Green Vision stack)
```yaml
# render.yaml
services:
  - type: web
    name: chemicalpro
    env: node
    buildCommand: npm ci && npx prisma generate && npm run build
    startCommand: npm start
    envVars:
      - key: DATABASE_URL
        fromDatabase:
          name: chemicalpro-db
          property: connectionString
      - key: REDIS_URL
        fromService:
          name: chemicalpro-redis
          property: connectionString
```

### Cloudflare Pages (static export option)
For maximum performance, generate static pages for top 10,000 products and serve via Cloudflare Pages.

## Performance Optimisations

1. **ISR (Incremental Static Regeneration)** — Top 500 products pre-generated at build
2. **Redis caching** — Search results cached 10 min, product pages 1 hour
3. **Elasticsearch** — <50ms search response even at 100k products
4. **Image optimisation** — Next.js automatic WebP conversion
5. **Cloudflare CDN** — Global edge caching for static assets

## Contact

Green Vision Technical Services
Nashik, Maharashtra, India
admin@fertilizerindia.com | +91-9890550271
GST: 27AAIFG3238J1Z9
