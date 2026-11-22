'use client';

import { useState, useEffect, useRef, type FormEvent } from 'react';
import {
  Upload,
  X,
  Sparkles,
  Loader2,
  CheckCircle2,
  Save,
  FileText
} from 'lucide-react';
import { getAuthHeaders, supabase } from '@/lib/supabase-client';
import { toast } from 'sonner';

interface ModalProps {
  isOpen: boolean;
  workspaceId: string;
  onClose: () => void;
  onSuccess: () => void;
}

interface WorkspaceMember {
  userId: string;
  role: string;
  name: string | null;
  email: string | null;
}

interface ReviewRequirement {
  title: string;
  description: string;
  obligation_source: string;
  priority: string;
  deadline: string;
  status: string;
  responsible_person: string;
  applies_to: string;
  source_excerpt: string;
  reason: string;
  responsibleUserId: string;
  saved: boolean;
}

const missing = (value: unknown): string => {
  if (typeof value !== 'string') return '';
  return value.trim() === 'Not found in document' ? '' : value.trim();
};

const isValidISODate = (value: string): boolean => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day;
};

const normalizePriority = (value: string) =>
  ['Critical', 'High', 'Medium', 'Low'].includes(value) ? value : '';

const normalizeStatus = (value: string) =>
  ['Compliant', 'In Progress', 'Non-Compliant', 'Under Review'].includes(value)
    ? value
    : '';

const normalizeApplicability = (value: string) =>
  ['our_organization', 'supplier', 'shared', 'unclear'].includes(value)
    ? value
    : '';

export function UploadEvidenceModal({
  isOpen,
  workspaceId,
  onClose,
  onSuccess
}: ModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [requirements, setRequirements] = useState<any[]>([]);
  const [selectedReqId, setSelectedReqId] = useState('');
  const [step, setStep] = useState<'idle' | 'analyzing' | 'review' | 'linked'>('idle');
  const [extractionResult, setExtractionResult] = useState<any>(null);
  const [evidenceId, setEvidenceId] = useState('');
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [proposals, setProposals] = useState<ReviewRequirement[]>([]);
  const [savingIndex, setSavingIndex] = useState<number | null>(null);
  const [savedCount, setSavedCount] = useState(0);
  const [manualReview, setManualReview] = useState(false);
  const uploadInProgress = useRef(false);
  const savingProposalIndices = useRef(new Set<number>());

  useEffect(() => {
    if (!isOpen || !workspaceId) return;

    let active = true;

    setStep('idle');
    setFile(null);
    setRequirements([]);
    setMembers([]);
    setExtractionResult(null);
    setEvidenceId('');
    setSelectedReqId('');
    setProposals([]);
    setSavedCount(0);
    setManualReview(false);

    const loadData = async () => {
      try {
        const { data, error } = await supabase
          .from('compliance_requirements')
          .select('id, title')
          .eq('workspace_id', workspaceId);

        if (!active) return;

        if (error) {
          setRequirements([]);
          toast.error('Could not load existing requirements.');
        } else {
          setRequirements(data || []);
        }

        const headers = await getAuthHeaders();
        const response = await fetch(
          `/api/workspaces/members?workspaceId=${encodeURIComponent(workspaceId)}`,
          { headers }
        );

        const responseText = await response.text();
        let json: any;

        try {
          json = responseText ? JSON.parse(responseText) : null;
        } catch {
          throw new Error('The workspace members service returned invalid data.');
        }

        if (!active) return;

        if (response.ok && json?.success && Array.isArray(json.members)) {
          setMembers(json.members);
        } else {
          setMembers([]);
          toast.error(json?.error || 'Could not load workspace members.');
        }
      } catch {
        if (!active) return;
        setMembers([]);
        toast.error('Could not load workspace data. Please try again.');
      }
    };

    loadData();

    return () => {
      active = false;
    };
  }, [isOpen, workspaceId]);

  if (!isOpen) return null;

  const updateProposal = (
    index: number,
    field: keyof ReviewRequirement,
    value: string
  ) => {
    setProposals(previous =>
      previous.map((proposal, i) =>
        i === index ? { ...proposal, [field]: value } : proposal
      )
    );
  };

  const findMember = (person: string): string => {
    if (!person) return '';

    const normalized = person.trim().toLowerCase();

    const match = members.find(member =>
      member.name?.trim().toLowerCase() === normalized ||
      member.email?.trim().toLowerCase() === normalized
    );

    return match?.userId || '';
  };

  const handleUpload = async (e: FormEvent) => {
    e.preventDefault();

    if (uploadInProgress.current) return;

    if (!file) {
      toast.error('Please attach an evidence file.');
      return;
    }

    const extension = file.name.split('.').pop()?.toLowerCase();
    const validPdf = extension === 'pdf' &&
      (!file.type || file.type === 'application/pdf');
    const validTxt = extension === 'txt' &&
      (!file.type || file.type === 'text/plain');

    if (!validPdf && !validTxt) {
      toast.error('Only PDF and TXT files are supported.');
      return;
    }

    if (file.size === 0) {
      toast.error('The selected file is empty.');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('The maximum file size is 10 MB.');
      return;
    }

    uploadInProgress.current = true;
    setStep('analyzing');

    let uploadedFilePath: string | null = null;
    let apiRequestStarted = false;
    let apiResponseOk: boolean | null = null;
    let apiResponseStatus: number | null = null;

    try {
      const headers = await getAuthHeaders();

      const safeFileName =
        file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-120) ||
        (validPdf ? 'evidence.pdf' : 'evidence.txt');

      uploadedFilePath =
        `${workspaceId}/${Date.now()}-${crypto.randomUUID()}-${safeFileName}`;

      // Upload the original file directly from the browser to private Storage.
      const { error: storageError } = await supabase.storage
        .from('compliance-evidence')
        .upload(uploadedFilePath, file, {
          contentType: validPdf ? 'application/pdf' : 'text/plain',
          upsert: false
        });

      if (storageError) {
        throw new Error(`Storage upload failed: ${storageError.message}`);
      }

      // Send only metadata to Vercel. The document itself stays in Storage.
      apiRequestStarted = true;
      const response = await fetch('/api/evidence/upload', {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          workspaceId,
          requirementId: selectedReqId || null,
          filePath: uploadedFilePath,
          fileName: file.name,
          fileSize: file.size,
          contentType: validPdf ? 'application/pdf' : 'text/plain'
        })
      });

      apiResponseOk = response.ok;
      apiResponseStatus = response.status;
      const responseText = await response.text();
      let json: any;

      try {
        json = responseText ? JSON.parse(responseText) : null;
      } catch {
        throw new Error(
          `Upload API returned invalid data (HTTP ${response.status}).`
        );
      }

      if (!response.ok || !json?.success) {
        throw new Error(
          json?.details || json?.error || 'Document upload failed.'
        );
      }

      if (!json.evidence?.id) {
        throw new Error('Upload succeeded but no evidence ID was returned.');
      }

      // Evidence is now saved. Do not remove its Storage object.
      uploadedFilePath = null;

      // Existing requirement selected: finish without creating new proposals.
      if (selectedReqId) {
        setEvidenceId(json.evidence.id);
        setStep('linked');
        toast.success('Document uploaded and linked to the existing requirement.');
        return;
      }

      const extracted = json.extraction || {};
      const proposed = Array.isArray(extracted.proposed_requirements)
        ? extracted.proposed_requirements
        : [];

      if (proposed.length > 20) {
        toast.warning('Only the first 20 proposed requirements are shown for review.');
      }

      const reviewedProposals: ReviewRequirement[] = proposed.slice(0, 20).map(
        (item: any) => {
          const person = missing(item.responsible_person);

          return {
            title: missing(item.title).slice(0, 500),
            description: missing(item.description).slice(0, 3000),
            obligation_source: missing(item.obligation_source).slice(0, 200),
            priority: normalizePriority(missing(item.priority)),
            deadline: isValidISODate(missing(item.deadline))
              ? missing(item.deadline)
              : '',
            status: normalizeStatus(missing(item.status)),
            responsible_person: person,
            applies_to: normalizeApplicability(item.applies_to),
            source_excerpt: missing(item.source_excerpt).slice(0, 3000),
            reason: missing(item.reason).slice(0, 1500),
            responsibleUserId: findMember(person),
            saved: false
          };
        }
      );

      const needsManualReview = reviewedProposals.length === 0;

      if (needsManualReview) {
        reviewedProposals.push({
          title: '',
          description: '',
          obligation_source: '',
          priority: '',
          deadline: '',
          status: '',
          responsible_person: '',
          applies_to: '',
          source_excerpt: '',
          reason: '',
          responsibleUserId: '',
          saved: false
        });
      }

      setEvidenceId(json.evidence.id);
      setExtractionResult({
        ...extracted,
        compliance_summary: typeof extracted.compliance_summary === 'string'
          ? extracted.compliance_summary.slice(0, 3000)
          : ''
      });
      setProposals(reviewedProposals);
      setManualReview(needsManualReview);
      setSavedCount(0);
      setStep('review');

      toast.success('Document uploaded. Review the proposed requirements.');
    } catch (error: unknown) {
      // Once the API request starts, the server owns cleanup.
      // A lost response must not delete evidence that may already be saved.
      if (uploadedFilePath && (!apiRequestStarted || (apiResponseOk === false && apiResponseStatus !== 409))) {
        const { error: cleanupError } = await supabase.storage
          .from('compliance-evidence')
          .remove([uploadedFilePath]);

        if (cleanupError) {
          console.error('[BROWSER UPLOAD CLEANUP ERROR]', cleanupError);
        }
      }

      toast.error(error instanceof Error ? error.message : 'Upload failed.');
      setStep('idle');
    } finally {
      uploadInProgress.current = false;
    }
  };

  const saveProposal = async (index: number) => {
    const proposal = proposals[index];

    if (!proposal || proposal.saved || savingProposalIndices.current.has(index)) return;

    if (!proposal.title.trim()) {
      toast.error('Requirement title is required.');
      return;
    }

    if (!proposal.status) {
      toast.error('Please choose a status before saving.');
      return;
    }

    if (proposal.title.trim().length > 500 ||
        proposal.description.length > 3000 ||
        proposal.obligation_source.length > 200) {
      toast.error('One or more requirement fields exceed the allowed length.');
      return;
    }

    if (!proposal.deadline) {
      toast.error('A requirement deadline is required.');
      return;
    }

    if (!isValidISODate(proposal.deadline)) {
      toast.error('Please enter a valid deadline.');
      return;
    }

    savingProposalIndices.current.add(index);
    setSavingIndex(index);

    try {
      const headers = await getAuthHeaders();

      const response = await fetch('/api/compliance/register', {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          workspaceId,
          evidenceId,
          title: proposal.title,
          description: proposal.description,
          obligationSource: proposal.obligation_source.trim() || 'N/A',
          priority: proposal.priority || null,
          deadline: proposal.deadline || null,
          status: proposal.status || null,
          responsibleUserId: proposal.responsibleUserId || null,
          appliesTo: 'our_organization',
          confirmed: true
        })
      });

      const responseText = await response.text();
      let json: any;

      try {
        json = responseText ? JSON.parse(responseText) : null;
      } catch {
        throw new Error('The register service returned invalid data.');
      }

      if (!response.ok || !json?.success) {
        throw new Error(
          json.details || json.error || 'Could not save requirement.'
        );
      }

      setProposals(previous =>
        previous.map((item, i) =>
          i === index ? { ...item, saved: true } : item
        )
      );

      setSavedCount(count => count + 1);
      onSuccess();
      toast.success('Requirement saved to Compliance Register.');
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Could not save requirement.');
    } finally {
      savingProposalIndices.current.delete(index);
      setSavingIndex(null);
    }
  };

  const closeModal = () => {
    if (uploadInProgress.current || savingProposalIndices.current.size > 0) {
      toast.error('Please wait for the current operation to finish.');
      return;
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">

        <div className="flex justify-between items-center px-6 py-5 border-b border-slate-200 bg-white shrink-0">
          <h3 className="font-semibold text-lg flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-emerald-700" />
            Upload Compliance Evidence
          </h3>

          <button
            onClick={closeModal}
            disabled={step === 'analyzing' || savingIndex !== null}
            className="text-slate-600 hover:text-slate-900 disabled:opacity-40"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="min-h-0 overflow-y-auto">

          {step === 'idle' && (
            <form onSubmit={handleUpload} className="p-6 space-y-5">

              <div className="border-2 border-dashed border-slate-300 bg-slate-50 hover:border-blue-400 hover:bg-blue-50 rounded-2xl p-8 text-center cursor-pointer transition-all relative">
                <input
                  type="file"
                  accept=".pdf,.txt"
                  onChange={e => setFile(e.target.files?.[0] || null)}
                  
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />

                <Upload className="w-8 h-8 mx-auto mb-2 text-slate-500" />

                {file ? (
                  <p className="text-sm font-medium text-emerald-700 break-all min-w-0 max-w-full">
                    {file.name}
                  </p>
                ) : (
                  <>
                    <p className="text-sm font-medium text-slate-700">
                      Select an audit report, policy or control document
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      PDF and TXT supported
                    </p>
                  </>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-2">
                  Link to Existing Requirement (Optional)
                </label>

                <select
                  value={selectedReqId}
                  onChange={e => setSelectedReqId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                >
                  <option value="">No existing requirement</option>
                  {requirements.map(req => (
                    <option key={req.id} value={req.id}>
                      {req.title}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                disabled={!file}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-xl text-sm transition-all disabled:opacity-50"
              >
                Upload & Analyze Document
              </button>
            </form>
          )}

          {step === 'analyzing' && (
            <div className="p-12 text-center space-y-4">
              <Loader2 className="w-10 h-10 animate-spin text-emerald-700 mx-auto" />
              <h4 className="font-semibold text-lg">
                Analyzing Document...
              </h4>
              <p className="text-xs text-slate-600">
                Identifying supported compliance requirements for your review.
              </p>
            </div>
          )}

          {step === 'linked' && (
            <div className="p-8 sm:p-12 text-center space-y-5">
              <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-9 h-9 text-emerald-700" />
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold text-xl text-slate-900">
                  Document Uploaded & Linked
                </h4>
                <p className="text-sm text-slate-600">
                  Your evidence document has been uploaded successfully.
                </p>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-left">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                  Linked to existing requirement
                </p>
                <p className="text-sm font-semibold text-slate-900">
                  {requirements.find(req => req.id === selectedReqId)?.title || 'Selected requirement'}
                </p>
                {file && (
                  <p className="text-xs text-slate-600 mt-2 break-all min-w-0 max-w-full">
                    Evidence: {file.name}
                  </p>
                )}
              </div>

              <p className="text-sm text-slate-600">
                No new requirement needs to be created. Your existing requirement remains unchanged.
              </p>

              <button
                onClick={() => {
                  onSuccess();
                  closeModal();
                }}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-xl text-sm"
              >
                Done
              </button>
            </div>
          )}

          {step === 'review' && (
            <div className="p-6 space-y-6">

              <div className="flex items-start gap-3 bg-emerald-50 border border-emerald-200 p-4 rounded-xl">
                <CheckCircle2 className="w-6 h-6 text-emerald-700 shrink-0" />

                <div className="min-w-0">
                  <p className="font-semibold text-sm text-emerald-700">
                    Document Uploaded Successfully
                  </p>
                  <p className="text-xs text-slate-700 mt-1">
                    {extractionResult?.title || file?.name}
                  </p>
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
                <div className="flex items-center gap-2 text-slate-600 text-xs font-semibold">
                  <FileText className="w-4 h-4" />
                  DOCUMENT SUMMARY
                </div>
                <p className="text-sm text-slate-700">
                  {extractionResult?.compliance_summary || 'No summary available.'}
                </p>
              </div>

              <div className="border-b border-slate-200 pb-4">
                <h4 className="font-semibold text-lg">
                  Review Proposed Requirements
                </h4>
                <p className="text-xs text-slate-600 mt-1">
                  Review and correct each proposal. Nothing enters the register until you save it.
                </p>
              </div>

              {manualReview && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                  <p className="text-sm font-semibold text-amber-700">
                    No requirements were identified automatically
                  </p>
                  <p className="text-xs text-slate-700 mt-1">
                    Review the document and enter any applicable requirement below.
                    Complete any fields AI could not identify. Nothing is saved until you confirm.
                    Nothing is saved until you confirm.
                  </p>
                </div>
              )}

              {proposals.length === 0 ? (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 text-center space-y-2">
                  <FileText className="w-8 h-8 mx-auto text-slate-500" />
                  <p className="font-medium text-slate-900">
                    No register requirements identified
                  </p>
                  <p className="text-xs text-slate-600">
                    The document is safely uploaded, but Gemini did not identify sufficiently supported obligations to propose.
                  </p>
                </div>
              ) : (
                <div className="space-y-5">
                  {proposals.map((proposal, index) => (
                    <div
                      key={index}
                      className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-4"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <h5 className="font-semibold text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100">
                          Requirement {index + 1}
                        </h5>

                        {proposal.saved ? (
                          <span className="text-xs text-emerald-700 flex items-center gap-1">
                            <CheckCircle2 className="w-4 h-4" />
                            Saved
                          </span>
                        ) : (
                          <span className="text-xs text-amber-700">
                            Awaiting review
                          </span>
                        )}
                      </div>

                      <fieldset disabled={proposal.saved || savingIndex === index} className="space-y-4">

                        <div>
                          <label className="block text-xs text-slate-600 mb-1">
                            Requirement / Control *
                          </label>
                          <textarea
                            value={proposal.title}
                            onChange={e => updateProposal(index, 'title', e.target.value)}
                            maxLength={500}
                            rows={2}
                            placeholder="e.g. Review user access permissions quarterly"
                            className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                          />
                        </div>

                        <div>
                          <label className="block text-xs text-slate-600 mb-1">
                            Description
                          </label>
                          <textarea
                            value={proposal.description}
                            onChange={e => updateProposal(index, 'description', e.target.value)}
                            maxLength={3000}
                            rows={3}
                            placeholder="Describe what your organisation must do to meet this requirement"
                            className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                          />
                        </div>

                        <div>
                          <label className="block text-xs text-slate-600 mb-1">
                            Source Framework
                          </label>
                          <input
                            value={proposal.obligation_source}
                            onChange={e => updateProposal(index, 'obligation_source', e.target.value)}
                            maxLength={200}
                            placeholder="e.g. ISO 27001, GDPR, SOC 2, HIPAA"
                            className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                          />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs text-slate-600 mb-1">
                              Priority
                            </label>
                            <select
                              value={proposal.priority}
                              onChange={e => updateProposal(index, 'priority', e.target.value)}
                              className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                            >
                              <option value="">Choose priority (optional)</option>
                              <option value="Critical">Critical</option>
                              <option value="High">High</option>
                              <option value="Medium">Medium</option>
                              <option value="Low">Low</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-xs text-slate-600 mb-1">
                              Deadline
                            </label>
                            <input
                              type="date"
                              required
                              value={proposal.deadline}
                              onChange={e => updateProposal(index, 'deadline', e.target.value)}
                              className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                            />
                            {!proposal.deadline && (
                              <p className="text-xs text-slate-500 mt-1">
                                A deadline is required before saving this requirement.
                              </p>
                            )}
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs text-slate-600 mb-1">
                            Status
                          </label>
                          <select
                            value={proposal.status}
                            onChange={e => updateProposal(index, 'status', e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                          >
                            <option value="">Choose status — select one</option>
                            <option value="Compliant">Compliant</option>
                            <option value="In Progress">In Progress</option>
                            <option value="Non-Compliant">Non-Compliant</option>
                            <option value="Under Review">Under Review</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs text-slate-600 mb-1">
                            Responsible Person
                          </label>
                          <select
                            value={proposal.responsibleUserId}
                            onChange={e => updateProposal(index, 'responsibleUserId', e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                          >
                            <option value="">Unassigned — choose if applicable</option>
                            {members.map(member => (
                              <option key={member.userId} value={member.userId}>
                                {member.name || member.email || member.userId.slice(0, 8)}
                                {' '}({member.role})
                              </option>
                            ))}
                          </select>

                          {proposal.responsible_person && (
                            <p className="text-xs text-slate-500 mt-1">
                              Name found in document: {proposal.responsible_person}
                              {!proposal.responsibleUserId && ' — select a workspace member if applicable.'}
                            </p>
                          )}
                        </div>

                      </fieldset>

                      <div className="bg-white border border-slate-200 rounded-lg p-3">
                        <p className="text-xs font-semibold text-slate-600 mb-1">
                          SUPPORTING DOCUMENT EXCERPT
                        </p>
                        <p className="text-xs text-slate-700">
                          {proposal.source_excerpt || 'No supporting excerpt was identified. You can still review the requirement above.'}
                        </p>
                      </div>

                      {proposal.reason && (
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                          <p className="text-xs font-semibold text-amber-700 mb-1">
                            AI EXPLANATION
                          </p>
                          <p className="text-xs text-slate-700">
                            {proposal.reason}
                          </p>
                        </div>
                      )}

                      {!proposal.saved && (
                        <button
                          onClick={() => saveProposal(index)}
                          disabled={
                            savingIndex !== null ||
                            !proposal.title.trim()
                          }
                          className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-lg text-sm disabled:opacity-40"
                        >
                          {savingIndex === index ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Save className="w-4 h-4" />
                          )}
                          {savingIndex === index
                            ? 'Saving...'
                            : 'Confirm & Save Requirement'}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                <p className="text-sm font-semibold text-slate-900">
                  {savedCount} of {proposals.length} requirements saved
                </p>
                <p className="text-xs text-slate-600 mt-1">
                  The uploaded evidence remains saved even if you leave some proposals unapproved.
                </p>
              </div>

              <button
                onClick={() => {
                  onSuccess();
                  closeModal();
                }}
                disabled={savingIndex !== null}
                className="w-full bg-slate-700 hover:bg-slate-800 text-white font-semibold py-2.5 rounded-xl text-sm disabled:opacity-40"
              >
                {proposals.length > 0 && savedCount === 0
                  ? 'Finish Without Saving Requirements'
                  : 'Done'}
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
