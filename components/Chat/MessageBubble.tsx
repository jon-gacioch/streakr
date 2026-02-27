"use client";

import { ChatMessage } from "@/lib/types";
import { stripRouteBlock } from "@/lib/utils";

interface MessageBubbleProps {
  message: ChatMessage;
}

export default function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === "user";
  const content = isUser ? message.content : stripRouteBlock(message.content);

  if (!content) return null;

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} px-4`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
          isUser
            ? "bg-orange-50 text-stone-900"
            : "bg-white text-stone-800 shadow-sm border border-stone-100"
        }`}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap">{content}</p>
        ) : (
          <div className="prose prose-sm prose-stone max-w-none">
            <FormattedContent text={content} />
          </div>
        )}
      </div>
    </div>
  );
}

function FormattedContent({ text }: { text: string }) {
  const parts = text.split(/(\*\*.*?\*\*|\n)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part === "\n") return <br key={i} />;
        if (part.startsWith("**") && part.endsWith("**")) {
          return (
            <strong key={i} className="font-semibold">
              {part.slice(2, -2)}
            </strong>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}
