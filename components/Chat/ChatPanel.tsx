"use client";

import { useRef, useEffect } from "react";
import { ChatMessage, ToolCallEvent, RouteData } from "@/lib/types";
import MessageBubble from "./MessageBubble";
import ChatInput from "./ChatInput";
import ToolActivity from "./ToolActivity";
import RouteInfoPanel from "@/components/Route/RouteInfoPanel";

interface ChatPanelProps {
  messages: ChatMessage[];
  toolCalls: ToolCallEvent[];
  isLoading: boolean;
  routeData: RouteData | null;
  onSend: (message: string) => void;
  onRegenerate: () => void;
}

const WELCOME_MESSAGE: ChatMessage = {
  role: "assistant",
  content: `Hey! I'm STREAKR. Tell me where you're staying and what kind of run you're looking for, and I'll map out a route for you.\n\nTry something like:\n• "I'm at the Bellagio in Las Vegas, looking for a 5-mile run that avoids the Strip"\n• "Staying near Central Park, want a flat 10K loop"\n• "Downtown Portland near the river, 30-minute easy run"\n\nNew city. Same streak. Let's go.`,
};

export default function ChatPanel({
  messages,
  toolCalls,
  isLoading,
  routeData,
  onSend,
  onRegenerate,
}: ChatPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, toolCalls, isLoading]);

  const hasUserMessages = messages.some((m) => m.role === "user");
  const allMessages =
    messages.length === 0 ? [WELCOME_MESSAGE] : messages;

  return (
    <div className="flex h-full flex-col bg-[#FFFBF5]">
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto py-4 space-y-3"
      >
        {allMessages.map((msg, i) => (
          <MessageBubble key={i} message={msg} />
        ))}

        {isLoading && toolCalls.length > 0 && (
          <ToolActivity tools={toolCalls} />
        )}

        {isLoading && (
          <div className="flex justify-start px-4">
            <div className="rounded-2xl bg-white px-4 py-3 shadow-sm border border-stone-100">
              <div className="flex gap-1.5">
                <span className="h-2 w-2 rounded-full bg-orange-400 animate-bounce [animation-delay:0ms]" />
                <span className="h-2 w-2 rounded-full bg-orange-400 animate-bounce [animation-delay:150ms]" />
                <span className="h-2 w-2 rounded-full bg-orange-400 animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          </div>
        )}

        {routeData && !isLoading && <RouteInfoPanel routeData={routeData} />}

        {!isLoading && hasUserMessages && (
          <div className="flex justify-center px-4 pb-2">
            <button
              onClick={onRegenerate}
              className="flex items-center gap-1.5 rounded-full border border-stone-200 bg-white px-3.5 py-1.5 text-xs font-medium text-stone-500 shadow-sm transition-colors hover:border-orange-300 hover:text-orange-600 hover:bg-orange-50 active:bg-orange-100"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 16 16"
                fill="currentColor"
                className="h-3 w-3"
              >
                <path
                  fillRule="evenodd"
                  d="M13.836 2.477a.75.75 0 0 1 .75.75v3.182a.75.75 0 0 1-.75.75h-3.182a.75.75 0 0 1 0-1.5h1.37l-.84-.841a4.5 4.5 0 0 0-7.08.932.75.75 0 0 1-1.3-.75 6 6 0 0 1 9.44-1.242l.842.84V3.227a.75.75 0 0 1 .75-.75Zm-.911 7.5A.75.75 0 0 1 13.199 11a6 6 0 0 1-9.44 1.241l-.84-.84v1.371a.75.75 0 0 1-1.5 0V9.591a.75.75 0 0 1 .75-.75H5.35a.75.75 0 0 1 0 1.5H3.98l.841.841a4.5 4.5 0 0 0 7.08-.932.75.75 0 0 1 1.025-.273Z"
                  clipRule="evenodd"
                />
              </svg>
              Regenerate route
            </button>
          </div>
        )}
      </div>

      <ChatInput onSend={onSend} disabled={isLoading} />
    </div>
  );
}
