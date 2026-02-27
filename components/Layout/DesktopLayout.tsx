"use client";

import { ReactNode } from "react";

interface DesktopLayoutProps {
  chatPanel: ReactNode;
  mapView: ReactNode;
}

export default function DesktopLayout({
  chatPanel,
  mapView,
}: DesktopLayoutProps) {
  return (
    <div className="hidden lg:flex h-[calc(100vh-56px)]">
      <div className="w-[40%] min-w-[360px] max-w-[520px] border-r border-stone-200">
        {chatPanel}
      </div>
      <div className="flex-1">{mapView}</div>
    </div>
  );
}
