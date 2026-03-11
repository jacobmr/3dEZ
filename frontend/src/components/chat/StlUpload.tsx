"use client";

import { useRef, useCallback } from "react";

interface StlUploadProps {
  onStlSelected: (file: File) => void;
  onStlRemoved: () => void;
  pendingStl: { file: File; sizeMB: string } | null;
  disabled: boolean;
}

export default function StlUpload({
  onStlSelected,
  onStlRemoved,
  pendingStl,
  disabled,
}: StlUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      // Reset input so the same file can be re-selected
      e.target.value = "";

      // Validate extension client-side
      if (!file.name.toLowerCase().endsWith(".stl")) {
        return;
      }

      onStlSelected(file);
    },
    [onStlSelected],
  );

  return (
    <div className="relative">
      {/* Hidden file input */}
      <input
        ref={inputRef}
        type="file"
        accept=".stl"
        className="hidden"
        onChange={handleFileChange}
        disabled={disabled}
      />

      {/* STL upload button */}
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={disabled || !!pendingStl}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 disabled:opacity-40 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
        aria-label="Upload STL file"
        title="Upload STL file"
      >
        {/* 3D cube icon */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
          className="h-5 w-5"
        >
          <path d="M12.378 1.602a.75.75 0 0 0-.756 0L3 6.632l9 5.25 9-5.25-8.622-5.03ZM21.75 7.93l-9 5.25v9l8.628-5.032a.75.75 0 0 0 .372-.648V7.93ZM11.25 22.18v-9l-9-5.25v8.57a.75.75 0 0 0 .372.648l8.628 5.033Z" />
        </svg>
      </button>

      {/* Pending STL preview */}
      {pendingStl && (
        <div className="absolute bottom-full left-0 mb-2 flex items-center gap-2 rounded-lg border border-gray-200 bg-white p-1.5 dark:border-zinc-700 dark:bg-zinc-800">
          <div className="flex h-12 w-12 items-center justify-center rounded bg-indigo-100 dark:bg-indigo-900/30">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="h-6 w-6 text-indigo-600 dark:text-indigo-400"
            >
              <path d="M12.378 1.602a.75.75 0 0 0-.756 0L3 6.632l9 5.25 9-5.25-8.622-5.03ZM21.75 7.93l-9 5.25v9l8.628-5.032a.75.75 0 0 0 .372-.648V7.93ZM11.25 22.18v-9l-9-5.25v8.57a.75.75 0 0 0 .372.648l8.628 5.033Z" />
            </svg>
          </div>
          <div className="flex flex-col">
            <span className="max-w-[120px] truncate text-xs font-medium text-gray-700 dark:text-zinc-200">
              {pendingStl.file.name}
            </span>
            <span className="text-[10px] text-gray-400 dark:text-zinc-500">
              {pendingStl.sizeMB} MB
            </span>
          </div>
          <button
            type="button"
            onClick={onStlRemoved}
            className="flex h-5 w-5 items-center justify-center rounded-full bg-gray-200 text-xs text-gray-700 hover:bg-red-500 hover:text-white dark:bg-zinc-600 dark:text-zinc-200 dark:hover:bg-red-600"
            aria-label="Remove STL file"
          >
            &times;
          </button>
        </div>
      )}
    </div>
  );
}
