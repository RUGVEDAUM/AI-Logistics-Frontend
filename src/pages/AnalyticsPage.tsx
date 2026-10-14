import React, { useMemo } from 'react';
import { useOrders, useVehicles, useExceptions } from '../api/hooks';
import { QueryState } from '../components/QueryState';
import {
  BarChart3,
  Clock,
  Truck,
  Package,
  AlertTriangle,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';

const SEVERITY_COLORS: { [key: string]: string } = {
  critical: '#ef4444',
  high: '#f97316',
  medium: '#eab308',
  low: '#10b981',
};

const VEHICLE_STATUS_COLORS: { [key: string]: string } = {
  available: '#10b981',
  on_route: '#2563eb',
  in_use: '#3b82f6',
  active: '#2563eb',
  maintenance: '#f59e0b',
  offline: '#94a3b8',
};

const PALETTE = ['#2563eb', '#8b5cf6', '#06b6d4', '#f97316', '#10b981', '#ec4899'];

interface ChartCardProps {
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  hasData: boolean;
  children: React.ReactNode;
}

const ChartCard: React.FC<ChartCardProps> = ({ title, subtitle, icon, hasData, children }) => (
  <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-2xs flex flex-col justify-between">
    <div>
      <div className="flex items-center gap-2.5 mb-1">
        <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center">
          {icon}
        </div>
        <div>
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">{title}</h2>
          {subtitle && (
            <p className="text-xs text-slate-400 dark:text-slate-500">{subtitle}</p>
          )}
        </div>
      </div>

      <div className="mt-4 h-64 w-full flex items-center justify-center">
        {!hasData ? (
          <div className="flex flex-col items-center justify-center text-slate-400 text-xs">
            <BarChart3 className="w-8 h-8 mb-2 opacity-40" />
            No data yet
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  </div>
);

export const AnalyticsPage: React.FC = () => {
  const {
    data: orders = [],
    isLoading: isOrdersLoading,
    isError: isOrdersError,
    error: ordersError,
    refetch: refetchOrders,
  } = useOrders();

  const {
    data: vehicles = [],
    isLoading: isVehiclesLoading,
    isError: isVehiclesError,
    error: vehiclesError,
    refetch: refetchVehicles,
  } = useVehicles();

  const {
    data: exceptions = [],
    isLoading: isExceptionsLoading,
    isError: isExceptionsError,
    error: exceptionsError,
    refetch: refetchExceptions,
  } = useExceptions();

  const isLoading = isOrdersLoading || isVehiclesLoading || isExceptionsLoading;
  const isError = isOrdersError || isVehiclesError || isExceptionsError;
  const error = ordersError || vehiclesError || exceptionsError;

  const handleRetry = () => {
    refetchOrders();
    refetchVehicles();
    refetchExceptions();
  };

  // 1. Orders by status
  const ordersByStatus = useMemo(() => {
    const counts: { [status: string]: number } = {};
    orders.forEach((o) => {
      const s = o.status ? o.status.replace(/_/g, ' ') : 'Unknown';
      counts[s] = (counts[s] || 0) + 1;
    });
    return Object.entries(counts).map(([status, count]) => ({
      status: status.charAt(0).toUpperCase() + status.slice(1),
      count,
    }));
  }, [orders]);

  // 2. Exceptions by severity
  const exceptionsBySeverity = useMemo(() => {
    const counts: { [severity: string]: number } = {};
    exceptions.forEach((e) => {
      const s = e.severity ? e.severity.toLowerCase() : 'unknown';
      counts[s] = (counts[s] || 0) + 1;
    });
    return Object.entries(counts).map(([severity, count]) => ({
      name: severity.charAt(0).toUpperCase() + severity.slice(1),
      count,
      color: SEVERITY_COLORS[severity] || '#94a3b8',
    }));
  }, [exceptions]);

  // 3. Exceptions by type
  const exceptionsByType = useMemo(() => {
    const counts: { [type: string]: number } = {};
    exceptions.forEach((e) => {
      const t = e.exception_type
        ? e.exception_type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
        : 'Other';
      counts[t] = (counts[t] || 0) + 1;
    });
    return Object.entries(counts).map(([type, count]) => ({
      type,
      count,
    }));
  }, [exceptions]);

  // 4. Vehicles by status
  const vehiclesByStatus = useMemo(() => {
    const counts: { [status: string]: number } = {};
    vehicles.forEach((v) => {
      const s = v.status ? v.status.toLowerCase() : 'unknown';
      counts[s] = (counts[s] || 0) + 1;
    });
    return Object.entries(counts).map(([status, count]) => ({
      name: status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
      count,
      color: VEHICLE_STATUS_COLORS[status] || '#94a3b8',
    }));
  }, [vehicles]);

  // 5. Average delay per exception type
  const avgDelayByType = useMemo(() => {
    const stats: { [type: string]: { total: number; count: number } } = {};
    exceptions.forEach((e) => {
      const t = e.exception_type
        ? e.exception_type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
        : 'Other';
      const delay = Number(e.delay_minutes) || 0;
      if (!stats[t]) stats[t] = { total: 0, count: 0 };
      stats[t].total += delay;
      stats[t].count += 1;
    });
    return Object.entries(stats).map(([type, item]) => ({
      type,
      avgDelay: item.count > 0 ? Math.round(item.total / item.count) : 0,
    }));
  }, [exceptions]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Analytics
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Operational metrics and delivery performance trends
        </p>
      </div>

      <QueryState isLoading={isLoading} isError={isError} error={error} onRetry={handleRetry}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 1. Orders by Status (Bar Chart) */}
          <ChartCard
            title="Orders by Status"
            subtitle="Current delivery stage breakdown"
            icon={<Package className="w-4 h-4" />}
            hasData={ordersByStatus.length > 0}
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ordersByStatus} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <XAxis
                  dataKey="status"
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                  interval={0}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                  formatter={(val: unknown) => [`${val} orders`, 'Count']}
                />
                <Bar dataKey="count" fill="#2563eb" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* 2. Exceptions by Severity (Donut Chart) */}
          <ChartCard
            title="Exceptions by Severity"
            subtitle="Incident severity classification"
            icon={<AlertTriangle className="w-4 h-4" />}
            hasData={exceptionsBySeverity.length > 0}
          >
            <div className="w-full h-full flex flex-col items-center justify-center">
              <ResponsiveContainer width="100%" height={190}>
                <PieChart>
                  <Pie
                    data={exceptionsBySeverity}
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="count"
                  >
                    {exceptionsBySeverity.map((entry, index) => (
                      <Cell key={`cell-sev-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#334155',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '12px',
                    }}
                    formatter={(val: unknown) => [`${val} exceptions`, 'Count']}
                  />
                </PieChart>
              </ResponsiveContainer>

              <div className="flex flex-wrap items-center justify-center gap-4 text-xs mt-2">
                {exceptionsBySeverity.map((item) => (
                  <div key={item.name} className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-slate-500">{item.name}</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{item.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </ChartCard>

          {/* 3. Exceptions by Type (Bar Chart) */}
          <ChartCard
            title="Exceptions by Type"
            subtitle="Disruption causes and frequencies"
            icon={<AlertTriangle className="w-4 h-4" />}
            hasData={exceptionsByType.length > 0}
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={exceptionsByType} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <XAxis
                  dataKey="type"
                  tick={{ fontSize: 10, fill: '#94a3b8' }}
                  interval={0}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                  formatter={(val: unknown) => [`${val} incidents`, 'Count']}
                />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {exceptionsByType.map((_, index) => (
                    <Cell key={`bar-typ-${index}`} fill={PALETTE[index % PALETTE.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* 4. Vehicles by Status (Donut Chart) */}
          <ChartCard
            title="Vehicles by Status"
            subtitle="Fleet readiness and active deployment"
            icon={<Truck className="w-4 h-4" />}
            hasData={vehiclesByStatus.length > 0}
          >
            <div className="w-full h-full flex flex-col items-center justify-center">
              <ResponsiveContainer width="100%" height={190}>
                <PieChart>
                  <Pie
                    data={vehiclesByStatus}
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="count"
                  >
                    {vehiclesByStatus.map((entry, index) => (
                      <Cell key={`cell-veh-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#334155',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '12px',
                    }}
                    formatter={(val: unknown) => [`${val} vehicles`, 'Count']}
                  />
                </PieChart>
              </ResponsiveContainer>

              <div className="flex flex-wrap items-center justify-center gap-4 text-xs mt-2">
                {vehiclesByStatus.map((item) => (
                  <div key={item.name} className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-slate-500">{item.name}</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{item.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </ChartCard>

          {/* 5. Average Delay per Exception Type (Full width on 2-col or spanned) */}
          <div className="lg:col-span-2">
            <ChartCard
              title="Average Delay per Exception Type"
              subtitle="Calculated average delay in minutes from reported exceptions"
              icon={<Clock className="w-4 h-4" />}
              hasData={avgDelayByType.length > 0}
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={avgDelayByType} margin={{ top: 10, right: 20, left: -10, bottom: 20 }}>
                  <XAxis
                    dataKey="type"
                    tick={{ fontSize: 11, fill: '#94a3b8' }}
                    interval={0}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#94a3b8' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#334155',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '12px',
                    }}
                    formatter={(val: unknown) => [`${val} minutes`, 'Avg Delay']}
                  />
                  <Bar dataKey="avgDelay" fill="#f97316" radius={[6, 6, 0, 0]}>
                    {avgDelayByType.map((_, index) => (
                      <Cell key={`bar-delay-${index}`} fill={PALETTE[index % PALETTE.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>
        </div>
      </QueryState>
    </div>
  );
};
