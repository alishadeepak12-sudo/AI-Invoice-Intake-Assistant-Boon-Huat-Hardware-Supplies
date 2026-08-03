import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import { validateInvoiceCalculations } from "./src/utils/calculationValidation";

dotenv.config();

const app = express();
const PORT = 3000;

// Increase payload limits for base64 image/PDF uploads
app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ extended: true, limit: "25mb" }));

// Helper to get Gemini Client lazily
function getGenAIClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is missing. Please configure it in Settings > Secrets.");
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

// JSON Schema definition for Gemini response
const invoiceResponseSchema = {
  type: Type.OBJECT,
  properties: {
    sourceFileName: { type: Type.STRING, description: "Name of the source file processed" },
    supplierName: { type: Type.STRING, description: "Official name of the supplier/vendor issuing the invoice" },
    supplierAddress: { type: Type.STRING, description: "Full address of the supplier" },
    billToCompany: { type: Type.STRING, description: "Entity name billed (typically Boon Huat Hardware & Supplies Pte Ltd or variant)" },
    invoiceNumber: { type: Type.STRING, description: "Invoice reference number" },
    invoiceDate: { type: Type.STRING, description: "Date of invoice in YYYY-MM-DD format" },
    dueDate: { type: Type.STRING, description: "Payment due date in YYYY-MM-DD format" },
    poReference: { type: Type.STRING, description: "Purchase Order reference number. Leave blank if missing or shown as N/A." },
    currency: { type: Type.STRING, description: "Currency code (e.g. SGD, USD, MYR). Defaults to SGD if explicitly stated or Singapore dollars." },
    totalDue: { type: Type.NUMBER, description: "Total amount due as a numeric value without commas or currency symbols" },
    paymentTerms: { type: Type.STRING, description: "Payment terms e.g. 30 Days, COD, Immediate" },
    lineItems: {
      type: Type.ARRAY,
      description: "List of all itemised goods or services on the invoice",
      items: {
        type: Type.OBJECT,
        properties: {
          description: { type: Type.STRING, description: "Item description or product name" },
          poReference: { type: Type.STRING, description: "Line-item purchase order reference if available, else blank" },
          quantity: { type: Type.NUMBER, description: "Quantity purchased" },
          unitPrice: { type: Type.NUMBER, description: "Unit price per item" },
          lineAmount: { type: Type.NUMBER, description: "Total amount for this line item" }
        },
        required: ["description", "poReference", "quantity", "unitPrice", "lineAmount"]
      }
    },
    extractionStatus: {
      type: Type.STRING,
      description: "Must be exactly READY_FOR_REVIEW, MANUAL_REVIEW_REQUIRED, or UNABLE_TO_PROCESS"
    },
    reviewReasons: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "Plain language explanations for missing or unclear fields, or reasons why manual review is required."
    }
  },
  required: [
    "sourceFileName",
    "supplierName",
    "supplierAddress",
    "billToCompany",
    "invoiceNumber",
    "invoiceDate",
    "dueDate",
    "poReference",
    "currency",
    "totalDue",
    "paymentTerms",
    "lineItems",
    "extractionStatus",
    "reviewReasons"
  ]
};

// API Route for Invoice Extraction
app.post("/api/extract-invoice", async (req, res) => {
  try {
    const { fileData, mimeType, fileName } = req.body;

    if (!fileData || !mimeType || !fileName) {
      return res.status(400).json({
        success: false,
        error: "Missing file data, mime type, or file name.",
        details: "Please select a valid document (PDF, PNG, JPG, or JPEG) to upload."
      });
    }

    // Supported formats check
    const supportedMimeTypes = ["application/pdf", "image/png", "image/jpeg", "image/jpg", "image/webp"];
    if (!supportedMimeTypes.includes(mimeType.toLowerCase())) {
      return res.status(400).json({
        success: false,
        error: "Unsupported file format.",
        details: `The uploaded format (${mimeType}) is not supported. Please upload a PDF, PNG, JPG, or JPEG file.`
      });
    }

    // Clean base64 string safely by stripping any data URI prefix and whitespace
    let cleanBase64 = typeof fileData === "string" ? fileData : "";
    if (cleanBase64.includes(",")) {
      cleanBase64 = cleanBase64.split(",")[1];
    }
    cleanBase64 = cleanBase64.replace(/\s/g, "");

    const ai = getGenAIClient();

    const systemInstruction = `You are an expert accounts payable extraction assistant for Boon Huat Hardware & Supplies Pte Ltd.
Your job is to read supplier invoices (which may be digital PDFs, scanned documents, images, or handwritten invoices) and extract key information into a single standardized JSON format for Madam Lim (Accounts Executive) to review.

STRICT RULES:
1. Extract all invoice-level fields and line item details accurately.
2. Format dates strictly as YYYY-MM-DD. If year is ambiguous, assume current year context (e.g. 2026).
3. Display currency as 'SGD' where the invoice clearly states SGD or Singapore Dollars.
4. Store monetary values as raw numbers (e.g., 1250.50), without currency symbols, commas, or letters.
5. Keep EVERY line item listed in the invoice.
6. Do NOT invent, hallucinate, or guess missing information.
7. If information is missing or unreadable, use a blank string "" or 0 for numeric fields.
8. If a Purchase Order (PO) reference is missing or shown as "N/A", leave the PO reference blank ("") AND flag it in reviewReasons (e.g., "Manual review required because the PO reference is missing.").
9. STATUS SELECTION CRITERIA:
   - 'READY_FOR_REVIEW': All essential invoice details (Supplier Name, Invoice Number, Invoice Date, Total Due, Line Items) were clearly identified without ambiguity or missing mandatory fields.
   - 'MANUAL_REVIEW_REQUIRED': Information is missing, unclear, unreadable, handwritten/smudged, PO reference is missing/N/A, or total amount requires verification.
   - 'UNABLE_TO_PROCESS': The document cannot be read, is corrupt, or is NOT a supplier invoice (e.g., photo of hardware parts, statement of account, delivery order without prices, random document).
10. CALCULATION CHECKS:
    - Verify quantity * unitPrice for each line item (tolerance 0.01).
    - Verify sum of line amounts equals totalDue (tolerance 0.01).
    - If calculations agree, note "Basic invoice calculations agree." in reviewReasons.
    - If there is a calculation discrepancy, set status to MANUAL_REVIEW_REQUIRED and explain the exact difference in plain language (e.g. "The invoice states a line amount of SGD 675.00, but 31 × SGD 22.50 equals SGD 697.50. Madam Lim must verify the quantity, unit price and line amount."). Do not alter the extracted numbers.
11. REVIEW REASONS: Provide short, plain-language explanations for missing or unclear fields or calculation discrepancies.
    Examples:
    - "Manual review required because the PO reference is missing."
    - "The invoice number is unclear in the uploaded document."
    - "The invoice states a line amount of SGD 675.00, but 31 × SGD 22.50 equals SGD 697.50. Madam Lim must verify the quantity, unit price and line amount."
    - "Basic invoice calculations agree."
    DO NOT use technical AI language, confidence scores, or complex jargon.
12. Preserved exact sourceFileName parameter: "${fileName}".`;

    const promptText = `Process this uploaded document for Boon Huat Hardware & Supplies Pte Ltd.
File name: ${fileName}

Extract all invoice fields and line items according to the standardized schema. Check for missing or unclear fields and populate the status and plain-language review reasons.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: [
        {
          inlineData: {
            mimeType: mimeType,
            data: cleanBase64,
          },
        },
        {
          text: promptText,
        },
      ],
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: invoiceResponseSchema,
        temperature: 0.1,
      },
    });

    const responseText = response.text;
    if (!responseText || !responseText.trim()) {
      return res.status(500).json({
        success: false,
        error: "Empty model response.",
        details: "The AI service returned an empty response while reading the document. Please re-upload or try again."
      });
    }

    let parsedData;
    try {
      parsedData = JSON.parse(responseText.trim());
    } catch (jsonErr) {
      console.error("Failed to parse Gemini JSON response:", responseText);
      return res.status(500).json({
        success: false,
        error: "Invalid JSON response generated by document reader.",
        details: "The system could not parse the extracted invoice data. Please try re-extracting."
      });
    }

    // Ensure sourceFileName is populated
    if (!parsedData.sourceFileName) {
      parsedData.sourceFileName = fileName;
    }

    // Post-validation & sanity checks
    if (!parsedData.reviewReasons) {
      parsedData.reviewReasons = [];
    }

    // Ensure line items are an array
    if (!Array.isArray(parsedData.lineItems)) {
      parsedData.lineItems = [];
    }

    // Enforce PO check rule server-side as extra guard
    if ((!parsedData.poReference || parsedData.poReference.trim() === "" || parsedData.poReference.toUpperCase() === "N/A")) {
      parsedData.poReference = "";
      const poMsg = "Manual review required because the PO reference is missing or listed as N/A.";
      if (!parsedData.reviewReasons.some((r: string) => r.includes("PO reference"))) {
        parsedData.reviewReasons.push(poMsg);
      }
      if (parsedData.extractionStatus === "READY_FOR_REVIEW") {
        parsedData.extractionStatus = "MANUAL_REVIEW_REQUIRED";
      }
    }

    const finalValidatedData = validateInvoiceCalculations(parsedData);

    return res.json({
      success: true,
      data: finalValidatedData,
    });

  } catch (err: any) {
    console.error("Error extracting invoice:", err);
    return res.status(500).json({
      success: false,
      error: err.message || "Failed to process invoice document.",
      details: "An unexpected server error occurred during document extraction. Please verify your file and try again."
    });
  }
});

// API Route for Testing Database Connection (Row 1 Headings Check)
app.post("/api/test-db-connection", async (req, res) => {
  try {
    const { accessToken } = req.body;
    if (!accessToken) {
      return res.status(401).json({
        success: false,
        error: "Google Sheets is not connected. Please click 'Connect Google Sheets' first to authorise access.",
      });
    }

    const spreadsheetId = "1HKLQsB0rSDqE_b-tUqwu2koMtR2dAQHxMctz5ut7q8U";

    // 1. Fetch metadata to verify spreadsheet and worksheets exist
    const metaUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?includeGridData=false`;
    const metaRes = await fetch(metaUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!metaRes.ok) {
      const errText = await metaRes.text();
      let detail = "Could not access Boon Huat AP Database spreadsheet.";
      if (metaRes.status === 401 || metaRes.status === 403) {
        detail = "Insufficient permissions or expired Google authentication token. Please reconnect Google Sheets.";
      } else if (metaRes.status === 404) {
        detail = `Spreadsheet ID ${spreadsheetId} was not found on Google Sheets.`;
      }
      return res.status(metaRes.status).json({
        success: false,
        error: detail,
      });
    }

    const metaData = await metaRes.json();
    const sheetTitles: string[] = (metaData.sheets || []).map(
      (s: any) => s.properties?.title || ""
    );

    const hasRegister = sheetTitles.includes("Invoice Register");
    const hasLineItems = sheetTitles.includes("Invoice Line Items");

    if (!hasRegister || !hasLineItems) {
      const missing = [];
      if (!hasRegister) missing.push("'Invoice Register'");
      if (!hasLineItems) missing.push("'Invoice Line Items'");
      return res.status(400).json({
        success: false,
        error: `Database worksheets missing in Google Sheet: ${missing.join(" and ")} not found. Available worksheets: ${sheetTitles.join(", ")}`,
      });
    }

    // 2. Read Row 1 headings only (Invoice Register!1:1 and Invoice Line Items!1:1)
    const registerHeaderUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent("Invoice Register!1:1")}`;
    const lineItemsHeaderUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent("Invoice Line Items!1:1")}`;

    const [regRes, lineRes] = await Promise.all([
      fetch(registerHeaderUrl, { headers: { Authorization: `Bearer ${accessToken}` } }),
      fetch(lineItemsHeaderUrl, { headers: { Authorization: `Bearer ${accessToken}` } }),
    ]);

    if (!regRes.ok) {
      return res.status(regRes.status).json({
        success: false,
        error: "Could not read headings from 'Invoice Register' worksheet.",
      });
    }

    if (!lineRes.ok) {
      return res.status(lineRes.status).json({
        success: false,
        error: "Could not read headings from 'Invoice Line Items' worksheet.",
      });
    }

    const regData = await regRes.json();
    const lineData = await lineRes.json();

    const regHeaders = regData.values?.[0] || [];
    const lineHeaders = lineData.values?.[0] || [];

    return res.json({
      success: true,
      message: "Database connected successfully. Invoice Register and Invoice Line Items are accessible.",
      details: {
        invoiceRegisterHeaders: regHeaders,
        invoiceLineItemsHeaders: lineHeaders,
      },
    });
  } catch (err: any) {
    console.error("Test DB Connection Error:", err);
    return res.status(500).json({
      success: false,
      error: err.message || "Failed to test database connection to Google Sheets.",
    });
  }
});

async function startServer() {
  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
