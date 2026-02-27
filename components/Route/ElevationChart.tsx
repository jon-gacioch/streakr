"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface ElevationChartProps {
  profile: [number, number][];
}

export default function ElevationChart({ profile }: ElevationChartProps) {
  if (!profile || profile.length < 2) return null;

  const data = profile.map(([dist, elev]) => ({
    distance: +(dist / 1000).toFixed(2),
    elevation: +elev.toFixed(1),
  }));

  const elevations = data.map((d) => d.elevation);
  const minElev = Math.floor(Math.min(...elevations) - 5);
  const maxElev = Math.ceil(Math.max(...elevations) + 5);

  return (
    <div className="h-[100px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
        >
          <defs>
            <linearGradient id="elevGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#F97316" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#F97316" stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="distance"
            tick={{ fontSize: 10, fill: "#78716C" }}
            tickLine={false}
            axisLine={{ stroke: "#E7E5E4" }}
            tickFormatter={(v) => `${v}km`}
          />
          <YAxis
            domain={[minElev, maxElev]}
            tick={{ fontSize: 10, fill: "#78716C" }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => `${v}m`}
          />
          <Tooltip
            contentStyle={{
              fontSize: 12,
              background: "white",
              border: "1px solid #E7E5E4",
              borderRadius: 8,
            }}
            formatter={(value: number | undefined) => [
              `${value ?? 0}m`,
              "Elevation",
            ]}
            labelFormatter={(label) => `${label} km`}
          />
          <Area
            type="monotone"
            dataKey="elevation"
            stroke="#F97316"
            strokeWidth={2}
            fill="url(#elevGradient)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
