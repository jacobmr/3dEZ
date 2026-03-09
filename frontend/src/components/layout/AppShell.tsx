"use client";

import { useState, useCallback } from "react";
import Header from "./Header";
import Sidebar from "./Sidebar";

interface AppShellProps {
  conversationPanel: React.ReactNode;
  previewPanel: React.ReactNode;
  activeConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onNewDesign: () => void;
  sidebarRefreshKey?: number;
}

export default function AppShell({
  conversationPanel,
  previewPanel,
  activeConversationId,
  onSelectConversation,
  onNewDesign,
  sidebarRefreshKey,
}: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleMenuClick = useCallback(() => {
    setSidebarOpen((prev) => !prev);
  }, []);

  const handleCloseSidebar = useCallback(() => {
    setSidebarOpen(false);
  }, []);

  return (
    <div className="flex h-screen flex-col">
      <Header onMenuClick={handleMenuClick} />
      {/* Mobile: stacked single column. Desktop (>=1024px): sidebar + two-column side-by-side */}
      <div className="flex min-h-0 flex-1">
        <Sidebar
          isOpen={sidebarOpen}
          onClose={handleCloseSidebar}
          activeConversationId={activeConversationId}
          onSelectConversation={onSelectConversation}
          onNewDesign={onNewDesign}
          refreshKey={sidebarRefreshKey}
        />
        <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
          <div className="flex-1 overflow-y-auto lg:w-2/5 lg:flex-none">
            {conversationPanel}
          </div>
          <div className="flex-1 overflow-y-auto lg:w-3/5 lg:flex-none">
            {previewPanel}
          </div>
        </div>
      </div>
    </div>
  );
}
