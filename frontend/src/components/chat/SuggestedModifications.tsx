"use client";

interface SuggestedModificationsProps {
  suggestions: string[];
  onSelect: (suggestion: string) => void;
  disabled?: boolean;
}

export default function SuggestedModifications({
  suggestions,
  onSelect,
  disabled = false,
}: SuggestedModificationsProps) {
  if (suggestions.length === 0) return null;

  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {suggestions.map((suggestion) => (
        <button
          key={suggestion}
          type="button"
          onClick={() => onSelect(suggestion)}
          disabled={disabled}
          className="rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700 transition-colors hover:border-indigo-400 hover:bg-indigo-100 disabled:opacity-40 disabled:cursor-not-allowed dark:border-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-300 dark:hover:border-indigo-600 dark:hover:bg-indigo-900/50"
        >
          {suggestion}
        </button>
      ))}
    </div>
  );
}
