'tsx'
'use client';

import { useState, useEffect } from 'react';
import { X, History, Upload, ExternalLink, RefreshCw } from 'lucide-react';
import { getAuthHeaders } from '@/lib/supabase-client';
import { toast } from 'sonner';

interface ContractVersion {
  id: string;
  version_number: number;
  change_summary: string | null;
  created_at: string;
  created_by: string | null;
  download_url: string | null;
  is_current: boolean;
}

interface EditModalProps {
  document: any;
  workspaceId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  workspaceMembers?: {
    userId: string;
    email: string | null;
    role: string;
    workspaceId: string;
  }[];
  canAssign?: boolean;
}

export function EditDocumentModal({
  document,
  workspaceId,
  isOpen,
  onClose,
  onSuccess,
  workspaceMembers = [],
  canAssign = false,
}: EditModalProps) {
  const [form, setForm] = useState({
parent_document_id: '',
assigned_to: '',
status: 'Active',
document_type: '',
effective_date: '',
expiration_date: '',
auto_renewal: false,
notice_period_days: '',
financial_value: '',
compliance_summary: '',
liability_cap_amount: '',
liability_cap_currency: '',
liability_cap_basis: 'not_found',
liability_cap_clause: '',
});
const [parentContracts, setParentContracts] = useState<any[]>([]);
const [parentContractsLoading, setParentContractsLoading] = useState(false);

const [versions, setVersions] = useState<ContractVersion[]>([]);
const [versionsLoading, setVersionsLoading] = useState(false);
const [versionFile, setVersionFile] = useState<File | null>(null);
const [changeSummary, setChangeSummary] = useState('');
const [uploadingVersion, setUploadingVersion] = useState(false);

async function loadVersions() {
  if (!document?.id) return;

  setVersionsLoading(true);
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(
      `/api/documents/${document.id}/versions`,
      { headers }
    );
    const json = await res.json();

    if (!res.ok) {
      throw new Error(json.error || 'Failed to load version history');
    }

    setVersions(Array.isArray(json.versions) ? json.versions : []);
  } catch (error: any) {
    toast.error(error.message || 'Failed to load version history');
  } finally {
    setVersionsLoading(false);
  }
}

useEffect(() => {
  if (isOpen && document?.id) {
    void loadVersions();
  }
}, [isOpen, document?.id]);

useEffect(() => {
  if (!isOpen || !workspaceId) {
    setParentContracts([]);
    return;
  }

  let cancelled = false;

  async function loadParentContracts() {
    setParentContractsLoading(true);

    try {
      const headers = await getAuthHeaders();
      const res = await fetch(
        `/api/documents?workspaceId=${encodeURIComponent(workspaceId)}`,
        { headers }
      );
      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || 'Failed to load parent contracts');
      }

      if (!cancelled) {
        const documents = Array.isArray(json.documents)
          ? json.documents
          : [];

        setParentContracts(
          documents.filter(
            (item: any) =>
              item.id !== document?.id &&
              item.workspace_id === workspaceId
          )
        );
      }
    } catch (error: any) {
      if (!cancelled) {
        setParentContracts([]);
        toast.error(error.message || 'Failed to load parent contracts');
      }
    } finally {
      if (!cancelled) {
        setParentContractsLoading(false);
      }
    }
  }

  void loadParentContracts();

  return () => {
    cancelled = true;
  };
}, [isOpen, workspaceId, document?.id]);

async function handleVersionUpload() {
  if (!document?.id || !document?.workspace_id || !versionFile) {
    toast.error('Select a PDF file before uploading.');
    return;
  }

  if (versionFile.type !== 'application/pdf' &&
      !versionFile.name.toLowerCase().endsWith('.pdf')) {
    toast.error('Only PDF files are allowed.');
    return;
  }

  if (versionFile.size > 25 * 1024 * 1024) {
    toast.error('The PDF must be 25 MB or smaller.');
    return;
  }

  setUploadingVersion(true);

  try {
    const headers = await getAuthHeaders();
    const body = new FormData();
    body.append('file', versionFile);
    body.append('workspaceId', document.workspace_id);
    body.append('changeSummary', changeSummary.trim());

    const res = await fetch(
      `/api/documents/${document.id}/versions`,
      {
        method: 'POST',
        headers,
        body,
      }
    );

    const json = await res.json();

    if (!res.ok) {
      throw new Error(json.error || 'Failed to upload contract version');
    }

    setVersionFile(null);
    setChangeSummary('');

    if (json.warning) {
      toast.warning(json.warning);
    } else {
      toast.success('Contract version uploaded successfully.');
    }

    await loadVersions();
    onSuccess();
  } catch (error: any) {
    toast.error(error.message || 'Failed to upload contract version');
  } finally {
    setUploadingVersion(false);
  }
}

useEffect(() => {
if (document) {
setForm({
parent_document_id: document.parent_document_id || '',
assigned_to: document.assigned_to || '',
status: document.status || 'Active',
document_type: document.document_type || '',
effective_date: document.effective_date || '',
expiration_date: document.expiration_date || '',
auto_renewal: document.auto_renewal || false,
notice_period_days: document.notice_period_days ?? '',
financial_value: document.financial_value ?? '',
compliance_summary: document.compliance_summary || '',
liability_cap_amount: document.liability_cap_amount ?? '',
liability_cap_currency: document.liability_cap_currency || '',
liability_cap_basis: document.liability_cap_basis || 'not_found',
liability_cap_clause: document.liability_cap_clause || '',
});
}
}, [document]);

  if (!isOpen || !document) return null;

  const handleSubmit = async (e: React.FormEvent) => {
e.preventDefault();

try {
  const headers = await getAuthHeaders();

  const res = await fetch(`/api/documents/${document.id}`, {
    method: 'PUT',
    headers: {
      ...headers,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      parent_document_id: form.parent_document_id || null,
      status: form.status,
      document_type: form.document_type,
      effective_date: form.effective_date || null,
      expiration_date: form.expiration_date || null,
      auto_renewal: form.auto_renewal,
      notice_period_days: form.notice_period_days !== ''
        ? parseInt(String(form.notice_period_days), 10)
        : null,
      financial_value: form.financial_value !== ''
        ? parseFloat(String(form.financial_value))
        : null,
      compliance_summary: form.compliance_summary,
      liability_cap_amount: form.liability_cap_amount !== ''
        ? parseFloat(String(form.liability_cap_amount))
        : null,
      liability_cap_currency: form.liability_cap_currency || null,
      liability_cap_basis: form.liability_cap_basis || 'not_found',
      liability_cap_clause: form.liability_cap_clause || null,
      ...(canAssign
        ? { assigned_to: form.assigned_to || null }
        : {}),
    }),
  });

  const json = await res.json();

  if (!res.ok) {
    throw new Error(json.error || 'Update failed');
  }

  toast.success('Document updated successfully!');
  onSuccess();
  onClose();
} catch (error: any) {
  toast.error(error.message || 'Failed to update document');
}

};

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center px-6 py-4 border-b border-zinc-800">
          <h3 className="font-semibold text-lg">Edit Document: {document.vendors?.name}</h3>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-100"><X className="w-5 h-5" /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          <div className="grid grid-cols-2 gap-4">
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1">Status</label>
  <select
    value={form.status}
    onChange={(e) => setForm({ ...form, status: e.target.value })}
    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-sm text-zinc-100"
  >
    <option value="Active">Active</option>
    <option value="Expiring Soon">Expiring Soon</option>
    <option value="Expired">Expired</option>
  </select>
</div><div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1">Document Type</label>
              <input
                type="text"
                value={form.document_type}
                onChange={(e) => setForm({ ...form, document_type: e.target.value })}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-sm text-zinc-100"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1">
                Parent Contract
              </label>
              <select
                value={form.parent_document_id}
                onChange={(e) =>
                  setForm({ ...form, parent_document_id: e.target.value })
                }
                disabled={parentContractsLoading}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-sm text-zinc-100"
              >
                <option value="">No parent (standalone contract)</option>
                {parentContracts.map((item: any) => (
                  <option key={item.id} value={item.id}>
                    {item.vendor_name ||
                      item.vendors?.name ||
                      item.document_type ||
                      'Untitled contract'}
                    {item.document_type ? ` — ${item.document_type}` : ''}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-zinc-500">
                Select a parent agreement if this contract is an amendment,
                renewal, or related agreement.
              </p>
            </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1">Effective Date</label>
              <input
                type="date"
                value={form.effective_date}
                onChange={(e) => setForm({ ...form, effective_date: e.target.value })}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-sm text-zinc-100"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1">Expiration Date</label>
              <input
                type="date"
                value={form.expiration_date}
                onChange={(e) => setForm({ ...form, expiration_date: e.target.value })}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-sm text-zinc-100"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1">Notice Period (Days)</label>
              <input
                type="number"
                value={form.notice_period_days}
                onChange={(e) => setForm({ ...form, notice_period_days: e.target.value })}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-sm text-zinc-100"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1">Financial Value ($)</label>
              <input
                type="number"
                step="0.01"
                value={form.financial_value}
                onChange={(e) => setForm({ ...form, financial_value: e.target.value })}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-sm text-zinc-100"
              />
            </div>
          </div>
          <div className="border border-zinc-800 rounded-xl p-4 space-y-4">
            <h4 className="text-sm font-semibold text-zinc-100">
              Limitation of Liability
            </h4>        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1">
              Liability Cap Amount
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.liability_cap_amount}
              onChange={(e) =>
                setForm({ ...form, liability_cap_amount: e.target.value })
              }
              placeholder="e.g. 100000"
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-sm text-zinc-100"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1">
              Currency
            </label>
            <input
              type="text"
              maxLength={3}
              value={form.liability_cap_currency}
              onChange={(e) =>
                setForm({
                  ...form,
                  liability_cap_currency: e.target.value.toUpperCase(),
                })
              }
              placeholder="USD"
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-sm text-zinc-100"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1">
            Liability Cap Basis
          </label>
          <select
            value={form.liability_cap_basis}
            onChange={(e) =>
              setForm({ ...form, liability_cap_basis: e.target.value })
            }
            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-sm text-zinc-100"
          >
            <option value="not_found">Not found</option>
            <option value="fixed_amount">Fixed amount</option>
            <option value="fees_paid">Fees paid/payable</option>
            <option value="multiple_of_fees">Multiple of fees</option>
            <option value="uncapped">Explicitly uncapped</option>
            <option value="unclear">Unclear</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1">
            Liability Clause
          </label>
          <textarea
            rows={3}
            value={form.liability_cap_clause}
            onChange={(e) =>
              setForm({ ...form, liability_cap_clause: e.target.value })
            }
            placeholder="Relevant limitation-of-liability wording or summary"
            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-sm text-zinc-100"
          />
        </div>

        <p className="text-xs text-zinc-500">
          Leave the amount and currency blank when no fixed monetary cap can be determined.
        </p>
      </div>

          <div className="flex items-center gap-2 pt-2">
           {canAssign && (
  <div>
    <label
      htmlFor="assigned_to"
      className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1"
    >
      Contract Owner
    </label>

    <select
      id="assigned_to"
      value={form.assigned_to}
      onChange={(e) =>
        setForm({ ...form, assigned_to: e.target.value })
      }
      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-sm text-zinc-100"
    >
      <option value="">Unassigned</option>

      {workspaceMembers.map((member) => (
        <option key={member.userId} value={member.userId}>
          {member.email || member.userId}
          {member.role === 'owner' ? ' (Owner)' : ''}
        </option>
      ))}
    </select>

    <p className="text-xs text-zinc-500 mt-1">
      Assign this contract to a member of the current workspace.
    </p>
  </div>
)}
            <input
              type="checkbox"
              id="auto_renewal"
              checked={form.auto_renewal}
              onChange={(e) => setForm({ ...form, auto_renewal: e.target.checked })}
              className="rounded bg-zinc-950 border-zinc-800 text-emerald-500 focus:ring-0"
            />
            <label htmlFor="auto_renewal" className="text-sm font-medium">Auto-Renewal Enabled</label>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1">Compliance Summary</label>
            <textarea
              rows={3}
              value={form.compliance_summary}
              onChange={(e) => setForm({ ...form, compliance_summary: e.target.value })}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-sm text-zinc-100"
            />
          </div>

          <section className="border border-zinc-800 rounded-xl p-4 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h4 className="font-semibold text-zinc-100 flex items-center gap-2">
                <History className="w-4 h-4" />
                Version History
              </h4>
              <button
                type="button"
                onClick={() => void loadVersions()}
                disabled={versionsLoading}
                className="text-xs text-zinc-400 hover:text-white disabled:opacity-50"
              >
                <RefreshCw className={`inline w-3 h-3 mr-1 ${versionsLoading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>

            {versionsLoading ? (
              <p className="text-sm text-zinc-400">Loading versions...</p>
            ) : versions.length === 0 ? (
              <p className="text-sm text-zinc-400">
                No saved versions yet. Upload a new PDF below to begin version tracking.
              </p>
            ) : (
              <div className="space-y-3">
                {versions.map((version) => (
                  <div
                    key={version.id}
                    className="rounded-lg bg-zinc-950 border border-zinc-800 p-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium text-zinc-100">
                        Version {version.version_number}
                      </span>
                      {version.is_current && (
                        <span className="text-xs text-emerald-400">
                          Current version
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-zinc-400 mt-1">
                      {new Date(version.created_at).toLocaleString()}
                    </p>

                    {version.change_summary && (
                      <p className="text-sm text-zinc-300 mt-2">
                        {version.change_summary}
                      </p>
                    )}

                    {version.download_url && (
                      <a
                        href={version.download_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 mt-2 text-xs text-emerald-400 hover:text-emerald-300"
                      >
                        Open PDF <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="border-t border-zinc-800 pt-4 space-y-3">
              <p className="text-sm font-medium text-zinc-200">
                Upload a new contract version
              </p>

              <input
                type="file"
                accept=".pdf,application/pdf"
                onChange={(e) => setVersionFile(e.target.files?.[0] || null)}
                className="block w-full text-sm text-zinc-400 file:mr-3 file:rounded-lg file:border-0 file:bg-zinc-800 file:px-3 file:py-2 file:text-zinc-100"
              />

              <textarea
                rows={2}
                value={changeSummary}
                onChange={(e) => setChangeSummary(e.target.value)}
                placeholder="Optional: summarize what changed in this version"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-zinc-100"
              />

              <button
                type="button"
                onClick={() => void handleVersionUpload()}
                disabled={!versionFile || uploadingVersion}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-zinc-950 hover:bg-emerald-400 disabled:opacity-50"
              >
                <Upload className="w-4 h-4" />
                {uploadingVersion ? 'Uploading...' : 'Upload New Version'}
              </button>
            </div>
          </section>

          <div className="flex justify-end gap-3 pt-4 border-t border-zinc-800">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-100">Cancel</button>
            <button type="submit" className="bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold px-4 py-2 rounded-xl text-sm transition-all">Save Changes</button>
          </div>
        </form>
      </div>
    </div>
  );
}
