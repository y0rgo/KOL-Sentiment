import React, { useState, useEffect, useCallback } from 'react';
import {
  fetchReviewQueue,
  fetchReviewQueueStats,
  reviewNomination,
} from '../api/client';
import { ReviewQueueItem, ReviewQueueStats } from '../types';
import { timeAgo } from '../utils/formatters';
import { EmptyState } from '../components/ui/EmptyState';
import { SkeletonPage } from '../components/ui/Skeleton';
import toast from 'react-hot-toast';
import {
  Inbox,
  Search,
  UserPlus,
  Check,
  X,
  Clock,
  ChevronDown,
  ChevronUp,
  Star,
  Building2,
  Stethoscope,
  FileText,
  AlertCircle,
} from 'lucide-react';

type TypeFilter = 'all' | 'discovery' | 'nomination';

const ReviewQueue: React.FC = () => {
  const [items, setItems] = useState<ReviewQueueItem[]>([]);
  const [stats, setStats] = useState<ReviewQueueStats | null>(null);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [expandedNotes, setExpandedNotes] = useState<Record<string, boolean>>({});
  const [notesText, setNotesText] = useState<Record<string, string>>({});
  const [confirmingDecline, setConfirmingDecline] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [queueRes, statsRes] = await Promise.all([
        fetchReviewQueue(),
        fetchReviewQueueStats(),
      ]);
      setItems(queueRes.data.items ?? queueRes.data);
      setStats(statsRes.data);
    } catch (err) {
      console.error('Failed to load review queue:', err);
      toast.error('Failed to load review queue');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredItems = items.filter((item) => {
    if (typeFilter !== 'all' && item.type !== typeFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const fullName = `${item.first_name} ${item.last_name}`.toLowerCase();
      const institution = (item.institution_name ?? '').toLowerCase();
      const specialty = (item.specialty ?? '').toLowerCase();
      return (
        fullName.includes(q) ||
        institution.includes(q) ||
        specialty.includes(q)
      );
    }
    return true;
  });

  const handleAction = async (
    item: ReviewQueueItem,
    action: 'promote' | 'decline'
  ) => {
    if (item.type === 'discovery') {
      toast.error('Discovery review not yet implemented');
      return;
    }

    setActionLoading(`${item.id}-${action}`);
    try {
      const reviewStatus = action === 'promote' ? 'approved' : 'declined';
      await reviewNomination(item.id, {
        review_status: reviewStatus,
        reviewed_by: 'admin',
        review_notes: notesText[item.id] || undefined,
      });
      toast.success(
        action === 'promote'
          ? 'Physician promoted successfully'
          : 'Nomination declined'
      );
      setConfirmingDecline(null);
      await loadData();
    } catch (err) {
      console.error(`Failed to ${action} item:`, err);
      toast.error(`Failed to ${action} item. Please try again.`);
    } finally {
      setActionLoading(null);
    }
  };

  const toggleNotes = (id: string) => {
    setExpandedNotes((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleDeclineClick = (itemId: string) => {
    if (confirmingDecline === itemId) {
      setConfirmingDecline(null);
    } else {
      setConfirmingDecline(itemId);
    }
  };

  const filterOptions: { value: TypeFilter; label: string; count?: number }[] = [
    { value: 'all', label: 'All', count: stats?.total_pending },
    { value: 'discovery', label: 'Discoveries', count: stats?.pending_discoveries },
    { value: 'nomination', label: 'Nominations', count: stats?.pending_nominations },
  ];

  // --- Loading State ---
  if (loading) {
    return (
      <div className="min-h-screen bg-page">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900">Review Queue</h1>
            <p className="mt-1 text-sm text-gray-500">
              Review and action pending discoveries and nominations
            </p>
          </div>
          <SkeletonPage />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-page">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            Review Queue
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Review and action pending discoveries and nominations
          </p>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {/* Total Pending */}
            <div className="bg-white rounded-lg shadow-card overflow-hidden">
              <div className="flex">
                <div className="w-1 bg-brand-500 flex-shrink-0" />
                <div className="p-5 flex-1 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total Pending
                    </p>
                    <p className="mt-1 text-2xl font-bold text-gray-900">
                      {stats.total_pending}
                    </p>
                  </div>
                  <div className="rounded-lg bg-brand-50 p-2.5">
                    <Inbox className="h-5 w-5 text-brand-500" />
                  </div>
                </div>
              </div>
            </div>

            {/* Discoveries */}
            <div className="bg-white rounded-lg shadow-card overflow-hidden">
              <div className="flex">
                <div className="w-1 bg-purple-500 flex-shrink-0" />
                <div className="p-5 flex-1 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Discoveries
                    </p>
                    <p className="mt-1 text-2xl font-bold text-gray-900">
                      {stats.pending_discoveries}
                    </p>
                  </div>
                  <div className="rounded-lg bg-purple-50 p-2.5">
                    <Search className="h-5 w-5 text-purple-500" />
                  </div>
                </div>
              </div>
            </div>

            {/* Nominations */}
            <div className="bg-white rounded-lg shadow-card overflow-hidden">
              <div className="flex">
                <div className="w-1 bg-amber-500 flex-shrink-0" />
                <div className="p-5 flex-1 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Nominations
                    </p>
                    <p className="mt-1 text-2xl font-bold text-gray-900">
                      {stats.pending_nominations}
                    </p>
                  </div>
                  <div className="rounded-lg bg-amber-50 p-2.5">
                    <UserPlus className="h-5 w-5 text-amber-500" />
                  </div>
                </div>
              </div>
            </div>

            {/* Oldest Item */}
            <div className="bg-white rounded-lg shadow-card overflow-hidden">
              <div className="flex">
                <div className="w-1 bg-gray-400 flex-shrink-0" />
                <div className="p-5 flex-1 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Oldest Item
                    </p>
                    <p className="mt-1 text-2xl font-bold text-gray-900">
                      {stats.oldest_pending_date
                        ? timeAgo(stats.oldest_pending_date)
                        : '--'}
                    </p>
                  </div>
                  <div className="rounded-lg bg-gray-100 p-2.5">
                    <Clock className="h-5 w-5 text-gray-400" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filter Bar */}
        <div className="bg-white rounded-lg shadow-card p-4 mb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            {/* Segmented Button Group */}
            <div className="flex items-center rounded-lg bg-gray-100 p-0.5">
              {filterOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setTypeFilter(opt.value)}
                  className={`
                    relative px-4 py-1.5 text-sm font-medium rounded-md transition-all duration-200
                    ${
                      typeFilter === opt.value
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                    }
                  `}
                >
                  {opt.label}
                  {opt.count !== undefined && opt.count > 0 && (
                    <span
                      className={`ml-1.5 text-xs font-semibold ${
                        typeFilter === opt.value
                          ? 'text-brand-500'
                          : 'text-gray-400'
                      }`}
                    >
                      {opt.count}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div className="relative flex-1 w-full sm:w-auto">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name, institution, or specialty..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent focus:bg-white transition-colors"
              />
            </div>
          </div>
        </div>

        {/* Empty State */}
        {!loading && filteredItems.length === 0 && (
          <div className="bg-white rounded-lg shadow-card">
            {items.length === 0 ? (
              <EmptyState
                icon={Inbox}
                title="Review queue is empty"
                description="All submissions have been reviewed. New discoveries and nominations will appear here."
              />
            ) : (
              <EmptyState
                icon={Search}
                title="No matching results"
                description="No items match your current filters. Try adjusting your search or type filter."
              />
            )}
          </div>
        )}

        {/* Card List */}
        {!loading && filteredItems.length > 0 && (
          <div className="space-y-3">
            {filteredItems.map((item) => {
              const isPromoting = actionLoading === `${item.id}-promote`;
              const isDeclining = actionLoading === `${item.id}-decline`;
              const isExpanded = expandedNotes[item.id] ?? false;
              const isConfirmingDecline = confirmingDecline === item.id;
              const isDiscovery = item.type === 'discovery';
              const stripeColor = isDiscovery ? 'bg-[#8B5CF6]' : 'bg-[#F59E0B]';
              const typeBadgeBg = isDiscovery
                ? 'bg-purple-50 text-purple-700'
                : 'bg-amber-50 text-amber-700';
              const location = [item.city, item.state]
                .filter(Boolean)
                .join(', ');

              return (
                <div
                  key={`${item.type}-${item.id}`}
                  className="bg-white rounded-lg shadow-card hover:shadow-card-hover transition-shadow duration-200 overflow-hidden"
                >
                  <div className="flex">
                    {/* Left Color Stripe */}
                    <div className={`w-1 flex-shrink-0 ${stripeColor}`} />

                    {/* Card Content */}
                    <div className="flex-1 p-5">
                      <div className="flex flex-col lg:flex-row lg:items-start gap-4">
                        {/* Main Content */}
                        <div className="flex-1 min-w-0">
                          {/* Header Row: Name + Type Badge */}
                          <div className="flex items-start justify-between gap-3 mb-1">
                            <div className="flex items-baseline gap-2 flex-wrap">
                              <h3 className="text-lg font-semibold text-gray-900">
                                {item.first_name} {item.last_name}
                              </h3>
                              {item.credentials && (
                                <span className="text-sm text-gray-400 font-medium">
                                  {item.credentials}
                                </span>
                              )}
                            </div>
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold flex-shrink-0 ${typeBadgeBg}`}
                            >
                              {isDiscovery ? (
                                <Search className="h-3 w-3" />
                              ) : (
                                <UserPlus className="h-3 w-3" />
                              )}
                              {isDiscovery ? 'Discovery' : 'Nomination'}
                            </span>
                          </div>

                          {/* Meta Line: Institution, Location, Specialty */}
                          <div className="flex items-center gap-x-3 gap-y-1 flex-wrap text-sm text-gray-500 mb-3">
                            {item.institution_name && (
                              <span className="inline-flex items-center gap-1">
                                <Building2 className="h-3.5 w-3.5 text-gray-400" />
                                {item.institution_name}
                              </span>
                            )}
                            {item.specialty && (
                              <span className="inline-flex items-center gap-1">
                                <Stethoscope className="h-3.5 w-3.5 text-gray-400" />
                                {item.specialty}
                              </span>
                            )}
                            {location && (
                              <span className="text-gray-400">
                                {location}
                              </span>
                            )}
                          </div>

                          {/* Evidence / Rationale Body */}
                          <p className="text-sm text-gray-600 leading-relaxed line-clamp-3">
                            {item.evidence_or_rationale}
                          </p>

                          {/* Footer: Age, Source, Score, Disease Context */}
                          <div className="mt-3 flex items-center gap-2 flex-wrap">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-gray-100 text-xs font-medium text-gray-600">
                              <Clock className="h-3 w-3" />
                              {timeAgo(item.created_at)}
                            </span>
                            {item.source_detail && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-gray-100 text-xs font-medium text-gray-600">
                                <FileText className="h-3 w-3" />
                                {item.source_detail}
                              </span>
                            )}
                            {item.disease_context && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 text-xs font-medium text-blue-600">
                                {item.disease_context}
                              </span>
                            )}
                            {item.score !== null && item.score !== undefined && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-brand-50 text-xs font-semibold text-brand-600">
                                <Star className="h-3 w-3" />
                                Score: {item.score}
                              </span>
                            )}
                          </div>

                          {/* Expandable Review Notes */}
                          <div className="mt-3">
                            <button
                              onClick={() => toggleNotes(item.id)}
                              className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-brand-600 font-medium transition-colors"
                            >
                              {isExpanded ? (
                                <ChevronUp className="h-3.5 w-3.5" />
                              ) : (
                                <ChevronDown className="h-3.5 w-3.5" />
                              )}
                              {isExpanded ? 'Hide notes' : 'Add review notes'}
                            </button>
                            {isExpanded && (
                              <textarea
                                value={notesText[item.id] ?? ''}
                                onChange={(e) =>
                                  setNotesText((prev) => ({
                                    ...prev,
                                    [item.id]: e.target.value,
                                  }))
                                }
                                placeholder="Add review notes (optional)..."
                                rows={2}
                                className="mt-2 w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent resize-none bg-gray-50 focus:bg-white transition-colors"
                              />
                            )}
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex-shrink-0 flex lg:flex-col gap-2 lg:min-w-[120px]">
                          <button
                            onClick={() => handleAction(item, 'promote')}
                            disabled={isPromoting || isDeclining}
                            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg bg-brand-500 text-white hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                          >
                            {isPromoting ? (
                              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                            ) : (
                              <Check className="h-4 w-4" />
                            )}
                            Promote
                          </button>

                          {/* Decline with Confirmation */}
                          {!isConfirmingDecline ? (
                            <button
                              onClick={() => handleDeclineClick(item.id)}
                              disabled={isPromoting || isDeclining}
                              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                              <X className="h-4 w-4" />
                              Decline
                            </button>
                          ) : (
                            <div className="flex flex-col gap-1.5">
                              <div className="flex items-center gap-1 text-xs text-red-600 font-medium">
                                <AlertCircle className="h-3.5 w-3.5" />
                                Are you sure?
                              </div>
                              <div className="flex gap-1.5">
                                <button
                                  onClick={() => handleAction(item, 'decline')}
                                  disabled={isDeclining}
                                  className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-1.5 text-xs font-medium rounded-md bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                  {isDeclining ? (
                                    <div className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent" />
                                  ) : (
                                    'Confirm'
                                  )}
                                </button>
                                <button
                                  onClick={() => setConfirmingDecline(null)}
                                  className="flex-1 inline-flex items-center justify-center px-3 py-1.5 text-xs font-medium rounded-md border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Results Count */}
        {!loading && items.length > 0 && (
          <div className="mt-6 text-center text-xs text-gray-400">
            Showing {filteredItems.length} of {items.length} pending items
          </div>
        )}
      </div>
    </div>
  );
};

export default ReviewQueue;
