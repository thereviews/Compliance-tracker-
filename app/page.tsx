'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  supabase,
  getAuthHeaders,
} from '@/lib/supabase-client';
import {
  ShieldCheck,
  Plus,
  Search,
  LogOut,
  FileText,
  AlertTriangle,
  Clock,
} from 'lucide-react';
import { UploadModal } from '@/components/UploadModal';
import { EditDocumentModal } from '@/components/EditDocumentModal';
import { toast } from 'sonner';

export default function DashboardPage() {
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState<any>(null);
  const [userEmail, setUserEmail] = useState('');
  const [authLoading, setAuthLoading] = useState(true);

  const router = useRouter();

  // Check authentication
  useEffect(() => {
    checkUser();
  }, []);

  // Fetch documents after authentication
  useEffect(() => {
    if (userEmail) {
      fetchDocuments();
    }
  }, [userEmail, statusFilter, search]);

  const checkUser = async () => {
    try {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error || !user) {
        router.push('/login');
        return;
      }

      setUserEmail(user.email || '');
      setAuthLoading(false);
    } catch (err) {
      router.push('/login');
    }
  };

  // Calculate status from expiration date
  const getCurrentStatus = (
    expirationDate: string | null
  ) => {
    if (!expirationDate) {
      return 'Active';
    }

    // Use local date and compare YYYY-MM-DD strings
    // to avoid timezone problems.
    const today = new Date();
    const todayStr = [
      today.getFullYear(),
      String(today.getMonth() + 1).padStart(2, '0'),
      String(today.getDate()).padStart(2, '0'),
    ].join('-');

    const thirtyDaysFromNow = new Date(today);
    thirtyDaysFromNow.setDate(
      thirtyDaysFromNow.getDate() + 30
    );

    const thirtyDaysStr = [
      thirtyDaysFromNow.getFullYear(),
      String(thirtyDaysFromNow.getMonth() + 1).padStart(2, '0'),
      String(thirtyDaysFromNow.getDate()).padStart(2, '0'),
    ].join('-');

    if (expirationDate < todayStr) {
      return 'Expired';
    }

    if (expirationDate <= thirtyDaysStr) {
      return 'Expiring Soon';
    }

    return 'Active';
  };

  // Add calculated status to every document
  const documentsWithCurrentStatus = documents.map(
    (doc) => ({
      ...doc,
      currentStatus: getCurrentStatus(
        doc.expiration_date
      ),
    })
  );

  // Apply status filter on the client using calculated status
  const filteredDocuments =
    statusFilter === 'all'
      ? documentsWithCurrentStatus
      : documentsWithCurrentStatus.filter(
          (doc) =>
            doc.currentStatus === statusFilter
        );

  const fetchDocuments = async () => {
    setLoading(true);

    try {
      const headers = await getAuthHeaders();

      // Only search is sent to the API.
      // Status is calculated locally from expiration_date.
      const params = new URLSearchParams();

      if (search) {
        params.append('search', search);
      }

      const res = await fetch(
        `/api/documents?${params.toString()}`,
        {
          headers,
        }
      );

      const json = await res.json();

      if (!res.ok) {
        throw new Error(
          json.error || 'Failed to fetch documents'
        );
      }

      if (json.success) {
        setDocuments(json.documents || []);
      }
    } catch (error: any) {
      console.error('FETCH DOCUMENTS ERROR:', error);
      toast.error('Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (
      !confirm(
        'Are you sure you want to delete this document?'
      )
    ) {
      return;
    }

    try {
      const headers = await getAuthHeaders();

      const res = await fetch(
        `/api/documents/${id}`,
        {
          method: 'DELETE',
          headers,
        }
      );

      const json = await res.json();

      if (!res.ok) {
        throw new Error(
          json.details ||
            json.error ||
            'Delete failed'
        );
      }

      toast.success('Document deleted');

      await fetchDocuments();
    } catch (error: any) {
      console.error('DELETE ERROR:', error);
      toast.error(error.message || 'Delete failed');
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  // Dashboard metrics use calculated status
  const totalContracts =
    documentsWithCurrentStatus.length;

  const expiringSoonCount =
    documentsWithCurrentStatus.filter(
      (doc) =>
        doc.currentStatus === 'Expiring Soon'
    ).length;

  const expiredCount =
    documentsWithCurrentStatus.filter(
      (doc) =>
        doc.currentStatus === 'Expired'
    ).length;

  const valueAtRisk =
    documentsWithCurrentStatus
      .filter(
        (doc) =>
          doc.currentStatus === 'Expiring Soon' ||
          doc.currentStatus === 'Expired'
      )
      .reduce(
        (total, doc) =>
          total +
          (Number(doc.financial_value) || 0),
        0
      );

  if (authLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-emerald-500">
        Verifying session...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">

      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">

          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl">
              <ShieldCheck className="w-6 h-6" />
            </div>

            <h1 className="font-bold text-lg tracking-tight">
              ComplianceTracker
            </h1>
          </div>

          <div className="flex items-center gap-4">

            <span className="text-xs text-zinc-400 hidden sm:inline">
              {userEmail}
            </span>

            <button
              onClick={() =>
                setIsUploadOpen(true)
              }
              className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold px-4 py-2 rounded-xl text-sm transition-all"
            >
              <Plus className="w-4 h-4" />
              Upload Document
            </button>

            <button
              onClick={handleLogout}
              className="p-2 text-zinc-400 hover:text-zinc-100 transition-colors"
            >
              <LogOut className="w-5 h-5" />
            </button>

          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

        {/* Metric Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

          {/* Total */}
          <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-2xl">
            <div className="flex items-center justify-between text-zinc-400 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">
                Total Contracts
              </span>

              <FileText className="w-5 h-5 text-emerald-400" />
            </div>

            <p className="text-2xl font-bold">
              {totalContracts}
            </p>
          </div>

          {/* Expiring */}
          <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-2xl">
            <div className="flex items-center justify-between text-zinc-400 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">
                Expiring Soon (30d)
              </span>

              <Clock className="w-5 h-5 text-amber-400" />
            </div>

            <p className="text-2xl font-bold text-amber-400">
              {expiringSoonCount}
            </p>
          </div>

          {/* Expired */}
          <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-2xl">
            <div className="flex items-center justify-between text-zinc-400 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">
                Expired / Action Needed
              </span>

              <AlertTriangle className="w-5 h-5 text-rose-400" />
            </div>

            <p className="text-2xl font-bold text-rose-400">
              {expiredCount}
            </p>
          </div>

          {/* Value at Risk */}
          <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-2xl">
            <div className="flex items-center justify-between text-zinc-400 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">
                Value at Risk
              </span>

              <span className="text-xs font-bold text-zinc-400">
                $
              </span>
            </div>

            <p className="text-2xl font-bold">
              ${valueAtRisk.toLocaleString()}
            </p>
          </div>

        </div>

        {/* Search & Filters */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">

          <div className="relative w-full sm:w-80">

            <Search className="w-4 h-4 absolute left-3 top-3 text-zinc-500" />

            <input
              type="text"
              placeholder="Search vendor name..."
              value={search}
              onChange={(e) =>
                setSearch(e.target.value)
              }
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2 pl-9 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500"
            />

          </div>

          <div className="flex gap-2 w-full sm:w-auto overflow-x-auto">

            {[
              'all',
              'Active',
              'Expiring Soon',
              'Expired',
            ].map((status) => (

              <button
                key={status}
                onClick={() =>
                  setStatusFilter(status)
                }
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all shrink-0 ${
                  statusFilter === status
                    ? 'bg-emerald-500 text-zinc-950'
                    : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-100'
                }`}
              >
                {status === 'all'
                  ? 'All Statuses'
                  : status}
              </button>

            ))}

          </div>

        </div>

        {/* Main Data Table */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">

          <div className="overflow-x-auto">

            <table className="w-full text-left border-collapse text-sm">

              <thead>
                <tr className="border-b border-zinc-800 text-zinc-400 text-xs font-semibold uppercase tracking-wider bg-zinc-900/50">
                  <th className="p-4">Vendor Name</th>
                  <th className="p-4">Document Type</th>
                  <th className="p-4">Expiration Date</th>
                  <th className="p-4">Auto-Renewal Window</th>
                  <th className="p-4">Financial Value</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-zinc-800">

                {loading ? (

                  Array.from({ length: 3 }).map(
                    (_, i) => (
                      <tr
                        key={i}
                        className="animate-pulse"
                      >
                        <td
                          colSpan={7}
                          className="p-4 h-12 bg-zinc-900/30"
                        />
                      </tr>
                    )
                  )

                ) : filteredDocuments.length === 0 ? (

                  <tr>
                    <td
                      colSpan={7}
                      className="p-12 text-center text-zinc-500"
                    >
                      {documents.length === 0
                        ? 'No documents uploaded yet. Upload your first contract to get started.'
                        : 'No documents match the selected filter.'}
                    </td>
                  </tr>

                ) : (

                  filteredDocuments.map((doc) => {

                    const status =
                      doc.currentStatus;

                    return (
                      <tr
                        key={doc.id}
                        className="hover:bg-zinc-800/30 transition-colors"
                      >

                        <td className="p-4 font-medium text-zinc-200">
                          {doc.vendors?.name ||
                            'Unknown'}
                        </td>

                        <td className="p-4">
                          <span className="px-2.5 py-1 bg-zinc-800 border border-zinc-700 rounded-lg text-xs font-medium text-zinc-300">
                            {doc.document_type ||
                              'Contract'}
                          </span>
                        </td>

                        <td className="p-4 text-zinc-300">
                          {doc.expiration_date ||
                            'N/A'}
                        </td>

                        <td className="p-4 text-zinc-400">
                          {doc.auto_renewal
                            ? `${
                                doc.notice_period_days ||
                                30
                              } Days Notice`
                            : 'No Auto-Renewal'}
                        </td>

                        <td className="p-4 font-mono text-zinc-300">
                          $
                          {doc.financial_value
                            ? Number(
                                doc.financial_value
                              ).toLocaleString()
                            : '0'}
                        </td>

                        <td className="p-4">

                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                              status === 'Active'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : status ===
                                  'Expiring Soon'
                                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                            }`}
                          >

                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                status === 'Active'
                                  ? 'bg-emerald-400'
                                  : status ===
                                    'Expiring Soon'
                                  ? 'bg-amber-400'
                                  : 'bg-rose-400'
                              }`}
                            />

                            {status}

                          </span>

                        </td>

                        <td className="p-4 text-right space-x-2">

                          <button
                            onClick={() =>
                              setEditingDoc(doc)
                            }
                            className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium rounded-lg transition-colors"
                          >
                            Edit
                          </button>

                          <button
                            onClick={() =>
                              handleDelete(doc.id)
                            }
                            className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-medium rounded-lg transition-colors"
                          >
                            Delete
                          </button>

                        </td>

                      </tr>
                    );
                  })

                )}

              </tbody>

            </table>

          </div>

        </div>

      </main>

      <UploadModal
        isOpen={isUploadOpen}
        onClose={() =>
          setIsUploadOpen(false)
        }
        onSuccess={fetchDocuments}
      />

      <EditDocumentModal
        document={editingDoc}
        isOpen={!!editingDoc}
        onClose={() =>
          setEditingDoc(null)
        }
        onSuccess={fetchDocuments}
      />

    </div>
  );
}
