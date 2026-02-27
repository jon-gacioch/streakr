"use client";

import { RouteData } from "@/lib/types";
import { formatDuration } from "@/lib/utils";
import ElevationChart from "./ElevationChart";
import GpxExport from "./GpxExport";

interface RouteInfoPanelProps {
  routeData: RouteData;
}

export default function RouteInfoPanel({ routeData }: RouteInfoPanelProps) {
  return (
    <div className="mx-4 mb-3 rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-start justify-between">
        <div>
          <h3 className="text-sm font-semibold text-stone-900">
            {routeData.name}
          </h3>
        </div>
        <GpxExport routeData={routeData} />
      </div>

      <div className="mb-3 grid grid-cols-3 gap-3">
        <StatBlock
          label="Distance"
          value={`${routeData.distance_miles} mi`}
          subvalue={`${routeData.distance_km} km`}
        />
        <StatBlock
          label="Est. Time"
          value={formatDuration(routeData.estimated_time_minutes)}
          subvalue="~9:00/mi pace"
        />
        <StatBlock
          label="Elevation"
          value={`+${routeData.elevation_gain_ft} ft`}
          subvalue={`-${routeData.elevation_loss_ft} ft`}
        />
      </div>

      {routeData.elevation_profile?.length > 0 && (
        <div>
          <p className="mb-1 text-xs font-medium text-stone-500">
            Elevation Profile
          </p>
          <ElevationChart profile={routeData.elevation_profile} />
        </div>
      )}
    </div>
  );
}

function StatBlock({
  label,
  value,
  subvalue,
}: {
  label: string;
  value: string;
  subvalue: string;
}) {
  return (
    <div className="text-center">
      <p className="text-xs text-stone-500">{label}</p>
      <p className="text-base font-bold text-stone-900">{value}</p>
      <p className="text-xs text-stone-400">{subvalue}</p>
    </div>
  );
}
