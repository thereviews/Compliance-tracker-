'use client';

import { useEffect, useState } from 'react';
import { ExternalLink, RefreshCw, X } from 'lucide-react';
import { toast } from 'sonner';
import { supabase, getAuthHeaders } from '@/lib/supabase-client';

type Vendor = {
  id: string;
  name: string;
};

type Evidence = {
  id: string;
  workspace_id: string;
  vendor_id: string;
  document_id: string;
  evidence_type: string;
  framework: string | null;
  issue_date: string | null;
  expiration_date: string | null;
  verification_status: string;
  notes: string | null;
  compliance_documents: {
    id: string;
    file_path: string;
  } | null;
};

type Props = {
  evidenceRecord: Evidence | null;
  workspaceId: string;
  onClose: () => void;
  onSuccess: () => void | Promise<void>;
};

export function EditComplianceEvidenceModal({
  evidenceRecord,
  workspaceId,
  onClose,
  onSuccess,
}: Props) {
  const [saving, setSaving] = useState(false);
  const [openingPdf, setOpeningPdf] = useState(false);
  const [evidence, setEvidence] = useState<Evidence | null>(null);
  const [vendors, setVendors] = useState<Vendor[]>([]);

  const [vendorId, setVendorId] = useState('');
  const [evidenceType, setEvidenceType] = useState('certificate');
  const [framework, setFramework] = useState('');
  const [issueDate, setIssueDate] = useState('');
  const [expirationDate, setExpirationDate] = useState('');
  const [verificationStatus, setVerificationStatus] = useState('unverified');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!evidenceRecord) {
      setEvidence(null);
      return;
    }

    setEvidence(evidenceRecord);
    setVendorId(evidenceRecord.vendor_id);
    setEvidenceType(evidenceRecord.evidence_type);
    setFramework(evidenceRecord.framework || '');
    setIssueDate(evidenceRecord.issue_date || '');
    setExpirationDate(evidenceRecord.expiration_date || '');
    setVerificationStatus(evidenceRecord.verification_status);
    setNotes(evidenceRecord.notes || '');
  }, [evidenceRecord]);

  useEffect(() => {
    if (!evidenceRecord || !workspaceId) return;

    let active = true;

    const loadVendors = async () => {
      const { data, error } = await supabase
        .from('vendors')
        .select('id, name')
        .eq('workspace_id', workspaceId)
        .order('name');

      if (!active) return;

      if (error) {
        toast.error('Could not load vendor options.');
        return;
      }

      setVendors(data || []);
    };

    void loadVendors();

    return () => {
      active = false;
    };
  }, [evidenceRecord, workspaceId]);

  const openPdf = async () => {
    const path = evidence?.compliance_documents?.file_path;

    if (!path) {
      toast.error('The PDF storage path is missing.');
      return;
    }

    setOpeningPdf(true);

    try {
      const { data, error } = await supabase.storage
        .from('compliance-files')
        .createSignedUrl(path, 60);

      if (error || !data?.signedUrl) {
        throw new Error(error?.message || 'Could not open the PDF.');
      }

      window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Could not open the PDF.'
      );
    } finally {
      setOpeningPdf(false);
    }
  };

  const saveChanges = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!evidence || !workspaceId) return;

    if (!vendorId) {
      toast.error('Please select a vendor.');
      return;
    }

    if (issueDate && expirationDate && expirationDate < issueDate) {
      toast.error('Expiration date cannot be before issue date.');
      return;
    }

    setSaving(true);

    try {
      const headers = await getAuthHeaders();
      const response = await fetch('/api/compliance-evidence', {
        method: 'PATCH',
        headers: {
          ...headers,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          evidenceId: evidence.id,
          workspaceId,
          vendorId,
          evidenceType,
          framework,
          issueDate,
          expirationDate,
          verificationStatus,
          notes,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Could not update evidence.');
      }

      toast.success('Compliance evidence updated.');
      await onSuccess();
      onClose();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Could not update compliance evidence.'
      );
    } finally {
      setSaving(false);
    }
  };

  if (!evidenceRecord || !evidence) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/70 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-evidence-title"
        className="my-8 w-full max-w-2xl rounded-2xl border border-zinc-800 bg-zinc-900 shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-4">
          <div>
            <h2 id="edit-evidence-title" className="font-semibold text-zinc-100">
              Edit Compliance Evidence
            </h2>
            <p className="mt-1 text-xs text-zinc-500">
              Update the evidence details without uploading the PDF again.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            aria-label="Close editor"
            className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={saveChanges} className="max-h-[75vh] space-y-5 overflow-y-auto p-5">
            <div>
              <label className="mb-2 block text-xs font-medium text-zinc-400">
                Vendor
              </label>
              <select
                required
                value={vendorId}
                onChange={(event) => setVendorId(event.target.value)}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-sm text-zinc-200"
              >
                <option value="">Select a vendor...</option>
                {vendors.map((vendor) => (
                  <option key={vendor.id} value={vendor.id}>
                    {vendor.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-xs font-medium text-zinc-400">
                Evidence Type
              </label>
              <select
                required
                value={evidenceType}
                onChange={(event) => setEvidenceType(event.target.value)}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-sm text-zinc-200"
              >
                <option value="certificate">Certificate</option>
                <option value="audit_report">Audit Report</option>
                <option value="questionnaire">Questionnaire</option>
                <option value="security_policy">Security Policy</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-xs font-medium text-zinc-400">
                Compliance Framework
              </label>
              <select
                value={framework}
                onChange={(event) => setFramework(event.target.value)}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-sm text-zinc-200"
              >
                <option value="">Not specified</option>
                <option value="SOC 2">SOC 2</option>
                <option value="ISO 27001">ISO 27001</option>
                <option value="GDPR">GDPR</option>
                <option value="HIPAA">HIPAA</option>
                <option value="PCI DSS">PCI DSS</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-xs font-medium text-zinc-400">
                  Issue Date
                </label>
                <input
                  type="date"
                  value={issueDate}
                  onChange={(event) => setIssueDate(event.target.value)}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-200"
                />
              </div>
              <div>
                <label className="mb-2 block text-xs font-medium text-zinc-400">
                  Expiration Date
                </label>
                <input
                  type="date"
                  value={expirationDate}
                  min={issueDate || undefined}
                  onChange={(event) => setExpirationDate(event.target.value)}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-200"
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-xs font-medium text-zinc-400">
                Verification Status
              </label>
              <select
                required
                value={verificationStatus}
                onChange={(event) => setVerificationStatus(event.target.value)}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-sm text-zinc-200"
              >
                <option value="unverified">Unverified</option>
                <option value="self_reported">Self-reported</option>
                <option value="under_review">Under review</option>
                <option value="verified">Verified</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-xs font-medium text-zinc-400">
                Notes
              </label>
              <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                maxLength={10000}
                rows={3}
                placeholder="Add certification details or review notes..."
                className="w-full resize-y rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-sm text-zinc-200"
              />
            </div>

            <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                Existing PDF
              </p>
              <p className="mt-1 truncate text-sm text-zinc-300">
                {evidence.compliance_documents?.file_path
                  ? evidence.compliance_documents.file_path.split('/').pop()
                  : 'No PDF file is linked to this record.'}
              </p>
              {evidence.compliance_documents?.file_path && (
                <button
                  type="button"
                  onClick={() => void openPdf()}
                  disabled={openingPdf}
                  className="mt-3 inline-flex items-center gap-2 rounded-lg border border-zinc-700 px-3 py-2 text-xs text-zinc-200 hover:border-emerald-500 hover:text-emerald-400 disabled:opacity-50"
                >
                  {openingPdf ? (
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <ExternalLink className="h-3.5 w-3.5" />
                  )}
                  View current PDF
                </button>
              )}
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-zinc-800 pt-4 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                className="rounded-xl border border-zinc-700 px-4 py-2.5 text-sm text-zinc-300 hover:bg-zinc-800 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving || !vendorId}
                className="rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-emerald-400 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
        </form>
      </div>
    </div>
  );
}
