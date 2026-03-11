"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { ChatMessage } from "@/hooks/useConversation";
import StreamingMessage from "./StreamingMessage";
import DimensionCard from "./DimensionCard";
import CostEstimate from "./CostEstimate";
import ParameterDiff from "./ParameterDiff";
import SuggestedModifications from "./SuggestedModifications";

interface MessageListProps {
  messages: ChatMessage[];
  isStreaming: boolean;
  onApproveCost?: () => void;
  onDeclineCost?: () => void;
  isApprovingCost?: boolean;
  costApproved?: boolean;
  onSuggestedModification?: (suggestion: string) => void;
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
  onApproveCost,
  onDeclineCost,
  isApprovingCost = false,
  costApproved = false,
  onSuggestedModification,
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
                  : "bg-gray-100 text-gray-800 dark:bg-zinc-800 dark:text-zinc-100"
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

              {/* Parameter diff for revision designs */}
              {!isUser && msg.parameterDiff && (
                <ParameterDiff
                  previous={msg.parameterDiff.previous}
                  current={msg.parameterDiff.current}
                />
              )}

              {/* Cost estimate card for assistant messages */}
              {!isUser &&
                msg.costEstimate &&
                onApproveCost &&
                onDeclineCost && (
                  <CostEstimate
                    data={msg.costEstimate}
                    onApprove={onApproveCost}
                    onDecline={onDeclineCost}
                    isApproving={isApprovingCost}
                    approved={costApproved}
                  />
                )}

              {/* Suggested modifications chips */}
              {!isUser &&
                msg.suggestedModifications &&
                msg.suggestedModifications.length > 0 &&
                onSuggestedModification && (
                  <SuggestedModifications
                    suggestions={msg.suggestedModifications}
                    onSelect={onSuggestedModification}
                    disabled={isStreaming}
                  />
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
            <div className="rounded-lg bg-gray-100 px-3 py-2 text-sm text-gray-500 dark:bg-zinc-800 dark:text-zinc-400">
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
