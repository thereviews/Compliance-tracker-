'use client';

import { useState, useEffect } from 'react';
import {
  Upload,
  X,
  CheckCircle2,
  Sparkles,
  Loader2,
} from 'lucide-react';
import { getAuthHeaders, supabase } from '@/lib/supabase-client';
import { toast } from 'sonner';

interface UploadModalProps {
  isOpen: boolean;
  workspaceId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function UploadModal({
  isOpen,
  workspaceId,
  onClose,
  onSuccess,
}: UploadModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [vendorMode, setVendorMode] =
    useState<'existing' | 'new'>('existing');
  const [vendors, setVendors] = useState<any[]>([]);
  const [selectedVendorId, setSelectedVendorId] = useState('');
  const [newVendorName, setNewVendorName] = useState('');
  const [step, setStep] = useState<
    'idle' | 'uploading' | 'extracted'
  >('idle');
  const [extractedData, setExtractedData] = useState<any>(null);
  const [uploadMode, setUploadMode] = useState<'contract' | 'evidence'>('contract');
const [evidenceType, setEvidenceType] = useState('certificate');
const [framework, setFramework] = useState('');
const [issueDate, setIssueDate] = useState('');
const [expirationDate, setExpirationDate] = useState('');
const [verificationStatus, setVerificationStatus] = useState('unverified');
const [evidenceNotes, setEvidenceNotes] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchVendors();
      setStep('idle');
      setFile(null);
      setExtractedData(null);
    }
  }, [isOpen, workspaceId]);

  const fetchVendors = async () => {
    const { data, error } = await supabase
      .from('vendors')
      .select('id, name')
      .eq('workspace_id', workspaceId);

    if (error) {
      console.error('FETCH VENDORS ERROR:', error);
      toast.error('Failed to load workspace vendors');
      return;
    }

    if (data) {
      setVendors(data);
    }
  };

  if (!isOpen) return null;

  const handleUploadAndAnalyze = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    if (!file) {
      toast.error('Please select a PDF file');
      return;
    }

    setStep('uploading');

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('workspaceId', workspaceId);

      if (vendorMode === 'existing' && selectedVendorId) {
        formData.append('vendorId', selectedVendorId);
        formData.append('newVendorName', newVendorName);
      }

if (vendorMode === 'new' && newVendorName) {
        formData.append('newVendorName', newVendorName);
      }


      const authHeaders = await getAuthHeaders();

      const res = await fetch('/api/documents/upload', {
        method: 'POST',
        headers: {
          Authorization: authHeaders.Authorization,
        },
        body: formData,
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(
          json.details || json.error || 'Upload failed'
        );
      }

      setExtractedData(json.data);
      setStep('extracted');

      toast.success(
        'Document successfully analyzed & indexed!'
      );
    } catch (error: any) {
      toast.error(error.message || 'Upload failed');
      setStep('idle');
    }
  };
const handleEvidenceUpload = async (
  e: React.FormEvent
) => {
  e.preventDefault();

  if (!file) {
    toast.error('Please select a PDF file');
    return;
  }

  if (!selectedVendorId) {
    toast.error('Please select a vendor');
    return;
  }

  if (
    issueDate &&
    expirationDate &&
    expirationDate < issueDate
  ) {
    toast.error('Expiration date cannot precede the issue date');
    return;
  }

  setStep('uploading');

  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('workspaceId', workspaceId);
    formData.append('vendorId', selectedVendorId);
    formData.append('evidenceType', evidenceType);
    formData.append('framework', framework);
    formData.append('issueDate', issueDate);
    formData.append('expirationDate', expirationDate);
    formData.append('verificationStatus', verificationStatus);
    formData.append('notes', evidenceNotes);

    const authHeaders = await getAuthHeaders();

    const res = await fetch('/api/compliance-evidence/upload', {
      method: 'POST',
      headers: {
        Authorization: authHeaders.Authorization,
      },
      body: formData,
    });

    const json = await res.json();

    if (!res.ok) {
      throw new Error(json.error || 'Evidence upload failed');
    }

    toast.success('Compliance evidence uploaded successfully');
    onSuccess();
    onClose();
  } catch (error: any) {
    toast.error(error.message || 'Evidence upload failed');
  } finally {
    setStep('idle');
  }
};

  const handleFinish = () => {
    onSuccess();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">

        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-zinc-800">
          <h3 className="font-semibold text-lg flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-emerald-400" />
            Upload Compliance Document
          </h3>

          <button
            type="button"
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Upload form */}
        {step === 'idle' && (
          <form
            onSubmit={
            uploadMode === 'contract'
            ? handleUploadAndAnalyze
            : handleEvidenceUpload
}
            className="p-6 space-y-5"
          >
          {/* Upload mode */}
<div className="space-y-2">
  <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
    Upload Type
  </label>

  <div className="grid grid-cols-2 gap-3">
    <button
      type="button"
      onClick={() => setUploadMode('contract')}
      className={`rounded-xl border px-3 py-3 text-sm font-medium transition-colors ${
        uploadMode === 'contract'
          ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400'
          : 'border-zinc-700 text-zinc-400'
      }`}
    >
      Contract
    </button>

    <button
      type="button"
      onClick={() => {
        setUploadMode('evidence');
        setVendorMode('existing');
        setNewVendorName('');
      }}
      className={`rounded-xl border px-3 py-3 text-sm font-medium transition-colors ${
        uploadMode === 'evidence'
          ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400'
          : 'border-zinc-700 text-zinc-400'
      }`}
    >
      Compliance Evidence
    </button>
  </div>

  <p className="text-xs text-zinc-500">
    {uploadMode === 'contract'
      ? 'Analyze a contract and extract its key terms using AI.'
      : 'Upload a certificate or compliance report without AI extraction.'}
  </p>
</div>
            {/* File picker */}
            <div className="border-2 border-dashed border-zinc-800 hover:border-emerald-500/50 rounded-xl p-6 text-center cursor-pointer transition-colors relative">

              <input
                type="file"
                accept="application/pdf,.pdf"
                onChange={(e) => {
                  const selectedFile =
                    e.target.files?.[0] || null;

                  if (selectedFile) {
                    setFile(selectedFile);
                  }
                }}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />

              <Upload className="w-8 h-8 mx-auto mb-2 text-zinc-500" />

              {file ? (
                <>
                  <p className="text-sm font-medium text-emerald-400">
                    {file.name}
                  </p>

                  <p className="text-xs text-zinc-500 mt-1">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </>
              ) : (
                <>
                  <p className="text-sm font-medium text-zinc-300">
                    {uploadMode === 'contract'
  ? 'Drop a PDF contract here, or click to browse'
  : 'Drop a PDF certificate or report here, or click to browse'}
                  </p>

                  <p className="text-xs text-zinc-500 mt-1">
                    Supports PDF up to 25MB
                  </p>
                </>
              )}
            </div>

            {/* Vendor selection */}
            <div className="space-y-3">
              <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Vendor Selection
              </label>
               {uploadMode === 'contract' && (

              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="radio"
                    name="vendorMode"
                    checked={vendorMode === 'existing'}
                    onChange={() =>
                      setVendorMode('existing')
                    }
                  />
                  Existing Vendor
                </label>

                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="radio"
                    name="vendorMode"
                    checked={vendorMode === 'new'}
                    onChange={() =>
                      setVendorMode('new')
                    }
                  />
                  New Vendor
                </label>
              </div>
             )}

              {uploadMode === 'evidence' || vendorMode === 'existing' ? (
                <select
                  value={selectedVendorId}
                  onChange={(e) =>
                    setSelectedVendorId(e.target.value)
                  }
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-zinc-200"
                >
                  <option value="">
                    Select a vendor...
                  </option>

                  {vendors.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  placeholder="Enter new vendor name"
                  value={newVendorName}
                  onChange={(e) =>
                    setNewVendorName(e.target.value)
                  }
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-zinc-200"
                />
              )}
            </div>
           {uploadMode === 'evidence' && (
  <div className="space-y-4 border-t border-zinc-800 pt-5">
    <h4 className="text-sm font-semibold text-zinc-200">
      Evidence Details
    </h4>

    <div>
      <label className="mb-2 block text-xs font-medium text-zinc-400">
        Evidence Type
      </label>
      <select
        value={evidenceType}
        onChange={(e) => setEvidenceType(e.target.value)}
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
        onChange={(e) => setFramework(e.target.value)}
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

    <div className="grid grid-cols-2 gap-3">
      <div>
        <label className="mb-2 block text-xs font-medium text-zinc-400">
          Issue Date
        </label>
        <input
          type="date"
          value={issueDate}
          onChange={(e) => setIssueDate(e.target.value)}
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
          onChange={(e) => setExpirationDate(e.target.value)}
          className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-200"
        />
      </div>
    </div>

    <div>
      <label className="mb-2 block text-xs font-medium text-zinc-400">
        Verification Status
      </label>
      <select
        value={verificationStatus}
        onChange={(e) => setVerificationStatus(e.target.value)}
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
        value={evidenceNotes}
        onChange={(e) => setEvidenceNotes(e.target.value)}
        maxLength={10000}
        rows={3}
        placeholder="Add certification details or review notes..."
        className="w-full resize-y rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-sm text-zinc-200"
      />
    </div>
  </div>
)}

            {/* Submit */}
            <button
              type="submit"
              disabled={
                !file ||
                (uploadMode === 'evidence' && !selectedVendorId) ||
                (uploadMode === 'contract' &&
                  vendorMode === 'existing' &&
                  !selectedVendorId) ||
                (uploadMode === 'contract' &&
                  vendorMode === 'new' &&
                  !newVendorName.trim())
              }
              className="w-full bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold py-2.5 rounded-xl text-sm transition-all disabled:opacity-50"
            >
              {uploadMode === 'contract'
                ? 'Upload & Analyze with Gemini AI'
                : 'Upload Compliance Evidence'}
            </button>
          </form>
        )}

        {/* Uploading */}
        {step === 'uploading' && (
          <div className="p-12 text-center space-y-4">
            <Loader2 className="w-10 h-10 animate-spin text-emerald-400 mx-auto" />

            <h4 className="font-semibold text-lg">
              Processing Document...
            </h4>

            <p className="text-xs text-zinc-400">
              Uploading to secure storage and running Gemini AI
              extraction engine.
            </p>
          </div>
        )}

        {/* Extraction complete */}
        {step === 'extracted' && (
          <div className="p-6 space-y-4">

            <div className="flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-xl text-emerald-400">
              <CheckCircle2 className="w-6 h-6 shrink-0" />

              <div>
                <p className="font-semibold text-sm">
                  Extraction Complete!
                </p>

                <p className="text-xs text-emerald-300/80">
                  Metadata has been successfully extracted and stored.
                </p>
              </div>
            </div>

            <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 space-y-3 text-xs">

              <div className="flex justify-between gap-4">
                <span className="text-zinc-400">
                  Document Type:
                </span>

                <span className="font-medium text-right">
                  {extractedData?.document_type || 'N/A'}
                </span>
              </div>

              <div className="flex justify-between gap-4">
                <span className="text-zinc-400">
                  Expiration Date:
                </span>

                <span className="font-medium text-right">
                  {extractedData?.expiration_date || 'N/A'}
                </span>
              </div>

              <div className="flex justify-between gap-4">
                <span className="text-zinc-400">
                  Auto-Renewal:
                </span>

                <span className="font-medium text-right">
                  {extractedData?.auto_renewal
                    ? 'Yes'
                    : 'No'}
                </span>
              </div>

              <div className="flex justify-between gap-4">
                <span className="text-zinc-400">
                  Financial Value:
                </span>

                <span className="font-medium text-right">
                  ${extractedData?.financial_value || 0}
                </span>
              </div>

            </div>

            <button
              type="button"
              onClick={handleFinish}
              className="w-full bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold py-2.5 rounded-xl text-sm transition-all"
            >
              Done
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
