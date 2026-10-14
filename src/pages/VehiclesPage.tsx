import React, { useState, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useVehicles } from '../api/hooks';
import { apiClient } from '../api/client';
import { QueryState } from '../components/QueryState';
import { Truck, MapPin, X, Plus, Loader2 } from 'lucide-react';
import type { Vehicle, VehicleCreate } from '../api/types';

function getVehicleStatusBadge(status: string) {
  const s = status.toLowerCase();
  if (s === 'available') {
    return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800';
  }
  if (s === 'on_route' || s === 'in_use' || s === 'active') {
    return 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 border-blue-200 dark:border-blue-800';
  }
  if (s === 'maintenance') {
    return 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border-amber-200 dark:border-amber-800';
  }
  return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700';
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
  return 'Failed to add vehicle';
}

const initialForm = {
  vehicle_number: '',
  driver_name: '',
  capacity: '',
  vehicle_type: 'van',
  current_location: '',
  latitude: '',
  longitude: '',
  status: 'available',
};

export const VehiclesPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { data: vehicles = [], isLoading, isError, error, refetch } = useVehicles();
  const [statusFilter, setStatusFilter] = useState('all');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState(initialForm);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const statusOptions = useMemo(() => {
    const set = new Set<string>();
    vehicles.forEach((v) => {
      if (v.status) set.add(v.status);
    });
    return Array.from(set);
  }, [vehicles]);

  const modalStatusOptions = useMemo(() => {
    const set = new Set<string>(statusOptions);
    if (!set.has('available')) set.add('available');
    if (!set.has('on_route')) set.add('on_route');
    if (!set.has('maintenance')) set.add('maintenance');
    return Array.from(set);
  }, [statusOptions]);

  const filteredVehicles = useMemo(() => {
    if (statusFilter === 'all') return vehicles;
    return vehicles.filter(
      (v: Vehicle) => v.status?.toLowerCase() === statusFilter.toLowerCase()
    );
  }, [vehicles, statusFilter]);

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
    if (!formData.vehicle_number.trim()) {
      errors.vehicle_number = 'Vehicle number is required.';
    }
    if (!formData.driver_name.trim()) {
      errors.driver_name = 'Driver name is required.';
    }
    if (!formData.capacity.trim()) {
      errors.capacity = 'Capacity is required.';
    } else if (isNaN(Number(formData.capacity)) || Number(formData.capacity) <= 0) {
      errors.capacity = 'Capacity must be a positive number.';
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }
    setFormErrors({});

    const payload: VehicleCreate = {
      vehicle_number: formData.vehicle_number.trim(),
      driver_name: formData.driver_name.trim(),
      capacity: Number(formData.capacity),
      vehicle_type: formData.vehicle_type.trim() || 'van',
      status: formData.status || 'available',
      current_location: formData.current_location.trim() || null,
      latitude: formData.latitude !== '' ? Number(formData.latitude) : null,
      longitude: formData.longitude !== '' ? Number(formData.longitude) : null,
    };

    setIsSubmitting(true);
    try {
      await apiClient.post('/vehicles/', payload);
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast.success('Vehicle added successfully');
      setIsModalOpen(false);
    } catch (err: unknown) {
      setServerError(extractErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Vehicles
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Fleet overview and capacity fetched from <code className="text-xs">GET /vehicles/</code>
          </p>
        </div>
        <button
          type="button"
          onClick={handleOpenModal}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Add Vehicle
        </button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
        <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">
          Filter by Status:
        </label>
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

        {statusFilter !== 'all' && (
          <button
            onClick={() => setStatusFilter('all')}
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
                  <th className="px-5 py-3.5">Vehicle Number</th>
                  <th className="px-5 py-3.5">Driver Name</th>
                  <th className="px-5 py-3.5">Type</th>
                  <th className="px-5 py-3.5">Capacity</th>
                  <th className="px-5 py-3.5">Current Location</th>
                  <th className="px-5 py-3.5">Coordinates</th>
                  <th className="px-5 py-3.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {filteredVehicles.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-5 py-12 text-center text-slate-400 dark:text-slate-500">
                      <Truck className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      No vehicles found matching the filter.
                    </td>
                  </tr>
                ) : (
                  filteredVehicles.map((vehicle) => (
                    <tr key={vehicle.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="px-5 py-4 font-mono font-medium text-slate-900 dark:text-slate-200">
                        #{vehicle.id}
                      </td>
                      <td className="px-5 py-4 font-semibold text-slate-900 dark:text-white">
                        {vehicle.vehicle_number}
                      </td>
                      <td className="px-5 py-4 font-medium text-slate-900 dark:text-slate-200">
                        {vehicle.driver_name}
                      </td>
                      <td className="px-5 py-4 capitalize">
                        {vehicle.vehicle_type}
                      </td>
                      <td className="px-5 py-4 font-mono text-slate-700 dark:text-slate-300">
                        {vehicle.capacity} kg
                      </td>
                      <td className="px-5 py-4">
                        {vehicle.current_location ? (
                          <div className="flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                            <span>{vehicle.current_location}</span>
                          </div>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap text-xs font-mono text-slate-500 dark:text-slate-400">
                        {vehicle.latitude != null && vehicle.longitude != null
                          ? `${vehicle.latitude.toFixed(4)}, ${vehicle.longitude.toFixed(4)}`
                          : '—'}
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border capitalize ${getVehicleStatusBadge(
                            vehicle.status
                          )}`}
                        >
                          {vehicle.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </QueryState>

      {/* Add Vehicle Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 max-w-lg w-full shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Add Vehicle</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Create a new vehicle in the fleet</p>
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
                  Vehicle Number <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. MH-31-AB-1234"
                  value={formData.vehicle_number}
                  onChange={(e) => {
                    setFormData({ ...formData, vehicle_number: e.target.value });
                    if (formErrors.vehicle_number) setFormErrors({ ...formErrors, vehicle_number: '' });
                  }}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {formErrors.vehicle_number && (
                  <p className="text-[11px] text-rose-600 dark:text-rose-400 mt-1">{formErrors.vehicle_number}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Driver Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Rajesh Kumar"
                  value={formData.driver_name}
                  onChange={(e) => {
                    setFormData({ ...formData, driver_name: e.target.value });
                    if (formErrors.driver_name) setFormErrors({ ...formErrors, driver_name: '' });
                  }}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {formErrors.driver_name && (
                  <p className="text-[11px] text-rose-600 dark:text-rose-400 mt-1">{formErrors.driver_name}</p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Capacity (kg) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="any"
                    placeholder="e.g. 1000"
                    value={formData.capacity}
                    onChange={(e) => {
                      setFormData({ ...formData, capacity: e.target.value });
                      if (formErrors.capacity) setFormErrors({ ...formErrors, capacity: '' });
                    }}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {formErrors.capacity && (
                    <p className="text-[11px] text-rose-600 dark:text-rose-400 mt-1">{formErrors.capacity}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Vehicle Type
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. van, truck"
                    value={formData.vehicle_type}
                    onChange={(e) => setFormData({ ...formData, vehicle_type: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Current Location
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Wardha Road"
                    value={formData.current_location}
                    onChange={(e) => setFormData({ ...formData, current_location: e.target.value })}
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
                    <span>Add Vehicle</span>
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
