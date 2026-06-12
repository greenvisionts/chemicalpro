// app/api/rfq/route.ts — RFQ submission and supplier matching
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { z } from 'zod'
import nodemailer from 'nodemailer'

const rfqSchema = z.object({
  productName:  z.string().min(2),
  casNumber:    z.string().optional(),
  quantity:     z.number().positive(),
  unit:         z.string().min(1),
  purity:       z.string().optional(),
  frequency:    z.string().optional(),
  requestType:  z.enum(['PRICE_QUOTE','SAMPLE_REQUEST','SDS_REQUEST','TDS_REQUEST','COA_REQUEST','BULK_SUPPLY','OEM_INQUIRY']).default('PRICE_QUOTE'),
  buyerName:    z.string().min(2),
  buyerEmail:   z.string().email(),
  buyerPhone:   z.string().min(7),
  buyerCompany: z.string().optional(),
  buyerCountry: z.string().min(2),
  buyerCity:    z.string().optional(),
  buyerMessage: z.string().optional(),
  platform:     z.string().default('CHEMICALPRO'),
  chemicalId:   z.string().optional(),
})

const mailer = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: 587,
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const data = rfqSchema.parse(body)

    // Find matching chemical
    let chemical = null
    if (data.chemicalId) {
      chemical = await db.chemical.findUnique({ where: { id: data.chemicalId } })
    } else if (data.casNumber) {
      chemical = await db.chemical.findFirst({ where: { casNumber: data.casNumber } })
    }

    // Auto-match suppliers
    let matchedSupplier = null
    if (chemical) {
      matchedSupplier = await db.supplierProduct.findFirst({
        where: { chemicalId: chemical.id, isActive: true },
        include: { supplier: true },
        orderBy: { supplier: { isPremium: 'desc' } },
      })
    }

    // Create RFQ
    const rfq = await db.rFQ.create({
      data: {
        ...data,
        chemicalId: chemical?.id,
        supplierId: matchedSupplier?.supplier.id,
        ipAddress: req.headers.get('x-forwarded-for') || '',
        userAgent: req.headers.get('user-agent') || '',
        referrer: req.headers.get('referer') || '',
      },
    })

    // Send confirmation email to buyer
    const siteName = data.platform === 'PHARMACLOUD' ? 'PharmaCloud' : 'ChemicalPro'
    await mailer.sendMail({
      from: `"${siteName}" <admin@fertilizerindia.com>`,
      to: data.buyerEmail,
      subject: `RFQ Received — ${data.productName} | ${siteName}`,
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
          <h2 style="color:#7c3aed">Your RFQ has been received</h2>
          <p>Dear ${data.buyerName},</p>
          <p>We have received your request for <strong>${data.productName}</strong>.</p>
          <table style="width:100%;border-collapse:collapse;margin:16px 0">
            <tr><td style="padding:8px;background:#f5f3ff;font-weight:700">Product</td><td style="padding:8px;border-bottom:1px solid #e5e7eb">${data.productName}</td></tr>
            <tr><td style="padding:8px;background:#f5f3ff;font-weight:700">Quantity</td><td style="padding:8px;border-bottom:1px solid #e5e7eb">${data.quantity} ${data.unit}</td></tr>
            <tr><td style="padding:8px;background:#f5f3ff;font-weight:700">RFQ Type</td><td style="padding:8px;border-bottom:1px solid #e5e7eb">${data.requestType.replace('_',' ')}</td></tr>
            <tr><td style="padding:8px;background:#f5f3ff;font-weight:700">RFQ ID</td><td style="padding:8px">${rfq.id.slice(0,8).toUpperCase()}</td></tr>
          </table>
          <p>Our team will respond within <strong>2 business hours</strong> with a competitive quote.</p>
          <p>For urgent requirements: <a href="https://wa.me/919890550271">WhatsApp +91-9890550271</a></p>
          <hr style="border:1px solid #e5e7eb;margin:20px 0"/>
          <p style="font-size:12px;color:#888">Green Vision Technical Services · Nashik, Maharashtra, India · GST: 27AAIFG3238J1Z9</p>
        </div>
      `,
    }).catch(() => {}) // Don't fail if email fails

    // Notify admin
    await mailer.sendMail({
      from: `"${siteName} RFQ" <admin@fertilizerindia.com>`,
      to: 'admin@fertilizerindia.com',
      subject: `🆕 New RFQ: ${data.productName} — ${data.quantity} ${data.unit} — ${data.buyerCountry}`,
      html: `
        <h3>New RFQ Received</h3>
        <p><strong>Product:</strong> ${data.productName}</p>
        <p><strong>Quantity:</strong> ${data.quantity} ${data.unit}</p>
        <p><strong>Type:</strong> ${data.requestType}</p>
        <p><strong>Buyer:</strong> ${data.buyerName}, ${data.buyerCompany || 'N/A'}</p>
        <p><strong>Country:</strong> ${data.buyerCountry}</p>
        <p><strong>Email:</strong> ${data.buyerEmail}</p>
        <p><strong>Phone:</strong> ${data.buyerPhone}</p>
        <p><strong>Message:</strong> ${data.buyerMessage || 'N/A'}</p>
        <p><strong>RFQ ID:</strong> ${rfq.id}</p>
        <p><a href="${process.env.ADMIN_URL}/admin/rfq/${rfq.id}">View in Admin →</a></p>
      `,
    }).catch(() => {})

    return NextResponse.json({ success: true, rfqId: rfq.id.slice(0,8).toUpperCase() }, { status: 201 })
  } catch (err: any) {
    if (err.name === 'ZodError') {
      return NextResponse.json({ error: 'Invalid data', details: err.errors }, { status: 400 })
    }
    console.error('RFQ error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  // Admin only — list RFQs
  const { searchParams } = new URL(req.url)
  const platform = searchParams.get('platform') || 'CHEMICALPRO'
  const status = searchParams.get('status')
  const page = parseInt(searchParams.get('page') || '1')

  const where: any = { platform }
  if (status) where.status = status

  const [rfqs, total] = await Promise.all([
    db.rFQ.findMany({
      where, skip: (page-1)*20, take: 20,
      orderBy: { createdAt: 'desc' },
      include: { chemical: { select: { productName: true, slug: true } } },
    }),
    db.rFQ.count({ where }),
  ])

  return NextResponse.json({ rfqs, total, page })
}
