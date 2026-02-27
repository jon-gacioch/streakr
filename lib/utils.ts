export function metersToMiles(meters: number): number {
  return +(meters * 0.000621371).toFixed(2);
}

export function metersToKm(meters: number): number {
  return +(meters / 1000).toFixed(2);
}

export function metersToFeet(meters: number): number {
  return +(meters * 3.28084).toFixed(0);
}

export function formatPace(totalMinutes: number, distanceMiles: number): string {
  if (distanceMiles <= 0) return "--:--";
  const paceMin = totalMinutes / distanceMiles;
  const min = Math.floor(paceMin);
  const sec = Math.round((paceMin - min) * 60);
  return `${min}:${sec.toString().padStart(2, "0")}`;
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${Math.round(minutes)} min`;
  const hrs = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  return `${hrs}h ${mins}m`;
}

export function toolDisplayName(toolName: string): string {
  const names: Record<string, string> = {
    geocode: "Finding location...",
    search_places: "Searching for parks & trails nearby...",
    get_route: "Calculating route...",
    get_elevation: "Getting elevation data...",
  };
  return names[toolName] || `Running ${toolName}...`;
}

export function parseRouteFromMessage(content: string) {
  const routeMatch = content.match(/```route\s*\n([\s\S]*?)\n```/);
  if (!routeMatch) return null;
  try {
    return JSON.parse(routeMatch[1]);
  } catch {
    return null;
  }
}

export function stripRouteBlock(content: string): string {
  return content
    .replace(/```route\s*\n[\s\S]*?\n```/g, "")
    .replace(/```waypoint_details\s*\n[\s\S]*?\n```/g, "")
    .replace(/```points_of_interest\s*\n[\s\S]*?\n```/g, "")
    .trim();
}
