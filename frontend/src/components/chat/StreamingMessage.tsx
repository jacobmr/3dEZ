"use client";

interface StreamingMessageProps {
  content: string;
  hasDesign: boolean;
  designCategory?: string;
}

export default function StreamingMessage({
  content,
  hasDesign,
  designCategory,
}: StreamingMessageProps) {
  return (
    <div>
      {!content && (
        <span className="inline-flex items-center gap-1 text-gray-400 dark:text-zinc-400">
          <span className="animate-pulse">Thinking</span>
          <span className="animate-bounce">...</span>
        </span>
      )}
      {content && <span className="whitespace-pre-wrap">{content}</span>}
      {hasDesign && (
        <div className="mt-2 rounded border border-emerald-300 bg-emerald-50 px-3 py-2 text-emerald-700 dark:border-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
          <span className="font-medium">Design ready!</span>
          {designCategory && (
            <span className="ml-2 rounded bg-emerald-100 px-1.5 py-0.5 text-xs dark:bg-emerald-800/50">
              {designCategory.replace("_", " ")}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
