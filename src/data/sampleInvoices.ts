import { ExtractedInvoice } from '../types';

export interface SampleInvoice {
  id: string;
  title: string;
  subtitle: string;
  fileName: string;
  mimeType: string;
  badge: 'Clean SGD' | 'Unclear / Handwritten' | 'Foreign Currency' | 'Non-Invoice';
  badgeColor: 'green' | 'amber' | 'blue' | 'red';
  // SVG or visual mockup data uri for preview
  previewUrl: string;
  mockExtractedData: ExtractedInvoice;
}

// Generate high quality SVG Data URL previews for sample invoices
function createSvgDataUrl(title: string, supplier: string, date: string, invNo: string, items: { desc: string; qty: number; price: number }[], note?: string) {
  const itemRows = items.map((it, idx) => `
    <tr>
      <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; font-size: 13px; font-family: sans-serif; color: #1f2937;">${it.desc}</td>
      <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; font-size: 13px; font-family: sans-serif; text-align: center; color: #1f2937;">${it.qty}</td>
      <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; font-size: 13px; font-family: sans-serif; text-align: right; color: #1f2937;">$${it.price.toFixed(2)}</td>
      <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; font-size: 13px; font-family: sans-serif; text-align: right; color: #1f2937;">$${(it.qty * it.price).toFixed(2)}</td>
    </tr>
  `).join('');

  const total = items.reduce((sum, it) => sum + (it.qty * it.price), 0);

  const svg = `
  <svg xmlns="http://www.w3.org/2000/svg" width="600" height="750" viewBox="0 0 600 750" fill="none">
    <rect width="600" height="750" fill="#F9FAFB"/>
    <rect x="25" y="25" width="550" height="700" rx="8" fill="#FFFFFF" stroke="#E5E7EB" stroke-width="2"/>
    
    <!-- Header -->
    <text x="50" y="70" font-family="Arial, sans-serif" font-size="20" font-weight="bold" fill="#0F172A">${supplier}</text>
    <text x="50" y="90" font-family="Arial, sans-serif" font-size="11" fill="#64748B">12 Kaki Bukit Industrial Terrace, #02-04, Singapore 416123</text>
    <text x="50" y="105" font-family="Arial, sans-serif" font-size="11" fill="#64748B">TEL: +65 6745 8821 | GST Reg No: M2-0098712-4</text>
    
    <text x="430" y="70" font-family="Arial, sans-serif" font-size="24" font-weight="bold" fill="#2563EB">INVOICE</text>
    <text x="430" y="95" font-family="Arial, sans-serif" font-size="12" font-weight="bold" fill="#334155">INVOICE #: ${invNo}</text>
    <text x="430" y="112" font-family="Arial, sans-serif" font-size="11" fill="#64748B">DATE: ${date}</text>
    
    <!-- Divider -->
    <line x1="50" y1="130" x2="550" y2="130" stroke="#E2E8F0" stroke-width="1.5"/>
    
    <!-- Bill To -->
    <rect x="50" y="145" width="240" height="85" rx="4" fill="#F8FAFC" stroke="#E2E8F0"/>
    <text x="60" y="165" font-family="Arial, sans-serif" font-size="11" font-weight="bold" fill="#475569">BILL TO:</text>
    <text x="60" y="182" font-family="Arial, sans-serif" font-size="12" font-weight="bold" fill="#0F172A">Boon Huat Hardware &amp; Supplies Pte Ltd</text>
    <text x="60" y="198" font-family="Arial, sans-serif" font-size="11" fill="#64748B">Blk 5032 Ang Mo Kio Industrial Park 2</text>
    <text x="60" y="213" font-family="Arial, sans-serif" font-size="11" fill="#64748B">#01-285 Singapore 569535</text>
    
    <!-- Payment Terms -->
    <rect x="310" y="145" width="240" height="85" rx="4" fill="#F8FAFC" stroke="#E2E8F0"/>
    <text x="320" y="165" font-family="Arial, sans-serif" font-size="11" font-weight="bold" fill="#475569">INVOICE DETAILS:</text>
    <text x="320" y="184" font-family="Arial, sans-serif" font-size="11" fill="#334155">PO Ref: <tspan font-weight="bold">${title.includes('Unclear') ? 'N/A' : 'BH-2026-0891'}</tspan></text>
    <text x="320" y="200" font-family="Arial, sans-serif" font-size="11" fill="#334155">Payment Terms: 30 Days Net</text>
    <text x="320" y="216" font-family="Arial, sans-serif" font-size="11" fill="#334155">Currency: SGD</text>
    
    <!-- Table HTML Embed via foreignObject -->
    <foreignObject x="50" y="250" width="500" height="350">
      <div xmlns="http://www.w3.org/1999/xhtml">
        <table style="width:100%; border-collapse: collapse; font-family: Arial, sans-serif;">
          <thead>
            <tr style="background-color: #0F172A; color: white; font-size: 12px; text-align: left;">
              <th style="padding: 8px; border-top-left-radius: 4px;">Item Description</th>
              <th style="padding: 8px; text-align: center; width: 60px;">Qty</th>
              <th style="padding: 8px; text-align: right; width: 90px;">Unit ($)</th>
              <th style="padding: 8px; text-align: right; width: 90px; border-top-right-radius: 4px;">Amount ($)</th>
            </tr>
          </thead>
          <tbody>
            ${itemRows}
          </tbody>
        </table>
        
        <div style="margin-top: 20px; display: flex; justify-content: flex-end;">
          <div style="width: 200px; font-family: Arial, sans-serif; font-size: 13px;">
            <div style="display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid #e5e7eb;">
              <span>Subtotal:</span>
              <span style="font-weight: bold;">$${total.toFixed(2)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid #e5e7eb;">
              <span>GST (9%):</span>
              <span>$${(total * 0.09).toFixed(2)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 8px 0; font-size: 15px; font-weight: bold; color: #0f172a; border-bottom: 2px solid #0f172a;">
              <span>TOTAL DUE:</span>
              <span style="color: #2563eb;">$${(total * 1.09).toFixed(2)}</span>
            </div>
          </div>
        </div>
        
        ${note ? `<div style="margin-top: 25px; padding: 10px; background-color: #fef3c7; border: 1px solid #f59e0b; border-radius: 4px; color: #92400e; font-size: 11px;">Note: ${note}</div>` : ''}
      </div>
    </foreignObject>
    
    <!-- Footer Note -->
    <text x="300" y="700" font-family="Arial, sans-serif" font-size="10" fill="#94A3B8" text-anchor="middle">Thank you for your business. Please remit payment via PayNow UEN: 201209871M</text>
  </svg>
  `;

  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
}

export const SAMPLE_INVOICES: SampleInvoice[] = [
  {
    id: 'sample-1',
    title: 'SingaTools Supply Pte Ltd',
    subtitle: 'Clean SGD Hardware Invoice with clear line items & PO',
    fileName: 'SingaTools_INV-88219.png',
    mimeType: 'image/svg+xml',
    badge: 'Clean SGD',
    badgeColor: 'green',
    previewUrl: createSvgDataUrl(
      'Clean SGD',
      'SingaTools Supply Pte Ltd',
      '2026-07-15',
      'ST-INV-88219',
      [
        { desc: 'Heavy Duty Socket Wrench Set (24pc)', qty: 5, price: 85.00 },
        { desc: 'M10 Stainless Steel Hex Bolts (Box of 100)', qty: 10, price: 24.50 },
        { desc: 'Carbide Drill Bit Set 1mm-13mm', qty: 3, price: 112.00 }
      ]
    ),
    mockExtractedData: {
      sourceFileName: 'SingaTools_INV-88219.png',
      supplierName: 'SingaTools Supply Pte Ltd',
      supplierAddress: '12 Kaki Bukit Industrial Terrace, #02-04, Singapore 416123',
      billToCompany: 'Boon Huat Hardware & Supplies Pte Ltd',
      invoiceNumber: 'ST-INV-88219',
      invoiceDate: '2026-07-15',
      dueDate: '2026-08-14',
      poReference: 'BH-2026-0891',
      currency: 'SGD',
      totalDue: 1096.54,
      paymentTerms: '30 Days Net',
      lineItems: [
        { id: 'item-1', description: 'Heavy Duty Socket Wrench Set (24pc)', poReference: 'BH-2026-0891', quantity: 5, unitPrice: 85.00, lineAmount: 425.00 },
        { id: 'item-2', description: 'M10 Stainless Steel Hex Bolts (Box of 100)', poReference: 'BH-2026-0891', quantity: 10, unitPrice: 24.50, lineAmount: 245.00 },
        { id: 'item-3', description: 'Carbide Drill Bit Set 1mm-13mm', poReference: 'BH-2026-0891', quantity: 3, unitPrice: 112.00, lineAmount: 336.00 }
      ],
      extractionStatus: 'READY_FOR_REVIEW',
      reviewReasons: [
        'All essential invoice fields and line items were clearly extracted.'
      ]
    }
  },
  {
    id: 'sample-2',
    title: 'Chuan Heng Metalwork & Trading',
    subtitle: 'Handwritten / Scanned receipt missing PO Reference',
    fileName: 'ChuanHeng_Receipt_098.png',
    mimeType: 'image/svg+xml',
    badge: 'Unclear / Handwritten',
    badgeColor: 'amber',
    previewUrl: createSvgDataUrl(
      'Unclear / Handwritten',
      'Chuan Heng Metalwork & Trading',
      '2026-07-20',
      'CH-8902',
      [
        { desc: 'Custom Mild Steel Angle Bars 50x50x5mm', qty: 12, price: 38.00 },
        { desc: 'Grit Blasting & Anti-Rust Coating Service', qty: 1, price: 180.00 }
      ],
      'Handwritten receipt. PO Reference not stated on document.'
    ),
    mockExtractedData: {
      sourceFileName: 'ChuanHeng_Receipt_098.png',
      supplierName: 'Chuan Heng Metalwork & Trading',
      supplierAddress: 'Blk 3019 Ubi Road 1, #01-112, Singapore 408712',
      billToCompany: 'Boon Huat Hardware & Supplies Pte Ltd',
      invoiceNumber: 'CH-8902',
      invoiceDate: '2026-07-20',
      dueDate: '2026-08-19',
      poReference: '',
      currency: 'SGD',
      totalDue: 693.24,
      paymentTerms: '30 Days Net',
      lineItems: [
        { id: 'item-1', description: 'Custom Mild Steel Angle Bars 50x50x5mm', poReference: '', quantity: 12, unitPrice: 38.00, lineAmount: 456.00 },
        { id: 'item-2', description: 'Grit Blasting & Anti-Rust Coating Service', poReference: '', quantity: 1, unitPrice: 180.00, lineAmount: 180.00 }
      ],
      extractionStatus: 'MANUAL_REVIEW_REQUIRED',
      reviewReasons: [
        'Manual review required because the PO reference is missing or listed as N/A.',
        'Handwritten formatting detected; please double check item unit prices against physical delivery receipt.'
      ]
    }
  },
  {
    id: 'sample-3',
    title: 'Global Fasteners & Bolts (HK) Ltd',
    subtitle: 'Overseas Supplier Invoice in USD with unstated payment terms',
    fileName: 'GlobalFasteners_INV-USD-99.png',
    mimeType: 'image/svg+xml',
    badge: 'Foreign Currency',
    badgeColor: 'blue',
    previewUrl: createSvgDataUrl(
      'Foreign Currency',
      'Global Fasteners & Bolts (HK) Ltd',
      '2026-07-10',
      'GF-HK-2026-99',
      [
        { desc: 'High Tensile Grade 8.8 Structural Nuts M16', qty: 50, price: 12.00 },
        { desc: 'Precision Brass Washers M12 (Pack of 500)', qty: 8, price: 45.00 }
      ],
      'International shipment billed in USD.'
    ),
    mockExtractedData: {
      sourceFileName: 'GlobalFasteners_INV-USD-99.png',
      supplierName: 'Global Fasteners & Bolts (HK) Ltd',
      supplierAddress: 'Unit 1402 Tower B, Billion Centre, Kowloon Bay, Hong Kong',
      billToCompany: 'Boon Huat Hardware & Supplies Pte Ltd',
      invoiceNumber: 'GF-HK-2026-99',
      invoiceDate: '2026-07-10',
      dueDate: '',
      poReference: 'BH-PO-OVERSEAS-04',
      currency: 'USD',
      totalDue: 1046.40,
      paymentTerms: '',
      lineItems: [
        { id: 'item-1', description: 'High Tensile Grade 8.8 Structural Nuts M16', poReference: 'BH-PO-OVERSEAS-04', quantity: 50, unitPrice: 12.00, lineAmount: 600.00 },
        { id: 'item-2', description: 'Precision Brass Washers M12 (Pack of 500)', poReference: 'BH-PO-OVERSEAS-04', quantity: 8, unitPrice: 45.00, lineAmount: 360.00 }
      ],
      extractionStatus: 'MANUAL_REVIEW_REQUIRED',
      reviewReasons: [
        'Manual review required because the payment due date is not specified.',
        'Payment terms are missing on the uploaded invoice.',
        'Foreign currency (USD) detected; verify telegraphic transfer terms.'
      ]
    }
  }
];
