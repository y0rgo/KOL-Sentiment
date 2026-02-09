import React, { useState, useEffect, useRef, useCallback } from 'react';
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
import {
  Upload,
  FileText,
  AlertTriangle,
  Check,
  X,
  ChevronRight,
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
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Upload failed. Please try again.';
      setUploadError(message);
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
    } catch {
      console.error('Failed to resolve conflict');
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
    } catch {
      console.error('Bulk resolve failed');
    } finally {
      setBulkResolving(false);
    }
  };

  /* ================================================================ */
  /*  Render helpers                                                  */
  /* ================================================================ */

  const StatBadge: React.FC<{
    label: string;
    value: number;
    color: string;
  }> = ({ label, value, color }) => (
    <div className="flex flex-col items-center">
      <span className={`text-2xl font-bold ${color}`}>{value}</span>
      <span className="text-xs text-gray-500 mt-1">{label}</span>
    </div>
  );

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
          <h1 className="text-2xl font-bold text-[#1e2a4a]">Import Data</h1>
          <p className="text-gray-500 mt-1">
            Upload CSV or Excel files to import KOL records into the platform.
          </p>
        </div>

        {/* ======================================================== */}
        {/*  SECTION 1 – Upload New                                   */}
        {/* ======================================================== */}
        <section className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold text-[#1e2a4a] mb-4 flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Upload New
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
              border-2 border-dashed rounded-lg p-10 text-center cursor-pointer
              transition-colors duration-200
              ${
                dragOver
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
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
            <Upload
              className={`w-10 h-10 mx-auto mb-3 ${
                dragOver ? 'text-blue-500' : 'text-gray-400'
              }`}
            />
            {file ? (
              <div className="flex items-center justify-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                <span className="text-sm font-medium text-[#1e2a4a]">
                  {file.name}
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setFile(null);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                  className="ml-2 text-gray-400 hover:text-red-500"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <>
                <p className="text-sm text-gray-600 font-medium">
                  Drag &amp; drop a CSV or Excel file here, or click to browse
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  Supported formats: .csv, .xlsx, .xls
                </p>
              </>
            )}
          </div>

          {/* Form fields */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-5">
            {/* Team selector */}
            <div>
              <label
                htmlFor="team"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Team
              </label>
              <select
                id="team"
                value={team}
                onChange={(e) => setTeam(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm
                           focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Uploaded By
              </label>
              <input
                id="uploadedBy"
                type="text"
                placeholder="Your name"
                value={uploadedBy}
                onChange={(e) => setUploadedBy(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm
                           focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Description */}
            <div>
              <label
                htmlFor="description"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Description
              </label>
              <textarea
                id="description"
                rows={1}
                placeholder="Optional notes about this import"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm resize-y
                           focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Upload button */}
          <div className="mt-5 flex items-center gap-4">
            <button
              type="button"
              onClick={handleUpload}
              disabled={!file || uploading}
              className={`
                inline-flex items-center gap-2 px-5 py-2.5 rounded-md text-sm font-medium
                transition-colors duration-200
                ${
                  !file || uploading
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
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
                  Uploading…
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Upload
                </>
              )}
            </button>

            {uploadError && (
              <p className="text-sm text-red-600 flex items-center gap-1">
                <AlertTriangle className="w-4 h-4" />
                {uploadError}
              </p>
            )}
          </div>

          {/* Upload result card */}
          {uploadResult && (
            <div className="mt-6 bg-gray-50 border border-gray-200 rounded-lg p-5">
              <h3 className="text-sm font-semibold text-[#1e2a4a] mb-4 flex items-center gap-2">
                <Check className="w-4 h-4 text-green-600" />
                Import Complete
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
                <StatBadge
                  label="New"
                  value={uploadResult.new_records}
                  color="text-green-600"
                />
                <StatBadge
                  label="Updated"
                  value={uploadResult.updated_records}
                  color="text-blue-600"
                />
                <StatBadge
                  label="Duplicates"
                  value={uploadResult.duplicate_records}
                  color="text-amber-500"
                />
                <StatBadge
                  label="Errors"
                  value={uploadResult.error_records}
                  color="text-red-600"
                />
              </div>
            </div>
          )}
        </section>

        {/* ======================================================== */}
        {/*  SECTION 2 – Import History                               */}
        {/* ======================================================== */}
        <section className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold text-[#1e2a4a] mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Import History
          </h2>

          {batchesLoading ? (
            <div className="text-center py-10 text-gray-400 text-sm">
              Loading batches…
            </div>
          ) : batches.length === 0 ? (
            <div className="text-center py-10 text-gray-400 text-sm">
              No imports yet. Upload a file above to get started.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    <th className="py-3 pr-4" />
                    <th className="py-3 pr-4">Filename</th>
                    <th className="py-3 pr-4">Team</th>
                    <th className="py-3 pr-4">Uploaded By</th>
                    <th className="py-3 pr-4">Date</th>
                    <th className="py-3 pr-4 text-center">New</th>
                    <th className="py-3 pr-4 text-center">Updated</th>
                    <th className="py-3 pr-4 text-center">Dup</th>
                    <th className="py-3 pr-4 text-center">Err</th>
                    <th className="py-3 pr-4 text-center">Conflicts</th>
                  </tr>
                </thead>
                <tbody>
                  {batches.map((batch) => {
                    const isSelected = selectedBatchId === batch.id;
                    return (
                      <React.Fragment key={batch.id}>
                        <tr
                          onClick={() => handleBatchClick(batch.id)}
                          className={`
                            border-b border-gray-100 cursor-pointer transition-colors
                            ${
                              isSelected
                                ? 'bg-blue-50'
                                : 'hover:bg-gray-50'
                            }
                          `}
                        >
                          <td className="py-3 pr-2">
                            <ChevronRight
                              className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${
                                isSelected ? 'rotate-90' : ''
                              }`}
                            />
                          </td>
                          <td className="py-3 pr-4 font-medium text-[#1e2a4a] whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <FileText className="w-4 h-4 text-gray-400 flex-shrink-0" />
                              {batch.filename}
                            </div>
                          </td>
                          <td className="py-3 pr-4 text-gray-600 whitespace-nowrap">
                            {batch.team}
                          </td>
                          <td className="py-3 pr-4 text-gray-600 whitespace-nowrap">
                            {batch.uploaded_by}
                          </td>
                          <td className="py-3 pr-4 text-gray-500 whitespace-nowrap">
                            {formatDate(batch.created_at)}
                          </td>
                          <td className="py-3 pr-4 text-center text-green-600 font-medium">
                            {batch.new_records}
                          </td>
                          <td className="py-3 pr-4 text-center text-blue-600 font-medium">
                            {batch.updated_records}
                          </td>
                          <td className="py-3 pr-4 text-center text-amber-500 font-medium">
                            {batch.duplicate_records}
                          </td>
                          <td className="py-3 pr-4 text-center text-red-600 font-medium">
                            {batch.error_records}
                          </td>
                          <td className="py-3 pr-4 text-center">
                            {(batch.pending_conflicts ?? 0) > 0 ? (
                              <span className="inline-flex items-center gap-1 text-amber-600 font-medium">
                                <AlertTriangle className="w-3.5 h-3.5" />
                                {batch.pending_conflicts}
                              </span>
                            ) : (
                              <span className="text-gray-400">0</span>
                            )}
                          </td>
                        </tr>

                        {/* Expanded conflict section for this batch */}
                        {isSelected && (
                          <tr>
                            <td colSpan={10} className="p-0">
                              <div className="bg-gray-50 border-t border-gray-200 p-5">
                                {conflictsLoading ? (
                                  <p className="text-center text-gray-400 text-sm py-4">
                                    Loading conflicts…
                                  </p>
                                ) : conflicts.length === 0 ? (
                                  <p className="text-center text-gray-400 text-sm py-4 flex items-center justify-center gap-2">
                                    <Check className="w-4 h-4 text-green-500" />
                                    No unresolved conflicts for this batch.
                                  </p>
                                ) : (
                                  /* Render conflict resolution section inline */
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
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white rounded-lg border border-gray-200 px-4 py-3">
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={onToggleSelectAll}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-gray-700 font-medium">
              Select All ({conflicts.length})
            </span>
          </label>
          {selectedConflictIds.size > 0 && (
            <span className="text-xs text-gray-400">
              {selectedConflictIds.size} selected
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 mr-1">Bulk resolve:</span>
          <button
            type="button"
            disabled={selectedConflictIds.size === 0 || bulkResolving}
            onClick={() => onBulkResolve('keep_existing')}
            className={`
              inline-flex items-center gap-1 px-3 py-1.5 rounded text-xs font-medium
              transition-colors duration-150
              ${
                selectedConflictIds.size === 0 || bulkResolving
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
              }
            `}
          >
            <Check className="w-3.5 h-3.5" />
            Keep Existing
          </button>
          <button
            type="button"
            disabled={selectedConflictIds.size === 0 || bulkResolving}
            onClick={() => onBulkResolve('use_incoming')}
            className={`
              inline-flex items-center gap-1 px-3 py-1.5 rounded text-xs font-medium
              transition-colors duration-150
              ${
                selectedConflictIds.size === 0 || bulkResolving
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-amber-100 text-amber-700 hover:bg-amber-200'
              }
            `}
          >
            <Check className="w-3.5 h-3.5" />
            Use Incoming
          </button>
        </div>
      </div>

      {/* Conflict cards */}
      <div className="space-y-3">
        {conflicts.map((conflict) => (
          <div
            key={conflict.id}
            className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-sm transition-shadow"
          >
            {/* Card header */}
            <div className="flex items-start gap-3 mb-4">
              <input
                type="checkbox"
                checked={selectedConflictIds.has(conflict.id)}
                onChange={() => onToggleConflictSelect(conflict.id)}
                className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                  <span className="font-semibold text-[#1e2a4a] text-sm">
                    {conflict.physician_name}
                  </span>
                  <span className="inline-block bg-gray-100 text-gray-600 text-xs font-mono px-2 py-0.5 rounded">
                    {conflict.field_name}
                  </span>
                </div>
                {conflict.created_at && (
                  <p className="text-xs text-gray-400 mt-1">
                    Detected {formatDateTime(conflict.created_at)}
                  </p>
                )}
              </div>
            </div>

            {/* Value comparison */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
              {/* Existing value */}
              <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-1">
                  Existing Value
                </p>
                <p className="text-sm text-[#1e2a4a] font-medium break-words">
                  {conflict.existing_value || (
                    <span className="italic text-gray-400">(empty)</span>
                  )}
                </p>
              </div>

              {/* Incoming value */}
              <div className="bg-amber-50 border border-amber-200 rounded-md p-3">
                <p className="text-xs font-semibold text-amber-600 uppercase tracking-wide mb-1">
                  Incoming Value
                </p>
                <p className="text-sm text-[#1e2a4a] font-medium break-words">
                  {conflict.incoming_value || (
                    <span className="italic text-gray-400">(empty)</span>
                  )}
                </p>
              </div>
            </div>

            {/* Resolution buttons */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => onResolve(conflict.id, 'keep_existing')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium
                           bg-blue-600 text-white hover:bg-blue-700 transition-colors"
              >
                <Check className="w-3.5 h-3.5" />
                Keep Existing
              </button>
              <button
                type="button"
                onClick={() => onResolve(conflict.id, 'use_incoming')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium
                           bg-amber-500 text-white hover:bg-amber-600 transition-colors"
              >
                <Check className="w-3.5 h-3.5" />
                Use Incoming
              </button>

              {manualInputId === conflict.id ? (
                <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                  <input
                    type="text"
                    value={manualValue}
                    onChange={(e) => onSetManualValue(e.target.value)}
                    placeholder="Enter manual value…"
                    className="flex-1 rounded-md border border-gray-300 px-3 py-1.5 text-xs
                               focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                      p-1.5 rounded-md transition-colors
                      ${
                        manualValue.trim()
                          ? 'bg-green-600 text-white hover:bg-green-700'
                          : 'bg-gray-200 text-gray-400 cursor-not-allowed'
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
                    className="p-1.5 rounded-md bg-gray-200 text-gray-500 hover:bg-gray-300 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    onSetManualInputId(conflict.id);
                    onSetManualValue('');
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium
                             bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300 transition-colors"
                >
                  Enter Manual
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ImportData;
