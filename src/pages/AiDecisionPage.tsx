import React, { useState, useEffect } from 'react';
import { useOrders, useVehicles, useExceptions } from '../api/hooks';
import { QueryState } from '../components/QueryState';
import { AiDecisionPanel } from '../components/AiDecisionPanel';
import { LiveMap } from '../components/LiveMap';
import { Cpu, AlertTriangle, Clock } from 'lucide-react';
import type { DeliveryException } from '../api/types';

function getSeverityBadge(severity?: string) {
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
  return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800';
}

export const AiDecisionPage: React.FC = () => {
  const { data: orders = [], isLoading: isOrdersLoading } = useOrders();
  const { data: vehicles = [], isLoading: isVehiclesLoading } = useVehicles();
  const {
    data: exceptions = [],
    isLoading: isExceptionsLoading,
    isError,
    error,
    refetch,
  } = useExceptions();

  const isLoading = isOrdersLoading || isVehiclesLoading || isExceptionsLoading;

  const [selectedException, setSelectedException] = useState<DeliveryException | null>(null);
  const [analyzedRouteGeometry, setAnalyzedRouteGeometry] = useState<[number, number][] | null>(null);

  // Default to first/latest exception
  useEffect(() => {
    if (exceptions.length > 0 && !selectedException) {
      setSelectedException(exceptions[0]);
    }
  }, [exceptions, selectedException]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <Cpu className="w-6 h-6 text-blue-600" />
            AI Decision Center
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Machine learning route delay analysis and automated dispatch optimization
          </p>
        </div>
      </div>

      <QueryState isLoading={isLoading} isError={isError} error={error} onRetry={() => refetch()}>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Exceptions List */}
          <div className="lg:col-span-4 space-y-3">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white px-1">
              Select Exception ({exceptions.length})
            </h2>

            {exceptions.length === 0 ? (
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-8 text-center text-slate-400">
                <AlertTriangle className="w-8 h-8 mx-auto mb-2 opacity-50 text-emerald-500" />
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">No exceptions logged</p>
                <p className="text-xs mt-1">All deliveries are operating normally.</p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[720px] overflow-y-auto pr-1">
                {exceptions.map((exc) => {
                  const isSelected = selectedException?.id === exc.id;

                  return (
                    <button
                      key={exc.id}
                      onClick={() => {
                        setSelectedException(exc);
                        setAnalyzedRouteGeometry(null);
                      }}
                      className={`w-full text-left p-4 rounded-xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-blue-50/80 dark:bg-blue-950/40 border-blue-500 shadow-xs'
                          : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase ${getSeverityBadge(
                            exc.severity
                          )}`}
                        >
                          {exc.severity}
                        </span>
                        <span className="text-[11px] font-mono text-slate-400">
                          #{exc.id}
                        </span>
                      </div>

                      <h3 className="text-sm font-semibold text-slate-900 dark:text-white capitalize">
                        {exc.exception_type.replace(/_/g, ' ')}
                      </h3>

                      <div className="flex items-center gap-3 mt-2 text-xs text-slate-500 dark:text-slate-400">
                        {exc.order_id != null && (
                          <span>Order #{exc.order_id}</span>
                        )}
                        {exc.vehicle_id != null && (
                          <span>Vehicle #{exc.vehicle_id}</span>
                        )}
                        {exc.delay_minutes > 0 && (
                          <span className="flex items-center gap-1 text-rose-600 dark:text-rose-400 font-medium">
                            <Clock className="w-3 h-3" />
                            +{exc.delay_minutes}m
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right Column: AI Analysis Panel & Route Map */}
          <div className="lg:col-span-8 space-y-6">
            <AiDecisionPanel
              exception={selectedException}
              orders={orders}
              vehicles={vehicles}
              onRouteAnalyzed={(coords) => setAnalyzedRouteGeometry(coords)}
              isStandalone={true}
            />

            <LiveMap
              orders={orders}
              vehicles={vehicles}
              exceptions={exceptions}
              routeGeometry={analyzedRouteGeometry}
            />
          </div>
        </div>
      </QueryState>
    </div>
  );
};
