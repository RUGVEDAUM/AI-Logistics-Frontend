import React, { useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Order, Vehicle, DeliveryException } from '../api/types';
import { calculateRoadRoute } from '../api/hooks';
import { Map as MapIcon } from 'lucide-react';

// Fix Vite default marker icon paths
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Custom colored SVG markers
const vehicleIcon = L.divIcon({
  className: 'custom-vehicle-marker',
  html: `<div style="background-color: #2563eb; width: 26px; height: 26px; border-radius: 50%; border: 2.5px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.35); display: flex; align-items: center; justify-content: center; color: white;">
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/></svg>
  </div>`,
  iconSize: [26, 26],
  iconAnchor: [13, 13],
  popupAnchor: [0, -13],
});

const deliveryIcon = L.divIcon({
  className: 'custom-delivery-marker',
  html: `<div style="background-color: #10b981; width: 24px; height: 24px; border-radius: 50%; border: 2.5px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.35); display: flex; align-items: center; justify-content: center; color: white;">
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
  </div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
  popupAnchor: [0, -12],
});

const exceptionIcon = L.divIcon({
  className: 'custom-exception-marker',
  html: `<div style="background-color: #ef4444; width: 24px; height: 24px; border-radius: 50%; border: 2.5px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.35); display: flex; align-items: center; justify-content: center; color: white;">
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
  </div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
  popupAnchor: [0, -12],
});

// Helper component to auto-fit bounds when markers exist
function FitBounds({ points }: { points: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length > 0) {
      const bounds = L.latLngBounds(points.map(([lat, lng]) => [lat, lng]));
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
    }
  }, [points, map]);
  return null;
}

interface LiveMapProps {
  orders: Order[];
  vehicles: Vehicle[];
  exceptions: DeliveryException[];
  routeGeometry?: [number, number][] | null;
}

const NAGPUR_CENTER: [number, number] = [21.1458, 79.0882];

export const LiveMap: React.FC<LiveMapProps> = ({
  orders,
  vehicles,
  exceptions,
  routeGeometry,
}) => {
  const [calculatedRoute, setCalculatedRoute] = useState<[number, number][] | null>(null);

  // Filter items with real coordinates
  const validVehicles = useMemo(
    () => vehicles.filter((v) => v.latitude != null && v.longitude != null),
    [vehicles]
  );

  const validOrders = useMemo(
    () => orders.filter((o) => o.latitude != null && o.longitude != null),
    [orders]
  );

  // Match exceptions to real coordinates via linked order or vehicle
  const validExceptions = useMemo(() => {
    return exceptions
      .map((e) => {
        const linkedOrder = orders.find((o) => o.id === e.order_id);
        const linkedVehicle = vehicles.find((v) => v.id === e.vehicle_id);
        const lat = linkedOrder?.latitude ?? linkedVehicle?.latitude ?? null;
        const lng = linkedOrder?.longitude ?? linkedVehicle?.longitude ?? null;
        return {
          ...e,
          lat,
          lng,
        };
      })
      .filter((e): e is DeliveryException & { lat: number; lng: number } => e.lat != null && e.lng != null);
  }, [exceptions, orders, vehicles]);

  // Aggregate points for fitBounds check
  const allCoordinatePoints = useMemo(() => {
    const pts: [number, number][] = [];
    validVehicles.forEach((v) => pts.push([v.latitude!, v.longitude!]));
    validOrders.forEach((o) => pts.push([o.latitude!, o.longitude!]));
    validExceptions.forEach((e) => pts.push([e.lat, e.lng]));
    return pts;
  }, [validVehicles, validOrders, validExceptions]);

  // If no external routeGeometry was passed, check if we can calculate route for first order with coordinates
  useEffect(() => {
    if (routeGeometry && routeGeometry.length > 0) {
      setCalculatedRoute(null);
      return;
    }

    const orderWithCoords = validOrders[0];
    const vehicleWithCoords = validVehicles[0];

    if (orderWithCoords && vehicleWithCoords) {
      calculateRoadRoute({
        start_lat: vehicleWithCoords.latitude!,
        start_lon: vehicleWithCoords.longitude!,
        end_lat: orderWithCoords.latitude!,
        end_lon: orderWithCoords.longitude!,
        alternatives: true,
      })
        .then((res) => {
          if (res?.geometry?.coordinates) {
            // Convert GeoJSON [lng, lat] to Leaflet [lat, lng]
            const leafletCoords: [number, number][] = res.geometry.coordinates.map(
              ([lon, lat]) => [lat, lon]
            );
            setCalculatedRoute(leafletCoords);
          }
        })
        .catch(() => {
          // Keep silent fallback
        });
    }
  }, [validOrders, validVehicles, routeGeometry]);

  const activePolyline = routeGeometry || calculatedRoute;

  const hasCoordinates = allCoordinatePoints.length > 0 || (activePolyline && activePolyline.length > 0);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-2xs flex flex-col justify-between">
      {/* Header & Legend */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center">
            <MapIcon className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Live Map</h2>
            <p className="text-xs text-slate-400 dark:text-slate-500">Real-time vehicle locations and delivery routes</p>
          </div>
        </div>

        <div className="flex items-center flex-wrap gap-3 text-xs font-medium text-slate-500 dark:text-slate-400">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
            Vehicles
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            Deliveries
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
            Exceptions
          </span>
          {activePolyline && (
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-blue-600 inline-block" />
              Route
            </span>
          )}
        </div>
      </div>

      {/* Map or Empty State */}
      {!hasCoordinates ? (
        <div className="h-[380px] w-full rounded-xl bg-slate-50/70 dark:bg-slate-950/60 border border-dashed border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center text-center p-6">
          <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mb-2">
            <MapIcon className="w-6 h-6" />
          </div>
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
            No location data available
          </span>
          <span className="text-xs text-slate-400 mt-1 max-w-sm">
            None of the current orders or vehicles have geographic coordinates assigned.
          </span>
        </div>
      ) : (
        <div className="h-[380px] w-full rounded-xl overflow-hidden border border-slate-200/80 dark:border-slate-800 z-10 relative">
          <MapContainer
            center={NAGPUR_CENTER}
            zoom={12}
            scrollWheelZoom={false}
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {allCoordinatePoints.length > 0 && <FitBounds points={allCoordinatePoints} />}

            {/* Blue markers for vehicles */}
            {validVehicles.map((vehicle) => (
              <Marker
                key={`veh-${vehicle.id}`}
                position={[vehicle.latitude!, vehicle.longitude!]}
                icon={vehicleIcon}
              >
                <Popup>
                  <div className="text-xs font-sans space-y-1">
                    <p className="font-bold text-slate-900">{vehicle.vehicle_number}</p>
                    <p className="text-slate-600">Driver: {vehicle.driver_name}</p>
                    <p className="text-slate-600 capitalize">Status: <span className="font-semibold">{vehicle.status}</span></p>
                  </div>
                </Popup>
              </Marker>
            ))}

            {/* Green markers for delivery locations */}
            {validOrders.map((order) => (
              <Marker
                key={`ord-${order.id}`}
                position={[order.latitude!, order.longitude!]}
                icon={deliveryIcon}
              >
                <Popup>
                  <div className="text-xs font-sans space-y-1">
                    <p className="font-bold text-slate-900">{order.customer_name}</p>
                    <p className="text-slate-600">{order.delivery_location}</p>
                    <p className="text-slate-600 capitalize">Status: <span className="font-semibold">{order.status}</span></p>
                  </div>
                </Popup>
              </Marker>
            ))}

            {/* Red markers for exceptions */}
            {validExceptions.map((exc) => (
              <Marker
                key={`exc-${exc.id}`}
                position={[exc.lat, exc.lng]}
                icon={exceptionIcon}
              >
                <Popup>
                  <div className="text-xs font-sans space-y-1">
                    <p className="font-bold text-rose-600 uppercase">Exception #{exc.id}</p>
                    <p className="font-semibold text-slate-900 capitalize">{exc.exception_type.replace(/_/g, ' ')}</p>
                    <p className="text-slate-600 capitalize">Severity: <span className="font-semibold">{exc.severity}</span></p>
                    {exc.description && <p className="text-slate-500 italic text-[11px]">{exc.description}</p>}
                  </div>
                </Popup>
              </Marker>
            ))}

            {/* Blue Polyline for active route */}
            {activePolyline && activePolyline.length > 0 && (
              <Polyline
                positions={activePolyline}
                pathOptions={{ color: '#2563eb', weight: 4, opacity: 0.85 }}
              />
            )}
          </MapContainer>
        </div>
      )}
    </div>
  );
};
