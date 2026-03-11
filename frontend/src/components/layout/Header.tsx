"use client";

import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { UserMenu } from "@/components/auth/UserMenu";

interface HeaderProps {
  onMenuClick?: () => void;
  onNewDesign?: () => void;
}

export default function Header({ onMenuClick, onNewDesign }: HeaderProps) {
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
      {onNewDesign && (
        <button
          onClick={onNewDesign}
          className="ml-4 hidden rounded-md bg-indigo-600 px-3 py-1 text-xs font-semibold text-white transition-colors hover:bg-indigo-500 active:bg-indigo-700 sm:inline-flex sm:items-center sm:gap-1"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 16 16"
            fill="currentColor"
            className="h-3.5 w-3.5"
          >
            <path d="M8.75 3.75a.75.75 0 0 0-1.5 0v3.5h-3.5a.75.75 0 0 0 0 1.5h3.5v3.5a.75.75 0 0 0 1.5 0v-3.5h3.5a.75.75 0 0 0 0-1.5h-3.5v-3.5Z" />
          </svg>
          New Design
        </button>
      )}
      <div className="ml-auto flex items-center gap-2">
        <ThemeToggle />
        <UserMenu />
      </div>
    </header>
  );
}
