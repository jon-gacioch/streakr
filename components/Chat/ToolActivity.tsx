"use client";

import { ToolCallEvent } from "@/lib/types";
import { toolDisplayName } from "@/lib/utils";

interface ToolActivityProps {
  tools: ToolCallEvent[];
}

export default function ToolActivity({ tools }: ToolActivityProps) {
  if (tools.length === 0) return null;

  return (
    <div className="flex flex-col gap-1 px-4 py-2">
      {tools.map((tool, i) => (
        <div
          key={`${tool.name}-${i}`}
          className="flex items-center gap-2 text-xs text-stone-500"
        >
          {tool.status === "running" ? (
            <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-orange-400 border-t-transparent" />
          ) : tool.status === "done" ? (
            <svg
              className="h-3 w-3 text-green-500"
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
              className="h-3 w-3 text-red-500"
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
          <span>{toolDisplayName(tool.name)}</span>
        </div>
      ))}
    </div>
  );
}
