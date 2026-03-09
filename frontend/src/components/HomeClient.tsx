"use client";

import { useState, useCallback } from "react";
import AppShell from "@/components/layout/AppShell";
import ChatPanel from "@/components/chat/ChatPanel";
import PreviewPanel from "@/components/preview/PreviewPanel";
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
        <PreviewPanel stlBytes={null} isLoading={false} error={null} />
      }
    />
  );
}
