"use client";

import { useState, useEffect, useCallback } from "react";
import { getDesignHistory } from "@/lib/api";
import type { DesignHistoryEntry } from "@/lib/api";

interface VersionHistoryProps {
  conversationId: string | null;
  currentVersion: number;
  /** Called when user clicks a version to preview its parameters. */
  onSelectVersion: (entry: DesignHistoryEntry) => void;
  /** Called when user clicks revert on a non-current version. */
  onRevert: (entry: DesignHistoryEntry) => void;
  /** Incremented externally to force a refetch (e.g. after revert). */
  refreshKey?: number;
}

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function VersionHistory({
  conversationId,
  currentVersion,
  onSelectVersion,
  onRevert,
  refreshKey,
}: VersionHistoryProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [entries, setEntries] = useState<DesignHistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<number | null>(null);

  const fetchHistory = useCallback(async () => {
    if (!conversationId) return;
    setLoading(true);
    try {
      const data = await getDesignHistory(conversationId);
      setEntries(data);
    } catch {
      // Silently fail — panel just won't show data
    } finally {
      setLoading(false);
    }
  }, [conversationId]);

  // Fetch when opened or when refreshKey changes
  useEffect(() => {
    if (isOpen && conversationId) {
      fetchHistory();
    }
  }, [isOpen, conversationId, fetchHistory, refreshKey]);

  // Reset selected version when current changes
  useEffect(() => {
    setSelectedVersion(null);
  }, [currentVersion]);

  // Only show when there are multiple versions
  if (currentVersion <= 1) return null;

  const handleSelect = (entry: DesignHistoryEntry) => {
    setSelectedVersion(entry.version);
    onSelectVersion(entry);
  };

  return (
    <div className="border-b border-gray-200 dark:border-zinc-800">
      <button
        onClick={() => setIsOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 text-xs text-gray-500 transition-colors hover:bg-gray-50 active:bg-gray-100 dark:text-zinc-400 dark:hover:bg-zinc-800/50 dark:active:bg-zinc-800 md:py-1.5"
      >
        <span className="flex items-center gap-1.5">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 16 16"
            fill="currentColor"
            className="h-3 w-3"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M1 8a7 7 0 1 1 14 0A7 7 0 0 1 1 8Zm7.75-4.25a.75.75 0 0 0-1.5 0V8c0 .414.336.75.75.75h3.25a.75.75 0 0 0 0-1.5h-2.5V3.75Z"
              clipRule="evenodd"
            />
          </svg>
          Version History ({entries.length || currentVersion})
        </span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 16 16"
          fill="currentColor"
          className={`h-3 w-3 transition-transform ${isOpen ? "rotate-180" : ""}`}
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M4.22 6.22a.75.75 0 0 1 1.06 0L8 8.94l2.72-2.72a.75.75 0 1 1 1.06 1.06l-3.25 3.25a.75.75 0 0 1-1.06 0L4.22 7.28a.75.75 0 0 1 0-1.06Z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {isOpen && (
        <div className="max-h-48 overflow-y-auto px-4 pb-3">
          {loading ? (
            <div className="py-2 text-center text-xs text-gray-400 dark:text-zinc-500">
              Loading...
            </div>
          ) : entries.length === 0 ? (
            <div className="py-2 text-center text-xs text-gray-400 dark:text-zinc-500">
              No versions found
            </div>
          ) : (
            <div className="space-y-1">
              {entries
                .slice()
                .reverse()
                .map((entry) => {
                  const isActive =
                    selectedVersion === entry.version ||
                    (selectedVersion === null && entry.is_current);

                  return (
                    <div
                      key={entry.id}
                      className={`group flex items-center justify-between rounded-md px-2.5 py-2.5 text-xs transition-colors md:py-1.5 ${
                        isActive
                          ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300"
                          : "text-gray-600 hover:bg-gray-50 active:bg-gray-100 dark:text-zinc-400 dark:hover:bg-zinc-800/50 dark:active:bg-zinc-800"
                      }`}
                    >
                      <button
                        onClick={() => handleSelect(entry)}
                        className="flex min-h-[44px] flex-1 items-center gap-2 text-left md:min-h-0"
                      >
                        <span className="font-semibold">v{entry.version}</span>
                        <span className="text-gray-400 dark:text-zinc-500">
                          {formatTimestamp(entry.created_at)}
                        </span>
                        {entry.is_current && (
                          <span className="rounded bg-green-100 px-1.5 py-0.5 text-[9px] font-bold uppercase text-green-700 dark:bg-green-900/30 dark:text-green-400">
                            current
                          </span>
                        )}
                      </button>
                      {!entry.is_current && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onRevert(entry);
                          }}
                          className="rounded-md px-2.5 py-1.5 text-[11px] font-medium text-gray-400 opacity-100 transition-opacity hover:bg-gray-200 hover:text-gray-700 active:bg-gray-300 md:opacity-0 md:group-hover:opacity-100 dark:text-zinc-500 dark:hover:bg-zinc-700 dark:hover:text-zinc-300 dark:active:bg-zinc-600"
                          title={`Revert to v${entry.version}`}
                        >
                          Revert
                        </button>
                      )}
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
