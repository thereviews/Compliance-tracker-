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
  onClose: () => void;
  onSuccess: () => void;
}

export function UploadModal({
  isOpen,
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

  useEffect(() => {
    if (isOpen) {
      fetchVendors();
      setStep('idle');
      setFile(null);
      setExtractedData(null);
    }
  }, [isOpen]);

  const fetchVendors = async () => {
    const { data } = await supabase
      .from('vendors')
      .select('id, name');

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

      if (vendorMode === 'existing' && selectedVendorId) {
        formData.append('vendorId', selectedVendorId);
        formData.append('newVendorName', newVendorName);
      }

if (vendorMode === 'new' && newVendorName) {
        formData.append('newVendorName', newVendorName);
      }

      const headers = await getAuthHeaders();

      delete headers['Content-Type'];

      const res = await fetch('/api/documents/upload', {
        method: 'POST',
        headers,
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
            onSubmit={handleUploadAndAnalyze}
            className="p-6 space-y-5"
          >
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
                    Drop PDF contract or report here, or click to browse
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

              {vendorMode === 'existing' ? (
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

            {/* Submit */}
            <button
              type="submit"
              disabled={!file}
              className="w-full bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold py-2.5 rounded-xl text-sm transition-all disabled:opacity-50"
            >
              Upload & Analyze with Gemini AI
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
