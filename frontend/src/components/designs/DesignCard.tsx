"use client";

import type { ConversationSummary } from "@shared/api-types";

interface DesignCardProps {
  conversation: ConversationSummary;
  isActive: boolean;
  onClick: () => void;
  onDelete: () => void;
}

const categoryIcons: Record<string, string> = {
  mounting_bracket: "\u2397", // ⎗
  enclosure: "\u25A1", // □
  organizer: "\u2637", // ☷
};

function formatTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  return d.toLocaleDateString();
}

export default function DesignCard({
  conversation,
  isActive,
  onClick,
  onDelete,
}: DesignCardProps) {
  const icon = conversation.category
    ? (categoryIcons[conversation.category] ?? "\u25CB")
    : "\u25CB";

  return (
    <button
      onClick={onClick}
      className={`group flex w-full items-start gap-2 rounded-lg px-3 py-2 text-left transition-colors ${
        isActive
          ? "bg-indigo-600/20 text-gray-900 dark:text-zinc-100"
          : "text-gray-700 hover:bg-gray-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
      }`}
    >
      <span className="mt-0.5 text-base leading-none">{icon}</span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">
          {conversation.title || "Untitled design"}
        </div>
        <div className="mt-0.5 flex items-center gap-2 text-xs text-gray-400 dark:text-zinc-500">
          {conversation.category && (
            <span className="rounded bg-gray-200 px-1 py-0.5 text-[10px] dark:bg-zinc-800">
              {conversation.category.replace("_", " ")}
            </span>
          )}
          <span>{formatTime(conversation.updated_at)}</span>
        </div>
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        className="mt-0.5 hidden rounded p-0.5 text-gray-400 transition-colors hover:bg-gray-200 hover:text-gray-600 group-hover:block dark:text-zinc-500 dark:hover:bg-zinc-700 dark:hover:text-zinc-300"
        aria-label="Delete design"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 16 16"
          fill="currentColor"
          className="h-3.5 w-3.5"
        >
          <path d="M5.28 4.22a.75.75 0 0 0-1.06 1.06L6.94 8l-2.72 2.72a.75.75 0 1 0 1.06 1.06L8 9.06l2.72 2.72a.75.75 0 1 0 1.06-1.06L9.06 8l2.72-2.72a.75.75 0 0 0-1.06-1.06L8 6.94 5.28 4.22Z" />
        </svg>
      </button>
    </button>
  );
}
