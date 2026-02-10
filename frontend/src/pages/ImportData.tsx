import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  uploadImport,
  fetchBatches,
  fetchConflicts,
  fetchBatchConflicts,
  resolveConflict,
  bulkResolveConflicts,
} from '../api/client';
import { ImportBatch, ImportConflict } from '../types';
import { formatDate, formatDateTime } from '../utils/formatters';
import { SkeletonPage } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import {
  Upload,
  FileText,
  AlertTriangle,
  Check,
  X,
  ChevronRight,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Copy,
  ArrowRight,
  Pencil,
  Shield,
  ArrowDownToLine,
  Clock,
  History,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Types local to this page                                          */
/* ------------------------------------------------------------------ */

interface UploadResult {
  batch_id: string;
  new_records: number;
  updated_records: number;
  duplicate_records: number;
  error_records: number;
}

type ResolutionStrategy = 'keep_existing' | 'use_incoming';

const TEAMS = [
  'Medical Affairs',
  'Commercial',
  'Market Access',
  'Field',
  'Other',
] as const;

/* ------------------------------------------------------------------ */
/*  Status badge helper                                               */
/* ------------------------------------------------------------------ */

function BatchStatusBadge({ batch }: { batch: ImportBatch }) {
  const pending = batch.pending_conflicts ?? 0;

  if (batch.status === 'processing') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-200">
        <Clock className="w-3 h-3" />
        Processing
      </span>
    );
  }

  if (pending > 0) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200">
        <AlertTriangle className="w-3 h-3" />
        Has Conflicts
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-50 text-green-700 ring-1 ring-inset ring-green-200">
      <CheckCircle2 className="w-3 h-3" />
      Complete
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

const ImportData: React.FC = () => {
  /* ---- upload form state ---- */
  const [file, setFile] = useState<File | null>(null);
  const [team, setTeam] = useState<string>(TEAMS[0]);
  const [uploadedBy, setUploadedBy] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [uploading, setUploading] = useState<boolean>(false);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<boolean>(false);

  /* ---- batch / conflict state ---- */
  const [batches, setBatches] = useState<ImportBatch[]>([]);
  const [batchesLoading, setBatchesLoading] = useState<boolean>(true);
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
  const [conflicts, setConflicts] = useState<ImportConflict[]>([]);
  const [conflictsLoading, setConflictsLoading] = useState<boolean>(false);

  /* ---- manual-entry helpers ---- */
  const [manualInputId, setManualInputId] = useState<string | null>(null);
  const [manualValue, setManualValue] = useState<string>('');

  /* ---- bulk selection ---- */
  const [selectedConflictIds, setSelectedConflictIds] = useState<Set<string>>(
    new Set(),
  );
  const [bulkResolving, setBulkResolving] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  /* ================================================================ */
  /*  Data fetching                                                   */
  /* ================================================================ */

  const loadBatches = useCallback(async () => {
    setBatchesLoading(true);
    try {
      const response = await fetchBatches();
      setBatches(response.data);
    } catch {
      console.error('Failed to load import batches');
    } finally {
      setBatchesLoading(false);
    }
  }, []);

  const loadConflicts = useCallback(async (batchId: string | null) => {
    setConflictsLoading(true);
    setConflicts([]);
    setSelectedConflictIds(new Set());
    try {
      const response = batchId
        ? await fetchBatchConflicts(batchId)
        : await fetchConflicts();
      setConflicts(response.data);
    } catch {
      console.error('Failed to load conflicts');
    } finally {
      setConflictsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBatches();
  }, [loadBatches]);

  /* ================================================================ */
  /*  Upload handlers                                                 */
  /* ================================================================ */

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
      setUploadResult(null);
      setUploadError(null);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0];
      const ext = droppedFile.name.split('.').pop()?.toLowerCase();
      if (['csv', 'xlsx', 'xls'].includes(ext || '')) {
        setFile(droppedFile);
        setUploadResult(null);
        setUploadError(null);
      } else {
        setUploadError('Please upload a CSV or Excel file (.csv, .xlsx, .xls)');
        toast.error('Unsupported file format. Please use CSV or Excel files.');
      }
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setUploadResult(null);
    setUploadError(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('team', team);
      formData.append('uploaded_by', uploadedBy);
      formData.append('description', description);
      const result = await uploadImport(formData);
      setUploadResult(result.data as UploadResult);
      setFile(null);
      setDescription('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      await loadBatches();
      toast.success('File imported successfully');
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Upload failed. Please try again.';
      setUploadError(message);
      toast.error(message);
    } finally {
      setUploading(false);
    }
  };

  /* ================================================================ */
  /*  Batch row click                                                 */
  /* ================================================================ */

  const handleBatchClick = (batchId: string) => {
    if (selectedBatchId === batchId) {
      setSelectedBatchId(null);
      setConflicts([]);
      setSelectedConflictIds(new Set());
    } else {
      setSelectedBatchId(batchId);
      loadConflicts(batchId);
    }
  };

  /* ================================================================ */
  /*  Single conflict resolution                                      */
  /* ================================================================ */

  const handleResolve = async (
    conflictId: string,
    strategy: ResolutionStrategy,
    manualVal?: string,
  ) => {
    try {
      await resolveConflict(conflictId, {
        resolution: strategy,
        resolved_by: uploadedBy || 'unknown',
        manual_value: manualVal,
      });
      setConflicts((prev) => prev.filter((c) => c.id !== conflictId));
      setSelectedConflictIds((prev) => {
        const next = new Set(prev);
        next.delete(conflictId);
        return next;
      });
      setManualInputId(null);
      setManualValue('');
      await loadBatches();
      toast.success('Conflict resolved');
    } catch {
      console.error('Failed to resolve conflict');
      toast.error('Failed to resolve conflict');
    }
  };

  /* ================================================================ */
  /*  Bulk resolve                                                    */
  /* ================================================================ */

  const toggleSelectAll = () => {
    if (selectedConflictIds.size === conflicts.length) {
      setSelectedConflictIds(new Set());
    } else {
      setSelectedConflictIds(new Set(conflicts.map((c) => c.id)));
    }
  };

  const toggleConflictSelect = (id: string) => {
    setSelectedConflictIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleBulkResolve = async (strategy: ResolutionStrategy) => {
    if (selectedConflictIds.size === 0) return;
    setBulkResolving(true);
    try {
      await bulkResolveConflicts({
        conflict_ids: Array.from(selectedConflictIds),
        resolution: strategy,
        resolved_by: uploadedBy || 'unknown',
      });
      setConflicts((prev) =>
        prev.filter((c) => !selectedConflictIds.has(c.id)),
      );
      setSelectedConflictIds(new Set());
      await loadBatches();
      toast.success(`Resolved ${selectedConflictIds.size} conflicts`);
    } catch {
      console.error('Bulk resolve failed');
      toast.error('Bulk resolve failed');
    } finally {
      setBulkResolving(false);
    }
  };

  /* ================================================================ */
  /*  Render helpers                                                  */
  /* ================================================================ */

  const ResultStat: React.FC<{
    label: string;
    value: number;
    icon: React.ReactNode;
    color: string;
    bgColor: string;
  }> = ({ label, value, icon, color, bgColor }) => (
    <div className={`flex items-center gap-3 rounded-lg px-4 py-3 ${bgColor}`}>
      <div className={`flex-shrink-0 ${color}`}>{icon}</div>
      <div>
        <p className={`text-xl font-bold ${color}`}>{value}</p>
        <p className="text-xs text-gray-500 font-medium">{label}</p>
      </div>
    </div>
  );

  /* ================================================================ */
  /*  Loading state                                                   */
  /* ================================================================ */

  if (batchesLoading && batches.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 lg:p-10">
        <div className="max-w-7xl mx-auto">
          <SkeletonPage />
        </div>
      </div>
    );
  }

  /* ================================================================ */
  /*  JSX                                                             */
  /* ================================================================ */

  return (
    <div className="min-h-screen bg-gray-50 p-6 lg:p-10">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* -------------------------------------------------------- */}
        {/*  Page header                                              */}
        {/* -------------------------------------------------------- */}
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 rounded-lg bg-brand-50 flex items-center justify-center">
              <ArrowDownToLine className="w-5 h-5 text-brand-500" />
            </div>
            <h1 className="text-2xl font-bold text-navy-500">Import Data</h1>
          </div>
          <p className="text-gray-500 mt-1 ml-12">
            Upload CSV or Excel files to import KOL records into the platform.
          </p>
        </div>

        {/* ======================================================== */}
        {/*  SECTION 1 -- Upload New                                  */}
        {/* ======================================================== */}
        <section className="bg-white rounded-lg shadow-card p-6">
          <h2 className="text-lg font-semibold text-navy-500 mb-5 flex items-center gap-2">
            <Upload className="w-5 h-5 text-brand-500" />
            Upload New File
          </h2>

          {/* Drag-and-drop zone */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`
              relative border-2 border-dashed rounded-xl py-16 px-8 text-center cursor-pointer
              transition-all duration-300 ease-in-out
              ${
                dragOver
                  ? 'border-brand-500 bg-brand-50 scale-[1.01]'
                  : 'border-gray-300 hover:border-brand-500 hover:bg-gray-50'
              }
            `}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              className="hidden"
              onChange={handleFileChange}
            />

            {file ? (
              <div className="flex flex-col items-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-brand-50 flex items-center justify-center">
                  <FileText className="w-7 h-7 text-brand-500" />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-base font-semibold text-navy-500">
                    {file.name}
                  </span>
                  <span className="text-xs text-gray-400">
                    ({(file.size / 1024).toFixed(1)} KB)
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setFile(null);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                    className="ml-2 p-1 rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-sm text-gray-400">
                  Click or drop another file to replace
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <div
                  className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-colors duration-300 ${
                    dragOver ? 'bg-brand-100' : 'bg-gray-100'
                  }`}
                >
                  <Upload
                    className={`w-8 h-8 transition-colors duration-300 ${
                      dragOver ? 'text-brand-500' : 'text-gray-400'
                    }`}
                  />
                </div>
                <div>
                  <p className="text-base font-semibold text-navy-500">
                    Drag &amp; drop your file here
                  </p>
                  <p className="text-sm text-gray-400 mt-1">
                    CSV or Excel (.csv, .xlsx, .xls)
                  </p>
                </div>
                <p className="text-sm text-brand-500 font-medium hover:text-brand-600 transition-colors">
                  or click to browse
                </p>
              </div>
            )}
          </div>

          {/* Form fields */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            {/* Team selector */}
            <div>
              <label
                htmlFor="team"
                className="block text-sm font-medium text-gray-700 mb-1.5"
              >
                Team
              </label>
              <select
                id="team"
                value={team}
                onChange={(e) => setTeam(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm bg-white
                           focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500
                           transition-shadow"
              >
                {TEAMS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            {/* Uploaded by */}
            <div>
              <label
                htmlFor="uploadedBy"
                className="block text-sm font-medium text-gray-700 mb-1.5"
              >
                Uploaded By
              </label>
              <input
                id="uploadedBy"
                type="text"
                placeholder="Your name"
                value={uploadedBy}
                onChange={(e) => setUploadedBy(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm
                           focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500
                           transition-shadow placeholder:text-gray-400"
              />
            </div>

            {/* Description */}
            <div>
              <label
                htmlFor="description"
                className="block text-sm font-medium text-gray-700 mb-1.5"
              >
                Description
              </label>
              <textarea
                id="description"
                rows={1}
                placeholder="Optional notes about this import"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm resize-y
                           focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500
                           transition-shadow placeholder:text-gray-400"
              />
            </div>
          </div>

          {/* Upload button */}
          <div className="mt-6 flex items-center gap-4">
            <button
              type="button"
              onClick={handleUpload}
              disabled={!file || uploading}
              className={`
                inline-flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold
                transition-all duration-200 shadow-sm
                ${
                  !file || uploading
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed shadow-none'
                    : 'bg-brand-500 text-white hover:bg-brand-600 hover:shadow-md active:scale-[0.98]'
                }
              `}
            >
              {uploading ? (
                <>
                  <svg
                    className="animate-spin h-4 w-4"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                    />
                  </svg>
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Upload File
                </>
              )}
            </button>

            {uploadError && (
              <motion.p
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="text-sm text-red-600 flex items-center gap-1.5"
              >
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                {uploadError}
              </motion.p>
            )}
          </div>

          {/* Upload result card */}
          <AnimatePresence>
            {uploadResult && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
                className="mt-6 bg-gradient-to-br from-green-50 to-brand-50 border border-green-200 rounded-xl p-6"
              >
                <h3 className="text-sm font-semibold text-navy-500 mb-4 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  Import Complete
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <ResultStat
                    label="New Records"
                    value={uploadResult.new_records}
                    icon={<CheckCircle2 className="w-5 h-5" />}
                    color="text-green-600"
                    bgColor="bg-white/70"
                  />
                  <ResultStat
                    label="Updated"
                    value={uploadResult.updated_records}
                    icon={<RefreshCw className="w-5 h-5" />}
                    color="text-blue-600"
                    bgColor="bg-white/70"
                  />
                  <ResultStat
                    label="Duplicates"
                    value={uploadResult.duplicate_records}
                    icon={<Copy className="w-5 h-5" />}
                    color="text-amber-600"
                    bgColor="bg-white/70"
                  />
                  <ResultStat
                    label="Errors"
                    value={uploadResult.error_records}
                    icon={<XCircle className="w-5 h-5" />}
                    color="text-red-600"
                    bgColor="bg-white/70"
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* ======================================================== */}
        {/*  SECTION 2 -- Import History                              */}
        {/* ======================================================== */}
        <section className="bg-white rounded-lg shadow-card p-6">
          <h2 className="text-lg font-semibold text-navy-500 mb-5 flex items-center gap-2">
            <History className="w-5 h-5 text-brand-500" />
            Import History
          </h2>

          {batchesLoading ? (
            <div className="py-10">
              <SkeletonPage />
            </div>
          ) : batches.length === 0 ? (
            <EmptyState
              icon={Upload}
              title="No imports yet"
              description="Upload your first KOL list to get started"
            />
          ) : (
            <div className="overflow-x-auto rounded-lg border border-gray-200">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    <th className="py-3 pl-4 pr-2 w-8" />
                    <th className="py-3 px-4">Filename</th>
                    <th className="py-3 px-4">Team</th>
                    <th className="py-3 px-4">Uploaded By</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4 text-center">New</th>
                    <th className="py-3 px-4 text-center">Updated</th>
                    <th className="py-3 px-4 text-center">Dup</th>
                    <th className="py-3 px-4 text-center">Err</th>
                    <th className="py-3 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {batches.map((batch, index) => {
                    const isSelected = selectedBatchId === batch.id;
                    const isEven = index % 2 === 0;
                    return (
                      <React.Fragment key={batch.id}>
                        <tr
                          onClick={() => handleBatchClick(batch.id)}
                          className={`
                            cursor-pointer transition-colors duration-150
                            ${
                              isSelected
                                ? 'bg-brand-50'
                                : isEven
                                  ? 'bg-white hover:bg-gray-50'
                                  : 'bg-gray-50/50 hover:bg-gray-100/60'
                            }
                          `}
                        >
                          <td className="py-3.5 pl-4 pr-2">
                            <ChevronRight
                              className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${
                                isSelected ? 'rotate-90 text-brand-500' : ''
                              }`}
                            />
                          </td>
                          <td className="py-3.5 px-4 font-medium text-navy-500 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <FileText className="w-4 h-4 text-gray-400 flex-shrink-0" />
                              {batch.filename}
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-gray-600 whitespace-nowrap">
                            {batch.team}
                          </td>
                          <td className="py-3.5 px-4 text-gray-600 whitespace-nowrap">
                            {batch.uploaded_by}
                          </td>
                          <td className="py-3.5 px-4 text-gray-500 whitespace-nowrap">
                            {formatDate(batch.created_at)}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <span className="font-semibold text-green-600">
                              {batch.new_records}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <span className="font-semibold text-blue-600">
                              {batch.updated_records}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <span className="font-semibold text-amber-500">
                              {batch.duplicate_records}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <span className="font-semibold text-red-600">
                              {batch.error_records}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <BatchStatusBadge batch={batch} />
                          </td>
                        </tr>

                        {/* Expanded conflict section for this batch */}
                        {isSelected && (
                          <tr>
                            <td colSpan={10} className="p-0">
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.3 }}
                                className="bg-gray-50 border-t border-gray-200"
                              >
                                <div className="p-6">
                                  {conflictsLoading ? (
                                    <div className="flex items-center justify-center gap-3 py-8">
                                      <svg
                                        className="animate-spin h-5 w-5 text-brand-500"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                      >
                                        <circle
                                          className="opacity-25"
                                          cx="12"
                                          cy="12"
                                          r="10"
                                          stroke="currentColor"
                                          strokeWidth="4"
                                        />
                                        <path
                                          className="opacity-75"
                                          fill="currentColor"
                                          d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                                        />
                                      </svg>
                                      <span className="text-sm text-gray-500">
                                        Loading conflicts...
                                      </span>
                                    </div>
                                  ) : conflicts.length === 0 ? (
                                    <div className="flex items-center justify-center gap-2 py-8">
                                      <CheckCircle2 className="w-5 h-5 text-green-500" />
                                      <span className="text-sm text-gray-500 font-medium">
                                        No unresolved conflicts for this batch.
                                      </span>
                                    </div>
                                  ) : (
                                    <ConflictResolutionSection
                                      conflicts={conflicts}
                                      selectedConflictIds={selectedConflictIds}
                                      bulkResolving={bulkResolving}
                                      manualInputId={manualInputId}
                                      manualValue={manualValue}
                                      onToggleSelectAll={toggleSelectAll}
                                      onToggleConflictSelect={toggleConflictSelect}
                                      onBulkResolve={handleBulkResolve}
                                      onResolve={handleResolve}
                                      onSetManualInputId={setManualInputId}
                                      onSetManualValue={setManualValue}
                                    />
                                  )}
                                </div>
                              </motion.div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

/* ================================================================== */
/*  Conflict Resolution Section (extracted for clarity)               */
/* ================================================================== */

interface ConflictResolutionSectionProps {
  conflicts: ImportConflict[];
  selectedConflictIds: Set<string>;
  bulkResolving: boolean;
  manualInputId: string | null;
  manualValue: string;
  onToggleSelectAll: () => void;
  onToggleConflictSelect: (id: string) => void;
  onBulkResolve: (strategy: ResolutionStrategy) => Promise<void>;
  onResolve: (
    conflictId: string,
    strategy: ResolutionStrategy,
    manualVal?: string,
  ) => Promise<void>;
  onSetManualInputId: (id: string | null) => void;
  onSetManualValue: (val: string) => void;
}

const ConflictResolutionSection: React.FC<ConflictResolutionSectionProps> = ({
  conflicts,
  selectedConflictIds,
  bulkResolving,
  manualInputId,
  manualValue,
  onToggleSelectAll,
  onToggleConflictSelect,
  onBulkResolve,
  onResolve,
  onSetManualInputId,
  onSetManualValue,
}) => {
  const allSelected = selectedConflictIds.size === conflicts.length;

  return (
    <div className="space-y-4">
      {/* Bulk actions toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white rounded-lg border border-gray-200 px-5 py-3.5 shadow-sm">
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2.5 text-sm cursor-pointer select-none">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={onToggleSelectAll}
              className="w-4 h-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500/20"
            />
            <span className="text-gray-700 font-semibold">
              Select All ({conflicts.length})
            </span>
          </label>
          {selectedConflictIds.size > 0 && (
            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
              {selectedConflictIds.size} selected
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 mr-1 font-medium">Bulk resolve:</span>
          <button
            type="button"
            disabled={selectedConflictIds.size === 0 || bulkResolving}
            onClick={() => onBulkResolve('keep_existing')}
            className={`
              inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold
              transition-all duration-150 shadow-sm
              ${
                selectedConflictIds.size === 0 || bulkResolving
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed shadow-none'
                  : 'bg-blue-50 text-blue-700 hover:bg-blue-100 ring-1 ring-inset ring-blue-200'
              }
            `}
          >
            <Shield className="w-3.5 h-3.5" />
            Keep Existing
          </button>
          <button
            type="button"
            disabled={selectedConflictIds.size === 0 || bulkResolving}
            onClick={() => onBulkResolve('use_incoming')}
            className={`
              inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold
              transition-all duration-150 shadow-sm
              ${
                selectedConflictIds.size === 0 || bulkResolving
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed shadow-none'
                  : 'bg-amber-50 text-amber-700 hover:bg-amber-100 ring-1 ring-inset ring-amber-200'
              }
            `}
          >
            <ArrowDownToLine className="w-3.5 h-3.5" />
            Use Incoming
          </button>
        </div>
      </div>

      {/* Conflict cards */}
      <div className="space-y-3">
        {conflicts.map((conflict, index) => (
          <motion.div
            key={conflict.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: index * 0.05 }}
            className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-card-hover transition-shadow duration-200"
          >
            {/* Card header */}
            <div className="flex items-start gap-3 mb-5">
              <input
                type="checkbox"
                checked={selectedConflictIds.has(conflict.id)}
                onChange={() => onToggleConflictSelect(conflict.id)}
                className="mt-1 w-4 h-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500/20"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                  <span className="font-semibold text-navy-500 text-sm">
                    {conflict.physician_name}
                  </span>
                  {conflict.physician_institution && (
                    <span className="text-xs text-gray-400">
                      at {conflict.physician_institution}
                    </span>
                  )}
                  <span className="inline-flex items-center bg-gray-100 text-gray-600 text-xs font-mono px-2.5 py-0.5 rounded-md ring-1 ring-inset ring-gray-200">
                    {conflict.field_name}
                  </span>
                </div>
                {conflict.created_at && (
                  <p className="text-xs text-gray-400 mt-1.5">
                    Detected {formatDateTime(conflict.created_at)}
                  </p>
                )}
              </div>
            </div>

            {/* Visual diff -- side by side */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
              {/* Existing value */}
              <div className="relative rounded-lg border border-blue-200 overflow-hidden">
                <div className="bg-blue-50 px-4 py-2 border-b border-blue-200">
                  <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5" />
                    Existing
                  </p>
                </div>
                <div className="px-4 py-3 bg-white">
                  <p className="text-sm text-navy-500 font-medium break-words">
                    {conflict.existing_value || (
                      <span className="italic text-gray-400">(empty)</span>
                    )}
                  </p>
                </div>
              </div>

              {/* Arrow between values (visible on larger screens) */}
              <div className="hidden sm:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none" />

              {/* Incoming value */}
              <div className="relative rounded-lg border border-amber-200 overflow-hidden">
                <div className="bg-amber-50 px-4 py-2 border-b border-amber-200">
                  <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide flex items-center gap-1.5">
                    <ArrowDownToLine className="w-3.5 h-3.5" />
                    Incoming
                  </p>
                </div>
                <div className="px-4 py-3">
                  {conflict.existing_value !== conflict.incoming_value ? (
                    <p className="text-sm font-medium break-words bg-amber-50 text-amber-700 px-2 py-1 rounded -mx-2 -my-1">
                      {conflict.incoming_value || (
                        <span className="italic text-gray-400">(empty)</span>
                      )}
                    </p>
                  ) : (
                    <p className="text-sm text-navy-500 font-medium break-words">
                      {conflict.incoming_value || (
                        <span className="italic text-gray-400">(empty)</span>
                      )}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Resolution buttons */}
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => onResolve(conflict.id, 'keep_existing')}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold
                           bg-blue-600 text-white hover:bg-blue-700 transition-all duration-150 shadow-sm
                           hover:shadow-md active:scale-[0.98]"
              >
                <Shield className="w-3.5 h-3.5" />
                Keep Existing
              </button>
              <button
                type="button"
                onClick={() => onResolve(conflict.id, 'use_incoming')}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold
                           bg-amber-500 text-white hover:bg-amber-600 transition-all duration-150 shadow-sm
                           hover:shadow-md active:scale-[0.98]"
              >
                <ArrowRight className="w-3.5 h-3.5" />
                Use Incoming
              </button>

              {manualInputId === conflict.id ? (
                <motion.div
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 'auto' }}
                  className="flex items-center gap-2 flex-1 min-w-[200px]"
                >
                  <input
                    type="text"
                    value={manualValue}
                    onChange={(e) => onSetManualValue(e.target.value)}
                    placeholder="Enter manual value..."
                    className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-xs
                               focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500
                               transition-shadow placeholder:text-gray-400"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && manualValue.trim()) {
                        onResolve(conflict.id, 'keep_existing', manualValue.trim());
                      }
                      if (e.key === 'Escape') {
                        onSetManualInputId(null);
                        onSetManualValue('');
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (manualValue.trim()) {
                        onResolve(conflict.id, 'keep_existing', manualValue.trim());
                      }
                    }}
                    disabled={!manualValue.trim()}
                    className={`
                      p-2 rounded-lg transition-all duration-150
                      ${
                        manualValue.trim()
                          ? 'bg-green-600 text-white hover:bg-green-700 shadow-sm'
                          : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      }
                    `}
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onSetManualInputId(null);
                      onSetManualValue('');
                    }}
                    className="p-2 rounded-lg bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </motion.div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    onSetManualInputId(conflict.id);
                    onSetManualValue('');
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold
                             bg-white text-gray-700 hover:bg-gray-50 ring-1 ring-inset ring-gray-200
                             transition-all duration-150 hover:ring-gray-300"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  Enter Manual
                </button>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default ImportData;
