const ORS_KEY = process.env.ORS_API_KEY;
const ORS_URL =
  "https://api.openrouteservice.org/v2/directions/foot-hiking/geojson";

export async function getRoute(waypoints: [number, number][]) {
  const coordinates = waypoints.map(([lat, lng]) => [lng, lat]);

  const res = await fetch(ORS_URL, {
    method: "POST",
    headers: {
      Authorization: ORS_KEY!,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      coordinates,
      instructions: true,
      geometry: true,
    }),
  });

  const data = await res.json();

  if (data.error) {
    return {
      error:
        (data.error as { message?: string })?.message ||
        JSON.stringify(data.error),
    };
  }

  const feature = data.features?.[0];
  if (!feature) {
    return { error: "No route found between these waypoints." };
  }

  const props = feature.properties.summary;

  return {
    geometry: feature.geometry,
    distance_meters: props.distance,
    distance_miles: +(props.distance * 0.000621371).toFixed(2),
    distance_km: +(props.distance / 1000).toFixed(2),
    duration_seconds: props.duration,
    duration_minutes: +(props.duration / 60).toFixed(1),
    steps: feature.properties.segments?.[0]?.steps?.map(
      (s: { instruction: string; distance: number; name: string }) => ({
        instruction: s.instruction,
        distance_m: s.distance,
        name: s.name,
      })
    ),
    bbox: feature.bbox,
  };
}
