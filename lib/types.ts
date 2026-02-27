export interface WaypointDetail {
  name: string;
  reason: string;
}

export interface PointOfInterest {
  name: string;
  description: string;
  lat: number;
  lng: number;
}

export interface RouteData {
  waypoints: [number, number][];
  waypoint_details?: WaypointDetail[];
  points_of_interest?: PointOfInterest[];
  distance_miles: number;
  distance_km: number;
  estimated_time_minutes: number;
  elevation_gain_ft: number;
  elevation_loss_ft: number;
  route_geometry: GeoJSON.Geometry;
  elevation_profile: [number, number][];
  name: string;
}

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface ToolCallEvent {
  name: string;
  status: "running" | "done" | "error";
  detail?: string;
}

export interface StreamEvent {
  type:
    | "tool_start"
    | "tool_end"
    | "text_delta"
    | "route_data"
    | "done"
    | "error";
  name?: string;
  content?: string;
  detail?: string;
  route?: RouteData;
  error?: string;
}

export interface GeocodeResult {
  lat: number;
  lng: number;
  place_name: string;
  type?: string;
  error?: string;
}

export interface Place {
  name: string;
  lat: number;
  lng: number;
  type: string;
  surface?: string;
}

export interface RouteResult {
  geometry: GeoJSON.Geometry;
  distance_meters: number;
  distance_miles: number;
  distance_km: number;
  duration_seconds: number;
  duration_minutes: number;
  steps?: { instruction: string; distance_m: number; name: string }[];
  bbox?: number[];
  error?: string;
}

export interface ElevationResult {
  elevation_profile: [number, number][];
  total_ascent_meters: number;
  total_descent_meters: number;
  total_ascent_ft: number;
  total_descent_ft: number;
  min_elevation_meters: number;
  max_elevation_meters: number;
  min_elevation_ft: number;
  max_elevation_ft: number;
  error?: string;
}
