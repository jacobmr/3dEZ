"use client";

import { useState, useCallback } from "react";
import AppShell from "@/components/layout/AppShell";
import ChatPanel from "@/components/chat/ChatPanel";
import { useConversation } from "@/hooks/useConversation";

export default function HomeClient() {
  const {
    conversationId,
    messages,
    isStreaming,
    currentDesign,
    error,
    sendMessage,
    reviseDesign,
    loadConversation,
    startNew,
  } = useConversation();

  // Bump to force sidebar refresh after mutations
  const [sidebarRefreshKey, setSidebarRefreshKey] = useState(0);

  const handleSend = useCallback(
    (text: string) => {
      if (currentDesign) {
        reviseDesign(text);
      } else {
        sendMessage(text);
      }
      // Refresh sidebar after a short delay to pick up new conversations
      setTimeout(() => setSidebarRefreshKey((k) => k + 1), 1500);
    },
    [currentDesign, reviseDesign, sendMessage],
  );

  const handleSelectConversation = useCallback(
    (id: string) => {
      loadConversation(id);
    },
    [loadConversation],
  );

  const handleNewDesign = useCallback(() => {
    startNew();
  }, [startNew]);

  return (
    <AppShell
      activeConversationId={conversationId}
      onSelectConversation={handleSelectConversation}
      onNewDesign={handleNewDesign}
      sidebarRefreshKey={sidebarRefreshKey}
      conversationPanel={
        <ChatPanel
          messages={messages}
          isStreaming={isStreaming}
          error={error}
          hasDesign={!!currentDesign}
          onSend={handleSend}
          onStartNew={startNew}
        />
      }
      previewPanel={
        <div className="flex h-full flex-col border-t border-zinc-800 lg:border-l lg:border-t-0">
          <div className="border-b border-zinc-800 px-4 py-2">
            <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
              Preview
            </span>
          </div>
          {currentDesign ? (
            <div className="flex-1 overflow-y-auto p-4">
              <div className="mb-2 text-sm font-medium text-zinc-200">
                Extracted Parameters
              </div>
              <pre className="overflow-x-auto rounded-lg bg-zinc-900 p-3 text-xs text-zinc-300">
                {JSON.stringify(currentDesign.params, null, 2)}
              </pre>
            </div>
          ) : (
            <div className="flex flex-1 items-center justify-center p-6 text-center text-zinc-500">
              <div>
                <div className="mb-2 text-3xl">&#9651;</div>
                <p className="text-sm">Preview coming in Phase 4</p>
              </div>
            </div>
          )}
        </div>
      }
    />
  );
}
