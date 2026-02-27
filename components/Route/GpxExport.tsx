"use client";

import { RouteData } from "@/lib/types";
import { generateGPX } from "@/lib/gpx";

interface GpxExportProps {
  routeData: RouteData;
}

export default function GpxExport({ routeData }: GpxExportProps) {
  const handleExport = () => {
    const gpxString = generateGPX({
      name: routeData.name,
      geometry: routeData.route_geometry as unknown as {
        coordinates: [number, number, number?][];
      },
      elevation_profile: routeData.elevation_profile,
    });

    const blob = new Blob([gpxString], { type: "application/gpx+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");

    const citySlug = routeData.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    a.href = url;
    a.download = `streakr-${citySlug}-${routeData.distance_miles}mi.gpx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <button
      onClick={handleExport}
      className="flex items-center gap-1.5 rounded-lg bg-orange-500 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-orange-600"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
      </svg>
      Export GPX
    </button>
  );
}
