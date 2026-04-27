export type ZoneVertex = { lat: number; lng: number };

type ZonePickRequest = {
  centerLat: number;
  centerLng: number;
  polygon?: ZoneVertex[] | null;
};

type ZonePickResult = {
  polygon: ZoneVertex[];
};

let request: ZonePickRequest | null = null;
let result: ZonePickResult | null = null;

export function setZonePickRequest(req: ZonePickRequest) {
  request = req;
}

export function getZonePickRequest(): ZonePickRequest | null {
  return request;
}

export function clearZonePickRequest() {
  request = null;
}

export function setZonePickResult(polygon: ZoneVertex[]) {
  result = { polygon };
}

export function getZonePickResult(): ZonePickResult | null {
  return result;
}

export function clearZonePickResult() {
  result = null;
}
