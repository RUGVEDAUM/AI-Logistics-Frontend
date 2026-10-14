import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  Cpu,
  ArrowRight,
  Sparkles,
  Loader2,
  AlertTriangle,
  RefreshCw,
  MapPin,
  Truck,
  CheckCircle2,
  Check,
  X,
  Clock,
} from 'lucide-react';
import type {
  DeliveryException,
  Order,
  Vehicle,
  RouteAnalysisResponse,
  ActionExecutionResult,
} from '../api/types';
import { analyzeRoute, executeAction } from '../api/hooks';
import { ANALYZE_EXECUTES } from '../config';

interface AiDecisionPanelProps {
  exception?: DeliveryException | null;
  orders: Order[];
  vehicles: Vehicle[];
  onRouteAnalyzed?: (coords: [number, number][]) => void;
  isStandalone?: boolean;
}

function getSeverityBadgeClass(severity?: string) {
  const s = severity?.toLowerCase() || '';
  if (s === 'critical') return 'bg-red-500 text-white';
  if (s === 'high') return 'bg-orange-500 text-white';
  if (s === 'medium') return 'bg-amber-500 text-white';
  if (s === 'low') return 'bg-emerald-500 text-white';
  return 'bg-slate-500 text-white';
}

function getSeverityTextClass(severity?: string) {
  const s = severity?.toLowerCase() || '';
  if (s === 'critical') return 'text-red-600 dark:text-red-400 font-bold';
  if (s === 'high') return 'text-orange-600 dark:text-orange-400 font-bold';
  if (s === 'medium') return 'text-amber-600 dark:text-amber-400 font-bold';
  if (s === 'low') return 'text-emerald-600 dark:text-emerald-400 font-bold';
  return 'text-slate-700 dark:text-slate-300 font-semibold';
}

function isDataChangingAction(actionObj?: { action?: string | null; message?: string | null } | null) {
  if (!actionObj) return false;
  const act = (actionObj.action || '').toLowerCase();
  const msg = (actionObj.message || '').toLowerCase();
  if (act.includes('reroute') || msg.includes('accepted') || msg.includes('pending')) {
    return false;
  }
  return true;
}

function ActionResultDisplay({
  actionObj,
}: {
  actionObj?: { action?: string | null; message?: string | null } | null;
}) {
  if (!actionObj) return null;
  const changedData = isDataChangingAction(actionObj);

  if (changedData) {
    return (
      <div className="p-3.5 rounded-xl bg-emerald-50/90 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 space-y-1">
        <div className="flex items-center gap-2 text-xs font-bold text-emerald-900 dark:text-emerald-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
          <span>Action applied</span>
        </div>
        {actionObj.action && (
          <p className="text-xs text-emerald-800 dark:text-emerald-300">
            <span className="font-semibold">Action:</span> {actionObj.action.replace(/_/g, ' ')}
          </p>
        )}
        <p className="text-xs text-emerald-700 dark:text-emerald-300">
          {actionObj.message || 'Action executed successfully and live data updated.'}
        </p>
      </div>
    );
  }

  return (
    <div className="p-3.5 rounded-xl bg-amber-50/90 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 space-y-1">
      <div className="flex items-center gap-2 text-xs font-bold text-amber-900 dark:text-amber-200">
        <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
        <span>Action accepted</span>
      </div>
      {actionObj.action && (
        <p className="text-xs text-amber-800 dark:text-amber-300">
          <span className="font-semibold">Action:</span> {actionObj.action.replace(/_/g, ' ')}
        </p>
      )}
      <p className="text-xs text-amber-700 dark:text-amber-300">
        {actionObj.message || 'Action accepted.'}
      </p>
    </div>
  );
}

export const AiDecisionPanel: React.FC<AiDecisionPanelProps> = ({
  exception,
  orders,
  vehicles,
  onRouteAnalyzed,
  isStandalone = false,
}) => {
  const queryClient = useQueryClient();

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<RouteAnalysisResponse | null>(null);

  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [isExecutingAction, setIsExecutingAction] = useState(false);
  const [actionResult, setActionResult] = useState<ActionExecutionResult | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionDismissed, setActionDismissed] = useState(false);
  const [actionCompleted, setActionCompleted] = useState(false);

  useEffect(() => {
    setError(null);
    setAnalysisResult(null);
    setShowConfirmDialog(false);
    setIsExecutingAction(false);
    setActionResult(null);
    setActionError(null);
    setActionDismissed(false);
    setActionCompleted(false);
  }, [exception?.id]);

  const invalidateQueries = () => {
    queryClient.invalidateQueries({ queryKey: ['orders'] });
    queryClient.invalidateQueries({ queryKey: ['vehicles'] });
    queryClient.invalidateQueries({ queryKey: ['exceptions'] });
  };

  if (!exception) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-2xs flex flex-col justify-between">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center">
            <Cpu className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">AI Decision Center</h2>
            <p className="text-xs text-slate-400 dark:text-slate-500">Latest AI analysis and recommendations</p>
          </div>
        </div>
        <div className="h-64 flex flex-col items-center justify-center text-center p-6 text-slate-400">
          <CheckCircle2 className="w-10 h-10 mb-2 text-emerald-500 opacity-60" />
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300">No active exceptions</p>
          <p className="text-xs mt-1">All deliveries and vehicles are currently operating normally.</p>
        </div>
      </div>
    );
  }

  const handleStartAnalysis = () => {
    if (ANALYZE_EXECUTES) {
      setShowConfirmDialog(true);
    } else {
      executeRouteAnalysis();
    }
  };

  const executeRouteAnalysis = async () => {
    setShowConfirmDialog(false);
    setIsAnalyzing(true);
    setError(null);
    setActionDismissed(false);
    setActionResult(null);
    setActionError(null);
    setActionCompleted(false);

    const orderId = exception.order_id ?? orders[0]?.id ?? 1;
    const vehicleId = exception.vehicle_id ?? vehicles[0]?.id ?? 1;

    try {
      const response = await analyzeRoute({
        order_id: orderId,
        vehicle_id: vehicleId,
        traffic_level: 'low',
        weather_condition: 'clear',
        road_condition: 'normal',
        vehicle_condition: 'normal',
      });

      setAnalysisResult(response);

      if (response.route?.selected_route?.geometry?.coordinates) {
        const leafletCoords: [number, number][] = response.route.selected_route.geometry.coordinates.map(
          ([lon, lat]) => [lat, lon]
        );
        onRouteAnalyzed?.(leafletCoords);
      }

      if (ANALYZE_EXECUTES) {
        invalidateQueries();
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to analyze route with AI');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleAcceptAction = async () => {
    if (!analysisResult || actionCompleted) return;

    setIsExecutingAction(true);
    setActionError(null);

    const action =
      analysisResult.ai_decision?.decision ||
      analysisResult.route?.decision ||
      'reassign_vehicle';
    const orderId =
      analysisResult.order?.id ?? exception.order_id ?? orders[0]?.id ?? 1;
    const currentVehicleId =
      analysisResult.vehicle?.id ?? exception.vehicle_id ?? vehicles[0]?.id ?? 1;
    const newVehicleId =
      analysisResult.ai_decision?.selected_vehicle?.id ?? null;

    try {
      const res = await executeAction({
        action,
        order_id: orderId,
        current_vehicle_id: currentVehicleId,
        new_vehicle_id: newVehicleId,
      });

      setActionResult(res);
      setActionCompleted(true);
      invalidateQueries();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Failed to execute AI action');
    } finally {
      setIsExecutingAction(false);
    }
  };

  const handleRejectAction = () => {
    if (actionCompleted) return;
    setAnalysisResult(null);
    setActionDismissed(true);
    setActionCompleted(true);
  };

  const formattedDetectedAt = exception.detected_at
    ? new Date(exception.detected_at).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '';

  const delayMinutes =
    analysisResult?.prediction?.predicted_delay_minutes ??
    analysisResult?.ai_decision?.delay_minutes ??
    exception.delay_minutes;

  const severityDisplay =
    analysisResult?.ai_decision?.severity ??
    analysisResult?.prediction?.severity ??
    analysisResult?.exception?.severity ??
    exception.severity;

  const decisionDisplay =
    analysisResult?.ai_decision?.decision ??
    analysisResult?.route?.decision;

  const recommendedAction =
    analysisResult?.ai_decision?.recommended_action ??
    analysisResult?.route?.recommendation ??
    exception.recommended_action;

  const selectedVehicle =
    analysisResult?.ai_decision?.selected_vehicle ??
    analysisResult?.vehicle;

  const actionExecution = analysisResult?.action_execution;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-2xs flex flex-col justify-between relative">
      {/* Confirmation Dialog for ANALYZE_EXECUTES = true */}
      {showConfirmDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-amber-600 dark:text-amber-400">
              <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/50 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Confirm Live Action</h3>
                <p className="text-xs text-slate-500">Live operational change</p>
              </div>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              This will analyze the exception AND apply the AI&apos;s action (e.g. reassign a vehicle). This changes live data. Continue?
            </p>
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmDialog(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={executeRouteAnalysis}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-colors cursor-pointer"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      <div>
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Cpu className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">AI Decision Center</h2>
              <p className="text-xs text-slate-400 dark:text-slate-500">Latest AI analysis and recommendations</p>
            </div>
          </div>

          {!isStandalone && (
            <Link
              to="/ai-decision"
              className="text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 flex items-center gap-1 transition-colors"
            >
              View All <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>

        {/* Exception banner */}
        <div className="space-y-3 pt-1">
          <div className="flex items-center gap-2.5">
            <span
              className={`px-2 py-0.5 rounded-sm text-[10px] font-bold uppercase tracking-wider ${getSeverityBadgeClass(
                exception.severity
              )}`}
            >
              {exception.severity}
            </span>
            {formattedDetectedAt && (
              <span className="text-xs text-slate-400">{formattedDetectedAt}</span>
            )}
          </div>

          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white capitalize">
              {exception.exception_type.replace(/_/g, ' ')}
              {exception.order_id != null && ` - Order #${exception.order_id}`}
            </h3>
            {exception.description && (
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {exception.description}
              </p>
            )}
          </div>
        </div>

        {/* Loading State for Analysis */}
        {isAnalyzing && (
          <div className="py-10 flex flex-col items-center justify-center text-center space-y-2.5">
            <Loader2 className="w-7 h-7 text-blue-600 animate-spin" />
            <p className="text-xs font-medium text-slate-600 dark:text-slate-300">
              AI is analyzing...
            </p>
            <p className="text-[11px] text-slate-400">
              Evaluating routes, traffic, and vehicle reassignments
            </p>
          </div>
        )}

        {/* Error State for Analysis */}
        {!isAnalyzing && error && (
          <div className="my-4 p-4 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 space-y-2">
            <div className="flex items-center gap-2 text-rose-700 dark:text-rose-400 text-xs font-semibold">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>Failed to analyze with AI</span>
            </div>
            <p className="text-[11px] text-rose-600 dark:text-rose-400">{error}</p>
            <button
              onClick={handleStartAnalysis}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-rose-600 hover:bg-rose-700 text-white transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Retry
            </button>
          </div>
        )}

        {/* Recommendation Dismissed Banner */}
        {actionDismissed && !analysisResult && (
          <div className="my-4 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300 text-xs font-medium">
              <X className="w-4 h-4 text-slate-400" />
              <span>Recommendation dismissed</span>
            </div>
            <button
              onClick={handleStartAnalysis}
              className="text-xs text-blue-600 hover:underline cursor-pointer"
            >
              Re-analyze
            </button>
          </div>
        )}

        {/* Pre-analysis: Button to trigger analysis */}
        {!isAnalyzing && !analysisResult && !error && !actionDismissed && (
          <div className="py-8 flex flex-col items-center justify-center text-center space-y-3">
            <button
              onClick={handleStartAnalysis}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-md shadow-blue-600/20 transition-all cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              {ANALYZE_EXECUTES ? 'Run AI Analysis & Apply' : 'Analyze with AI'}
            </button>
            <p className="text-[11px] text-slate-400 max-w-xs">
              {ANALYZE_EXECUTES
                ? 'Click to run AI optimization and automatically apply the recommended action'
                : 'Click to predict delay minutes and compute optimal road rerouting'}
            </p>
          </div>
        )}

        {/* Post-analysis Results */}
        {!isAnalyzing && analysisResult && (
          <div className="space-y-4 pt-4">
            {/* 3 Metric Columns */}
            <div className="grid grid-cols-3 gap-2 py-3 border-y border-slate-100 dark:border-slate-800 text-center">
              <div>
                <p className="text-[10px] text-slate-400 uppercase font-medium">Predicted Delay</p>
                <p className="text-sm font-bold text-slate-900 dark:text-white mt-1">
                  {delayMinutes != null ? `${delayMinutes} min` : '—'}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 uppercase font-medium">Severity</p>
                <p className={`text-sm mt-1 capitalize ${getSeverityTextClass(severityDisplay)}`}>
                  {severityDisplay || '—'}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 uppercase font-medium">AI Decision</p>
                <p className="text-sm font-bold text-slate-900 dark:text-white mt-1 capitalize truncate" title={decisionDisplay || ''}>
                  {decisionDisplay ? decisionDisplay.replace(/_/g, ' ') : '—'}
                </p>
              </div>
            </div>

            {/* Recommended Action Card */}
            {recommendedAction && (
              <div className="p-3.5 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/60 flex items-start gap-3">
                <div className="w-6 h-6 rounded-md bg-blue-600 text-white flex items-center justify-center flex-shrink-0 mt-0.5">
                  <MapPin className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <span className="text-[11px] font-bold text-blue-900 dark:text-blue-300 block">
                    Recommended Action
                  </span>
                  <p className="text-xs text-blue-800 dark:text-blue-200 mt-0.5 leading-relaxed">
                    {recommendedAction}
                  </p>
                </div>
              </div>
            )}

            {/* Selected Vehicle Card (if present) */}
            {selectedVehicle?.vehicle_number && (
              <div className="p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                    <Truck className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-medium block">
                      Selected Vehicle
                    </span>
                    <span className="text-xs font-semibold text-slate-900 dark:text-white">
                      {selectedVehicle.vehicle_number}
                      {selectedVehicle.driver_name && ` (${selectedVehicle.driver_name})`}
                    </span>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                  Available
                </span>
              </div>
            )}

            {/* IF ANALYZE_EXECUTES is true: Result box */}
            {ANALYZE_EXECUTES && (
              <ActionResultDisplay
                actionObj={
                  actionExecution || {
                    action: decisionDisplay || 'reroute',
                    message: analysisResult.message || recommendedAction,
                  }
                }
              />
            )}

            {/* IF ANALYZE_EXECUTES is false: Accept / Reject and Execution States */}
            {!ANALYZE_EXECUTES && (
              <div className="space-y-3 pt-1">
                {/* Error State for Action Execution */}
                {actionError && (
                  <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 space-y-2">
                    <div className="flex items-center gap-2 text-rose-700 dark:text-rose-400 text-xs font-semibold">
                      <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                      <span>Failed to execute action</span>
                    </div>
                    <p className="text-[11px] text-rose-600 dark:text-rose-400">{actionError}</p>
                    <button
                      onClick={handleAcceptAction}
                      disabled={isExecutingAction}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-rose-600 hover:bg-rose-700 text-white transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      Retry Action
                    </button>
                  </div>
                )}

                {/* Success/Accepted Message for Action Execution */}
                {actionResult && <ActionResultDisplay actionObj={actionResult} />}

                {/* Accept and Reject Buttons */}
                {!actionResult && (
                  <div className="flex items-center gap-2.5 pt-1">
                    <button
                      type="button"
                      onClick={handleAcceptAction}
                      disabled={isExecutingAction || actionCompleted}
                      className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isExecutingAction ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Applying...</span>
                        </>
                      ) : (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Accept</span>
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={handleRejectAction}
                      disabled={isExecutingAction || actionCompleted}
                      className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>Reject</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer re-analyze if already analyzed */}
      {analysisResult && (
        <div className="pt-3 mt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
          <button
            onClick={handleStartAnalysis}
            disabled={isAnalyzing || isExecutingAction}
            className="inline-flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 hover:underline cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className="w-3 h-3" /> Re-analyze
          </button>
        </div>
      )}
    </div>
  );
};
