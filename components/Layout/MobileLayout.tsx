"use client";

import { ReactNode, useState } from "react";

interface MobileLayoutProps {
  chatPanel: ReactNode;
  mapView: ReactNode;
}

export default function MobileLayout({
  chatPanel,
  mapView,
}: MobileLayoutProps) {
  const [chatExpanded, setChatExpanded] = useState(false);

  return (
    <div className="flex lg:hidden flex-col h-[calc(100vh-56px)]">
      <div
        className={`transition-all duration-300 ${
          chatExpanded ? "h-[30%]" : "h-[55%]"
        }`}
      >
        {mapView}
      </div>

      <button
        onClick={() => setChatExpanded(!chatExpanded)}
        className="flex items-center justify-center gap-1 border-y border-stone-200 bg-white py-1.5 text-xs text-stone-500"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className={`transition-transform ${chatExpanded ? "rotate-180" : ""}`}
        >
          <polyline points="18 15 12 9 6 15" />
        </svg>
        {chatExpanded ? "Show more map" : "Expand chat"}
      </button>

      <div className="flex-1 overflow-hidden">{chatPanel}</div>
    </div>
  );
}
