"use client";

import { useState, useCallback, type KeyboardEvent } from "react";
import PhotoUpload from "./PhotoUpload";

interface MessageInputProps {
  onSend: (text: string, photo?: File) => void;
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

  const handleSend = useCallback(() => {
    const trimmed = text.trim();
    if ((!trimmed && !pendingPhoto) || disabled) return;
    onSend(trimmed, pendingPhoto?.file);
    setText("");
    if (pendingPhoto) {
      URL.revokeObjectURL(pendingPhoto.preview);
      setPendingPhoto(null);
    }
  }, [text, disabled, onSend, pendingPhoto]);

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
    <div className="border-t border-zinc-800 p-3">
      {/* Pending photo preview strip */}
      {pendingPhoto && (
        <div className="mb-2 flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800/50 p-2">
          <img
            src={pendingPhoto.preview}
            alt="Upload preview"
            className="h-16 w-16 rounded object-cover"
          />
          <div className="flex-1 text-xs text-zinc-400 truncate">
            {pendingPhoto.file.name}
          </div>
          <button
            type="button"
            onClick={() => {
              URL.revokeObjectURL(pendingPhoto.preview);
              setPendingPhoto(null);
            }}
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-zinc-400 hover:bg-zinc-700 hover:text-red-400"
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
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder={placeholder}
          rows={1}
          className="min-h-[40px] max-h-32 flex-1 resize-none rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:border-indigo-500 focus:outline-none disabled:opacity-50"
        />
        <button
          onClick={handleSend}
          disabled={disabled || (!text.trim() && !pendingPhoto)}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-white transition-colors hover:bg-indigo-500 disabled:opacity-40 disabled:hover:bg-indigo-600"
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
