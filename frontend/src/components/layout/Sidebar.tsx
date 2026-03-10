"use client";

import { useEffect } from "react";
import DesignsList from "@/components/designs/DesignsList";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  activeConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onNewDesign: () => void;
  refreshKey?: number;
}

export default function Sidebar({
  isOpen,
  onClose,
  activeConversationId,
  onSelectConversation,
  onNewDesign,
  refreshKey,
}: SidebarProps) {
  // Close on Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (isOpen) {
      document.addEventListener("keydown", handleKey);
      return () => document.removeEventListener("keydown", handleKey);
    }
  }, [isOpen, onClose]);

  const sidebarContent = (
    <div className="flex h-full flex-col bg-gray-50 dark:bg-zinc-950">
      <div className="flex items-center justify-between border-b border-gray-200 px-3 py-2 dark:border-zinc-800">
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-zinc-400">
          Designs
        </span>
        <button
          onClick={() => {
            onNewDesign();
            onClose();
          }}
          className="rounded bg-indigo-600 px-2 py-1 text-xs font-medium text-white transition-colors hover:bg-indigo-500"
        >
          + New
        </button>
      </div>
      <div className="flex-1 overflow-y-auto">
        <DesignsList
          activeConversationId={activeConversationId}
          onSelect={(id) => {
            onSelectConversation(id);
            onClose();
          }}
          refreshKey={refreshKey}
        />
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar — always visible */}
      <div className="hidden w-[200px] shrink-0 border-r border-gray-200 lg:block dark:border-zinc-800">
        {sidebarContent}
      </div>

      {/* Mobile overlay */}
      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/60 lg:hidden"
            onClick={onClose}
          />
          <div className="fixed inset-y-0 left-0 z-50 w-[260px] lg:hidden">
            {sidebarContent}
          </div>
        </>
      )}
    </>
  );
}
