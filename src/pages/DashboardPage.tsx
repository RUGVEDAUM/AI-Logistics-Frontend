import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useOrders, useVehicles, useExceptions } from '../api/hooks';
import { QueryState } from '../components/QueryState';
import { LiveMap } from '../components/LiveMap';
import { AiDecisionPanel } from '../components/AiDecisionPanel';
import {
  Package,
  Truck,
  ShieldCheck,
  AlertTriangle,
  Calendar,
  Clock,
  ArrowRight,
  PieChart as PieIcon,
  BarChart3,
} from 'lucide-react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';

function getPriorityBadgeClass(priority: string) {
  const p = priority?.toLowerCase() || '';
  if (p === 'high' || p === 'urgent') {
    return 'bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-900';
  }
  if (p === 'medium') {
    return 'bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900';
  }
  return 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900';
}

function getStatusBadge(status: string) {
  const s = status?.toLowerCase() || '';
  if (s === 'delivered') {
    return {
      dot: 'bg-emerald-500',
      badge: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900',
    };
  }
  if (s === 'in_transit' || s === 'in transit' || s === 'assigned') {
    return {
      dot: 'bg-blue-500',
      badge: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-900',
    };
  }
  if (s === 'pending') {
    return {
      dot: 'bg-amber-500',
      badge: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900',
    };
  }
  return {
    dot: 'bg-rose-500',
    badge: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-900',
  };
}

const BAR_COLORS = ['#2563eb', '#8b5cf6', '#f97316', '#ef4444', '#10b981'];

export const DashboardPage: React.FC = () => {
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

  const [aiRouteGeometry, setAiRouteGeometry] = useState<[number, number][] | null>(null);
  const latestException = exceptions.length > 0 ? exceptions[exceptions.length - 1] : null;

  // Date and Time
  const now = new Date();
  const dateFormatted = now.toLocaleDateString('en-US', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  const timeFormatted = now.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });

  // KPI Computations from real data
  const totalDeliveries = orders.length;

  const activeVehicles = useMemo(() => {
    return vehicles.filter((v) => {
      const s = v.status?.toLowerCase() || '';
      return s !== 'offline' && s !== 'unavailable' && s !== 'maintenance';
    }).length;
  }, [vehicles]);

  // Delayed orders computation
  const { onTimeCount, delayedCount, onTimePercentage } = useMemo(() => {
    if (orders.length === 0) {
      return { onTimeCount: 0, delayedCount: 0, onTimePercentage: 100 };
    }
    const delayedOrderIds = new Set(
      exceptions
        .filter((e) => e.order_id != null && (e.delay_minutes > 0 || e.status?.toLowerCase() === 'active'))
        .map((e) => e.order_id)
    );

    const delayed = orders.filter(
      (o) => delayedOrderIds.has(o.id) || o.status?.toLowerCase() === 'delayed'
    ).length;

    const onTime = Math.max(0, orders.length - delayed);
    const percentage = Math.round((onTime / orders.length) * 100);

    return { onTimeCount: onTime, delayedCount: delayed, onTimePercentage: percentage };
  }, [orders, exceptions]);

  const activeExceptionsCount = useMemo(() => {
    return exceptions.filter((e) => e.status?.toLowerCase() !== 'resolved').length;
  }, [exceptions]);

  // Recent 5 Deliveries
  const recentOrders = useMemo(() => {
    return [...orders].slice(-5).reverse();
  }, [orders]);

  // Vehicle lookup map
  const vehicleLookup = useMemo(() => {
    const map = new Map<number, string>();
    vehicles.forEach((v) => {
      map.set(v.id, v.vehicle_number);
    });
    return map;
  }, [vehicles]);

  // Order vehicle lookup (via exception vehicle_id or vehicle list)
  const getOrderVehicle = (orderId: number) => {
    const relatedException = exceptions.find((e) => e.order_id === orderId && e.vehicle_id != null);
    if (relatedException?.vehicle_id && vehicleLookup.has(relatedException.vehicle_id)) {
      return vehicleLookup.get(relatedException.vehicle_id);
    }
    return '—';
  };

  // Performance Pie Data
  const pieData = useMemo(() => {
    if (orders.length === 0) {
      return [{ name: 'On-time', value: 1, color: '#10b981' }];
    }
    return [
      { name: 'On-time', value: onTimeCount, color: '#10b981' },
      { name: 'Delayed', value: delayedCount, color: '#ef4444' },
    ];
  }, [orders.length, onTimeCount, delayedCount]);

  // Delay Statistics Data grouped by exception_type
  const delayStatsData = useMemo(() => {
    const grouped: { [type: string]: { totalDelay: number; count: number } } = {};
    exceptions.forEach((e) => {
      const type = e.exception_type
        ? e.exception_type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
        : 'Other';
      const delay = Number(e.delay_minutes) || 0;
      if (!grouped[type]) {
        grouped[type] = { totalDelay: 0, count: 0 };
      }
      grouped[type].totalDelay += delay;
      grouped[type].count += 1;
    });

    const result = Object.entries(grouped).map(([type, stat]) => ({
      name: type,
      avgDelay: stat.count > 0 ? Math.round(stat.totalDelay / stat.count) : 0,
    }));

    return result;
  }, [exceptions]);

  return (
    <div className="space-y-6">
      {/* 1. Welcome Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Dashboard
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Welcome back! Here's what's happening with your logistics operations today.
          </p>
        </div>

        <div className="flex items-center gap-3 bg-white dark:bg-slate-900 px-4 py-2 rounded-xl border border-slate-200/80 dark:border-slate-800 text-xs font-medium text-slate-600 dark:text-slate-300 shadow-2xs w-fit">
          <div className="flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-slate-400" />
            <span>{dateFormatted}</span>
          </div>
          <span className="text-slate-300 dark:text-slate-700">|</span>
          <div className="flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-slate-400" />
            <span>{timeFormatted}</span>
          </div>
        </div>
      </div>

      <QueryState isLoading={isLoading} isError={isError} error={error} onRetry={handleRetry}>
        {/* 2. Row of KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          {/* Total Deliveries */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-2xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center flex-shrink-0">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Deliveries</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white mt-0.5">{totalDeliveries}</p>
            </div>
          </div>

          {/* Active Vehicles */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-2xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-shrink-0">
              <Truck className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Active Vehicles</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white mt-0.5">{activeVehicles}</p>
            </div>
          </div>

          {/* On-time Deliveries */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-2xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 flex items-center justify-center flex-shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">On-time Deliveries</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white mt-0.5">{onTimePercentage}%</p>
            </div>
          </div>

          {/* Active Exceptions */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-2xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Active Exceptions</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white mt-0.5">{activeExceptionsCount}</p>
            </div>
          </div>
        </div>

        {/* Middle Row: Live Map & AI Decision Center */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-8">
            <LiveMap
              orders={orders}
              vehicles={vehicles}
              exceptions={exceptions}
              routeGeometry={aiRouteGeometry}
            />
          </div>
          <div className="lg:col-span-4 flex flex-col">
            <AiDecisionPanel
              exception={latestException}
              orders={orders}
              vehicles={vehicles}
              onRouteAnalyzed={(coords) => setAiRouteGeometry(coords)}
            />
          </div>
        </div>

        {/* Bottom Row: 3 Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Card 1: Recent Deliveries (lg:col-span-6) */}
          <div className="lg:col-span-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-2xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4 text-blue-600" />
                  <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Recent Deliveries</h2>
                </div>
                <Link
                  to="/deliveries"
                  className="text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 flex items-center gap-1 transition-colors"
                >
                  View All <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 font-medium">
                      <th className="pb-3 pr-3">Order ID</th>
                      <th className="pb-3 px-3">Customer</th>
                      <th className="pb-3 px-3">Location</th>
                      <th className="pb-3 px-3">Priority</th>
                      <th className="pb-3 px-3">Status</th>
                      <th className="pb-3 pl-3">Vehicle</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100/80 dark:divide-slate-800/60">
                    {recentOrders.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-400">
                          No deliveries recorded yet.
                        </td>
                      </tr>
                    ) : (
                      recentOrders.map((order) => {
                        const statusStyle = getStatusBadge(order.status);
                        const priorityStyle = getPriorityBadgeClass(order.priority);
                        const vehicleNum = getOrderVehicle(order.id);

                        return (
                          <tr key={order.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                            <td className="py-3 pr-3 font-mono font-medium text-slate-700 dark:text-slate-300">
                              #{order.id}
                            </td>
                            <td className="py-3 px-3 font-medium text-slate-900 dark:text-white whitespace-nowrap">
                              {order.customer_name}
                            </td>
                            <td className="py-3 px-3 text-slate-500 dark:text-slate-400 max-w-[130px] truncate" title={order.delivery_location}>
                              {order.delivery_location}
                            </td>
                            <td className="py-3 px-3">
                              <span
                                className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-medium border capitalize ${priorityStyle}`}
                              >
                                {order.priority}
                              </span>
                            </td>
                            <td className="py-3 px-3">
                              <span
                                className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium border capitalize ${statusStyle.badge}`}
                              >
                                <span className={`w-1.5 h-1.5 rounded-full ${statusStyle.dot}`} />
                                {order.status}
                              </span>
                            </td>
                            <td className="py-3 pl-3 font-mono text-slate-600 dark:text-slate-400">
                              {vehicleNum}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Card 2: Delivery Performance (lg:col-span-3) */}
          <div className="lg:col-span-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-2xs flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <PieIcon className="w-4 h-4 text-blue-600" />
                <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Delivery Performance</h2>
              </div>
              <p className="text-[11px] text-slate-400 mb-2">On-time vs Delayed deliveries</p>

              <div className="relative h-44 w-full flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      innerRadius={50}
                      outerRadius={68}
                      paddingAngle={3}
                      dataKey="value"
                      startAngle={90}
                      endAngle={-270}
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>

                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-2xl font-bold text-slate-900 dark:text-white leading-none">
                    {onTimePercentage}%
                  </span>
                  <span className="text-[11px] text-slate-400 font-medium mt-1">On-time</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-center gap-6 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span className="text-slate-500">On-time</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{onTimeCount}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                <span className="text-slate-500">Delayed</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{delayedCount}</span>
              </div>
            </div>
          </div>

          {/* Card 3: Delay Statistics (lg:col-span-3) */}
          <div className="lg:col-span-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-2xs flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <BarChart3 className="w-4 h-4 text-blue-600" />
                <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Delay Statistics</h2>
              </div>
              <p className="text-[11px] text-slate-400 mb-2">Average delay (minutes)</p>

              {delayStatsData.length === 0 ? (
                <div className="h-44 flex items-center justify-center text-xs text-slate-400">
                  No data yet
                </div>
              ) : (
                <div className="h-44 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={delayStatsData} margin={{ top: 10, right: 10, left: -25, bottom: 5 }}>
                      <XAxis
                        dataKey="name"
                        tick={{ fontSize: 10, fill: '#94a3b8' }}
                        interval={0}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fontSize: 10, fill: '#94a3b8' }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#1e293b',
                          borderColor: '#334155',
                          borderRadius: '8px',
                          color: '#fff',
                          fontSize: '12px',
                        }}
                        formatter={(val: unknown) => [`${val} min`, 'Avg Delay']}
                      />
                      <Bar dataKey="avgDelay" radius={[4, 4, 0, 0]}>
                        {delayStatsData.map((_, index) => (
                          <Cell key={`bar-${index}`} fill={BAR_COLORS[index % BAR_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            <div className="pt-2 text-center text-[10px] text-slate-400 border-t border-slate-100 dark:border-slate-800">
              Delay impact by category
            </div>
          </div>
        </div>
      </QueryState>
    </div>
  );
};
