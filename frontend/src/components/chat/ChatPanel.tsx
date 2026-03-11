"use client";

import MessageList from "./MessageList";
import MessageInput from "./MessageInput";
import type { ChatMessage } from "@/hooks/useConversation";

interface ChatPanelProps {
  messages: ChatMessage[];
  isStreaming: boolean;
  error: string | null;
  hasDesign: boolean;
  onSend: (text: string, photo?: File, stlFile?: File) => void;
  onStartNew: () => void;
  onApproveCost?: () => void;
  onDeclineCost?: () => void;
  isApprovingCost?: boolean;
  costApproved?: boolean;
  onSuggestedModification?: (suggestion: string) => void;
  onParameterNudge?: (parameterKey: string, newValue: number) => void;
}

export default function ChatPanel({
  messages,
  isStreaming,
  error,
  hasDesign,
  onSend,
  onStartNew,
  onApproveCost,
  onDeclineCost,
  isApprovingCost,
  costApproved,
  onSuggestedModification,
  onParameterNudge,
}: ChatPanelProps) {
  const hasMessages = messages.length > 0;

  return (
    <div className="flex h-full flex-col">
      {/* Header bar with new design button */}
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-2 dark:border-zinc-800">
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-zinc-400">
          Design
        </span>
        {hasMessages && (
          <button
            onClick={onStartNew}
            className="rounded px-2 py-1 text-xs text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-800 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
          >
            + New
          </button>
        )}
      </div>

      {/* Messages or welcome */}
      {hasMessages ? (
        <MessageList
          messages={messages}
          isStreaming={isStreaming}
          onApproveCost={onApproveCost}
          onDeclineCost={onDeclineCost}
          isApprovingCost={isApprovingCost}
          costApproved={costApproved}
          onSuggestedModification={onSuggestedModification}
          onParameterNudge={onParameterNudge}
        />
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
          <div className="text-4xl">&#9653;</div>
          <h2 className="text-lg font-semibold text-gray-800 dark:text-zinc-100">
            What would you like to create?
          </h2>
          <p className="max-w-xs text-sm text-gray-500 dark:text-zinc-400">
            Describe a 3D-printable part &mdash; a mounting bracket, enclosure,
            or organizer &mdash; and I&apos;ll help design it.
          </p>
        </div>
      )}

      {/* Error display */}
      {error && (
        <div className="mx-4 mb-2 rounded-lg border border-red-800 bg-red-900/30 px-3 py-2 text-sm text-red-300">
          {error}
        </div>
      )}

      {/* Input */}
      <MessageInput
        onSend={(text, photo, stlFile) => {
          onSend(text, photo, stlFile);
        }}
        disabled={isStreaming}
        placeholder={
          hasDesign
            ? "Describe changes to your design..."
            : "Describe what you want to create..."
        }
      />
    </div>
  );
}
