"use client";

import MessageList from "./MessageList";
import MessageInput from "./MessageInput";
import type { ChatMessage } from "@/hooks/useConversation";

const CATEGORY_SUGGESTIONS = [
  {
    label: "Mounting Bracket",
    prompt: "I need a mounting bracket",
    icon: "\u{1F529}",
  },
  {
    label: "Enclosure / Box",
    prompt: "I need an enclosure for electronics",
    icon: "\u{1F4E6}",
  },
  {
    label: "Organizer",
    prompt: "I need a desk organizer",
    icon: "\u{1F5C2}",
  },
];

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
  /** True while STL is being generated/regenerated. */
  isGenerating?: boolean;
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
  isGenerating = false,
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
            className="rounded-md px-3 py-2 text-xs text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-800 active:bg-gray-200 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200 dark:active:bg-zinc-700"
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
            Describe a 3D-printable part and I&apos;ll help you design it step
            by step.
          </p>
          <div className="mt-2 flex flex-wrap justify-center gap-2">
            {CATEGORY_SUGGESTIONS.map((s) => (
              <button
                key={s.label}
                onClick={() => onSend(s.prompt)}
                className="flex min-h-[44px] items-center gap-1.5 rounded-full border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 active:bg-indigo-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:border-indigo-600 dark:hover:bg-indigo-950/40 dark:hover:text-indigo-300 dark:active:bg-indigo-900/60 md:min-h-0 md:px-3 md:py-1.5 md:text-xs"
              >
                <span>{s.icon}</span>
                {s.label}
              </button>
            ))}
          </div>
          <p className="mt-1 text-[11px] text-gray-400 dark:text-zinc-500">
            Or describe something custom below
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
        disabled={isStreaming || isGenerating}
        placeholder={
          hasDesign
            ? "Describe changes to your design..."
            : "Describe what you want to create..."
        }
      />
    </div>
  );
}
