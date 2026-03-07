import { env } from '@/lib/config';

// ── Types ───────────────────────────────────────────────────

export interface DriveTimeResult {
  origin: string;
  destination: string;
  durationSeconds: number;
  durationText: string;
  distanceMeters: number;
  distanceText: string;
  departureTime: Date;
}

export interface OptimizedRoute {
  stops: string[];
  optimizedOrder: number[];
  legs: Array<{
    origin: string;
    destination: string;
    durationSeconds: number;
    durationText: string;
    distanceMeters: number;
    distanceText: string;
  }>;
  totalDurationSeconds: number;
  totalDistanceMeters: number;
}

export interface LatLng {
  lat: number;
  lng: number;
}

interface DirectionsResponse {
  status: string;
  routes: Array<{
    legs: Array<{
      duration: { value: number; text: string };
      distance: { value: number; text: string };
      start_address: string;
      end_address: string;
    }>;
    waypoint_order?: number[];
  }>;
  error_message?: string;
}

interface GeocodingResponse {
  status: string;
  results: Array<{
    geometry: {
      location: { lat: number; lng: number };
    };
    formatted_address: string;
  }>;
  error_message?: string;
}


// ── API Key ─────────────────────────────────────────────────

function getApiKey(): string {
  const key = env.GOOGLE_MAPS_API_KEY;
  if (!key) {
    throw new Error('GOOGLE_MAPS_API_KEY is not configured');
  }
  return key;
}

// ── Core Functions ──────────────────────────────────────────

export async function calculateDriveTime(
  origin: string,
  destination: string,
  departBy: Date
): Promise<DriveTimeResult> {
  const apiKey = getApiKey();
  const departureTime = Math.floor(departBy.getTime() / 1000);

  const params = new URLSearchParams({
    origin,
    destination,
    departure_time: departureTime.toString(),
    key: apiKey,
    mode: 'driving',
    traffic_model: 'best_guess',
  });

  const response = await fetch(
    `https://maps.googleapis.com/maps/api/directions/json?${params.toString()}`
  );

  if (!response.ok) {
    throw new Error(`Google Maps Directions API error: ${response.status}`);
  }

  const data: DirectionsResponse = await response.json();

  if (data.status !== 'OK') {
    throw new Error(`Google Maps Directions API: ${data.status} — ${data.error_message ?? 'Unknown error'}`);
  }

  const route = data.routes[0];
  const leg = route.legs[0];

  return {
    origin: leg.start_address,
    destination: leg.end_address,
    durationSeconds: leg.duration.value,
    durationText: leg.duration.text,
    distanceMeters: leg.distance.value,
    distanceText: leg.distance.text,
    departureTime: departBy,
  };
}

export async function calculateRouteForErrands(
  stops: string[]
): Promise<OptimizedRoute> {
  if (stops.length < 2) {
    throw new Error('Need at least 2 stops for route optimization');
  }

  const apiKey = getApiKey();
  const origin = stops[0];
  const destination = stops[stops.length - 1];
  const waypoints = stops.slice(1, -1);

  const params = new URLSearchParams({
    origin,
    destination,
    key: apiKey,
    mode: 'driving',
    optimize: 'true',
  });

  if (waypoints.length > 0) {
    params.set('waypoints', `optimize:true|${waypoints.join('|')}`);
  }

  const response = await fetch(
    `https://maps.googleapis.com/maps/api/directions/json?${params.toString()}`
  );

  if (!response.ok) {
    throw new Error(`Google Maps Directions API error: ${response.status}`);
  }

  const data: DirectionsResponse = await response.json();

  if (data.status !== 'OK') {
    throw new Error(`Google Maps Directions API: ${data.status} — ${data.error_message ?? 'Unknown error'}`);
  }

  const route = data.routes[0];
  const legs = route.legs.map((leg) => ({
    origin: leg.start_address,
    destination: leg.end_address,
    durationSeconds: leg.duration.value,
    durationText: leg.duration.text,
    distanceMeters: leg.distance.value,
    distanceText: leg.distance.text,
  }));

  const totalDurationSeconds = legs.reduce((sum, leg) => sum + leg.durationSeconds, 0);
  const totalDistanceMeters = legs.reduce((sum, leg) => sum + leg.distanceMeters, 0);

  return {
    stops,
    optimizedOrder: route.waypoint_order ?? stops.map((_, i) => i),
    legs,
    totalDurationSeconds,
    totalDistanceMeters,
  };
}

export async function geocodeAddress(address: string): Promise<LatLng> {
  const apiKey = getApiKey();

  const params = new URLSearchParams({
    address,
    key: apiKey,
  });

  const response = await fetch(
    `https://maps.googleapis.com/maps/api/geocode/json?${params.toString()}`
  );

  if (!response.ok) {
    throw new Error(`Google Maps Geocoding API error: ${response.status}`);
  }

  const data: GeocodingResponse = await response.json();

  if (data.status !== 'OK' || data.results.length === 0) {
    throw new Error(`Google Maps Geocoding API: ${data.status} — ${data.error_message ?? 'No results found'}`);
  }

  return data.results[0].geometry.location;
}

// ── Helpers ─────────────────────────────────────────────────

export function isVirtualLocation(location: string | null | undefined): boolean {
  if (!location) return true;
  const lower = location.toLowerCase();
  const virtualPatterns = [
    'zoom', 'meet.google', 'teams.microsoft', 'webex',
    'gotomeeting', 'whereby', 'around.co', 'hangouts',
    'skype', 'https://', 'http://', 'virtual', 'online',
    'remote', 'video call', 'conference call',
  ];
  return virtualPatterns.some((pattern) => lower.includes(pattern));
}
