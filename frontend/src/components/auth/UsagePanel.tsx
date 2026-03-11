"use client";

import { useState, useEffect, useCallback } from "react";
import { getUsageStats } from "@/lib/api";
import type { UsageStats } from "@/lib/api";

interface UsagePanelProps {
  onClose: () => void;
}

function formatCost(usd: number): string {
  if (usd < 0.01) return "<$0.01";
  return `$${usd.toFixed(2)}`;
}

function StatRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-sm text-gray-500 dark:text-zinc-400">{label}</span>
      <span className="text-sm font-medium text-gray-800 dark:text-zinc-200">
        {value}
      </span>
    </div>
  );
}

export function UsagePanel({ onClose }: UsagePanelProps) {
  const [stats, setStats] = useState<UsageStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getUsageStats();
      setStats(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load usage");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl dark:bg-zinc-900"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-800 dark:text-zinc-100">
            Usage Statistics
          </h2>
          <button
            onClick={onClose}
            className="rounded p-1 text-gray-400 transition-colors hover:text-gray-600 dark:hover:text-zinc-200"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="h-5 w-5"
            >
              <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
            </svg>
          </button>
        </div>

        {isLoading && (
          <div className="py-8 text-center text-sm text-gray-500 dark:text-zinc-400">
            Loading usage data...
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600 dark:border-red-800 dark:bg-red-900/30 dark:text-red-400">
            {error}
          </div>
        )}

        {stats && !isLoading && (
          <div className="space-y-4">
            {/* This Month */}
            <div>
              <h3 className="mb-1 text-xs font-medium uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                This Month
              </h3>
              <div className="rounded-lg border border-gray-200 p-3 dark:border-zinc-700">
                <StatRow label="Designs" value={stats.this_month.designs} />
                <StatRow
                  label="Conversations"
                  value={stats.this_month.conversations}
                />
                <StatRow
                  label="Tokens Used"
                  value={stats.this_month.tokens.toLocaleString()}
                />
                <StatRow
                  label="Estimated Cost"
                  value={formatCost(stats.this_month.estimated_cost)}
                />
              </div>
            </div>

            {/* All Time */}
            <div>
              <h3 className="mb-1 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-zinc-400">
                All Time
              </h3>
              <div className="rounded-lg border border-gray-200 p-3 dark:border-zinc-700">
                <StatRow label="Designs" value={stats.total.designs} />
                <StatRow
                  label="Conversations"
                  value={stats.total.conversations}
                />
                <StatRow
                  label="Tokens Used"
                  value={stats.total.tokens.toLocaleString()}
                />
                <StatRow
                  label="Estimated Cost"
                  value={formatCost(stats.total.estimated_cost)}
                />
              </div>
            </div>

            {/* Info note */}
            <p className="text-center text-xs text-gray-400 dark:text-zinc-500">
              Costs are estimates for informational purposes only.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
