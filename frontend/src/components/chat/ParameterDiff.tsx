"use client";

interface ParameterDiffProps {
  previous: Record<string, unknown>;
  current: Record<string, unknown>;
}

interface DiffEntry {
  key: string;
  label: string;
  oldValue: unknown;
  newValue: unknown;
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return "--";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "number") return String(value);
  if (typeof value === "string") return value.replace(/_/g, " ");
  return JSON.stringify(value);
}

function formatLabel(key: string): string {
  return key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function computeDiff(
  previous: Record<string, unknown>,
  current: Record<string, unknown>,
): DiffEntry[] {
  const diffs: DiffEntry[] = [];
  const allKeys = new Set([...Object.keys(previous), ...Object.keys(current)]);

  // Skip internal keys that aren't user-facing parameters
  const skipKeys = new Set(["category"]);

  for (const key of allKeys) {
    if (skipKeys.has(key)) continue;

    const oldVal = previous[key];
    const newVal = current[key];

    // Compare serialized values to handle objects/arrays
    if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
      diffs.push({
        key,
        label: formatLabel(key),
        oldValue: oldVal,
        newValue: newVal,
      });
    }
  }

  return diffs;
}

export default function ParameterDiff({
  previous,
  current,
}: ParameterDiffProps) {
  const diffs = computeDiff(previous, current);

  if (diffs.length === 0) return null;

  return (
    <div className="my-2 rounded-lg border border-amber-200 bg-amber-50/50 p-3 dark:border-amber-800/50 dark:bg-amber-950/20">
      <div className="mb-2 flex items-center gap-2">
        <span className="text-xs font-medium text-amber-700 dark:text-amber-400">
          Parameters Updated
        </span>
        <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-600 dark:bg-amber-900/40 dark:text-amber-300">
          {diffs.length} {diffs.length === 1 ? "change" : "changes"}
        </span>
      </div>
      <div className="space-y-1.5">
        {diffs.map((diff) => (
          <div key={diff.key} className="flex items-baseline gap-2 text-xs">
            <span className="min-w-[80px] font-medium text-gray-600 dark:text-zinc-300">
              {diff.label}
            </span>
            <span className="text-red-500 line-through dark:text-red-400">
              {formatValue(diff.oldValue)}
            </span>
            <span className="text-gray-400 dark:text-zinc-500">&rarr;</span>
            <span className="font-medium text-green-600 dark:text-green-400">
              {formatValue(diff.newValue)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
