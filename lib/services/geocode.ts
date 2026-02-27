const MAPBOX_TOKEN = process.env.MAPBOX_ACCESS_TOKEN;

export async function geocode(query: string) {
  const params = new URLSearchParams({
    access_token: MAPBOX_TOKEN!,
    limit: "5",
    types: "poi,address,place",
  });

  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?${params}`;

  const res = await fetch(url);
  const data = await res.json();

  if (!data.features?.length) {
    return { error: "Could not find that location. Try being more specific." };
  }

  const results = data.features.map(
    (f: {
      center: [number, number];
      place_name: string;
      place_type?: string[];
      text: string;
      properties?: { category?: string };
    }) => ({
      waypoint: [f.center[1], f.center[0]] as [number, number],
      place_name: f.place_name,
      name: f.text,
      type: f.place_type?.[0],
      category: f.properties?.category,
    })
  );

  return { results };
}
