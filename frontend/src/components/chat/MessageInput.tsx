"use client";

import { useState, useCallback, type KeyboardEvent } from "react";
import PhotoUpload from "./PhotoUpload";
import StlUpload from "./StlUpload";

interface MessageInputProps {
  onSend: (text: string, photo?: File, stlFile?: File) => void;
  disabled: boolean;
  placeholder?: string;
}

export default function MessageInput({
  onSend,
  disabled,
  placeholder = "Describe what you want to create...",
}: MessageInputProps) {
  const [text, setText] = useState("");
  const [pendingPhoto, setPendingPhoto] = useState<{
    file: File;
    preview: string;
  } | null>(null);
  const [pendingStl, setPendingStl] = useState<{
    file: File;
    sizeMB: string;
  } | null>(null);

  const handleSend = useCallback(() => {
    const trimmed = text.trim();
    if ((!trimmed && !pendingPhoto && !pendingStl) || disabled) return;
    onSend(trimmed, pendingPhoto?.file, pendingStl?.file);
    setText("");
    if (pendingPhoto) {
      URL.revokeObjectURL(pendingPhoto.preview);
      setPendingPhoto(null);
    }
    if (pendingStl) {
      setPendingStl(null);
    }
  }, [text, disabled, onSend, pendingPhoto, pendingStl]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  return (
    <div className="border-t border-gray-200 p-3 dark:border-zinc-800">
      {/* Pending STL preview strip */}
      {pendingStl && (
        <div className="mb-2 flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 p-2 dark:border-zinc-700 dark:bg-zinc-800/50">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded bg-indigo-100 dark:bg-indigo-900/30">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="h-8 w-8 text-indigo-600 dark:text-indigo-400"
            >
              <path d="M12.378 1.602a.75.75 0 0 0-.756 0L3 6.632l9 5.25 9-5.25-8.622-5.03ZM21.75 7.93l-9 5.25v9l8.628-5.032a.75.75 0 0 0 .372-.648V7.93ZM11.25 22.18v-9l-9-5.25v8.57a.75.75 0 0 0 .372.648l8.628 5.033Z" />
            </svg>
          </div>
          <div className="flex flex-1 flex-col truncate">
            <span className="text-xs font-medium text-gray-700 truncate dark:text-zinc-200">
              {pendingStl.file.name}
            </span>
            <span className="text-[10px] text-gray-400 dark:text-zinc-500">
              {pendingStl.sizeMB} MB &middot; STL file
            </span>
          </div>
          <button
            type="button"
            onClick={() => setPendingStl(null)}
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-gray-400 hover:bg-gray-200 hover:text-red-500 dark:text-zinc-400 dark:hover:bg-zinc-700 dark:hover:text-red-400"
            aria-label="Remove STL file"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="h-4 w-4"
            >
              <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
            </svg>
          </button>
        </div>
      )}

      {/* Pending photo preview strip */}
      {pendingPhoto && (
        <div className="mb-2 flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 p-2 dark:border-zinc-700 dark:bg-zinc-800/50">
          <img
            src={pendingPhoto.preview}
            alt="Upload preview"
            className="h-16 w-16 rounded object-cover"
          />
          <div className="flex-1 text-xs text-gray-500 truncate dark:text-zinc-400">
            {pendingPhoto.file.name}
          </div>
          <button
            type="button"
            onClick={() => {
              URL.revokeObjectURL(pendingPhoto.preview);
              setPendingPhoto(null);
            }}
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-gray-400 hover:bg-gray-200 hover:text-red-500 dark:text-zinc-400 dark:hover:bg-zinc-700 dark:hover:text-red-400"
            aria-label="Remove photo"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="h-4 w-4"
            >
              <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
            </svg>
          </button>
        </div>
      )}

      <div className="flex items-end gap-2">
        <PhotoUpload
          onPhotoSelected={(file, preview) =>
            setPendingPhoto({ file, preview })
          }
          onPhotoRemoved={() => setPendingPhoto(null)}
          pendingPhoto={pendingPhoto}
          disabled={disabled}
        />
        <StlUpload
          onStlSelected={(file) =>
            setPendingStl({
              file,
              sizeMB: (file.size / (1024 * 1024)).toFixed(1),
            })
          }
          onStlRemoved={() => setPendingStl(null)}
          pendingStl={pendingStl}
          disabled={disabled}
        />
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder={placeholder}
          rows={1}
          className="min-h-[44px] max-h-32 flex-1 resize-none rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-none disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder-zinc-500"
        />
        <button
          onClick={handleSend}
          disabled={disabled || (!text.trim() && !pendingPhoto && !pendingStl)}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-white transition-colors hover:bg-indigo-500 active:bg-indigo-700 disabled:opacity-40 disabled:hover:bg-indigo-600"
          aria-label="Send message"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="h-5 w-5"
          >
            <path d="M3.105 2.288a.75.75 0 0 0-.826.95l1.414 4.926A1.5 1.5 0 0 0 5.135 9.25h6.115a.75.75 0 0 1 0 1.5H5.135a1.5 1.5 0 0 0-1.442 1.086l-1.414 4.926a.75.75 0 0 0 .826.95 28.897 28.897 0 0 0 15.293-7.154.75.75 0 0 0 0-1.115A28.897 28.897 0 0 0 3.105 2.289Z" />
          </svg>
        </button>
      </div>
    </div>
  );
}
