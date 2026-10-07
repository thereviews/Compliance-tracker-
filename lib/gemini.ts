import { GoogleGenAI, Type } from "@google/genai";

const key = process.env.GEMINI_API_KEY;

console.log("GEMINI KEY CHECK:", {
  exists: !!key,
  startsWithAQ: key?.startsWith("AQ."),
  length: key?.length,
});

export const ai = new GoogleGenAI({
  apiKey: key!,
});

export const documentExtractionSchema = {
  type: Type.OBJECT,
  properties: {
    vendor_name: { type: Type.STRING },
    document_type: { type: Type.STRING },
    effective_date: {
      type: Type.STRING,
      description: "Format YYYY-MM-DD"
    },
    expiration_date: {
      type: Type.STRING,
      description: "Format YYYY-MM-DD"
    },
    auto_renewal: { type: Type.BOOLEAN },
    notice_period_days: { type: Type.INTEGER },
    financial_value: { type: Type.NUMBER },
    compliance_summary: {
      type: Type.STRING,
      description: "Short text summary"
    }
  },
  required: [
    "vendor_name",
    "document_type",
    "auto_renewal",
    "compliance_summary"
  ]
};
