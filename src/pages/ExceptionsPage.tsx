import React, { useState, useMemo } from 'react';
import { useExceptions } from '../api/hooks';
import { QueryState } from '../components/QueryState';
import { AlertTriangle, Clock, Activity, X } from 'lucide-react';
import type { DeliveryException } from '../api/types';

function getSeverityBadge(severity: string) {
  const s = severity?.toLowerCase() || '';
  if (s === 'critical') {
    return 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400 border-red-200 dark:border-red-800';
  }
  if (s === 'high') {
    return 'bg-orange-50 text-orange-700 dark:bg-orange-950/40 dark:text-orange-400 border-orange-200 dark:border-orange-800';
  }
  if (s === 'medium') {
    return 'bg-yellow-50 text-yellow-700 dark:bg-yellow-950/40 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800';
  }
  if (s === 'low') {
    return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800';
  }
  return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700';
}

export const ExceptionsPage: React.FC = () => {
  const { data: exceptions = [], isLoading, isError, error, refetch } = useExceptions();

  const [severityFilter, setSeverityFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [resolutionFilter, setResolutionFilter] = useState<'all' | 'resolved' | 'unresolved'>('all');

  const severityOptions = useMemo(() => {
    const set = new Set<string>();
    exceptions.forEach((e) => {
      if (e.severity) set.add(e.severity);
    });
    return Array.from(set);
  }, [exceptions]);

  const typeOptions = useMemo(() => {
    const set = new Set<string>();
    exceptions.forEach((e) => {
      if (e.exception_type) set.add(e.exception_type);
    });
    return Array.from(set);
  }, [exceptions]);

  const hasActiveFilters =
    severityFilter !== 'all' || typeFilter !== 'all' || resolutionFilter !== 'all';

  const clearFilters = () => {
    setSeverityFilter('all');
    setTypeFilter('all');
    setResolutionFilter('all');
  };

  const filteredExceptions = useMemo(() => {
    return exceptions.filter((exc: DeliveryException) => {
      if (severityFilter !== 'all') {
        if (exc.severity?.toLowerCase() !== severityFilter.toLowerCase()) return false;
      }

      if (typeFilter !== 'all') {
        if (exc.exception_type?.toLowerCase() !== typeFilter.toLowerCase()) return false;
      }

      if (resolutionFilter === 'resolved') {
        if (exc.status?.toLowerCase() !== 'resolved') return false;
      } else if (resolutionFilter === 'unresolved') {
        if (exc.status?.toLowerCase() === 'resolved') return false;
      }

      return true;
    });
  }, [exceptions, severityFilter, typeFilter, resolutionFilter]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Exceptions
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Active delivery disruptions fetched from <code className="text-xs">GET /exceptions/</code> (auto-refreshes every 10s)
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 w-fit">
          <Activity className="w-3.5 h-3.5 text-blue-500 animate-pulse" />
          <span>Polling interval: 10s</span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
        {/* Severity Filter */}
        <select
          value={severityFilter}
          onChange={(e) => setSeverityFilter(e.target.value)}
          className="px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 capitalize cursor-pointer"
        >
          <option value="all">All Severities</option>
          {severityOptions.map((sev) => (
            <option key={sev} value={sev} className="capitalize">
              {sev}
            </option>
          ))}
        </select>

        {/* Type Filter */}
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 capitalize cursor-pointer"
        >
          <option value="all">All Types</option>
          {typeOptions.map((typ) => (
            <option key={typ} value={typ} className="capitalize">
              {typ.replace(/_/g, ' ')}
            </option>
          ))}
        </select>

        {/* Resolved / Unresolved Toggle */}
        <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 p-0.5 text-xs">
          <button
            onClick={() => setResolutionFilter('all')}
            className={`px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer ${
              resolutionFilter === 'all'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setResolutionFilter('unresolved')}
            className={`px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer ${
              resolutionFilter === 'unresolved'
                ? 'bg-rose-500 text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
            }`}
          >
            Unresolved
          </button>
          <button
            onClick={() => setResolutionFilter('resolved')}
            className={`px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer ${
              resolutionFilter === 'resolved'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
            }`}
          >
            Resolved
          </button>
        </div>

        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
            Clear filters
          </button>
        )}
      </div>

      <QueryState isLoading={isLoading} isError={isError} error={error} onRetry={() => refetch()}>
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-xs uppercase font-semibold text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-5 py-3.5">ID</th>
                  <th className="px-5 py-3.5">Order ID</th>
                  <th className="px-5 py-3.5">Vehicle ID</th>
                  <th className="px-5 py-3.5">Type</th>
                  <th className="px-5 py-3.5">Severity</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5">Delay</th>
                  <th className="px-5 py-3.5">Description</th>
                  <th className="px-5 py-3.5">Recommended Action</th>
                  <th className="px-5 py-3.5">Detected At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {filteredExceptions.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-5 py-12 text-center text-slate-400 dark:text-slate-500">
                      <AlertTriangle className="w-8 h-8 mx-auto mb-2 opacity-50 text-emerald-500" />
                      No exceptions found matching current filter criteria.
                    </td>
                  </tr>
                ) : (
                  filteredExceptions.map((exc) => (
                    <tr key={exc.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="px-5 py-4 font-mono font-medium text-slate-900 dark:text-slate-200">
                        #{exc.id}
                      </td>
                      <td className="px-5 py-4 font-mono text-slate-700 dark:text-slate-300">
                        {exc.order_id != null ? `#${exc.order_id}` : '—'}
                      </td>
                      <td className="px-5 py-4 font-mono text-slate-700 dark:text-slate-300">
                        {exc.vehicle_id != null ? `#${exc.vehicle_id}` : '—'}
                      </td>
                      <td className="px-5 py-4 font-medium text-slate-900 dark:text-white capitalize">
                        {exc.exception_type.replace(/_/g, ' ')}
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border capitalize ${getSeverityBadge(
                            exc.severity
                          )}`}
                        >
                          {exc.severity}
                        </span>
                      </td>
                      <td className="px-5 py-4 capitalize">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                          {exc.status}
                        </span>
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400 font-medium">
                          <Clock className="w-3.5 h-3.5" />
                          <span>+{exc.delay_minutes} min</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 max-w-xs text-xs text-slate-600 dark:text-slate-300 truncate" title={exc.description || ''}>
                        {exc.description || '—'}
                      </td>
                      <td className="px-5 py-4 max-w-xs text-xs text-slate-600 dark:text-slate-300 truncate" title={exc.recommended_action || ''}>
                        {exc.recommended_action || '—'}
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap text-xs text-slate-500 dark:text-slate-400">
                        {exc.detected_at ? new Date(exc.detected_at).toLocaleString() : '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </QueryState>
    </div>
  );
};
