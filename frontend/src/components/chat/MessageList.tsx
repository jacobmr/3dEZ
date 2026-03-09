"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { ChatMessage } from "@/hooks/useConversation";
import StreamingMessage from "./StreamingMessage";
import DimensionCard from "./DimensionCard";

interface MessageListProps {
  messages: ChatMessage[];
  isStreaming: boolean;
}

function PhotoThumbnail({ photoId }: { photoId: string }) {
  const [expanded, setExpanded] = useState(false);

  const toggle = useCallback(() => setExpanded((prev) => !prev), []);

  return (
    <>
      <button
        type="button"
        onClick={toggle}
        className="mb-1 block cursor-pointer rounded-md overflow-hidden"
      >
        <img
          src={`/api/photos/${photoId}`}
          alt="Uploaded photo"
          className="max-w-[200px] rounded-md object-cover"
        />
      </button>
      {expanded && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={toggle}
          role="dialog"
        >
          <img
            src={`/api/photos/${photoId}`}
            alt="Full size photo"
            className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain"
          />
        </div>
      )}
    </>
  );
}

export default function MessageList({
  messages,
  isStreaming,
}: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isStreaming]);

  if (messages.length === 0 && !isStreaming) {
    return null;
  }

  return (
    <div className="flex-1 space-y-3 overflow-y-auto p-4">
      {messages.map((msg, idx) => {
        const isUser = msg.role === "user";
        const isLastAssistant =
          msg.role === "assistant" &&
          idx === messages.length - 1 &&
          isStreaming;

        return (
          <div
            key={msg.id}
            className={`flex ${isUser ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-lg px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap ${
                isUser
                  ? "bg-indigo-600 text-white"
                  : "bg-zinc-800 text-zinc-100"
              }`}
            >
              {/* Photo thumbnail for user messages */}
              {isUser && msg.photoId && (
                <PhotoThumbnail photoId={msg.photoId} />
              )}

              {/* Dimension inference card for assistant messages */}
              {!isUser && msg.dimensionInference && (
                <DimensionCard data={msg.dimensionInference} />
              )}

              {/* Message text content */}
              {isLastAssistant && !msg.content ? (
                <StreamingMessage content="" hasDesign={false} />
              ) : (
                msg.content
              )}
            </div>
          </div>
        );
      })}

      {/* Typing indicator when streaming hasn't produced the assistant message yet */}
      {isStreaming &&
        messages.length > 0 &&
        messages[messages.length - 1].role === "user" && (
          <div className="flex justify-start">
            <div className="rounded-lg bg-zinc-800 px-3 py-2 text-sm text-zinc-400">
              <span className="inline-flex items-center gap-1">
                <span className="animate-pulse">Thinking</span>
                <span className="animate-bounce">...</span>
              </span>
            </div>
          </div>
        )}

      <div ref={bottomRef} />
    </div>
  );
}
