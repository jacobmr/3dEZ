"use client";

import { useState } from "react";
import type { CostEstimateData } from "@/lib/api";

interface CostEstimateProps {
  data: CostEstimateData;
  onApprove: () => void;
  onDecline: () => void;
  isApproving?: boolean;
  approved?: boolean;
}

function formatPrice(usd: number): string {
  if (usd < 0.01) return "<$0.01";
  return `$${usd.toFixed(2)}`;
}

function formatSmallPrice(usd: number): string {
  if (usd === 0) return "$0.00";
  if (usd < 0.001) return "<$0.001";
  return `$${usd.toFixed(4)}`;
}

export type { CostEstimateData };

export default function CostEstimate({
  data,
  onApprove,
  onDecline,
  isApproving = false,
  approved = false,
}: CostEstimateProps) {
  const [showBreakdown, setShowBreakdown] = useState(false);

  return (
    <div className="my-2 rounded-lg border border-indigo-200 bg-indigo-50/50 p-3 dark:border-indigo-800 dark:bg-indigo-950/30">
      {/* Header */}
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400">
          Cost Estimate
        </span>
        {data.category && (
          <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-300">
            {data.category.replace(/_/g, " ")}
          </span>
        )}
      </div>

      {/* Total price */}
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-bold text-gray-800 dark:text-zinc-100">
          {formatPrice(data.estimated_price)}
        </span>
        <span className="text-xs text-gray-500 dark:text-zinc-400">
          estimated total
        </span>
      </div>

      {/* Breakdown toggle */}
      <button
        type="button"
        onClick={() => setShowBreakdown((v) => !v)}
        className="mt-1 text-xs text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300"
      >
        {showBreakdown ? "Hide" : "Show"} breakdown
      </button>

      {/* Breakdown details */}
      {showBreakdown && (
        <div className="mt-2 space-y-1 rounded-md bg-white/60 p-2 text-xs dark:bg-zinc-800/40">
          <div className="flex justify-between text-gray-600 dark:text-zinc-400">
            <span>
              Conversation ({data.total_tokens.toLocaleString()} tokens)
            </span>
            <span>{formatSmallPrice(data.token_cost)}</span>
          </div>
          <div className="flex justify-between text-gray-600 dark:text-zinc-400">
            <span>STL generation</span>
            <span>{formatSmallPrice(data.compute_cost)}</span>
          </div>
          <div className="border-t border-gray-200 pt-1 dark:border-zinc-700">
            <div className="flex justify-between text-gray-600 dark:text-zinc-400">
              <span>Subtotal (COGS)</span>
              <span>{formatSmallPrice(data.cogs)}</span>
            </div>
            <div className="flex justify-between text-gray-600 dark:text-zinc-400">
              <span>Markup ({data.markup_multiplier}x)</span>
              <span />
            </div>
          </div>
          <div className="flex justify-between border-t border-gray-200 pt-1 font-medium text-gray-800 dark:border-zinc-700 dark:text-zinc-200">
            <span>Total</span>
            <span>{formatPrice(data.estimated_price)}</span>
          </div>
        </div>
      )}

      {/* Action buttons */}
      {approved ? (
        <div className="mt-3 flex items-center gap-2 text-xs text-green-600 dark:text-green-400">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="h-4 w-4"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z"
              clipRule="evenodd"
            />
          </svg>
          <span className="font-medium">Approved — generating preview</span>
        </div>
      ) : (
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={onApprove}
            disabled={isApproving}
            className="rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-indigo-700 disabled:opacity-50 dark:bg-indigo-500 dark:hover:bg-indigo-600"
          >
            {isApproving ? "Approving..." : "Generate Preview"}
          </button>
          <button
            type="button"
            onClick={onDecline}
            disabled={isApproving}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-100 disabled:opacity-50 dark:border-zinc-600 dark:text-zinc-400 dark:hover:bg-zinc-800"
          >
            Keep Editing
          </button>
        </div>
      )}
    </div>
  );
}
