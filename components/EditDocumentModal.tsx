'tsx'
'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { getAuthHeaders } from '@/lib/supabase-client';
import { toast } from 'sonner';

interface EditModalProps {
  document: any;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function EditDocumentModal({ document, isOpen, onClose, onSuccess }: EditModalProps) {
  const [form, setForm] = useState({
    document_type: '',
    effective_date: '',
    expiration_date: '',
    auto_renewal: false,
    notice_period_days: '',
    financial_value: '',
    compliance_summary: '',
    status: 'Active',
  });

  useEffect(() => {
    if (document) {
      setForm({
        document_type: document.document_type || '',
        effective_date: document.effective_date || '',
        expiration_date: document.expiration_date || '',
        auto_renewal: document.auto_renewal || false,
        notice_period_days: document.notice_period_days || '',
        financial_value: document.financial_value || '',
        compliance_summary: document.compliance_summary || '',
        status: document.status || 'Active',
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
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          notice_period_days: form.notice_period_days ? parseInt(String(form.notice_period_days)) : null,
          financial_value: form.financial_value ? parseFloat(String(form.financial_value)) : null,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Update failed');

      toast.success('Document updated successfully!');
      onSuccess();
      onClose();
    } catch (error: any) {
      toast.error(error.message);
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
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1">Document Type</label>
              <input
                type="text"
                value={form.document_type}
                onChange={(e) => setForm({ ...form, document_type: e.target.value })}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-sm text-zinc-100"
              />
            </div>
            <div>
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
            </div>
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

          <div className="flex items-center gap-2 pt-2">
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

          <div className="flex justify-end gap-3 pt-4 border-t border-zinc-800">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-100">Cancel</button>
            <button type="submit" className="bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold px-4 py-2 rounded-xl text-sm transition-all">Save Changes</button>
          </div>
        </form>
      </div>
    </div>
  );
}

