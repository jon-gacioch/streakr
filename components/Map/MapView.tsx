"use client";

import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import { RouteData } from "@/lib/types";
import RouteLayer from "./RouteLayer";
import MapControls from "./MapControls";

interface MapViewProps {
  routeData: RouteData | null;
}

const DEFAULT_CENTER: [number, number] = [-115.1398, 36.1699]; // Las Vegas
const DEFAULT_ZOOM = 12;

export default function MapView({ routeData }: MapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;

    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "";

    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/outdoors-v12",
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
      attributionControl: false,
    });

    map.addControl(
      new mapboxgl.AttributionControl({ compact: true }),
      "bottom-right"
    );

    map.on("load", () => {
      setMapLoaded(true);
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  const handleRecenter = () => {
    if (!mapRef.current) return;
    if (routeData?.route_geometry) {
      const coords = (
        routeData.route_geometry as GeoJSON.LineString
      ).coordinates.map(
        (c) => new mapboxgl.LngLat(c[0], c[1])
      );
      const bounds = coords.reduce(
        (b, c) => b.extend(c),
        new mapboxgl.LngLatBounds(coords[0], coords[0])
      );
      mapRef.current.fitBounds(bounds, { padding: 60 });
    } else {
      mapRef.current.flyTo({ center: DEFAULT_CENTER, zoom: DEFAULT_ZOOM });
    }
  };

  return (
    <div className="relative h-full w-full">
      <div ref={mapContainer} className="h-full w-full" />
      {mapLoaded && mapRef.current && (
        <RouteLayer map={mapRef.current} routeData={routeData} />
      )}
      <MapControls onRecenter={handleRecenter} />
    </div>
  );
}
