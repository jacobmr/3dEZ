"use client";

interface DimensionData {
  reference_used: string;
  estimated_dimensions: {
    width_mm: number;
    height_mm: number;
    depth_mm?: number;
  };
  confidence: "high" | "medium" | "low";
  notes: string;
}

interface DimensionCardProps {
  data: DimensionData;
}

const confidenceConfig = {
  high: {
    label: "High",
    className:
      "bg-green-100 text-green-700 border-green-300 dark:bg-green-900/50 dark:text-green-300 dark:border-green-700",
  },
  medium: {
    label: "Medium",
    className:
      "bg-yellow-100 text-yellow-700 border-yellow-300 dark:bg-yellow-900/50 dark:text-yellow-300 dark:border-yellow-700",
  },
  low: {
    label: "Low",
    className:
      "bg-red-100 text-red-700 border-red-300 dark:bg-red-900/50 dark:text-red-300 dark:border-red-700",
  },
} as const;

export type { DimensionData };

export default function DimensionCard({ data }: DimensionCardProps) {
  const { reference_used, estimated_dimensions, confidence, notes } = data;
  const conf = confidenceConfig[confidence];
  const { width_mm, height_mm, depth_mm } = estimated_dimensions;

  return (
    <div className="my-2 rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-zinc-700 dark:bg-zinc-800/60">
      {/* Header row */}
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-gray-500 dark:text-zinc-400">
          Estimated Dimensions
        </span>
        <span
          className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${conf.className}`}
        >
          {conf.label} confidence
        </span>
      </div>

      {/* Dimensions */}
      <div className="flex items-baseline gap-1 text-lg font-semibold text-gray-800 dark:text-zinc-100">
        <span>{width_mm}</span>
        <span className="text-xs text-gray-400 dark:text-zinc-500">mm</span>
        <span className="text-gray-400 dark:text-zinc-500">&times;</span>
        <span>{height_mm}</span>
        <span className="text-xs text-gray-400 dark:text-zinc-500">mm</span>
        {depth_mm != null && (
          <>
            <span className="text-gray-400 dark:text-zinc-500">&times;</span>
            <span>{depth_mm}</span>
            <span className="text-xs text-gray-400 dark:text-zinc-500">mm</span>
          </>
        )}
      </div>

      {/* Reference & notes */}
      <div className="mt-2 space-y-1 text-xs text-gray-500 dark:text-zinc-400">
        <div>
          <span className="font-medium text-gray-700 dark:text-zinc-300">
            Calibrated from:
          </span>{" "}
          {reference_used}
        </div>
        {notes && <div className="italic">{notes}</div>}
      </div>
    </div>
  );
}
