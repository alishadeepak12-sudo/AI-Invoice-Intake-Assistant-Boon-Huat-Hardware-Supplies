import { ExtractedInvoice, FieldStatus, FieldValidationMap, LineItemFieldValidation } from '../types';

/**
 * Evaluates field status for required invoice fields:
 * - CLEAR: Present, valid value
 * - MISSING: Blank, N/A, NA, not provided, not available, empty, undefined, null
 * - UNCLEAR: Explicitly flagged as unclear, smudged, or unreadable
 */
export function evaluateFieldStatus(val: string | number | null | undefined, isNumeric = false): FieldStatus {
  if (val === undefined || val === null) return 'MISSING';

  if (typeof val === 'number') {
    if (isNaN(val)) return 'MISSING';
    if (isNumeric && val <= 0) return 'MISSING';
    return 'CLEAR';
  }

  const str = String(val).trim();
  if (!str) return 'MISSING';

  const lower = str.toLowerCase();
  const missingValues = ['n/a', 'na', 'not provided', 'not available', 'none', 'null', 'undefined', 'blank', '-'];
  if (missingValues.includes(lower)) return 'MISSING';

  if (
    lower.includes('unclear') ||
    lower.includes('smudged') ||
    lower.includes('unreadable') ||
    lower.includes('???') ||
    lower.includes('partially missing')
  ) {
    return 'UNCLEAR';
  }

  return 'CLEAR';
}

/**
 * Validates basic invoice required fields and calculations:
 * 1. Required invoice-level fields: supplier name, invoice number, invoice date, due date, PO reference, total due, currency.
 * 2. Required line-item fields: description, quantity, unit price, line amount.
 * 3. Arithmetic validation: qty * unit price vs line amount (tolerance 0.01), sum of line amounts vs total due (tolerance 0.01).
 *
 * Sets status to MANUAL_REVIEW_REQUIRED if any field is MISSING/UNCLEAR or arithmetic disagrees.
 * Displays "Basic invoice calculations agree." when calculations agree.
 */
export function validateInvoiceCalculations(invoice: ExtractedInvoice): ExtractedInvoice {
  const currency = invoice.currency && evaluateFieldStatus(invoice.currency) === 'CLEAR' ? invoice.currency : 'SGD';
  const existingReasons = invoice.reviewReasons || [];

  // 1. Evaluate Required Invoice-Level Fields
  const supplierNameStatus = evaluateFieldStatus(invoice.supplierName);
  const invoiceNumberStatus = evaluateFieldStatus(invoice.invoiceNumber);
  const invoiceDateStatus = evaluateFieldStatus(invoice.invoiceDate);
  const dueDateStatus = evaluateFieldStatus(invoice.dueDate);
  const poReferenceStatus = evaluateFieldStatus(invoice.poReference);
  const totalDueStatus = evaluateFieldStatus(invoice.totalDue, true);
  const currencyStatus = evaluateFieldStatus(invoice.currency);

  const fieldReasons: string[] = [];

  if (supplierNameStatus === 'MISSING') fieldReasons.push('The supplier name is missing.');
  else if (supplierNameStatus === 'UNCLEAR') fieldReasons.push('The supplier name could not be read clearly.');

  if (invoiceNumberStatus === 'MISSING') fieldReasons.push('The invoice number is missing.');
  else if (invoiceNumberStatus === 'UNCLEAR') fieldReasons.push('The invoice number could not be read clearly.');

  if (invoiceDateStatus === 'MISSING') fieldReasons.push('The invoice date is missing.');
  else if (invoiceDateStatus === 'UNCLEAR') fieldReasons.push('The invoice date could not be read clearly.');

  if (dueDateStatus === 'MISSING') fieldReasons.push('The due date is missing.');
  else if (dueDateStatus === 'UNCLEAR') fieldReasons.push('The due date could not be read clearly.');

  if (poReferenceStatus === 'MISSING') fieldReasons.push('The PO reference is missing.');
  else if (poReferenceStatus === 'UNCLEAR') fieldReasons.push('The PO reference could not be read clearly.');

  if (totalDueStatus === 'MISSING') fieldReasons.push('The total due is missing.');
  else if (totalDueStatus === 'UNCLEAR') fieldReasons.push('The total due could not be read clearly.');

  if (currencyStatus === 'MISSING') fieldReasons.push('The currency is missing.');
  else if (currencyStatus === 'UNCLEAR') fieldReasons.push('The currency could not be read clearly.');

  // 2. Evaluate Required Line-Item Fields & Arithmetic
  const lineItemsValidation: LineItemFieldValidation[] = [];
  const calcDiscrepancies: string[] = [];
  let calcAgrees = true;

  if (invoice.lineItems && invoice.lineItems.length > 0) {
    invoice.lineItems.forEach((item, idx) => {
      const itemNum = idx + 1;

      const descStatus = evaluateFieldStatus(item.description);
      const qtyStatus = evaluateFieldStatus(item.quantity, true);
      const unitPriceStatus = evaluateFieldStatus(item.unitPrice, true);
      const lineAmountStatus = evaluateFieldStatus(item.lineAmount, true);

      lineItemsValidation.push({
        description: descStatus,
        quantity: qtyStatus,
        unitPrice: unitPriceStatus,
        lineAmount: lineAmountStatus,
      });

      if (descStatus === 'MISSING') fieldReasons.push(`Line item ${itemNum} description is missing.`);
      else if (descStatus === 'UNCLEAR') fieldReasons.push(`Line item ${itemNum} description could not be read clearly.`);

      if (qtyStatus === 'MISSING') fieldReasons.push(`Line item ${itemNum} quantity is missing.`);
      else if (qtyStatus === 'UNCLEAR') fieldReasons.push(`Line item ${itemNum} quantity could not be read clearly.`);

      if (unitPriceStatus === 'MISSING') fieldReasons.push(`Line item ${itemNum} unit price is missing.`);
      else if (unitPriceStatus === 'UNCLEAR') fieldReasons.push(`Line item ${itemNum} unit price could not be read clearly.`);

      if (lineAmountStatus === 'MISSING') fieldReasons.push(`Line item ${itemNum} line amount is missing.`);
      else if (lineAmountStatus === 'UNCLEAR') fieldReasons.push(`Line item ${itemNum} line amount could not be read clearly.`);

      // Line item calculation check: quantity * unit price vs stated line amount
      const qty = Number(item.quantity) || 0;
      const unitPrice = Number(item.unitPrice) || 0;
      const statedLineAmount = Number(item.lineAmount) || 0;
      const calculatedLineAmount = Math.round(qty * unitPrice * 100) / 100;

      if (Math.abs(calculatedLineAmount - statedLineAmount) > 0.01) {
        calcAgrees = false;
        const msg = `The invoice states a line amount of ${currency} ${statedLineAmount.toFixed(
          2
        )}, but ${qty} × ${currency} ${unitPrice.toFixed(2)} equals ${currency} ${calculatedLineAmount.toFixed(
          2
        )}. Madam Lim must verify the quantity, unit price and line amount.`;
        calcDiscrepancies.push(msg);
      }
    });

    // Invoice total check: sum of line item amounts vs totalDue
    const lineTotalSum = invoice.lineItems.reduce(
      (sum, item) => sum + (Number(item.lineAmount) || 0),
      0
    );
    const roundedLineTotalSum = Math.round(lineTotalSum * 100) / 100;
    const statedTotalDue = Number(invoice.totalDue) || 0;

    if (Math.abs(roundedLineTotalSum - statedTotalDue) > 0.01) {
      calcAgrees = false;
      const msg = `The invoice states a total due of ${currency} ${statedTotalDue.toFixed(
        2
      )}, but the sum of line item amounts equals ${currency} ${roundedLineTotalSum.toFixed(
        2
      )}. Madam Lim must verify the total due and line amounts.`;
      calcDiscrepancies.push(msg);
    }
  } else {
    fieldReasons.push('No line items were found on the invoice.');
  }

  // Preserve custom external reasons (e.g., foreign currency, handwritten notes, unable to process)
  const nonValidationReasons = existingReasons.filter(
    (reason) =>
      !reason.includes('missing') &&
      !reason.includes('could not be read clearly') &&
      !reason.includes('Basic invoice calculations agree') &&
      !reason.includes('equals') &&
      !reason.includes('verify the quantity, unit price') &&
      !reason.includes('verify the total due') &&
      !reason.includes('line amount of')
  );

  const updatedReasons: string[] = [...nonValidationReasons, ...fieldReasons, ...calcDiscrepancies];

  if (calcAgrees && invoice.lineItems && invoice.lineItems.length > 0) {
    updatedReasons.push('Basic invoice calculations agree.');
  }

  // Deduplicate review reasons
  const uniqueReasons = Array.from(new Set(updatedReasons));

  // Determine Overall Status
  let finalStatus = invoice.extractionStatus;
  if (invoice.extractionStatus !== 'UNABLE_TO_PROCESS') {
    const hasFieldIssues = fieldReasons.length > 0;
    const hasCalcIssues = !calcAgrees;

    if (hasFieldIssues || hasCalcIssues) {
      finalStatus = 'MANUAL_REVIEW_REQUIRED';
    } else {
      finalStatus = 'READY_FOR_REVIEW';
    }
  }

  const fieldValidationMap: FieldValidationMap = {
    supplierName: supplierNameStatus,
    invoiceNumber: invoiceNumberStatus,
    invoiceDate: invoiceDateStatus,
    dueDate: dueDateStatus,
    poReference: poReferenceStatus,
    totalDue: totalDueStatus,
    currency: currencyStatus,
    lineItems: lineItemsValidation,
  };

  return {
    ...invoice,
    extractionStatus: finalStatus,
    reviewReasons: uniqueReasons,
    fieldValidation: fieldValidationMap,
  };
}
