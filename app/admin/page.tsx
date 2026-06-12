// app/admin/page.tsx — Admin dashboard
// (Protected by middleware — see middleware.ts)
import { db } from '@/lib/db'

export default async function AdminDashboard() {
  const [chemicals, rfqs, suppliers] = await Promise.all([
    db.chemical.count(),
    db.rFQ.count({ where: { status: 'PENDING' } }),
    db.supplier.count(),
  ])

  return (
    <div style={{ fontFamily: 'sans-serif', padding: '32px', maxWidth: '1200px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '28px', fontWeight: 800, marginBottom: '24px' }}>⚗️ ChemicalPro Admin</h1>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '16px', marginBottom: '32px' }}>
        {[
          { label: 'Total Products', value: chemicals.toLocaleString(), color: '#7c3aed' },
          { label: 'Pending RFQs', value: rfqs.toLocaleString(), color: '#dc2626' },
          { label: 'Suppliers', value: suppliers.toLocaleString(), color: '#059669' },
          { label: 'Platforms', value: '2', color: '#0284c7' },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ background: '#fff', border: `2px solid ${color}20`, borderRadius: '12px', padding: '20px', borderTop: `4px solid ${color}` }}>
            <div style={{ fontSize: '32px', fontWeight: 900, color }}>{value}</div>
            <div style={{ fontSize: '13px', color: '#666', marginTop: '4px' }}>{label}</div>
          </div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        {[
          { title: '📦 Products', links: [['All Products', '/admin/products'], ['Add Product', '/admin/products/new'], ['Bulk Import CSV', '/admin/import'], ['Categories', '/admin/categories']] },
          { title: '📋 RFQs', links: [['Pending RFQs', '/admin/rfq?status=PENDING'], ['All RFQs', '/admin/rfq'], ['Export RFQs', '/admin/rfq/export'], ['Analytics', '/admin/analytics']] },
          { title: '🏭 Suppliers', links: [['All Suppliers', '/admin/suppliers'], ['Add Supplier', '/admin/suppliers/new'], ['Verify Suppliers', '/admin/suppliers/verify'], ['Bulk Import', '/admin/suppliers/import']] },
          { title: '🔧 Tools', links: [['Reindex Elasticsearch', '/admin/tools/reindex'], ['Generate Sitemap', '/admin/tools/sitemap'], ['Clear Cache', '/admin/tools/cache'], ['SEO Audit', '/admin/tools/seo']] },
        ].map(({ title, links }) => (
          <div key={title} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '20px' }}>
            <h3 style={{ fontWeight: 700, marginBottom: '12px' }}>{title}</h3>
            {links.map(([label, href]) => (
              <a key={label} href={href} style={{ display: 'block', padding: '8px 0', borderBottom: '1px solid #f1f5f9', color: '#7c3aed', textDecoration: 'none', fontSize: '14px' }}>
                → {label}
              </a>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
