"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import dynamic from "next/dynamic";
import { ChatMessage, RouteData, ToolCallEvent, StreamEvent } from "@/lib/types";
import ChatPanel from "@/components/Chat/ChatPanel";
import DesktopLayout from "@/components/Layout/DesktopLayout";
import MobileLayout from "@/components/Layout/MobileLayout";
import GpxExport from "@/components/Route/GpxExport";

const MapView = dynamic(() => import("@/components/Map/MapView"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-stone-100">
      <div className="flex flex-col items-center gap-2 text-stone-400">
        <svg className="h-8 w-8 animate-spin" viewBox="0 0 24 24" fill="none">
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
        <span className="text-sm">Loading map...</span>
      </div>
    </div>
  ),
});

export default function Home() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [toolCalls, setToolCalls] = useState<ToolCallEvent[]>([]);
  const [routeData, setRouteData] = useState<RouteData | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {}
    );
  }, []);

  const handleNewRoute = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    setMessages([]);
    setToolCalls([]);
    setRouteData(null);
    setIsLoading(false);
  }, []);

  const handleSend = useCallback(
    async (content: string) => {
      const userMsg: ChatMessage = { role: "user", content };
      const updatedMessages = [...messages, userMsg];
      setMessages(updatedMessages);
      setIsLoading(true);
      setToolCalls([]);

      abortRef.current = new AbortController();

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: updatedMessages.map((m) => ({
              role: m.role,
              content: m.content,
            })),
            currentRoute: routeData,
            userLocation,
          }),
          signal: abortRef.current.signal,
        });

        if (!res.ok) {
          throw new Error(`Server error: ${res.status}`);
        }

        const reader = res.body?.getReader();
        if (!reader) throw new Error("No response stream");

        const decoder = new TextDecoder();
        let fullContent = "";
        let buffer = "";
        let pendingRoute: RouteData | null = null;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            try {
              const event: StreamEvent = JSON.parse(line.slice(6));

              switch (event.type) {
                case "tool_start":
                  setToolCalls((prev) => [
                    ...prev,
                    { name: event.name!, status: "running" },
                  ]);
                  break;

                case "tool_end":
                  setToolCalls((prev) =>
                    prev.map((t) =>
                      t.name === event.name && t.status === "running"
                        ? { ...t, status: event.error ? "error" : "done" }
                        : t
                    )
                  );
                  break;

                case "text_delta":
                  fullContent += event.content || "";
                  break;

                case "route_data":
                  if (event.route) {
                    pendingRoute = event.route;
                  }
                  break;

                case "error":
                  fullContent = `Sorry, something went wrong: ${event.error}`;
                  break;

                case "done":
                  break;
              }
            } catch {
              // skip malformed SSE chunks
            }
          }
        }

        if (fullContent) {
          const assistantMsg: ChatMessage = {
            role: "assistant",
            content: fullContent,
          };
          setMessages((prev) => [...prev, assistantMsg]);
        }

        if (pendingRoute) {
          setRouteData(pendingRoute);
        }
      } catch (err: unknown) {
        if (err instanceof Error && err.name === "AbortError") return;
        const errorMsg =
          err instanceof Error ? err.message : "Something went wrong";
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: `Sorry, I hit a snag: ${errorMsg}. Please try again!`,
          },
        ]);
      } finally {
        setIsLoading(false);
        abortRef.current = null;
      }
    },
    [messages, routeData, userLocation]
  );

  const chatPanel = (
    <ChatPanel
      messages={messages}
      toolCalls={toolCalls}
      isLoading={isLoading}
      routeData={routeData}
      onSend={handleSend}
    />
  );

  const mapView = <MapView routeData={routeData} />;

  return (
    <div className="h-screen flex flex-col">
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-stone-200 bg-white px-4">
        <div className="flex items-center gap-2">
          <span className="text-xl font-extrabold tracking-tight text-stone-900">
            STREAKR
          </span>
          <span className="text-orange-500 text-lg">⚡</span>
        </div>
        <div className="flex items-center gap-3">
          {(messages.length > 0 || routeData) && (
            <button
              onClick={handleNewRoute}
              className="flex items-center gap-1.5 rounded-full bg-orange-50 px-3 py-1.5 text-xs font-semibold text-orange-600 transition-colors hover:bg-orange-100 active:bg-orange-200"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 16 16"
                fill="currentColor"
                className="h-3.5 w-3.5"
              >
                <path
                  fillRule="evenodd"
                  d="M13.836 2.477a.75.75 0 0 1 .75.75v3.182a.75.75 0 0 1-.75.75h-3.182a.75.75 0 0 1 0-1.5h1.37l-.84-.841a4.5 4.5 0 0 0-7.08.932.75.75 0 0 1-1.3-.75 6 6 0 0 1 9.44-1.242l.842.84V3.227a.75.75 0 0 1 .75-.75Zm-.911 7.5A.75.75 0 0 1 13.199 11a6 6 0 0 1-9.44 1.241l-.84-.84v1.371a.75.75 0 0 1-1.5 0V9.591a.75.75 0 0 1 .75-.75H5.35a.75.75 0 0 1 0 1.5H3.98l.841.841a4.5 4.5 0 0 0 7.08-.932.75.75 0 0 1 1.025-.273Z"
                  clipRule="evenodd"
                />
              </svg>
              New Route
            </button>
          )}
          {routeData && <GpxExport routeData={routeData} />}
          <span className="hidden sm:block text-xs text-stone-400 italic">
            New city. Same streak.
          </span>
        </div>
      </header>

      <DesktopLayout chatPanel={chatPanel} mapView={mapView} />
      <MobileLayout chatPanel={chatPanel} mapView={mapView} />
    </div>
  );
}
