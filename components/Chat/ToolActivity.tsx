"use client";

import { ToolCallEvent } from "@/lib/types";

interface ToolActivityProps {
  tools: ToolCallEvent[];
}

const TOOL_LABELS: Record<string, { running: string; done: string }> = {
  geocode: {
    running: "Finding location",
    done: "Location found",
  },
  search_places: {
    running: "Searching for parks & trails",
    done: "Area scouted",
  },
  get_route: {
    running: "Calculating route",
    done: "Route mapped",
  },
  get_elevation: {
    running: "Getting elevation profile",
    done: "Elevation analyzed",
  },
};

function getLabel(tool: ToolCallEvent): string {
  const labels = TOOL_LABELS[tool.name];
  if (!labels) return tool.status === "running" ? `Running ${tool.name}` : tool.name;
  return tool.status === "running" ? labels.running : labels.done;
}

export default function ToolActivity({ tools }: ToolActivityProps) {
  if (tools.length === 0) return null;

  return (
    <div className="flex flex-col gap-2.5 px-4 py-2">
      {tools.map((tool, i) => (
        <div key={`${tool.name}-${i}`} className="flex flex-col gap-0.5">
          <div className="flex items-center gap-2 text-xs font-medium text-stone-600">
            {tool.status === "running" ? (
              <span className="inline-block h-3 w-3 shrink-0 animate-spin rounded-full border-2 border-orange-400 border-t-transparent" />
            ) : tool.status === "done" ? (
              <svg
                className="h-3 w-3 shrink-0 text-green-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={3}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5 13l4 4L19 7"
                />
              </svg>
            ) : (
              <svg
                className="h-3 w-3 shrink-0 text-red-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={3}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            )}
            <span>{getLabel(tool)}</span>
          </div>

          {tool.detail && (
            <p className="ml-5 text-[11px] leading-snug text-stone-400">
              {tool.detail}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
