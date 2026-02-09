import React, { useState, useEffect, useCallback } from 'react';
import {
  fetchReviewQueue,
  fetchReviewQueueStats,
  reviewNomination,
} from '../api/client';
import { ReviewQueueItem, ReviewQueueStats } from '../types';
import { formatDate, timeAgo } from '../utils/formatters';
import {
  Inbox,
  Search,
  UserPlus,
  CheckCircle,
  XCircle,
  Clock,
  Filter,
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
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

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
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [message]);

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
      setMessage({ type: 'error', text: 'Discovery review not yet implemented' });
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
      setMessage({
        type: 'success',
        text: `Nomination ${action === 'promote' ? 'promoted' : 'declined'} successfully`,
      });
      await loadData();
    } catch (err) {
      console.error(`Failed to ${action} item:`, err);
      setMessage({ type: 'error', text: `Failed to ${action} item. Please try again.` });
    } finally {
      setActionLoading(null);
    }
  };

  const toggleNotes = (id: string) => {
    setExpandedNotes((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Review Queue</h1>
          <p className="mt-1 text-sm text-gray-500">
            Review and action pending discoveries and nominations
          </p>
        </div>

        {/* Toast Message */}
        {message && (
          <div
            className={`mb-6 rounded-lg px-4 py-3 text-sm font-medium shadow-sm ${
              message.type === 'success'
                ? 'bg-green-50 text-green-800 border border-green-200'
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Stats Bar */}
        {stats && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Total Pending</p>
                  <p className="mt-1 text-3xl font-bold text-teal-600">
                    {stats.total_pending}
                  </p>
                </div>
                <div className="rounded-full bg-teal-50 p-3">
                  <Inbox className="h-6 w-6 text-teal-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Discoveries Pending</p>
                  <p className="mt-1 text-3xl font-bold text-purple-600">
                    {stats.pending_discoveries}
                  </p>
                </div>
                <div className="rounded-full bg-purple-50 p-3">
                  <Search className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Nominations Pending</p>
                  <p className="mt-1 text-3xl font-bold text-amber-600">
                    {stats.pending_nominations}
                  </p>
                </div>
                <div className="rounded-full bg-amber-50 p-3">
                  <UserPlus className="h-6 w-6 text-amber-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Oldest Item Age</p>
                  <p className="mt-1 text-3xl font-bold text-gray-700">
                    {stats.oldest_pending_date
                      ? timeAgo(stats.oldest_pending_date)
                      : '-'}
                  </p>
                </div>
                <div className="rounded-full bg-gray-100 p-3">
                  <Clock className="h-6 w-6 text-gray-500" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filter Bar */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-400" />
              <span className="text-sm font-medium text-gray-600">Type:</span>
              <div className="flex rounded-lg border border-gray-200 overflow-hidden">
                {(['all', 'discovery', 'nomination'] as TypeFilter[]).map(
                  (filterValue) => (
                    <button
                      key={filterValue}
                      onClick={() => setTypeFilter(filterValue)}
                      className={`px-3 py-1.5 text-sm font-medium capitalize transition-colors ${
                        typeFilter === filterValue
                          ? 'bg-teal-600 text-white'
                          : 'bg-white text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {filterValue}
                    </button>
                  )
                )}
              </div>
            </div>

            <div className="relative flex-1 w-full sm:w-auto">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name, institution, or specialty..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
            <span className="ml-3 text-gray-500">Loading review queue...</span>
          </div>
        )}

        {/* Empty State */}
        {!loading && filteredItems.length === 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 py-20 text-center">
            <Inbox className="mx-auto h-12 w-12 text-gray-300" />
            <h3 className="mt-4 text-lg font-medium text-gray-900">
              No pending reviews
            </h3>
            <p className="mt-2 text-sm text-gray-500">
              {items.length === 0
                ? 'The review queue is empty. New discoveries and nominations will appear here.'
                : 'No items match your current filters. Try adjusting your search or type filter.'}
            </p>
          </div>
        )}

        {/* Card List */}
        {!loading && filteredItems.length > 0 && (
          <div className="space-y-4">
            {filteredItems.map((item) => {
              const isPromoting = actionLoading === `${item.id}-promote`;
              const isDeclining = actionLoading === `${item.id}-decline`;
              const isExpanded = expandedNotes[item.id] ?? false;
              const location = [item.city, item.state]
                .filter(Boolean)
                .join(', ');

              return (
                <div
                  key={`${item.type}-${item.id}`}
                  className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 hover:shadow-md transition-shadow"
                >
                  <div className="flex flex-col lg:flex-row lg:items-start gap-4">
                    {/* Left: Type Badge */}
                    <div className="flex-shrink-0">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                          item.type === 'discovery'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {item.type === 'discovery' ? (
                          <Search className="h-3 w-3 mr-1" />
                        ) : (
                          <UserPlus className="h-3 w-3 mr-1" />
                        )}
                        {item.type === 'discovery' ? 'Discovery' : 'Nomination'}
                      </span>
                    </div>

                    {/* Center: Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2 flex-wrap">
                        <h3 className="text-base font-bold text-gray-900">
                          {item.first_name} {item.last_name}
                        </h3>
                        {item.credentials && (
                          <span className="text-sm text-gray-500">
                            {item.credentials}
                          </span>
                        )}
                      </div>

                      <div className="mt-1 flex items-center gap-2 flex-wrap text-sm text-gray-600">
                        {item.institution_name && (
                          <span>{item.institution_name}</span>
                        )}
                        {item.institution_name && location && (
                          <span className="text-gray-300">|</span>
                        )}
                        {location && <span>{location}</span>}
                        {item.specialty && (
                          <>
                            <span className="text-gray-300">|</span>
                            <span>{item.specialty}</span>
                          </>
                        )}
                      </div>

                      <p className="mt-2 text-sm text-gray-700 line-clamp-2">
                        {item.evidence_or_rationale}
                      </p>

                      <div className="mt-2 flex items-center gap-3 text-xs text-gray-400">
                        {item.source_detail && (
                          <span>Source: {item.source_detail}</span>
                        )}
                        {item.disease_context && (
                          <>
                            <span className="text-gray-300">|</span>
                            <span>Context: {item.disease_context}</span>
                          </>
                        )}
                        <span className="text-gray-300">|</span>
                        <span>{formatDate(item.created_at)}</span>
                        {item.score !== null && item.score !== undefined && (
                          <>
                            <span className="text-gray-300">|</span>
                            <span className="font-medium text-teal-600">
                              Score: {item.score}
                            </span>
                          </>
                        )}
                      </div>

                      {/* Expandable Notes */}
                      <div className="mt-3">
                        <button
                          onClick={() => toggleNotes(item.id)}
                          className="text-xs text-teal-600 hover:text-teal-700 font-medium"
                        >
                          {isExpanded ? 'Hide notes' : 'Add notes'}
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
                            className="mt-2 w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none"
                          />
                        )}
                      </div>
                    </div>

                    {/* Right: Action Buttons */}
                    <div className="flex-shrink-0 flex lg:flex-col gap-2">
                      <button
                        onClick={() => handleAction(item, 'promote')}
                        disabled={isPromoting || isDeclining}
                        className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {isPromoting ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        ) : (
                          <CheckCircle className="h-4 w-4" />
                        )}
                        Promote
                      </button>
                      <button
                        onClick={() => handleAction(item, 'decline')}
                        disabled={isPromoting || isDeclining}
                        className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg border border-red-300 text-red-600 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {isDeclining ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                        ) : (
                          <XCircle className="h-4 w-4" />
                        )}
                        Decline
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Results Count */}
        {!loading && items.length > 0 && (
          <div className="mt-4 text-center text-sm text-gray-400">
            Showing {filteredItems.length} of {items.length} pending items
          </div>
        )}
      </div>
    </div>
  );
};

export default ReviewQueue;
