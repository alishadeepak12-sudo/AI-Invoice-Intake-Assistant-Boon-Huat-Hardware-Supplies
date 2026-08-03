export type ExtractionStatus = 'READY_FOR_REVIEW' | 'MANUAL_REVIEW_REQUIRED' | 'UNABLE_TO_PROCESS';
export type FieldStatus = 'CLEAR' | 'MISSING' | 'UNCLEAR';
export type DuplicateStatus = 'DATABASE_NOT_LOADED' | 'NO_DUPLICATE_FOUND' | 'POSSIBLE_DUPLICATE' | 'EXACT_DUPLICATE' | 'CHECK_ERROR';
export type HumanDecision = 'HOLD' | 'CONFIRM_DUPLICATE' | 'NOT_DUPLICATE' | 'NONE';

export interface ExistingRegisterRecord {
  invoiceRecordId: string;
  processingTimestamp: string;
  sourceFileName: string;
  supplierName: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  poReference: string;
  totalDue: number;
  currency: string;
  extractionStatus: string;
  validationStatus: string;
  duplicateStatus: string;
  duplicateMatchRecordId: string;
  duplicateExplanation: string;
  humanDecision: string;
  reviewNotes: string;
  reviewedBy: string;
}

export interface DuplicateCheckResult {
  status: DuplicateStatus;
  explanation: string;
  matchedRecord?: ExistingRegisterRecord;
  matchedDetails?: string[];
  matchedRecordId?: string;
}

export interface LineItemFieldValidation {
  description: FieldStatus;
  quantity: FieldStatus;
  unitPrice: FieldStatus;
  lineAmount: FieldStatus;
}

export interface FieldValidationMap {
  supplierName: FieldStatus;
  invoiceNumber: FieldStatus;
  invoiceDate: FieldStatus;
  dueDate: FieldStatus;
  poReference: FieldStatus;
  totalDue: FieldStatus;
  currency: FieldStatus;
  lineItems: LineItemFieldValidation[];
}

export interface LineItem {
  id: string;
  description: string;
  poReference: string;
  quantity: number;
  unitPrice: number;
  lineAmount: number;
}

export interface ExtractedInvoice {
  sourceFileName: string;
  supplierName: string;
  supplierAddress: string;
  billToCompany: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  poReference: string;
  currency: string;
  totalDue: number;
  paymentTerms: string;
  lineItems: LineItem[];
  extractionStatus: ExtractionStatus;
  reviewReasons: string[];
  fieldValidation?: FieldValidationMap;
}

export interface ExtractionResponse {
  success: boolean;
  data?: Omit<ExtractedInvoice, 'lineItems'> & {
    lineItems: Omit<LineItem, 'id'>[];
  };
  error?: string;
  details?: string;
}

