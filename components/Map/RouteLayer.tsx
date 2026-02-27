"use client";

import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import { RouteData } from "@/lib/types";

interface RouteLayerProps {
  map: mapboxgl.Map;
  routeData: RouteData | null;
}

const ROUTE_SOURCE = "route-source";
const ROUTE_LAYER = "route-layer";
const ROUTE_OUTLINE = "route-outline";

export default function RouteLayer({ map, routeData }: RouteLayerProps) {
  const markersRef = useRef<mapboxgl.Marker[]>([]);

  useEffect(() => {
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    if (!map || !map.getStyle()) return;

    if (map.getLayer(ROUTE_LAYER)) map.removeLayer(ROUTE_LAYER);
    if (map.getLayer(ROUTE_OUTLINE)) map.removeLayer(ROUTE_OUTLINE);
    if (map.getSource(ROUTE_SOURCE)) map.removeSource(ROUTE_SOURCE);

    if (!routeData?.route_geometry) return;

    const geometry = routeData.route_geometry as GeoJSON.LineString;

    map.addSource(ROUTE_SOURCE, {
      type: "geojson",
      data: { type: "Feature", properties: {}, geometry },
    });

    map.addLayer({
      id: ROUTE_OUTLINE,
      type: "line",
      source: ROUTE_SOURCE,
      layout: { "line-join": "round", "line-cap": "round" },
      paint: {
        "line-color": "#FDBA74",
        "line-width": 8,
        "line-opacity": 0.6,
      },
    });

    map.addLayer({
      id: ROUTE_LAYER,
      type: "line",
      source: ROUTE_SOURCE,
      layout: { "line-join": "round", "line-cap": "round" },
      paint: {
        "line-color": "#F97316",
        "line-width": 4,
      },
    });

    const coords = geometry.coordinates;
    if (coords.length > 0) {
      const startEl = createMarkerEl("#22C55E", "S");
      const startMarker = new mapboxgl.Marker({ element: startEl })
        .setLngLat(coords[0] as [number, number])
        .addTo(map);
      markersRef.current.push(startMarker);

      const lastCoord = coords[coords.length - 1];
      const isLoop =
        Math.abs(coords[0][0] - lastCoord[0]) < 0.001 &&
        Math.abs(coords[0][1] - lastCoord[1]) < 0.001;

      if (!isLoop) {
        const endEl = createMarkerEl("#EF4444", "E");
        const endMarker = new mapboxgl.Marker({ element: endEl })
          .setLngLat(lastCoord as [number, number])
          .addTo(map);
        markersRef.current.push(endMarker);
      }

      if (routeData.waypoints && routeData.waypoints.length > 2) {
        const innerWaypoints = routeData.waypoints.slice(1, -1);
        innerWaypoints.forEach((wp) => {
          const wpEl = document.createElement("div");
          wpEl.className = "waypoint-dot";
          wpEl.style.cssText =
            "width:10px;height:10px;background:#F97316;border:2px solid white;border-radius:50%;box-shadow:0 1px 3px rgba(0,0,0,0.3);";
          const marker = new mapboxgl.Marker({ element: wpEl })
            .setLngLat([wp[1], wp[0]])
            .addTo(map);
          markersRef.current.push(marker);
        });
      }

      const bounds = coords.reduce(
        (b, c) => b.extend(c as [number, number]),
        new mapboxgl.LngLatBounds(
          coords[0] as [number, number],
          coords[0] as [number, number]
        )
      );
      map.fitBounds(bounds, { padding: 60, duration: 1000 });
    }
  }, [map, routeData]);

  return null;
}

function createMarkerEl(color: string, letter: string): HTMLDivElement {
  const el = document.createElement("div");
  el.style.cssText = `
    width: 28px; height: 28px;
    background: ${color};
    border: 3px solid white;
    border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-size: 12px; font-weight: 700; color: white;
    box-shadow: 0 2px 6px rgba(0,0,0,0.3);
    cursor: pointer;
  `;
  el.textContent = letter;
  return el;
}
