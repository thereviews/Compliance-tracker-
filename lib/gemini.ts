import { GoogleGenAI, Type } from "@google/genai";

export const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

export const complianceExtractionSchema = {
  type: Type.OBJECT,
  properties: {
    title: {
      type: Type.STRING,
      description: "Extracted name or title of the document"
    },
    document_type: {
      type: Type.STRING,
      description: "Category such as Policy, Audit Report, Technical Control, Certificate, or Vendor Questionnaire"
    },
    compliance_summary: {
      type: Type.STRING,
      description: "Accurate summary of the document's contents and findings"
    },
    proposed_requirements: {
      type: Type.ARRAY,
      description: "Individual compliance obligations or controls for human review. Do not turn a supplier's claims about its own controls into obligations for the user's organization. Return an empty array when no applicable obligations can be established.",
      items: {
        type: Type.OBJECT,
        properties: {
          title: {
            type: Type.STRING,
            description: "Short, specific requirement or control title"
          },
          description: {
            type: Type.STRING,
            description: "What the organization would need to do or demonstrate"
          },
          obligation_source: {
            type: Type.STRING,
            description: "Framework, regulation, contract, questionnaire, or document source"
          },
          priority: {
            type: Type.STRING,
            description: "Suggest a priority using Critical, High, Medium, or Low. Infer it from the potential impact, severity, legal or regulatory consequences, and risk of non-compliance. Explain the reasoning in the reason field. This is an AI suggestion, not a priority explicitly assigned by the document."
          },
          deadline: {
            type: Type.STRING,
            description: "Extract an explicitly stated deadline for this requirement, preferably YYYY-MM-DD. If absent, return exactly: Not found in document. Do not confuse report dates or certificate expiry dates with requirement deadlines."
          },
          status: {
            type: Type.STRING,
            description: "Extract a status explicitly stated for this requirement. Preserve its meaning. If absent, return exactly: Not found in document."
          },
          responsible_person: {
            type: Type.STRING,
            description: "Extract the explicitly named person responsible for this requirement. Do not infer a person from a job title, author, or signature. If absent, return exactly: Not found in document."
          },
          applies_to: {
            type: Type.STRING,
            description: "Who the statement applies to: our_organization, supplier, shared, or unclear"
          },
          source_excerpt: {
            type: Type.STRING,
            description: "Short supporting passage or faithful reference from the uploaded document"
          },
          reason: {
            type: Type.STRING,
            description: "Why this is a proposed obligation or control, and any uncertainty"
          }
        },
        required: [
          "title",
          "description",
          "obligation_source",
          "priority",
          "deadline",
          "status",
          "responsible_person",
          "applies_to",
          "source_excerpt",
          "reason"
        ]
      }
    }
  },
  required: [
    "title",
    "document_type",
    "compliance_summary",
    "proposed_requirements"
  ]
};
