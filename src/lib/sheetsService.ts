import { ExtractedInvoice, ExistingRegisterRecord, DuplicateCheckResult, HumanDecision } from '../types';

export const SPREADSHEET_ID = '1HKLQsB0rSDqE_b-tUqwu2koMtR2dAQHxMctz5ut7q8U';
export const INVOICE_REGISTER_SHEET = 'Invoice Register';
export const INVOICE_LINE_ITEMS_SHEET = 'Invoice Line Items';

/**
 * Normalizes supplier name for duplicate comparison:
 * - lowercase & trim
 * - removes punctuation
 * - removes common company suffixes like "pte. ltd.", "pte ltd", "ltd", "inc", "co", "llc", "corp", "corporation", "limited"
 */
export function normalizeSupplierName(name: string | null | undefined): string {
  if (!name) return '';
  let str = name.toLowerCase().trim();
  // Remove punctuation
  str = str.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()"'?]/g, ' ');
  // Remove common company suffixes
  const suffixes = [
    'pte ltd',
    'pte',
    'ltd',
    'private limited',
    'limited',
    'inc',
    'incorporated',
    'co',
    'company',
    'llc',
    'corp',
    'corporation',
  ];
  for (const suffix of suffixes) {
    const reg = new RegExp(`\\b${suffix}\\b`, 'gi');
    str = str.replace(reg, '');
  }
  return str.replace(/\s+/g, ' ').trim();
}

/**
 * Normalizes invoice number for duplicate comparison:
 * - lowercase
 * - strips all spaces, hyphens, slashes, dots, underscores
 */
export function normalizeInvoiceNumber(invNum: string | null | undefined): string {
  if (!invNum) return '';
  return invNum.toLowerCase().replace(/[\s\-_.\/\\#]/g, '').trim();
}

/**
 * Normalizes PO reference for duplicate comparison:
 * - lowercase & strip spaces and punctuation
 */
export function normalizePoReference(poRef: string | null | undefined): string {
  if (!poRef) return '';
  const clean = poRef.toLowerCase().replace(/[\s\-_.\/\\#]/g, '').trim();
  if (['na', 'n/a', 'none', 'null', 'undefined', 'blank', '-'].includes(clean)) return '';
  return clean;
}

/**
 * Checks if two dates (YYYY-MM-DD) are within N days of each other
 */
export function isDateWithinDays(dateStr1: string, dateStr2: string, maxDays = 7): boolean {
  if (!dateStr1 || !dateStr2) return false;
  const d1 = new Date(dateStr1).getTime();
  const d2 = new Date(dateStr2).getTime();
  if (isNaN(d1) || isNaN(d2)) return false;
  const diffDays = Math.abs(d1 - d2) / (1000 * 60 * 60 * 24);
  return diffDays <= maxDays;
}

/**
 * Fetches existing records from Invoice Register sheet in Google Sheets
 */
export async function fetchExistingInvoiceRegister(accessToken: string): Promise<ExistingRegisterRecord[]> {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent(
    INVOICE_REGISTER_SHEET
  )}!A2:R1000`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error('Failed to fetch Invoice Register from Sheets:', errText);
    throw new Error('Could not access Invoice Register in Google Sheets.');
  }

  const data = await res.json();
  const rows: string[][] = data.values || [];

  return rows.map((row) => ({
    invoiceRecordId: row[0] || '',
    processingTimestamp: row[1] || '',
    sourceFileName: row[2] || '',
    supplierName: row[3] || '',
    invoiceNumber: row[4] || '',
    invoiceDate: row[5] || '',
    dueDate: row[6] || '',
    poReference: row[7] || '',
    totalDue: parseFloat(row[8]) || 0,
    currency: row[9] || 'SGD',
    extractionStatus: row[10] || '',
    validationStatus: row[11] || '',
    duplicateStatus: row[12] || '',
    duplicateMatchRecordId: row[13] || '',
    duplicateExplanation: row[14] || '',
    humanDecision: row[15] || '',
    reviewNotes: row[16] || '',
    reviewedBy: row[17] || '',
  }));
}

/**
 * Compares a new extracted invoice against existing records according to prompt specification:
 *
 * EXACT_DUPLICATE when:
 * - Normalized supplier name matches; and
 * - Normalized invoice number matches.
 *
 * POSSIBLE_DUPLICATE when:
 * - Invoice number differs, is missing or is unclear, BUT at least three (3) of these match:
 *   1. supplier name
 *   2. PO reference
 *   3. total due (within 0.01)
 *   4. invoice date within 7 days
 *   5. similar item descriptions, quantities or line amounts
 */
export function performDuplicateCheck(
  invoice: ExtractedInvoice,
  existingRecords: ExistingRegisterRecord[]
): DuplicateCheckResult {
  if (!existingRecords || existingRecords.length === 0) {
    return {
      status: 'DATABASE_NOT_LOADED',
      explanation: 'Invoice extraction completed. Upload the Invoice Register CSV to perform duplicate checking.',
    };
  }

  const normSupplier = normalizeSupplierName(invoice.supplierName);
  const normInvNum = normalizeInvoiceNumber(invoice.invoiceNumber);
  const normPoRef = normalizePoReference(invoice.poReference);
  const totalDueVal = Number(invoice.totalDue) || 0;

  // 1. Check for EXACT DUPLICATE
  if (normSupplier && normInvNum) {
    for (const record of existingRecords) {
      const recNormSupplier = normalizeSupplierName(record.supplierName);
      const recNormInvNum = normalizeInvoiceNumber(record.invoiceNumber);

      if (normSupplier === recNormSupplier && normInvNum === recNormInvNum) {
        return {
          status: 'EXACT_DUPLICATE',
          explanation: 'An invoice with the same supplier and invoice number already exists in the Invoice Register.',
          matchedRecord: record,
          matchedRecordId: record.invoiceRecordId || 'REGISTERED-REC',
        };
      }
    }
  }

  // 2. Check for POSSIBLE DUPLICATE
  for (const record of existingRecords) {
    const matchedDetails: string[] = [];
    let matchCount = 0;

    const recNormSupplier = normalizeSupplierName(record.supplierName);
    const recNormPoRef = normalizePoReference(record.poReference);
    const recTotalDue = Number(record.totalDue) || 0;

    // Signal 1: Supplier Name match
    if (normSupplier && recNormSupplier && normSupplier === recNormSupplier) {
      matchCount++;
      matchedDetails.push(`Supplier Name (${record.supplierName})`);
    }

    // Signal 2: PO Reference match
    if (normPoRef && recNormPoRef && normPoRef === recNormPoRef) {
      matchCount++;
      matchedDetails.push(`PO Reference (${record.poReference})`);
    }

    // Signal 3: Total Due match
    if (totalDueVal > 0 && recTotalDue > 0 && Math.abs(totalDueVal - recTotalDue) <= 0.01) {
      matchCount++;
      matchedDetails.push(`Total Due (${invoice.currency || 'SGD'} ${totalDueVal.toFixed(2)})`);
    }

    // Signal 4: Invoice Date within 7 days
    if (invoice.invoiceDate && record.invoiceDate && isDateWithinDays(invoice.invoiceDate, record.invoiceDate, 7)) {
      matchCount++;
      matchedDetails.push(`Invoice Date within 7 days (${record.invoiceDate})`);
    }

    // Signal 5: Similar line items or amounts (check if description or total matches)
    if (invoice.lineItems && invoice.lineItems.length > 0) {
      const hasMatchingLineItem = invoice.lineItems.some((item) => {
        const itemDesc = (item.description || '').toLowerCase().trim();
        const itemAmt = Number(item.lineAmount) || 0;
        return itemDesc.length > 3 && itemAmt > 0 && Math.abs(itemAmt - recTotalDue) <= 0.01;
      });
      if (hasMatchingLineItem) {
        matchCount++;
        matchedDetails.push('Similar line item description and amount');
      }
    }

    // If 3 or more signals match, flag as POSSIBLE_DUPLICATE
    if (matchCount >= 3) {
      return {
        status: 'POSSIBLE_DUPLICATE',
        explanation: 'This invoice shares several details with a previous invoice. Madam Lim must compare both records.',
        matchedRecord: record,
        matchedDetails,
        matchedRecordId: record.invoiceRecordId || 'REGISTERED-REC',
      };
    }
  }

  return {
    status: 'NO_DUPLICATE_FOUND',
    explanation: 'No duplicate was found in the current Invoice Register.',
  };
}

export interface SaveInvoiceOptions {
  invoice: ExtractedInvoice;
  duplicateResult: DuplicateCheckResult;
  humanDecision: HumanDecision;
  decisionReason: string;
  reviewerName: string;
  accessToken: string;
}

/**
 * Generates unique Invoice Record ID
 */
export function generateInvoiceRecordId(): string {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randStr = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `REC-${dateStr}-${randStr}`;
}

/**
 * Saves confirmed invoice and line items to Google Sheets
 */
export async function saveInvoiceToSheets({
  invoice,
  duplicateResult,
  humanDecision,
  decisionReason,
  reviewerName,
  accessToken,
}: SaveInvoiceOptions): Promise<{ recordId: string }> {
  const invoiceRecordId = generateInvoiceRecordId();
  const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19);

  let formattedHumanDecision = 'Confirmed & Verified';
  if (humanDecision === 'HOLD') {
    formattedHumanDecision = 'Placed on Hold';
  } else if (humanDecision === 'CONFIRM_DUPLICATE') {
    formattedHumanDecision = 'Confirmed Duplicate';
  } else if (humanDecision === 'NOT_DUPLICATE') {
    formattedHumanDecision = `Marked Not Duplicate: ${decisionReason.trim()}`;
  }

  const validationNotes = (invoice.reviewReasons || []).join('; ') || 'Basic invoice calculations agree.';

  // Row for Invoice Register (18 columns)
  const registerRow = [
    invoiceRecordId,
    timestamp,
    invoice.sourceFileName || 'Uploaded Invoice',
    invoice.supplierName || '',
    invoice.invoiceNumber || '',
    invoice.invoiceDate || '',
    invoice.dueDate || '',
    invoice.poReference || '',
    Number(invoice.totalDue) || 0,
    invoice.currency || 'SGD',
    invoice.extractionStatus || 'READY_FOR_REVIEW',
    validationNotes,
    duplicateResult.status,
    duplicateResult.matchedRecordId || duplicateResult.matchedRecord?.invoiceRecordId || 'N/A',
    duplicateResult.explanation || 'N/A',
    formattedHumanDecision,
    decisionReason ? decisionReason.trim() : 'N/A',
    reviewerName || 'Madam Lim',
  ];

  // 1. Append to Invoice Register
  const registerUrl = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent(
    `${INVOICE_REGISTER_SHEET}!A1`
  )}:append?valueInputOption=USER_ENTERED`;

  const registerRes = await fetch(registerUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      values: [registerRow],
    }),
  });

  if (!registerRes.ok) {
    const errText = await registerRes.text();
    console.error('Failed to append to Invoice Register:', errText);
    throw new Error('Failed to save invoice record to Invoice Register in Google Sheets.');
  }

  // 2. Append line items to Invoice Line Items
  if (invoice.lineItems && invoice.lineItems.length > 0) {
    const lineRows = invoice.lineItems.map((item, idx) => [
      invoiceRecordId,
      idx + 1,
      item.description || '',
      item.poReference || '',
      Number(item.quantity) || 0,
      Number(item.unitPrice) || 0,
      Number(item.lineAmount) || 0,
    ]);

    const lineItemsUrl = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent(
      `${INVOICE_LINE_ITEMS_SHEET}!A1`
    )}:append?valueInputOption=USER_ENTERED`;

    const lineRes = await fetch(lineItemsUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        values: lineRows,
      }),
    });

    if (!lineRes.ok) {
      const errText = await lineRes.text();
      console.error('Failed to append to Invoice Line Items:', errText);
      throw new Error('Saved invoice summary, but failed to write line items to Google Sheets.');
    }
  }

  return { recordId: invoiceRecordId };
}

/**
 * Calls server-side test connection endpoint to verify access to Invoice Register and Invoice Line Items sheets.
 * Reads Row 1 headings only without modifying data.
 */
export async function testDatabaseConnection(accessToken: string): Promise<{ success: boolean; message: string }> {
  try {
    const res = await fetch('/api/test-db-connection', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accessToken }),
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      return {
        success: false,
        message: data.error || 'Failed to test connection to Google Sheets.',
      };
    }

    return {
      success: true,
      message: data.message || 'Database connected successfully. Invoice Register and Invoice Line Items are accessible.',
    };
  } catch (err: any) {
    return {
      success: false,
      message: err.message || 'Network error while attempting to test database connection.',
    };
  }
}

