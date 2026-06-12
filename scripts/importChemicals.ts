// scripts/importChemicals.ts — Bulk import from CSV/Excel
import { db } from '../lib/db'
import { indexChemical } from '../lib/search'
import * as XLSX from 'xlsx'
import * as fs from 'fs'
import * as path from 'path'

interface ChemicalRow {
  productName: string
  casNumber?: string
  ecNumber?: string
  molecularFormula?: string
  molecularWeight?: string
  iupacName?: string
  hsCode?: string
  unNumber?: string
  hazardClass?: string
  category: string
  subcategory?: string
  description: string
  applications?: string      // comma-separated
  industries?: string        // comma-separated
  appearance?: string
  density?: string
  meltingPoint?: string
  boilingPoint?: string
  flashPoint?: string
  solubility?: string
  purityGrades?: string      // comma-separated
  packagingOptions?: string  // comma-separated
  storageConditions?: string
  platform?: string
  synonyms?: string          // semicolon-separated
}

async function importFromFile(filePath: string) {
  console.log(`📂 Reading: ${filePath}`)

  let rows: ChemicalRow[] = []

  if (filePath.endsWith('.csv')) {
    const content = fs.readFileSync(filePath, 'utf-8')
    const lines = content.split('\n')
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g,''))
    rows = lines.slice(1).filter(l => l.trim()).map(line => {
      const values = line.split(',').map(v => v.trim().replace(/^"|"$/g,''))
      return Object.fromEntries(headers.map((h,i) => [h, values[i] || ''])) as unknown as ChemicalRow
    })
  } else if (filePath.endsWith('.xlsx') || filePath.endsWith('.xls')) {
    const wb = XLSX.readFile(filePath)
    const ws = wb.Sheets[wb.SheetNames[0]]
    rows = XLSX.utils.sheet_to_json(ws) as ChemicalRow[]
  }

  console.log(`📊 Found ${rows.length} records to import`)

  let imported = 0, skipped = 0, errors = 0

  for (const row of rows) {
    if (!row.productName || !row.category) {
      skipped++
      continue
    }

    try {
      const slug = row.productName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')

      // Find or create category
      const categorySlug = row.category.toLowerCase().replace(/[^a-z0-9]+/g, '-')
      const category = await db.category.upsert({
        where: { slug: categorySlug },
        create: {
          slug: categorySlug,
          name: row.category,
          platform: (row.platform as any) || 'CHEMICALPRO',
        },
        update: {},
      })

      // Create chemical
      const chemical = await db.chemical.upsert({
        where: { slug },
        create: {
          slug,
          productName: row.productName,
          casNumber: row.casNumber || null,
          ecNumber: row.ecNumber || null,
          molecularFormula: row.molecularFormula || null,
          molecularWeight: row.molecularWeight ? parseFloat(row.molecularWeight) : null,
          iupacName: row.iupacName || null,
          hsCode: row.hsCode || null,
          unNumber: row.unNumber || null,
          hazardClass: row.hazardClass || null,
          categoryId: category.id,
          subcategory: row.subcategory || null,
          shortDescription: row.description.slice(0, 300),
          longDescription: row.description,
          applications: row.applications ? row.applications.split(',').map(a => a.trim()) : [],
          industries: row.industries ? row.industries.split(',').map(i => i.trim()) : [],
          appearance: row.appearance || null,
          density: row.density || null,
          meltingPoint: row.meltingPoint || null,
          boilingPoint: row.boilingPoint || null,
          flashPoint: row.flashPoint || null,
          solubility: row.solubility || null,
          purityGrades: row.purityGrades ? row.purityGrades.split(',').map(p => p.trim()) : [],
          packagingOptions: row.packagingOptions ? row.packagingOptions.split(',').map(p => p.trim()) : [],
          storageConditions: row.storageConditions || null,
          platform: (row.platform as any) || 'CHEMICALPRO',
          // Auto-generate SEO
          seoTitle: `${row.productName}${row.casNumber ? ` CAS ${row.casNumber}` : ''} — Supplier, Price, MSDS | ChemicalPro`,
          seoDescription: `${row.productName}. Buy from verified suppliers. ${row.casNumber ? `CAS ${row.casNumber}.` : ''} Request MSDS, COA, TDS. Global export. ${row.description.slice(0,100)}`,
          seoKeywords: [
            row.productName.toLowerCase(),
            `${row.productName.toLowerCase()} supplier`,
            `${row.productName.toLowerCase()} manufacturer india`,
            row.casNumber ? `cas ${row.casNumber}` : null,
          ].filter(Boolean) as string[],
        },
        update: {
          // Update existing records
          shortDescription: row.description.slice(0, 300),
          applications: row.applications ? row.applications.split(',').map(a => a.trim()) : [],
        },
      })

      // Import synonyms
      if (row.synonyms) {
        const syns = row.synonyms.split(';').map(s => s.trim()).filter(Boolean)
        for (const syn of syns) {
          await db.synonym.upsert({
            where: { id: `${chemical.id}_${syn.toLowerCase().slice(0,20)}` },
            create: { name: syn, type: 'TRADE_NAME', chemicalId: chemical.id },
            update: {},
          }).catch(() => {})
        }
      }

      // Index in Elasticsearch (batch for performance)
      if (imported % 100 === 0) {
        await indexChemical({ ...chemical, synonyms: [], category }).catch(() => {})
      }

      imported++
      if (imported % 500 === 0) console.log(`  ✅ Imported ${imported}/${rows.length}...`)

    } catch (err: any) {
      console.error(`  ❌ Error on ${row.productName}:`, err.message)
      errors++
    }
  }

  console.log(`\n✅ Import complete:`)
  console.log(`  Imported: ${imported}`)
  console.log(`  Skipped:  ${skipped}`)
  console.log(`  Errors:   ${errors}`)

  // Update category product counts
  const categories = await db.category.findMany()
  for (const cat of categories) {
    const count = await db.chemical.count({ where: { categoryId: cat.id, isActive: true } })
    await db.category.update({ where: { id: cat.id }, data: { productCount: count } })
  }

  console.log('✅ Category counts updated')
  await db.$disconnect()
}

// CLI: ts-node scripts/importChemicals.ts ./data/chemicals.csv
const file = process.argv[2]
if (!file) {
  console.error('Usage: ts-node scripts/importChemicals.ts <path-to-file.csv|xlsx>')
  process.exit(1)
}

importFromFile(path.resolve(file)).catch(console.error)
