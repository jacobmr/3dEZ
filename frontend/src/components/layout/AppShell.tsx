"use client";

import { useState, useCallback } from "react";
import Header from "./Header";
import Sidebar from "./Sidebar";

type MobileTab = "chat" | "preview";

interface AppShellProps {
  conversationPanel: React.ReactNode;
  previewPanel: React.ReactNode;
  activeConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onNewDesign: () => void;
  sidebarRefreshKey?: number;
  /** Whether a design/STL is available for preview. */
  hasPreview?: boolean;
}

export default function AppShell({
  conversationPanel,
  previewPanel,
  activeConversationId,
  onSelectConversation,
  onNewDesign,
  sidebarRefreshKey,
  hasPreview = false,
}: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mobileTab, setMobileTab] = useState<MobileTab>("chat");

  const handleMenuClick = useCallback(() => {
    setSidebarOpen((prev) => !prev);
  }, []);

  const handleCloseSidebar = useCallback(() => {
    setSidebarOpen(false);
  }, []);

  return (
    <div className="flex h-screen flex-col">
      <Header onMenuClick={handleMenuClick} onNewDesign={onNewDesign} />

      {/* Mobile tab bar (<768px) */}
      <div className="flex border-b border-gray-200 dark:border-zinc-800 md:hidden">
        <button
          onClick={() => setMobileTab("chat")}
          className={`flex-1 px-4 py-2.5 text-xs font-medium uppercase tracking-wider transition-colors ${
            mobileTab === "chat"
              ? "border-b-2 border-indigo-500 text-indigo-600 dark:text-indigo-400"
              : "text-gray-500 dark:text-zinc-400"
          }`}
        >
          Design
        </button>
        <button
          onClick={() => setMobileTab("preview")}
          className={`flex-1 px-4 py-2.5 text-xs font-medium uppercase tracking-wider transition-colors ${
            mobileTab === "preview"
              ? "border-b-2 border-indigo-500 text-indigo-600 dark:text-indigo-400"
              : "text-gray-500 dark:text-zinc-400"
          }`}
        >
          Preview
        </button>
      </div>

      <div className="flex min-h-0 flex-1">
        <Sidebar
          isOpen={sidebarOpen}
          onClose={handleCloseSidebar}
          activeConversationId={activeConversationId}
          onSelectConversation={onSelectConversation}
          onNewDesign={onNewDesign}
          refreshKey={sidebarRefreshKey}
        />

        {/* Desktop (>=768px): side-by-side 40/60 split */}
        <div className="hidden min-h-0 flex-1 md:flex md:flex-row">
          <div className="flex-1 overflow-y-auto md:w-2/5 md:flex-none">
            {conversationPanel}
          </div>
          <div className="flex-1 overflow-y-auto md:w-3/5 md:flex-none">
            {previewPanel}
          </div>
        </div>

        {/* Mobile (<768px): tab-switched full-height panels */}
        <div className="relative flex min-h-0 flex-1 flex-col md:hidden">
          <div
            className={`absolute inset-0 overflow-y-auto ${mobileTab === "chat" ? "z-10" : "pointer-events-none z-0 opacity-0"}`}
          >
            {conversationPanel}
          </div>
          <div
            className={`absolute inset-0 overflow-y-auto ${mobileTab === "preview" ? "z-10" : "pointer-events-none z-0 opacity-0"}`}
          >
            {previewPanel}
          </div>

          {/* Floating "View Preview" button when in chat mode and preview is available */}
          {mobileTab === "chat" && hasPreview && (
            <button
              onClick={() => setMobileTab("preview")}
              className="absolute bottom-20 right-4 z-20 flex items-center gap-2 rounded-full bg-indigo-600 px-4 py-3 text-sm font-medium text-white shadow-lg transition-transform active:scale-95"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="h-4 w-4"
                aria-hidden="true"
              >
                <path d="M10 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" />
                <path
                  fillRule="evenodd"
                  d="M.664 10.59a1.651 1.651 0 0 1 0-1.186A10.004 10.004 0 0 1 10 3c4.257 0 7.893 2.66 9.336 6.41.147.381.146.804 0 1.186A10.004 10.004 0 0 1 10 17c-4.257 0-7.893-2.66-9.336-6.41ZM14 10a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z"
                  clipRule="evenodd"
                />
              </svg>
              View Preview
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
