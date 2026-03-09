"use client";

import { useState, useRef, useCallback } from "react";

interface PhotoUploadProps {
  onPhotoSelected: (file: File, preview: string) => void;
  onPhotoRemoved: () => void;
  pendingPhoto: { file: File; preview: string } | null;
  disabled: boolean;
}

/**
 * Max dimension for the longest edge (Claude Vision optimal resolution).
 */
const MAX_DIMENSION = 1568;
const JPEG_QUALITY = 0.85;

/**
 * Client-side image compression: resize to max 1568px longest edge,
 * JPEG at 0.85 quality.
 */
async function compressImage(file: File): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      let { width, height } = img;
      const longest = Math.max(width, height);

      if (longest > MAX_DIMENSION) {
        const scale = MAX_DIMENSION / longest;
        width = Math.round(width * scale);
        height = Math.round(height * scale);
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas context unavailable"));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error("Image compression failed"));
            return;
          }
          const compressed = new File([blob], file.name, {
            type: "image/jpeg",
            lastModified: Date.now(),
          });
          resolve(compressed);
        },
        "image/jpeg",
        JPEG_QUALITY,
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load image"));
    };

    img.src = url;
  });
}

export default function PhotoUpload({
  onPhotoSelected,
  onPhotoRemoved,
  pendingPhoto,
  disabled,
}: PhotoUploadProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      // Reset input so the same file can be re-selected
      e.target.value = "";

      setIsCompressing(true);
      setShowMenu(false);

      try {
        const compressed = await compressImage(file);
        const preview = URL.createObjectURL(compressed);
        onPhotoSelected(compressed, preview);
      } catch {
        // Silently fail — user can retry
      } finally {
        setIsCompressing(false);
      }
    },
    [onPhotoSelected],
  );

  return (
    <div className="relative">
      {/* Hidden file inputs */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileChange}
        disabled={disabled}
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
        disabled={disabled}
      />

      {/* Camera/Photo button */}
      <button
        type="button"
        onClick={() => setShowMenu((prev) => !prev)}
        disabled={disabled || isCompressing || !!pendingPhoto}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-200 disabled:opacity-40"
        aria-label="Attach photo"
      >
        {isCompressing ? (
          <svg
            className="h-5 w-5 animate-spin"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
        ) : (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="h-5 w-5"
          >
            <path d="M12 9a3.75 3.75 0 1 0 0 7.5A3.75 3.75 0 0 0 12 9Z" />
            <path
              fillRule="evenodd"
              d="M9.344 3.071a49.52 49.52 0 0 1 5.312 0c.967.052 1.83.585 2.332 1.39l.821 1.317c.24.383.645.643 1.11.71.386.054.77.113 1.152.177 1.432.239 2.429 1.493 2.429 2.909V18a3 3 0 0 1-3 3H4.5a3 3 0 0 1-3-3V9.574c0-1.416.997-2.67 2.429-2.909.382-.064.766-.123 1.152-.177a1.56 1.56 0 0 0 1.11-.71l.822-1.315a2.942 2.942 0 0 1 2.332-1.39ZM12 12.75a2.25 2.25 0 1 0 0-4.5 2.25 2.25 0 0 0 0 4.5Z"
              clipRule="evenodd"
            />
          </svg>
        )}
      </button>

      {/* Dropdown menu */}
      {showMenu && (
        <>
          {/* Backdrop to close menu */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setShowMenu(false)}
          />
          <div className="absolute bottom-full left-0 z-20 mb-2 w-44 rounded-lg border border-zinc-700 bg-zinc-800 py-1 shadow-xl">
            <button
              type="button"
              onClick={() => {
                cameraInputRef.current?.click();
                setShowMenu(false);
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-700"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="h-4 w-4"
              >
                <path d="M10 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" />
                <path
                  fillRule="evenodd"
                  d="M.664 10.59a1.651 1.651 0 0 1 0-1.186A10.004 10.004 0 0 1 10 3c4.257 0 7.893 2.66 9.336 6.41.147.381.146.804 0 1.186A10.004 10.004 0 0 1 10 17c-4.257 0-7.893-2.66-9.336-6.41Z"
                  clipRule="evenodd"
                />
              </svg>
              Take photo
            </button>
            <button
              type="button"
              onClick={() => {
                galleryInputRef.current?.click();
                setShowMenu(false);
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-700"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="h-4 w-4"
              >
                <path
                  fillRule="evenodd"
                  d="M1 5.25A2.25 2.25 0 0 1 3.25 3h13.5A2.25 2.25 0 0 1 19 5.25v9.5A2.25 2.25 0 0 1 16.75 17H3.25A2.25 2.25 0 0 1 1 14.75v-9.5Zm1.5 5.81v3.69c0 .414.336.75.75.75h13.5a.75.75 0 0 0 .75-.75v-2.69l-2.22-2.219a.75.75 0 0 0-1.06 0l-1.91 1.909-4.22-4.22a.75.75 0 0 0-1.06 0L2.5 11.06ZM12 7a1 1 0 1 1 2 0 1 1 0 0 1-2 0Z"
                  clipRule="evenodd"
                />
              </svg>
              Choose from gallery
            </button>
          </div>
        </>
      )}

      {/* Pending photo preview */}
      {pendingPhoto && (
        <div className="absolute bottom-full left-0 mb-2 flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800 p-1.5">
          <img
            src={pendingPhoto.preview}
            alt="Upload preview"
            className="h-12 w-12 rounded object-cover"
          />
          <button
            type="button"
            onClick={() => {
              URL.revokeObjectURL(pendingPhoto.preview);
              onPhotoRemoved();
            }}
            className="flex h-5 w-5 items-center justify-center rounded-full bg-zinc-600 text-xs text-zinc-200 hover:bg-red-600"
            aria-label="Remove photo"
          >
            &times;
          </button>
        </div>
      )}
    </div>
  );
}
