export interface Order {
  id: number;
  customer_name: string;
  pickup_location: string;
  delivery_location: string;
  priority: string;
  deadline: string | null;
  latitude: number | null;
  longitude: number | null;
  status: string;
  assigned_vehicle_id?: number | null;
  created_at: string;
}

export interface Vehicle {
  id: number;
  vehicle_number: string;
  driver_name: string;
  vehicle_type: string;
  capacity: number;
  current_location: string | null;
  latitude: number | null;
  longitude: number | null;
  status: string;
}

export interface VehicleCreate {
  vehicle_number: string;
  driver_name: string;
  capacity: number;
  vehicle_type?: string;
  current_location?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  status?: string;
}

export interface OrderCreate {
  customer_name: string;
  pickup_location: string;
  delivery_location: string;
  priority?: string;
  deadline?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  status?: string;
  assigned_vehicle_id?: number | null;
}

export interface OrderUpdate {
  customer_name?: string | null;
  pickup_location?: string | null;
  delivery_location?: string | null;
  priority?: string | null;
  deadline?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  status?: string | null;
  assigned_vehicle_id?: number | null;
}

export interface DeliveryException {
  id: number;
  order_id: number | null;
  vehicle_id: number | null;
  exception_type: string;
  severity: string;
  status: string;
  description: string | null;
  delay_minutes: number;
  recommended_action: string | null;
  detected_at: string;
}

export interface RoadRouteRequest {
  start_lat: number;
  start_lon: number;
  end_lat: number;
  end_lon: number;
  alternatives?: boolean;
}

export interface RouteGeometry {
  coordinates: [number, number][];
  type: string;
}

export interface RoadRouteResponse {
  status: string;
  distance_km: number;
  duration_minutes: number;
  geometry: RouteGeometry;
  alternatives?: unknown[];
}

export interface RouteAnalysisRequest {
  order_id: number;
  vehicle_id: number;
  traffic_level?: string;
  weather_condition?: string;
  road_condition?: string;
  vehicle_condition?: string;
}

export interface RouteAnalysisResponse {
  message?: string;
  order?: {
    id: number;
    customer_name: string;
    delivery_location: string;
    priority: string;
    status: string;
  };
  vehicle?: {
    id: number;
    vehicle_number: string;
    driver_name: string;
    status: string;
  };
  route?: {
    original_route?: {
      distance_km: number;
      duration_minutes: number;
    };
    selected_route?: {
      route_id?: number;
      route_type?: string;
      distance_km?: number;
      duration_minutes?: number;
      geometry?: RouteGeometry;
    };
    decision?: string;
    recommendation?: string;
  };
  exception?: {
    type?: string;
    severity?: string;
  };
  prediction?: {
    distance_km?: number;
    road_eta_minutes?: number;
    predicted_delay_minutes?: number;
    final_eta_minutes?: number;
    severity?: string;
  };
  ai_decision?: {
    decision?: string;
    severity?: string;
    delay_minutes?: number;
    order_priority?: string;
    recommended_action?: string;
    reason?: string;
    selected_vehicle?: {
      id?: number;
      vehicle_number?: string;
      driver_name?: string;
    } | null;
  };
  action_execution?: ActionExecutionResult;
}

export interface ActionRequest {
  action: string;
  order_id: number;
  current_vehicle_id: number;
  new_vehicle_id?: number | null;
}

export interface ActionExecutionResult {
  success?: boolean;
  action?: string;
  message?: string;
  [key: string]: unknown;
}

