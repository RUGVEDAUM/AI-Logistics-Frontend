import React, { useState, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useOrders } from '../api/hooks';
import { apiClient } from '../api/client';
import { QueryState } from '../components/QueryState';
import { Search, Package, Calendar, MapPin, X, Plus, Loader2, Check } from 'lucide-react';
import type { Order, OrderCreate, OrderUpdate } from '../api/types';

function getStatusBadge(status: string) {
  const s = status.toLowerCase();
  if (s === 'delivered') {
    return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800';
  }
  if (s === 'in_transit' || s === 'in transit') {
    return 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 border-blue-200 dark:border-blue-800';
  }
  if (s === 'pending') {
    return 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border-amber-200 dark:border-amber-800';
  }
  if (s === 'cancelled' || s === 'failed') {
    return 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border-rose-200 dark:border-rose-800';
  }
  return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700';
}

function getPriorityBadge(priority: string) {
  const p = priority.toLowerCase();
  if (p === 'urgent' || p === 'high') {
    return 'text-rose-600 dark:text-rose-400 font-medium';
  }
  if (p === 'medium') {
    return 'text-amber-600 dark:text-amber-400';
  }
  return 'text-slate-600 dark:text-slate-400';
}

function extractErrorMessage(err: unknown): string {
  if (err && typeof err === 'object' && 'response' in err) {
    const res = (err as { response?: { data?: { detail?: unknown; message?: unknown } } }).response;
    if (res?.data) {
      if (typeof res.data.detail === 'string') return res.data.detail;
      if (typeof res.data.message === 'string') return res.data.message;
      if (Array.isArray(res.data.detail)) {
        return res.data.detail
          .map((item: { msg?: string; loc?: (string | number)[] }) => {
            const locName = item.loc ? item.loc[item.loc.length - 1] : '';
            return locName ? `${locName}: ${item.msg}` : (item.msg || JSON.stringify(item));
          })
          .join(', ');
      }
    }
  }
  if (err instanceof Error) return err.message;
  return 'Failed to complete request';
}

const initialForm = {
  customer_name: '',
  pickup_location: '',
  delivery_location: '',
  priority: 'normal',
  status: 'pending',
  deadline: '',
  assigned_vehicle_id: '',
  latitude: '',
  longitude: '',
};

export const DeliveriesPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { data: orders = [], isLoading, isError, error, refetch } = useOrders();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState(initialForm);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Mark Delivered State
  const [confirmDeliveryOrder, setConfirmDeliveryOrder] = useState<Order | null>(null);
  const [isDelivering, setIsDelivering] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);

  // Derive unique options from real data
  const statusOptions = useMemo(() => {
    const set = new Set<string>();
    orders.forEach((o) => {
      if (o.status) set.add(o.status);
    });
    return Array.from(set);
  }, [orders]);

  const priorityOptions = useMemo(() => {
    const set = new Set<string>();
    orders.forEach((o) => {
      if (o.priority) set.add(o.priority);
    });
    return Array.from(set);
  }, [orders]);

  const modalPriorityOptions = useMemo(() => {
    const set = new Set<string>(priorityOptions);
    if (!set.has('normal')) set.add('normal');
    if (!set.has('medium')) set.add('medium');
    if (!set.has('high')) set.add('high');
    if (!set.has('urgent')) set.add('urgent');
    return Array.from(set);
  }, [priorityOptions]);

  const modalStatusOptions = useMemo(() => {
    const set = new Set<string>(statusOptions);
    if (!set.has('pending')) set.add('pending');
    if (!set.has('in_transit')) set.add('in_transit');
    if (!set.has('delivered')) set.add('delivered');
    return Array.from(set);
  }, [statusOptions]);

  const hasActiveFilters = searchTerm !== '' || statusFilter !== 'all' || priorityFilter !== 'all';

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setPriorityFilter('all');
  };

  const handleOpenModal = () => {
    setFormData(initialForm);
    setFormErrors({});
    setServerError(null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    if (isSubmitting) return;
    setIsModalOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    const errors: Record<string, string> = {};
    if (!formData.customer_name.trim()) {
      errors.customer_name = 'Customer name is required.';
    }
    if (!formData.pickup_location.trim()) {
      errors.pickup_location = 'Pickup location is required.';
    }
    if (!formData.delivery_location.trim()) {
      errors.delivery_location = 'Delivery location is required.';
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }
    setFormErrors({});

    let deadlineIso: string | null = null;
    if (formData.deadline) {
      const parsed = new Date(formData.deadline);
      if (!isNaN(parsed.getTime())) {
        deadlineIso = parsed.toISOString();
      }
    }

    const payload: OrderCreate = {
      customer_name: formData.customer_name.trim(),
      pickup_location: formData.pickup_location.trim(),
      delivery_location: formData.delivery_location.trim(),
      priority: formData.priority || 'normal',
      status: formData.status || 'pending',
      deadline: deadlineIso,
      assigned_vehicle_id:
        formData.assigned_vehicle_id !== '' ? Number(formData.assigned_vehicle_id) : null,
      latitude: formData.latitude !== '' ? Number(formData.latitude) : null,
      longitude: formData.longitude !== '' ? Number(formData.longitude) : null,
    };

    setIsSubmitting(true);
    try {
      await apiClient.post('/orders/', payload);
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      toast.success('Delivery order added successfully');
      setIsModalOpen(false);
    } catch (err: unknown) {
      setServerError(extractErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDelivered = async () => {
    if (!confirmDeliveryOrder) return;
    setIsDelivering(true);
    setConfirmError(null);

    const payload: OrderUpdate = {
      customer_name: confirmDeliveryOrder.customer_name,
      pickup_location: confirmDeliveryOrder.pickup_location,
      delivery_location: confirmDeliveryOrder.delivery_location,
      priority: confirmDeliveryOrder.priority,
      deadline: confirmDeliveryOrder.deadline,
      latitude: confirmDeliveryOrder.latitude,
      longitude: confirmDeliveryOrder.longitude,
      status: 'delivered',
      assigned_vehicle_id: confirmDeliveryOrder.assigned_vehicle_id ?? null,
    };

    try {
      await apiClient.put(`/orders/${confirmDeliveryOrder.id}`, payload);
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      queryClient.invalidateQueries({ queryKey: ['exceptions'] });
      toast.success('Delivery marked as delivered');
      setConfirmDeliveryOrder(null);
    } catch (err: unknown) {
      const errMsg = extractErrorMessage(err);
      setConfirmError(errMsg);
      toast.error(errMsg);
    } finally {
      setIsDelivering(false);
    }
  };

  const filteredOrders = useMemo(() => {
    return orders.filter((order: Order) => {
      // Search filter
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchesSearch =
          order.customer_name?.toLowerCase().includes(term) ||
          order.pickup_location?.toLowerCase().includes(term) ||
          order.delivery_location?.toLowerCase().includes(term) ||
          order.status?.toLowerCase().includes(term) ||
          order.id?.toString().includes(term);
        if (!matchesSearch) return false;
      }

      // Status filter
      if (statusFilter !== 'all') {
        if (order.status?.toLowerCase() !== statusFilter.toLowerCase()) return false;
      }

      // Priority filter
      if (priorityFilter !== 'all') {
        if (order.priority?.toLowerCase() !== priorityFilter.toLowerCase()) return false;
      }

      return true;
    });
  }, [orders, searchTerm, statusFilter, priorityFilter]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Deliveries
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Real-time delivery orders fetched from <code className="text-xs">GET /orders/</code>
          </p>
        </div>
        <button
          type="button"
          onClick={handleOpenModal}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Add Delivery
        </button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search orders, customers, locations..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Status Dropdown */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 capitalize cursor-pointer"
        >
          <option value="all">All Statuses</option>
          {statusOptions.map((st) => (
            <option key={st} value={st} className="capitalize">
              {st}
            </option>
          ))}
        </select>

        {/* Priority Dropdown */}
        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          className="px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 capitalize cursor-pointer"
        >
          <option value="all">All Priorities</option>
          {priorityOptions.map((pr) => (
            <option key={pr} value={pr} className="capitalize">
              {pr}
            </option>
          ))}
        </select>

        {/* Clear Filters Button */}
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
                  <th className="px-5 py-3.5">Customer Name</th>
                  <th className="px-5 py-3.5">Pickup Location</th>
                  <th className="px-5 py-3.5">Delivery Location</th>
                  <th className="px-5 py-3.5">Priority</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5">Deadline</th>
                  <th className="px-5 py-3.5">Coordinates</th>
                  <th className="px-5 py-3.5">Created At</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-5 py-12 text-center text-slate-400 dark:text-slate-500">
                      <Package className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      No orders matching the current filter criteria.
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((order) => {
                    const isDelivered = order.status?.toLowerCase() === 'delivered';

                    return (
                      <tr key={order.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="px-5 py-4 font-mono font-medium text-slate-900 dark:text-slate-200">
                          #{order.id}
                        </td>
                        <td className="px-5 py-4 font-medium text-slate-900 dark:text-white">
                          {order.customer_name}
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                            <span>{order.pickup_location}</span>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                            <span>{order.delivery_location}</span>
                          </div>
                        </td>
                        <td className="px-5 py-4 capitalize">
                          <span className={getPriorityBadge(order.priority)}>
                            {order.priority}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border capitalize ${getStatusBadge(
                              order.status
                            )}`}
                          >
                            {order.status}
                          </span>
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap text-xs text-slate-500 dark:text-slate-400">
                          {order.deadline ? (
                            <div className="flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5" />
                              {new Date(order.deadline).toLocaleString()}
                            </div>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap text-xs font-mono text-slate-500 dark:text-slate-400">
                          {order.latitude != null && order.longitude != null
                            ? `${order.latitude.toFixed(4)}, ${order.longitude.toFixed(4)}`
                            : '—'}
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap text-xs text-slate-500 dark:text-slate-400">
                          {order.created_at ? new Date(order.created_at).toLocaleString() : '—'}
                        </td>
                        <td className="px-5 py-4 text-right">
                          {!isDelivered && (
                            <button
                              type="button"
                              onClick={() => {
                                setConfirmError(null);
                                setConfirmDeliveryOrder(order);
                              }}
                              disabled={isDelivering && confirmDeliveryOrder?.id === order.id}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-emerald-700 hover:text-emerald-800 dark:text-emerald-400 dark:hover:text-emerald-300 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/50 border border-emerald-200 dark:border-emerald-800 rounded-lg transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Mark Delivered</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </QueryState>

      {/* Confirmation Dialog for Mark as Delivered */}
      {confirmDeliveryOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-emerald-600 dark:text-emerald-400">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center flex-shrink-0">
                <Check className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Mark this delivery as delivered?
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Order #{confirmDeliveryOrder.id} • {confirmDeliveryOrder.customer_name}
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              This will update the order status to &quot;delivered&quot; and refresh the live map, active vehicles, and delivery exceptions.
            </p>

            {confirmError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-400">
                {confirmError}
              </div>
            )}

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => {
                  if (!isDelivering) setConfirmDeliveryOrder(null);
                }}
                disabled={isDelivering}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelivered}
                disabled={isDelivering}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isDelivering ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Updating...</span>
                  </>
                ) : (
                  <span>Confirm</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Delivery Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 max-w-lg w-full shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Add Delivery</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Create a new delivery order</p>
              </div>
              <button
                type="button"
                onClick={handleCloseModal}
                disabled={isSubmitting}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer disabled:opacity-50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {serverError && (
              <div className="mt-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-400">
                {serverError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Customer Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Acme Corp"
                  value={formData.customer_name}
                  onChange={(e) => {
                    setFormData({ ...formData, customer_name: e.target.value });
                    if (formErrors.customer_name) setFormErrors({ ...formErrors, customer_name: '' });
                  }}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {formErrors.customer_name && (
                  <p className="text-[11px] text-rose-600 dark:text-rose-400 mt-1">{formErrors.customer_name}</p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Pickup Location <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Sitabuldi Warehouse"
                    value={formData.pickup_location}
                    onChange={(e) => {
                      setFormData({ ...formData, pickup_location: e.target.value });
                      if (formErrors.pickup_location) setFormErrors({ ...formErrors, pickup_location: '' });
                    }}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {formErrors.pickup_location && (
                    <p className="text-[11px] text-rose-600 dark:text-rose-400 mt-1">{formErrors.pickup_location}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Delivery Location <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Dharampeth Store"
                    value={formData.delivery_location}
                    onChange={(e) => {
                      setFormData({ ...formData, delivery_location: e.target.value });
                      if (formErrors.delivery_location) setFormErrors({ ...formErrors, delivery_location: '' });
                    }}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {formErrors.delivery_location && (
                    <p className="text-[11px] text-rose-600 dark:text-rose-400 mt-1">{formErrors.delivery_location}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Priority
                  </label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 capitalize cursor-pointer"
                  >
                    {modalPriorityOptions.map((pr) => (
                      <option key={pr} value={pr} className="capitalize">
                        {pr}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 capitalize cursor-pointer"
                  >
                    {modalStatusOptions.map((st) => (
                      <option key={st} value={st} className="capitalize">
                        {st}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Deadline
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.deadline}
                    onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Assigned Vehicle ID (Optional)
                  </label>
                  <input
                    type="number"
                    placeholder="e.g. 1"
                    value={formData.assigned_vehicle_id}
                    onChange={(e) => setFormData({ ...formData, assigned_vehicle_id: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Latitude
                    </label>
                    <input
                      type="number"
                      step="any"
                      placeholder="e.g. 21.1458"
                      value={formData.latitude}
                      onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Longitude
                    </label>
                    <input
                      type="number"
                      step="any"
                      placeholder="e.g. 79.0882"
                      value={formData.longitude}
                      onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  Nagpur is around 21.14, 79.08
                </p>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Adding...</span>
                    </>
                  ) : (
                    <span>Add Delivery</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
