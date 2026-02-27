"use client";

interface MapControlsProps {
  onRecenter: () => void;
}

export default function MapControls({ onRecenter }: MapControlsProps) {
  return (
    <div className="absolute top-3 right-3 flex flex-col gap-2 z-10">
      <button
        onClick={onRecenter}
        className="bg-white/90 backdrop-blur-sm rounded-lg p-2 shadow-md hover:bg-white transition-colors"
        title="Recenter map"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="3" />
          <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
        </svg>
      </button>
    </div>
  );
}
