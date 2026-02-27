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
}: ChatPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, toolCalls, isLoading]);

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
      </div>

      <ChatInput onSend={onSend} disabled={isLoading} />
    </div>
  );
}
