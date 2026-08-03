import { ExistingRegisterRecord } from '../types';

/**
 * Robust CSV parser handling quoted fields with commas and newlines
 */
export function parseCSVLines(csvText: string): string[][] {
  const result: string[][] = [];
  let row: string[] = [];
  let currentField = '';
  let inQuotes = false;

  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    const nextChar = csvText[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote inside quoted string
        currentField += '"';
        i++; // Skip next quote
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      row.push(currentField.trim());
      currentField = '';
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++; // Handle CRLF
      }
      row.push(currentField.trim());
      if (row.some((cell) => cell.length > 0)) {
        result.push(row);
      }
      row = [];
      currentField = '';
    } else {
      currentField += char;
    }
  }

  if (currentField || row.length > 0) {
    row.push(currentField.trim());
    if (row.some((cell) => cell.length > 0)) {
      result.push(row);
    }
  }

  return result;
}

export function parseInvoiceRegisterCSV(csvText: string): ExistingRegisterRecord[] {
  const rows = parseCSVLines(csvText);
  if (rows.length < 2) return [];

  const headers = rows[0].map((h) => h.toLowerCase().replace(/[\s\-_]/g, ''));

  const findColIndex = (aliases: string[]): number => {
    return headers.findIndex((h) => aliases.some((alias) => h === alias.toLowerCase().replace(/[\s\-_]/g, '')));
  };

  const recordIdIdx = findColIndex(['invoicerecordid', 'recordid', 'id']);
  const supplierIdx = findColIndex(['suppliername', 'supplier', 'vendor']);
  const invNumIdx = findColIndex(['invoicenumber', 'invnumber', 'invnum', 'invoiceno', 'invno']);
  const invDateIdx = findColIndex(['invoicedate', 'invdate', 'date']);
  const dueDateIdx = findColIndex(['duedate']);
  const poRefIdx = findColIndex(['poreference', 'poref', 'ponumber', 'po']);
  const totalDueIdx = findColIndex(['totaldue', 'total', 'amount', 'amountdue']);
  const currencyIdx = findColIndex(['currency']);
  const decisionIdx = findColIndex(['humandecision', 'decision']);

  const records: ExistingRegisterRecord[] = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (row.length === 0) continue;

    const recordId = recordIdIdx !== -1 ? row[recordIdIdx] || '' : `REC-${i}`;
    const supplier = supplierIdx !== -1 ? row[supplierIdx] || '' : '';
    const invNum = invNumIdx !== -1 ? row[invNumIdx] || '' : '';
    const invDate = invDateIdx !== -1 ? row[invDateIdx] || '' : '';
    const dueDate = dueDateIdx !== -1 ? row[dueDateIdx] || '' : '';
    const poRef = poRefIdx !== -1 ? row[poRefIdx] || '' : '';
    const totalRaw = totalDueIdx !== -1 ? row[totalDueIdx] || '0' : '0';
    const totalDue = parseFloat(totalRaw.replace(/[^0-9.-]+/g, '')) || 0;
    const currency = currencyIdx !== -1 ? row[currencyIdx] || 'SGD' : 'SGD';
    const decision = decisionIdx !== -1 ? row[decisionIdx] || '' : '';

    if (supplier || invNum || totalDue > 0) {
      records.push({
        invoiceRecordId: recordId,
        processingTimestamp: new Date().toISOString(),
        sourceFileName: 'Uploaded Invoice Register CSV',
        supplierName: supplier,
        invoiceNumber: invNum,
        invoiceDate: invDate,
        dueDate: dueDate,
        poReference: poRef,
        totalDue: totalDue,
        currency: currency,
        extractionStatus: 'READY_FOR_REVIEW',
        validationStatus: 'PASSED',
        duplicateStatus: 'NO_DUPLICATE_FOUND',
        duplicateMatchRecordId: 'N/A',
        duplicateExplanation: 'N/A',
        humanDecision: decision || 'Confirmed & Verified',
        reviewNotes: '',
        reviewedBy: 'Madam Lim',
      });
    }
  }

  return records;
}

export const SAMPLE_INVOICE_REGISTER_CSV = `Invoice Record ID,Supplier Name,Invoice Number,Invoice Date,Due Date,PO Reference,Total Due,Currency,Human Decision
REC-20260710-001,Seng Tat Building Supplies,ST-2026-8812,2026-07-10,2026-08-09,PO-2026-0441,1245.80,SGD,Confirmed & Verified
REC-20260715-002,Gim Soon Hardware Pte Ltd,GS-99042,2026-07-15,2026-08-14,PO-2026-0450,890.00,SGD,Confirmed & Verified
REC-20260718-003,Far East Timber & Plywood,FET-10294,2026-07-18,2026-08-17,PO-2026-0455,3420.50,SGD,Confirmed & Verified
REC-20260720-004,Sin Huat Fasteners,SH-5510,2026-07-20,2026-08-19,PO-2026-0462,450.25,SGD,Confirmed & Verified`;
