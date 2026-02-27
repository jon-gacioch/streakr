const OVERPASS_URL = "https://overpass-api.de/api/interpreter";

const CATEGORY_TO_OSM: Record<string, string> = {
  park: '["leisure"="park"]',
  trail: '["highway"="path"]["foot"!="no"]',
  running_track: '["leisure"="track"]["sport"="running"]',
  waterfront: '["natural"="water"]',
  sports_facility: '["leisure"="sports_centre"]',
  pedestrian_path: '["highway"="pedestrian"]',
  nature_reserve: '["leisure"="nature_reserve"]',
};

export async function searchPlaces(
  lat: number,
  lng: number,
  radiusMeters: number,
  categories: string[]
) {
  const filters = categories
    .map((c) => CATEGORY_TO_OSM[c])
    .filter(Boolean)
    .map(
      (tag) => `
      node${tag}(around:${radiusMeters},${lat},${lng});
      way${tag}(around:${radiusMeters},${lat},${lng});
      relation${tag}(around:${radiusMeters},${lat},${lng});
    `
    )
    .join("");

  const query = `[out:json][timeout:10];(${filters});out center body 20;`;

  const res = await fetch(OVERPASS_URL, {
    method: "POST",
    body: `data=${encodeURIComponent(query)}`,
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });

  const contentType = res.headers.get("content-type") || "";
  if (!contentType.includes("json")) {
    const text = await res.text();
    console.error("[Overpass] Non-JSON response:", text.slice(0, 200));
    return [];
  }

  const data = await res.json();

  return (data.elements || [])
    .map((el: Record<string, unknown>) => {
      const tags = el.tags as Record<string, string> | undefined;
      const center = el.center as { lat: number; lon: number } | undefined;
      return {
        name: tags?.name || "Unnamed",
        lat: (el.lat as number) || center?.lat,
        lng: (el.lon as number) || center?.lon,
        type: tags?.leisure || tags?.highway || tags?.natural || "unknown",
        surface: tags?.surface,
      };
    })
    .filter((p: { lat?: number; lng?: number }) => p.lat && p.lng)
    .slice(0, 20);
}
