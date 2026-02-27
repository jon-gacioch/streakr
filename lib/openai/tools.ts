import { ChatCompletionTool } from "openai/resources/chat/completions";

export const tools: ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "geocode",
      description:
        "Convert a place name, address, or landmark into geographic coordinates. Returns up to 5 candidates ranked by relevance. Each result has a `waypoint` field ([lat, lng]) that is ready to use directly in get_route — ALWAYS use this exact value, never round or modify the numbers. Pick the candidate whose name/category best matches the user's intent (e.g. the actual hotel, not just the city).",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description:
              "The place to geocode, e.g. 'Marriott Grand Las Vegas' or '123 Main St, Portland OR'",
          },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search_places",
      description:
        "Search for runner-friendly places near a location. Returns parks, trails, running tracks, waterfront paths, and other points of interest suitable for running. Use this to find good waypoints for a route.",
      parameters: {
        type: "object",
        properties: {
          lat: { type: "number", description: "Latitude of center point" },
          lng: { type: "number", description: "Longitude of center point" },
          radius_meters: {
            type: "number",
            description:
              "Search radius in meters. For a 5-mile run, use ~4000-5000m.",
          },
          categories: {
            type: "array",
            items: { type: "string" },
            description:
              "Categories to search for. Options: 'park', 'trail', 'running_track', 'waterfront', 'sports_facility', 'pedestrian_path', 'nature_reserve'. Include multiple for best results.",
          },
        },
        required: ["lat", "lng", "radius_meters", "categories"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_route",
      description:
        "Generate a running route through a series of waypoints. Uses the foot-running profile which automatically avoids highways and prefers pedestrian-friendly paths. Returns the route geometry, total distance, and estimated duration. If the route distance doesn't match the target, adjust waypoints and call again.",
      parameters: {
        type: "object",
        properties: {
          waypoints: {
            type: "array",
            items: {
              type: "array",
              items: { type: "number" },
              minItems: 2,
              maxItems: 2,
            },
            description:
              "Ordered array of [latitude, longitude] pairs. First and last should be the same point for loop routes. Minimum 2 waypoints.",
          },
        },
        required: ["waypoints"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_elevation",
      description:
        "Get the elevation profile along a route. Pass the route geometry from a get_route result. Returns elevation data that can be used to show hills and calculate total ascent/descent.",
      parameters: {
        type: "object",
        properties: {
          route_geometry: {
            type: "object",
            description:
              "The GeoJSON geometry object from a get_route response. Should be a LineString or MultiLineString.",
          },
        },
        required: ["route_geometry"],
      },
    },
  },
];
