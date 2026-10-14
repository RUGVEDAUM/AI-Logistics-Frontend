import React, { useEffect, useState } from 'react';
import { AlertTriangle, RefreshCw, Loader2 } from 'lucide-react';

interface QueryStateProps {
  isLoading: boolean;
  isError: boolean;
  error?: unknown;
  onRetry: () => void;
  children: React.ReactNode;
}

export const QueryState: React.FC<QueryStateProps> = ({
  isLoading,
  isError,
  error,
  onRetry,
  children,
}) => {
  const [showWakeMessage, setShowWakeMessage] = useState(false);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    if (isLoading) {
      setShowWakeMessage(false);
      timer = setTimeout(() => {
        setShowWakeMessage(true);
      }, 5000);
    } else {
      setShowWakeMessage(false);
    }

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [isLoading]);

  if (isLoading) {
    return (
      <div className="space-y-4 w-full">
        {showWakeMessage && (
          <div className="flex items-center gap-3 p-4 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-sm animate-pulse">
            <Loader2 className="w-5 h-5 animate-spin flex-shrink-0" />
            <span>Waking up server, this may take up to a minute...</span>
          </div>
        )}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-6 shadow-sm overflow-hidden space-y-4">
          <div className="flex justify-between items-center mb-6">
            <div className="h-6 w-48 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
            <div className="h-9 w-64 bg-slate-200 dark:bg-slate-800 rounded-lg animate-pulse" />
          </div>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex gap-4 items-center py-3 border-b border-slate-100 dark:border-slate-800/60">
                <div className="h-4 w-12 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
                <div className="h-4 w-32 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
                <div className="h-4 w-48 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
                <div className="h-4 w-28 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
                <div className="h-6 w-20 bg-slate-200 dark:bg-slate-800 rounded-full animate-pulse ml-auto" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50/50 dark:bg-rose-950/20 p-8 text-center space-y-4 max-w-lg mx-auto my-12">
        <div className="mx-auto w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-900/40 flex items-center justify-center text-rose-600 dark:text-rose-400">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Failed to load data</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {error instanceof Error ? error.message : 'An error occurred while fetching information from the server.'}
          </p>
        </div>
        <button
          onClick={onRetry}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-rose-600 hover:bg-rose-700 text-white transition-colors cursor-pointer"
        >
          <RefreshCw className="w-4 h-4" />
          Retry
        </button>
      </div>
    );
  }

  return <>{children}</>;
};
