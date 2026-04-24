import { API_BASE_URL } from '../constants/api';

export type BusStop = {
  stopId: string;
  stopName: string;
  latitude: number;
  longitude: number;
  cityCode?: string;
};

export type BusArrivalItem = {
  routeId: string;
  routeNo: string;
  destination: string;
  arrivalSec: number | null;
  arrivalMin: number | null;
  arrivalMessage: string;
  remainingStops: number | null;
};

export type BusArrivalResponse = {
  stopName: string;
  cityCode: string;
  cachedAt: number;
  arrivals: BusArrivalItem[];
};

export type BusRouteInfo = {
  routeId: string;
  routeNo: string;
  endNodeName: string;
};

export type BusRouteStop = {
  nodeId: string;
  nodeName: string;
  latitude: number;
  longitude: number;
  nodeOrder: number;
};


export async function getBusStopsInBounds(
  swLat: number,
  swLng: number,
  neLat: number,
  neLng: number
): Promise<BusStop[]> {
  const res = await fetch(
    `${API_BASE_URL}/api/bus/stops/bounds?swLat=${swLat}&swLng=${swLng}&neLat=${neLat}&neLng=${neLng}`
  );
  if (!res.ok) throw new Error('정류장 조회 실패');
  return res.json();
}

export async function getBusArrivals(stopId: string): Promise<BusArrivalResponse> {
  const res = await fetch(`${API_BASE_URL}/api/bus/stops/${stopId}/arrivals`);
  if (!res.ok) throw new Error('도착 정보 조회 실패');
  return res.json();
}

export async function getBusRoutesByStop(stopId: string): Promise<BusRouteInfo[]> {
  const res = await fetch(`${API_BASE_URL}/api/bus/stops/${stopId}/routes`);
  if (!res.ok) throw new Error('노선 조회 실패');
  return res.json();
}

export async function getBusRouteStops(routeId: string, cityCode: string): Promise<BusRouteStop[]> {
  const res = await fetch(
    `${API_BASE_URL}/api/bus/routes/${routeId}/stops?cityCode=${cityCode}`
  );
  if (!res.ok) throw new Error('노선 정류장 조회 실패');
  return res.json();
}

export type BusLocation = {
  vehicleNo: string;
  nodeOrder: number;
  nodeName: string;
  latitude: number;
  longitude: number;
};

export type BusLocationResponse = {
  routeId: string;
  cachedAt: number;
  buses: BusLocation[];
};

export async function getBusLocations(routeId: string, cityCode: string): Promise<BusLocationResponse> {
  const res = await fetch(
    `${API_BASE_URL}/api/bus/routes/${routeId}/buses?cityCode=${cityCode}`
  );
  if (!res.ok) throw new Error('버스 위치 조회 실패');
  return res.json();
}
