"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { AuthModal } from "./AuthModal";
import { UsagePanel } from "./UsagePanel";

export function UserMenu() {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [showUsage, setShowUsage] = useState(false);

  if (isLoading) return null;

  if (!isAuthenticated) {
    return (
      <>
        <button
          onClick={() => setShowUsage(true)}
          className="rounded-md px-2 py-1 text-xs text-gray-400 transition-colors hover:text-white"
          title="Usage stats"
        >
          Usage
        </button>
        <button
          onClick={() => setShowModal(true)}
          className="rounded-md border border-gray-600 px-3 py-1 text-xs font-medium text-gray-300 transition-colors hover:border-gray-400 hover:text-white"
        >
          Sign In
        </button>
        {showModal && <AuthModal onClose={() => setShowModal(false)} />}
        {showUsage && <UsagePanel onClose={() => setShowUsage(false)} />}
      </>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="hidden text-xs text-gray-400 sm:inline">
        {user?.email}
      </span>
      <button
        onClick={() => setShowUsage(true)}
        className="rounded-md px-2 py-1 text-xs text-gray-400 transition-colors hover:text-white"
        title="Usage stats"
      >
        Usage
      </button>
      <button
        onClick={logout}
        className="rounded-md px-2 py-1 text-xs text-gray-400 transition-colors hover:text-white"
      >
        Sign Out
      </button>
      {showUsage && <UsagePanel onClose={() => setShowUsage(false)} />}
    </div>
  );
}
