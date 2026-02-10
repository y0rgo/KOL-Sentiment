import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  ChevronDown,
  X,
  ChevronLeft,
  ChevronRight,
  Edit2,
  Save,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Loader2,
  Users,
  ExternalLink,
  CheckCircle,
  TrendingUp,
  Award,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { fetchPhysicians, fetchPhysician, updatePhysician, transitionStatus } from '../api/client';
import type { Physician, PhysicianListResponse } from '../types';
import {
  STATUS_COLORS,
  STATUS_LABELS,
  VALID_TRANSITIONS,
  ALL_STATUSES,
  SOURCE_LABELS,
} from '../utils/statusUtils';
import { formatDate } from '../utils/formatters';
import { StatusBadge, TierBadge } from '../components/ui/StatusBadge';
import { SkeletonPage } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import type { LucideIcon } from 'lucide-react';

/* -------------------------------------------------------------------------- */
/*  Constants                                                                 */
/* -------------------------------------------------------------------------- */

const PAGE_SIZES = [25, 50, 100] as const;

const SORT_OPTIONS = [
  { value: 'last_name', label: 'Name' },
  { value: 'created_at', label: 'Date Created' },
  { value: 'completeness_score', label: 'Completeness' },
] as const;

const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA',
  'KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT',
  'VA','WA','WV','WI','WY','DC',
] as const;

const SOURCE_CHANNELS = Object.keys(SOURCE_LABELS);

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

function completenessBarColor(score: number): string {
  if (score < 40) return '#EF4444';
  if (score <= 70) return '#F59E0B';
  return '#22C55E';
}

function completenessTrackColor(score: number): string {
  if (score < 40) return 'bg-red-100';
  if (score <= 70) return 'bg-amber-100';
  return 'bg-green-100';
}

function completenessColor(score: number): string {
  if (score < 40) return 'bg-red-500';
  if (score <= 70) return 'bg-amber-500';
  return 'bg-green-500';
}

/* -------------------------------------------------------------------------- */
/*  StatCard                                                                  */
/* -------------------------------------------------------------------------- */

function StatCard({
  icon: Icon,
  label,
  value,
  iconBg,
  iconColor,
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
  iconBg: string;
  iconColor: string;
}) {
  return (
    <div className="bg-white rounded-lg shadow-card p-4 flex items-center gap-4">
      <div className={`flex-shrink-0 w-11 h-11 rounded-full flex items-center justify-center ${iconBg}`}>
        <Icon className={`w-5 h-5 ${iconColor}`} />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide truncate">
          {label}
        </p>
        <p className="text-xl font-bold text-gray-900 leading-tight mt-0.5">
          {value}
        </p>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  PhysicianDrawer                                                           */
/* -------------------------------------------------------------------------- */

interface DrawerProps {
  physicianId: string | null;
  onClose: () => void;
  onUpdated: () => void;
}

function PhysicianDrawer({ physicianId, onClose, onUpdated }: DrawerProps) {
  const navigate = useNavigate();
  const [physician, setPhysician] = useState<Physician | null>(null);
  const [loading, setLoading] = useState(false);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [transitioning, setTransitioning] = useState(false);

  useEffect(() => {
    if (!physicianId) return;
    setLoading(true);
    fetchPhysician(physicianId)
      .then((res) => setPhysician(res.data))
      .catch(() => setPhysician(null))
      .finally(() => setLoading(false));
  }, [physicianId]);

  const startEdit = (field: string, currentValue: string | null) => {
    setEditingField(field);
    setEditValue(currentValue ?? '');
  };

  const cancelEdit = () => {
    setEditingField(null);
    setEditValue('');
  };

  const saveEdit = async () => {
    if (!physician || !editingField) return;
    setSaving(true);
    try {
      await updatePhysician(physician.id, { [editingField]: editValue || null });
      const res = await fetchPhysician(physician.id);
      setPhysician(res.data);
      setEditingField(null);
      setEditValue('');
      onUpdated();
      toast.success('Field updated successfully');
    } catch {
      toast.error('Failed to update field');
    } finally {
      setSaving(false);
    }
  };

  const handleTransition = async (newStatus: string) => {
    if (!physician) return;
    setTransitioning(true);
    try {
      await transitionStatus(physician.id, {
        new_status: newStatus,
        changed_by: 'current_user',
      });
      const res = await fetchPhysician(physician.id);
      setPhysician(res.data);
      onUpdated();
      toast.success(`Status changed to ${STATUS_LABELS[newStatus] ?? newStatus}`);
    } catch {
      toast.error('Failed to change status');
    } finally {
      setTransitioning(false);
    }
  };

  const isOpen = physicianId !== null;

  /* Editable field row */
  const EditableField = ({
    label,
    field,
    value,
  }: {
    label: string;
    field: string;
    value: string | null;
  }) => {
    const isEditing = editingField === field;
    return (
      <div className="flex items-start justify-between py-2 group">
        <div className="flex-1 min-w-0">
          <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            {label}
          </dt>
          {isEditing ? (
            <div className="flex items-center gap-2 mt-1">
              <input
                type="text"
                className="flex-1 px-2 py-1 text-sm border border-brand-300 rounded-lg focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 focus:outline-none"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') saveEdit();
                  if (e.key === 'Escape') cancelEdit();
                }}
                autoFocus
              />
              <button
                onClick={saveEdit}
                disabled={saving}
                className="p-1 text-brand-600 hover:text-brand-800 disabled:opacity-50"
                title="Save"
              >
                <Save className="w-4 h-4" />
              </button>
              <button
                onClick={cancelEdit}
                className="p-1 text-gray-400 hover:text-gray-600"
                title="Cancel"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <dd className="mt-0.5 text-sm text-gray-900">
              {value || <span className="text-gray-400 italic">Not set</span>}
            </dd>
          )}
        </div>
        {!isEditing && (
          <button
            onClick={() => startEdit(field, value)}
            className="p-1 text-gray-300 hover:text-navy-500 opacity-0 group-hover:opacity-100 transition-opacity mt-3"
            title={`Edit ${label}`}
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    );
  };

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-40 transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Drawer panel */}
      <div
        className={`fixed top-0 right-0 h-full w-[500px] bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Close button (floating) */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-1.5 rounded-lg bg-white/80 backdrop-blur-sm hover:bg-white text-gray-500 hover:text-gray-700 transition-colors shadow-sm"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Body */}
        <div className="overflow-y-auto h-full">
          {loading && (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
            </div>
          )}

          {!loading && !physician && (
            <div className="flex items-center justify-center h-64 text-gray-400">
              Physician not found
            </div>
          )}

          {!loading && physician && (
            <div className="divide-y divide-gray-100">
              {/* Hero header with gradient background */}
              <div className="px-6 pt-6 pb-5 bg-gradient-to-r from-navy-500/5 to-brand-500/5">
                <h2 className="text-xl font-bold text-navy-600 leading-tight">
                  {physician.first_name} {physician.last_name}
                </h2>
                {physician.credentials && (
                  <p className="text-sm text-gray-500 mt-0.5">{physician.credentials}</p>
                )}
                {physician.institution_name && (
                  <p className="text-sm text-gray-600 mt-1 font-medium">
                    {physician.institution_name}
                  </p>
                )}

                {/* Status + Tier */}
                <div className="flex items-center gap-3 mt-4">
                  <StatusBadge status={physician.record_status} size="sm" />
                  {physician.tier && <TierBadge tier={physician.tier} />}
                </div>

                {/* Completeness bar */}
                <div className="mt-4">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-gray-600">
                      Completeness
                    </span>
                    <span className="text-xs font-bold text-gray-700">
                      {Math.round(physician.completeness_score)}%
                    </span>
                  </div>
                  <div
                    className={`w-full h-2.5 rounded-full ${completenessTrackColor(
                      physician.completeness_score
                    )}`}
                  >
                    <div
                      className={`h-2.5 rounded-full transition-all ${completenessColor(
                        physician.completeness_score
                      )}`}
                      style={{
                        width: `${Math.min(100, physician.completeness_score)}%`,
                      }}
                    />
                  </div>
                </div>

                {/* Transition buttons */}
                {VALID_TRANSITIONS[physician.record_status]?.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-4">
                    {VALID_TRANSITIONS[physician.record_status].map((target) => (
                      <button
                        key={target}
                        disabled={transitioning}
                        onClick={() => handleTransition(target)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors disabled:opacity-50 ${
                          target === 'validated'
                            ? 'bg-green-50 border-green-300 text-green-700 hover:bg-green-100'
                            : target === 'declined'
                            ? 'bg-red-50 border-red-300 text-red-700 hover:bg-red-100'
                            : target === 'under_review'
                            ? 'bg-orange-50 border-orange-300 text-orange-700 hover:bg-orange-100'
                            : target === 'archived'
                            ? 'bg-gray-50 border-gray-300 text-gray-700 hover:bg-gray-100'
                            : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        {transitioning ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : null}
                        Move to {STATUS_LABELS[target] ?? target}
                      </button>
                    ))}
                  </div>
                )}

                {/* Persona link */}
                {physician.record_status === 'validated' && (
                  <button
                    onClick={() => navigate(`/persona/${physician.id}`)}
                    className="mt-3 inline-flex items-center gap-1.5 text-sm text-brand-600 hover:text-brand-800 font-medium"
                  >
                    <ExternalLink className="w-4 h-4" />
                    View Full Persona
                  </button>
                )}
              </div>

              {/* Identity fields */}
              <div className="px-6 py-4">
                <h3 className="text-xs font-bold text-navy-500 uppercase tracking-wider mb-2">
                  Identity
                </h3>
                <dl className="divide-y divide-gray-50">
                  <EditableField label="First Name" field="first_name" value={physician.first_name} />
                  <EditableField label="Last Name" field="last_name" value={physician.last_name} />
                  <EditableField label="NPI" field="npi" value={physician.npi} />
                  <EditableField label="Credentials" field="credentials" value={physician.credentials} />
                  <EditableField label="Specialty" field="specialty" value={physician.specialty} />
                  <EditableField label="Subspecialty" field="subspecialty" value={physician.subspecialty} />
                  <EditableField label="Practice Type" field="practice_type" value={physician.practice_type} />
                </dl>
              </div>

              {/* Institution / Location */}
              <div className="px-6 py-4">
                <h3 className="text-xs font-bold text-navy-500 uppercase tracking-wider mb-2">
                  Institution &amp; Location
                </h3>
                <dl className="divide-y divide-gray-50">
                  <EditableField
                    label="Institution"
                    field="institution_name"
                    value={physician.institution_name}
                  />
                  <EditableField
                    label="Institution Type"
                    field="institution_type"
                    value={physician.institution_type}
                  />
                  <EditableField label="City" field="city" value={physician.city} />
                  <EditableField label="State" field="state" value={physician.state} />
                  <EditableField label="Region" field="region" value={physician.region} />
                  <EditableField label="Country" field="country" value={physician.country} />
                </dl>
              </div>

              {/* Professional */}
              <div className="px-6 py-4">
                <h3 className="text-xs font-bold text-navy-500 uppercase tracking-wider mb-2">
                  Professional
                </h3>
                <dl className="divide-y divide-gray-50">
                  <EditableField
                    label="Years in Practice"
                    field="years_in_practice"
                    value={
                      physician.years_in_practice !== null
                        ? String(physician.years_in_practice)
                        : null
                    }
                  />
                  <EditableField
                    label="Fellowship Training"
                    field="fellowship_training"
                    value={physician.fellowship_training}
                  />
                  <EditableField
                    label="Institutional Role"
                    field="institutional_role"
                    value={physician.institutional_role}
                  />
                </dl>
              </div>

              {/* Source info */}
              <div className="px-6 py-4">
                <h3 className="text-xs font-bold text-navy-500 uppercase tracking-wider mb-2">
                  Source
                </h3>
                <dl className="divide-y divide-gray-50">
                  <div className="py-2">
                    <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                      Channel
                    </dt>
                    <dd className="mt-0.5 text-sm text-gray-900">
                      {SOURCE_LABELS[physician.source_channel] ?? physician.source_channel}
                    </dd>
                  </div>
                  <div className="py-2">
                    <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                      Detail
                    </dt>
                    <dd className="mt-0.5 text-sm text-gray-900">
                      {physician.source_detail || (
                        <span className="text-gray-400 italic">Not set</span>
                      )}
                    </dd>
                  </div>
                </dl>
              </div>

              {/* Notes */}
              <div className="px-6 py-4">
                <h3 className="text-xs font-bold text-navy-500 uppercase tracking-wider mb-2">
                  Notes
                </h3>
                <EditableField label="Notes" field="notes" value={physician.notes} />
              </div>

              {/* Meta */}
              <div className="px-6 py-4 bg-gray-50 text-xs text-gray-500 space-y-1">
                <div>
                  <span className="font-medium">Created:</span>{' '}
                  {formatDate(physician.created_at)}
                </div>
                <div>
                  <span className="font-medium">Updated:</span>{' '}
                  {formatDate(physician.updated_at)}
                </div>
                {physician.status_changed_at && (
                  <div>
                    <span className="font-medium">Status changed:</span>{' '}
                    {formatDate(physician.status_changed_at)}
                    {physician.status_changed_by
                      ? ` by ${physician.status_changed_by}`
                      : ''}
                  </div>
                )}
                <div className="font-mono text-[10px] text-gray-400 pt-1">
                  ID: {physician.id}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

/* -------------------------------------------------------------------------- */
/*  MasterList Page                                                           */
/* -------------------------------------------------------------------------- */

export default function MasterList() {
  /* ---------- state ---------- */
  const [data, setData] = useState<PhysicianListResponse | null>(null);
  const [loading, setLoading] = useState(true);

  // filters
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [sourceChannel, setSourceChannel] = useState('');
  const [stateFilter, setStateFilter] = useState('');
  const [sortBy, setSortBy] = useState('last_name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(25);

  // drawer
  const [drawerPhysicianId, setDrawerPhysicianId] = useState<string | null>(null);

  // dropdowns
  const [showSourceDropdown, setShowSourceDropdown] = useState(false);
  const [showStateDropdown, setShowStateDropdown] = useState(false);
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [showPageSizeDropdown, setShowPageSizeDropdown] = useState(false);

  const sourceRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef<HTMLDivElement>(null);
  const sortRef = useRef<HTMLDivElement>(null);
  const pageSizeRef = useRef<HTMLDivElement>(null);

  /* ---------- debounce search ---------- */
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  /* ---------- close dropdowns on outside click ---------- */
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (sourceRef.current && !sourceRef.current.contains(e.target as Node))
        setShowSourceDropdown(false);
      if (stateRef.current && !stateRef.current.contains(e.target as Node))
        setShowStateDropdown(false);
      if (sortRef.current && !sortRef.current.contains(e.target as Node))
        setShowSortDropdown(false);
      if (pageSizeRef.current && !pageSizeRef.current.contains(e.target as Node))
        setShowPageSizeDropdown(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  /* ---------- fetch ---------- */
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = {
        page,
        page_size: pageSize,
        sort_by: sortBy,
        sort_order: sortOrder,
      };
      if (debouncedSearch) params.search = debouncedSearch;
      if (selectedStatuses.length > 0) params.status = selectedStatuses.join(',');
      if (sourceChannel) params.source_channel = sourceChannel;
      if (stateFilter) params.state = stateFilter;

      const res = await fetchPhysicians(params);
      setData(res.data);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, sortBy, sortOrder, debouncedSearch, selectedStatuses, sourceChannel, stateFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  /* ---------- computed hero stats ---------- */
  const heroStats = useMemo(() => {
    const physicians = data?.items ?? [];
    const totalCount = data?.total ?? 0;
    const validatedCount = physicians.filter((p) => p.record_status === 'validated').length;
    const avgCompleteness =
      physicians.length > 0
        ? Math.round(
            physicians.reduce((sum, p) => sum + p.completeness_score, 0) / physicians.length
          )
        : 0;
    const physWithTier = physicians.filter((p) => p.tier_score !== null && p.tier_score !== undefined);
    const avgTierScore =
      physWithTier.length > 0
        ? (
            physWithTier.reduce((sum, p) => sum + (p.tier_score ?? 0), 0) / physWithTier.length
          ).toFixed(1)
        : '--';
    return { totalCount, validatedCount, avgCompleteness, avgTierScore };
  }, [data]);

  /* ---------- handlers ---------- */
  const toggleStatus = (status: string) => {
    setSelectedStatuses((prev) =>
      prev.includes(status)
        ? prev.filter((s) => s !== status)
        : [...prev, status]
    );
    setPage(1);
  };

  const clearFilters = () => {
    setSearch('');
    setDebouncedSearch('');
    setSelectedStatuses([]);
    setSourceChannel('');
    setStateFilter('');
    setSortBy('last_name');
    setSortOrder('asc');
    setPage(1);
  };

  const hasActiveFilters =
    debouncedSearch ||
    selectedStatuses.length > 0 ||
    sourceChannel ||
    stateFilter;

  const totalPages = data?.total_pages ?? 1;
  const totalCount = data?.total ?? 0;
  const physicians = data?.items ?? [];

  /* ---------- render ---------- */

  if (loading && !data) {
    return <SkeletonPage />;
  }

  return (
    <div className="space-y-5">
      {/* ---- Page header ---- */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-navy-600">Master KOL List</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {totalCount.toLocaleString()} physician{totalCount !== 1 ? 's' : ''} in database
          </p>
        </div>
      </div>

      {/* ---- Hero stat cards ---- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Users}
          label="Total Physicians"
          value={heroStats.totalCount.toLocaleString()}
          iconBg="bg-blue-100"
          iconColor="text-blue-600"
        />
        <StatCard
          icon={CheckCircle}
          label="Validated"
          value={heroStats.validatedCount.toLocaleString()}
          iconBg="bg-emerald-100"
          iconColor="text-emerald-600"
        />
        <StatCard
          icon={TrendingUp}
          label="Avg Completeness"
          value={`${heroStats.avgCompleteness}%`}
          iconBg="bg-amber-100"
          iconColor="text-amber-600"
        />
        <StatCard
          icon={Award}
          label="Avg Tier Score"
          value={heroStats.avgTierScore}
          iconBg="bg-purple-100"
          iconColor="text-purple-600"
        />
      </div>

      {/* ---- Filter bar ---- */}
      <div className="bg-white rounded-lg shadow-card p-4 space-y-3">
        {/* Row 1: search + dropdowns */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-[240px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name or NPI..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-8 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 focus:outline-none transition-colors"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Source dropdown */}
          <div className="relative" ref={sourceRef}>
            <button
              onClick={() => setShowSourceDropdown(!showSourceDropdown)}
              className={`inline-flex items-center gap-1.5 px-3 py-2 text-sm border rounded-lg transition-colors ${
                sourceChannel
                  ? 'border-brand-300 bg-brand-50 text-brand-700'
                  : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              {sourceChannel
                ? SOURCE_LABELS[sourceChannel] ?? sourceChannel
                : 'Source'}
              <ChevronDown className="w-4 h-4" />
            </button>
            {showSourceDropdown && (
              <div className="absolute top-full left-0 mt-1 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-30 py-1 max-h-64 overflow-y-auto">
                <button
                  onClick={() => {
                    setSourceChannel('');
                    setShowSourceDropdown(false);
                    setPage(1);
                  }}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 ${
                    !sourceChannel ? 'font-medium text-brand-600' : 'text-gray-700'
                  }`}
                >
                  All Sources
                </button>
                {SOURCE_CHANNELS.map((ch) => (
                  <button
                    key={ch}
                    onClick={() => {
                      setSourceChannel(ch);
                      setShowSourceDropdown(false);
                      setPage(1);
                    }}
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 ${
                      sourceChannel === ch
                        ? 'font-medium text-brand-600'
                        : 'text-gray-700'
                    }`}
                  >
                    {SOURCE_LABELS[ch]}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* State dropdown */}
          <div className="relative" ref={stateRef}>
            <button
              onClick={() => setShowStateDropdown(!showStateDropdown)}
              className={`inline-flex items-center gap-1.5 px-3 py-2 text-sm border rounded-lg transition-colors ${
                stateFilter
                  ? 'border-brand-300 bg-brand-50 text-brand-700'
                  : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              {stateFilter || 'State'}
              <ChevronDown className="w-4 h-4" />
            </button>
            {showStateDropdown && (
              <div className="absolute top-full left-0 mt-1 w-36 bg-white border border-gray-200 rounded-lg shadow-lg z-30 py-1 max-h-64 overflow-y-auto">
                <button
                  onClick={() => {
                    setStateFilter('');
                    setShowStateDropdown(false);
                    setPage(1);
                  }}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 ${
                    !stateFilter ? 'font-medium text-brand-600' : 'text-gray-700'
                  }`}
                >
                  All States
                </button>
                {US_STATES.map((st) => (
                  <button
                    key={st}
                    onClick={() => {
                      setStateFilter(st);
                      setShowStateDropdown(false);
                      setPage(1);
                    }}
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 ${
                      stateFilter === st
                        ? 'font-medium text-brand-600'
                        : 'text-gray-700'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Sort dropdown */}
          <div className="relative" ref={sortRef}>
            <button
              onClick={() => setShowSortDropdown(!showSortDropdown)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-200 bg-white text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <ArrowUpDown className="w-4 h-4" />
              {SORT_OPTIONS.find((o) => o.value === sortBy)?.label ?? 'Sort'}
            </button>
            {showSortDropdown && (
              <div className="absolute top-full right-0 mt-1 w-44 bg-white border border-gray-200 rounded-lg shadow-lg z-30 py-1">
                {SORT_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => {
                      setSortBy(opt.value);
                      setShowSortDropdown(false);
                      setPage(1);
                    }}
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 ${
                      sortBy === opt.value
                        ? 'font-medium text-brand-600'
                        : 'text-gray-700'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Sort order toggle */}
          <button
            onClick={() => {
              setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
              setPage(1);
            }}
            className="inline-flex items-center gap-1 px-3 py-2 text-sm border border-gray-200 bg-white text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            title={sortOrder === 'asc' ? 'Ascending' : 'Descending'}
          >
            {sortOrder === 'asc' ? (
              <ArrowUp className="w-4 h-4" />
            ) : (
              <ArrowDown className="w-4 h-4" />
            )}
          </button>

          {/* Clear filters */}
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="inline-flex items-center gap-1 px-3 py-2 text-sm text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
              Clear
            </button>
          )}
        </div>

        {/* Row 2: status chips */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wide mr-1">
            Status:
          </span>
          {ALL_STATUSES.map((status) => {
            const colors = STATUS_COLORS[status];
            const isSelected = selectedStatuses.includes(status);
            return (
              <button
                key={status}
                onClick={() => toggleStatus(status)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
                  isSelected
                    ? `${colors.bg} ${colors.text} border-current ring-1 ring-current/20`
                    : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    isSelected ? colors.dot : 'bg-gray-400'
                  }`}
                />
                {STATUS_LABELS[status]}
              </button>
            );
          })}
        </div>
      </div>

      {/* ---- Table ---- */}
      <div className="bg-white rounded-lg shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-navy-500 text-white text-left">
                <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wider">
                  Name
                </th>
                <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wider">
                  Credentials
                </th>
                <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wider">
                  Institution
                </th>
                <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wider">
                  State
                </th>
                <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wider">
                  Source
                </th>
                <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wider">
                  Tier
                </th>
                <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wider min-w-[140px]">
                  Completeness
                </th>
                <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wider">
                  Created
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading && (
                <tr>
                  <td colSpan={9} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
                      <span className="text-sm text-gray-500">
                        Loading physicians...
                      </span>
                    </div>
                  </td>
                </tr>
              )}

              {!loading && physicians.length === 0 && (
                <tr>
                  <td colSpan={9}>
                    <EmptyState
                      icon={Users}
                      title="No physicians found"
                      description={
                        hasActiveFilters
                          ? 'Try adjusting your search or filters'
                          : 'Import or nominate physicians to get started'
                      }
                      actionLabel={hasActiveFilters ? 'Clear all filters' : undefined}
                      onAction={hasActiveFilters ? clearFilters : undefined}
                    />
                  </td>
                </tr>
              )}

              {!loading &&
                physicians.map((p, index) => (
                  <tr
                    key={p.id}
                    onClick={() => setDrawerPhysicianId(p.id)}
                    className={`table-row-hover cursor-pointer transition-colors ${
                      index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                    }`}
                  >
                    {/* Name */}
                    <td className="px-4 py-3">
                      <div className="font-medium text-navy-600">
                        {p.first_name} {p.last_name}
                      </div>
                      {p.npi && (
                        <div className="text-xs text-gray-400 mt-0.5">
                          NPI: {p.npi}
                        </div>
                      )}
                    </td>

                    {/* Credentials */}
                    <td className="px-4 py-3 text-gray-600">
                      {p.credentials || (
                        <span className="text-gray-300">&mdash;</span>
                      )}
                    </td>

                    {/* Institution */}
                    <td className="px-4 py-3 text-gray-600 max-w-[200px] truncate">
                      {p.institution_name || (
                        <span className="text-gray-300">&mdash;</span>
                      )}
                    </td>

                    {/* State */}
                    <td className="px-4 py-3 text-gray-600">
                      {p.state || (
                        <span className="text-gray-300">&mdash;</span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3">
                      <StatusBadge status={p.record_status} size="xs" />
                    </td>

                    {/* Source */}
                    <td className="px-4 py-3">
                      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                        {SOURCE_LABELS[p.source_channel] ?? p.source_channel}
                      </span>
                    </td>

                    {/* Tier */}
                    <td className="px-4 py-3">
                      <TierBadge tier={p.tier} />
                    </td>

                    {/* Completeness */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 rounded-full bg-gray-200">
                          <div
                            className="h-2 rounded-full transition-all"
                            style={{
                              width: `${Math.min(100, p.completeness_score)}%`,
                              backgroundColor: completenessBarColor(p.completeness_score),
                            }}
                          />
                        </div>
                        <span className="text-xs text-gray-500 w-8 text-right tabular-nums font-medium">
                          {Math.round(p.completeness_score)}%
                        </span>
                      </div>
                    </td>

                    {/* Created */}
                    <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                      {formatDate(p.created_at)}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        {/* ---- Pagination ---- */}
        {!loading && physicians.length > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
            {/* Left: page size */}
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span>Show</span>
              <div className="relative" ref={pageSizeRef}>
                <button
                  onClick={() =>
                    setShowPageSizeDropdown(!showPageSizeDropdown)
                  }
                  className="inline-flex items-center gap-1 px-2.5 py-1 border border-gray-200 rounded-lg bg-white text-sm hover:bg-gray-50"
                >
                  {pageSize}
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
                {showPageSizeDropdown && (
                  <div className="absolute bottom-full left-0 mb-1 w-20 bg-white border border-gray-200 rounded-lg shadow-lg z-30 py-1">
                    {PAGE_SIZES.map((size) => (
                      <button
                        key={size}
                        onClick={() => {
                          setPageSize(size);
                          setPage(1);
                          setShowPageSizeDropdown(false);
                        }}
                        className={`w-full text-left px-3 py-1.5 text-sm hover:bg-gray-50 ${
                          pageSize === size
                            ? 'font-medium text-brand-600'
                            : 'text-gray-700'
                        }`}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <span>per page</span>
              <span className="text-gray-400 mx-2">|</span>
              <span>
                {((page - 1) * pageSize + 1).toLocaleString()}
                &ndash;
                {Math.min(page * pageSize, totalCount).toLocaleString()} of{' '}
                {totalCount.toLocaleString()}
              </span>
            </div>

            {/* Right: page navigation */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(1)}
                disabled={page <= 1}
                className="px-2 py-1 text-sm border border-gray-200 rounded-lg bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                First
              </button>
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="p-1.5 border border-gray-200 rounded-lg bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              {/* Page numbers */}
              {(() => {
                const pages: (number | string)[] = [];
                const maxVisible = 5;
                let start = Math.max(1, page - Math.floor(maxVisible / 2));
                let end = Math.min(totalPages, start + maxVisible - 1);
                if (end - start + 1 < maxVisible) {
                  start = Math.max(1, end - maxVisible + 1);
                }
                if (start > 1) {
                  pages.push(1);
                  if (start > 2) pages.push('...');
                }
                for (let i = start; i <= end; i++) pages.push(i);
                if (end < totalPages) {
                  if (end < totalPages - 1) pages.push('...');
                  pages.push(totalPages);
                }
                return pages.map((p, idx) =>
                  typeof p === 'string' ? (
                    <span
                      key={`ellipsis-${idx}`}
                      className="px-1 text-gray-400 text-sm"
                    >
                      ...
                    </span>
                  ) : (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className={`min-w-[32px] px-2 py-1 text-sm border rounded-lg transition-colors ${
                        p === page
                          ? 'bg-navy-500 border-navy-500 text-white font-medium'
                          : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {p}
                    </button>
                  )
                );
              })()}

              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="p-1.5 border border-gray-200 rounded-lg bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPage(totalPages)}
                disabled={page >= totalPages}
                className="px-2 py-1 text-sm border border-gray-200 rounded-lg bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Last
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ---- Drawer ---- */}
      <PhysicianDrawer
        physicianId={drawerPhysicianId}
        onClose={() => setDrawerPhysicianId(null)}
        onUpdated={loadData}
      />
    </div>
  );
}
