import { GoogleGenAI, Type } from "@google/genai";

const key = process.env.GEMINI_API_KEY;

export const ai = new GoogleGenAI({
  apiKey: key!,
});

export const documentExtractionSchema = {
  type: Type.OBJECT,
  properties: {
    vendor_name: {
      type: Type.STRING,
    },
    document_type: {
      type: Type.STRING,
    },
    effective_date: {
      type: Type.STRING,
      description: "Format YYYY-MM-DD. Only extract dates explicitly supported by the document.",
    },
    expiration_date: {
      type: Type.STRING,
      description: "Format YYYY-MM-DD. Do not invent a date if none is stated.",
    },
      auto_renewal: {
type: Type.BOOLEAN,
description: "True only when the contract explicitly provides for automatic renewal or automatic extension. False when no such provision exists, including fixed-term contracts with only a termination notice period. Do not infer automatic renewal from the contract duration, expiration date, or notice period.",
},
    notice_period_days: {
      type: Type.INTEGER,
    },
    financial_value: {
      type: Type.NUMBER,
    },
    compliance_summary: {
      type: Type.STRING,
      description: "Short summary of the document's important compliance and contractual terms.",
    },
    liability_cap_amount: {
      type: Type.NUMBER,
      description: "Numeric monetary liability cap explicitly stated in the contract. Omit if no reliable numeric amount can be determined.",
    },
    liability_cap_currency: {
      type: Type.STRING,
      description: "Currency of the liability cap, such as USD, EUR, or GBP. Omit if unknown.",
    },
    liability_cap_basis: {
      type: Type.STRING,
      description: "Classify the liability provision as fixed_amount, fees_paid, multiple_of_fees, uncapped, unclear, or not_found.",
    },
    liability_cap_clause: {
      type: Type.STRING,
      description: "Relevant limitation-of-liability wording copied or faithfully summarized from the contract. Omit if no relevant clause is found.",
    },
  },
  required: [
    "vendor_name",
    "document_type",
    "auto_renewal",
    "compliance_summary",
  ],
};

export const personalDocumentExtractionSchema = {
  type: Type.OBJECT,
  properties: {
    category: {
      type: Type.STRING,
      enum: [
        'identity',
        'financial',
        'medical',
        'property',
        'insurance',
        'legal',
        'employment',
        'education',
        'vehicle',
        'warranty',
        'other',
      ],
      description:
        'Classify the document based on its contents. Use financial for utility bills, invoices, bank statements, tax documents, and financial records. Use identity for passports and identity cards; medical for medical records and prescriptions; property for leases, deeds, and property records; insurance for insurance policies; legal for legal documents; employment for employment records; education for academic records; vehicle for vehicle registration and records; warranty for product warranties. Use other only when no category fits.',
    },
    document_type: {
      type: Type.STRING,
      description: "The type of document, such as utility bill, passport, invoice, or insurance policy.",
    },
    issuer: {
      type: Type.STRING,
      description: "The organization or authority that issued the document.",
    },
    effective_date: {
      type: Type.STRING,
      description: "Start or effective date in YYYY-MM-DD format, only when explicitly supported.",
    },
    expiration_date: {
      type: Type.STRING,
      description: "Expiration date in YYYY-MM-DD format, only when explicitly supported.",
    },
    payment_due_date: {
      type: Type.STRING,
      description: "The explicit payment due date for a bill, invoice, utility statement, or other document requiring payment. Return YYYY-MM-DD only when the due date is explicitly stated. Do not confuse the billing period end date, statement date, expiration date, or renewal date with the payment due date. Do not infer a due date.",
    },
    renewal_date: {
      type: Type.STRING,
      description: "Explicit renewal date in YYYY-MM-DD format, if present.",
    },
    auto_renewal: {
      type: Type.BOOLEAN,
      description: "True only when the document explicitly establishes automatic renewal. Do not infer it.",
    },
    notice_period_days: {
      type: Type.INTEGER,
      description: "Explicit advance-notice period in days, if stated.",
    },
    amount: {
      type: Type.NUMBER,
      description: "A relevant monetary amount explicitly stated in the document. Do not invent or combine amounts.",
    },
    currency: {
      type: Type.STRING,
      description: "Currency of the extracted amount, such as USD or EUR, only when identifiable.",
    },
    summary: {
      type: Type.STRING,
      description: "A concise summary of the document and important dates or obligations.",
    },
  },
  required: ["category", "document_type", "summary"],
};
