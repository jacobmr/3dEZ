"use client";

import type { SavedDesign } from "@shared/api-types";

interface DesignCardProps {
  design: SavedDesign;
  isActive: boolean;
  onClick: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
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
  design,
  isActive,
  onClick,
  onDelete,
  onDuplicate,
}: DesignCardProps) {
  const icon = categoryIcons[design.category] ?? "\u25CB";
  const displayName =
    design.name || design.conversation_title || "Untitled design";

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
        <div className="truncate text-sm font-medium">{displayName}</div>
        <div className="mt-0.5 flex items-center gap-2 text-xs text-gray-400 dark:text-zinc-500">
          <span className="rounded bg-gray-200 px-1 py-0.5 text-[10px] dark:bg-zinc-800">
            {design.category.replace("_", " ")}
          </span>
          {design.parent_design_id && (
            <span className="text-[10px] text-indigo-400">variant</span>
          )}
          <span>{formatTime(design.created_at)}</span>
        </div>
      </div>
      <div className="mt-0.5 hidden gap-0.5 group-hover:flex">
        {/* Duplicate */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDuplicate();
          }}
          className="rounded p-0.5 text-gray-400 transition-colors hover:bg-gray-200 hover:text-gray-600 dark:text-zinc-500 dark:hover:bg-zinc-700 dark:hover:text-zinc-300"
          aria-label="Duplicate design"
          title="Duplicate"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 16 16"
            fill="currentColor"
            className="h-3.5 w-3.5"
          >
            <path d="M11.5 3h-7A1.5 1.5 0 0 0 3 4.5v7A1.5 1.5 0 0 0 4.5 13h7a1.5 1.5 0 0 0 1.5-1.5v-7A1.5 1.5 0 0 0 11.5 3ZM4.5 2a2.5 2.5 0 0 0-2.5 2.5v7A2.5 2.5 0 0 0 4.5 14h7a2.5 2.5 0 0 0 2.5-2.5v-7A2.5 2.5 0 0 0 11.5 2h-7Z" />
            <path d="M6.5 0A2.5 2.5 0 0 0 4 2.5h1A1.5 1.5 0 0 1 6.5 1h5A1.5 1.5 0 0 1 13 2.5v5a1.5 1.5 0 0 1-1 1.415V10a2.5 2.5 0 0 0 2-2.45v-5A2.5 2.5 0 0 0 11.5 0h-5Z" />
          </svg>
        </button>
        {/* Delete */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="rounded p-0.5 text-gray-400 transition-colors hover:bg-gray-200 hover:text-red-500 dark:text-zinc-500 dark:hover:bg-zinc-700 dark:hover:text-red-400"
          aria-label="Delete design"
          title="Delete"
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
      </div>
    </button>
  );
}
