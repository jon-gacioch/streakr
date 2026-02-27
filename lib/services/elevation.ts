const ORS_KEY = process.env.ORS_API_KEY;
const ORS_ELEVATION_URL = "https://api.openrouteservice.org/elevation/line";

export async function getElevation(routeGeometry: {
  coordinates: number[][];
}) {
  let coords = routeGeometry.coordinates;
  if (coords.length > 300) {
    const step = Math.ceil(coords.length / 300);
    coords = coords.filter((_, i: number) => i % step === 0);
    const last =
      routeGeometry.coordinates[routeGeometry.coordinates.length - 1];
    if (coords[coords.length - 1] !== last) {
      coords.push(last);
    }
  }

  const res = await fetch(ORS_ELEVATION_URL, {
    method: "POST",
    headers: {
      Authorization: ORS_KEY!,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      format_in: "geojson",
      format_out: "geojson",
      geometry: {
        type: "LineString",
        coordinates: coords,
      },
    }),
  });

  const data = await res.json();
  const elevCoords: number[][] = data.geometry?.coordinates || [];

  let totalAscent = 0;
  let totalDescent = 0;
  let minElevation = Infinity;
  let maxElevation = -Infinity;

  const profile: [number, number][] = [];
  let cumulativeDistance = 0;

  for (let i = 0; i < elevCoords.length; i++) {
    const elev = elevCoords[i][2];
    minElevation = Math.min(minElevation, elev);
    maxElevation = Math.max(maxElevation, elev);

    if (i > 0) {
      const diff = elev - elevCoords[i - 1][2];
      if (diff > 0) totalAscent += diff;
      else totalDescent += Math.abs(diff);

      const dlng = elevCoords[i][0] - elevCoords[i - 1][0];
      const dlat = elevCoords[i][1] - elevCoords[i - 1][1];
      cumulativeDistance += Math.sqrt(dlng ** 2 + dlat ** 2) * 111320;
    }

    profile.push([cumulativeDistance, elev]);
  }

  return {
    elevation_profile: profile,
    total_ascent_meters: +totalAscent.toFixed(1),
    total_descent_meters: +totalDescent.toFixed(1),
    total_ascent_ft: +(totalAscent * 3.28084).toFixed(0),
    total_descent_ft: +(totalDescent * 3.28084).toFixed(0),
    min_elevation_meters: +minElevation.toFixed(1),
    max_elevation_meters: +maxElevation.toFixed(1),
    min_elevation_ft: +(minElevation * 3.28084).toFixed(0),
    max_elevation_ft: +(maxElevation * 3.28084).toFixed(0),
  };
}
