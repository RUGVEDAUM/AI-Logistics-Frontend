import { useQuery } from '@tanstack/react-query';
import { apiClient } from './client';
import type {
  Order,
  Vehicle,
  DeliveryException,
  RoadRouteRequest,
  RoadRouteResponse,
  RouteAnalysisRequest,
  RouteAnalysisResponse,
  ActionRequest,
  ActionExecutionResult,
} from './types';

export function useOrders() {
  return useQuery<Order[]>({
    queryKey: ['orders'],
    queryFn: async () => {
      const response = await apiClient.get<Order[]>('/orders/');
      return response.data;
    },
  });
}

export function useVehicles() {
  return useQuery<Vehicle[]>({
    queryKey: ['vehicles'],
    queryFn: async () => {
      const response = await apiClient.get<Vehicle[]>('/vehicles/');
      return response.data;
    },
  });
}

export function useExceptions() {
  return useQuery<DeliveryException[]>({
    queryKey: ['exceptions'],
    queryFn: async () => {
      const response = await apiClient.get<DeliveryException[]>('/exceptions/');
      return response.data;
    },
    refetchInterval: 10000,
  });
}

export async function calculateRoadRoute(data: RoadRouteRequest): Promise<RoadRouteResponse> {
  const response = await apiClient.post<RoadRouteResponse>('/road-route/calculate', data);
  return response.data;
}

export async function analyzeRoute(data: RouteAnalysisRequest): Promise<RouteAnalysisResponse> {
  const response = await apiClient.post<RouteAnalysisResponse>('/ai/route-analysis?execute=false', data);
  return response.data;
}

export async function executeAction(data: ActionRequest): Promise<ActionExecutionResult> {
  const response = await apiClient.post<ActionExecutionResult>('/actions/execute', data);
  return response.data;
}

