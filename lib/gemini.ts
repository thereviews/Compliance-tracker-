import { GoogleGenAI, Type } from "@google/genai";

export const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY!,
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
