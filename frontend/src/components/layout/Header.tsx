"use client";

import { ThemeToggle } from "@/components/theme/ThemeToggle";

interface HeaderProps {
  onMenuClick?: () => void;
}

export default function Header({ onMenuClick }: HeaderProps) {
  return (
    <header className="flex h-12 shrink-0 items-center bg-gray-900 px-4 text-white dark:bg-gray-900">
      {onMenuClick && (
        <button
          onClick={onMenuClick}
          className="mr-3 rounded p-1 transition-colors hover:bg-gray-800 lg:hidden"
          aria-label="Open menu"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="h-5 w-5"
          >
            <path
              fillRule="evenodd"
              d="M2 4.75A.75.75 0 0 1 2.75 4h14.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 4.75ZM2 10a.75.75 0 0 1 .75-.75h14.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 10Zm0 5.25a.75.75 0 0 1 .75-.75h14.5a.75.75 0 0 1 0 1.5H2.75a.75.75 0 0 1-.75-.75Z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      )}
      <span className="text-lg font-bold tracking-tight">3dEZ</span>
      <ThemeToggle />
    </header>
  );
}
