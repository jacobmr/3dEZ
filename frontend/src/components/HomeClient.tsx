"use client";

import { useState, useCallback } from "react";
import AppShell from "@/components/layout/AppShell";
import ChatPanel from "@/components/chat/ChatPanel";
import PreviewPanel from "@/components/preview/PreviewPanel";
import { useConversation } from "@/hooks/useConversation";
import { usePreview } from "@/hooks/usePreview";
import { uploadPhoto } from "@/lib/api";

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

  const {
    stlBytes,
    isLoading: previewLoading,
    error: previewError,
    regenerate,
  } = usePreview(currentDesign);

  // Bump to force sidebar refresh after mutations
  const [sidebarRefreshKey, setSidebarRefreshKey] = useState(0);

  const handleSend = useCallback(
    async (text: string, photo?: File) => {
      let photoId: string | undefined;

      // If photo is attached and we have a conversation, upload it first
      if (photo && conversationId) {
        try {
          const result = await uploadPhoto(conversationId, photo);
          photoId = result.id;
        } catch {
          // Photo upload failed — still send the text message
        }
      }

      if (currentDesign) {
        reviseDesign(text);
      } else {
        sendMessage(text, photoId);
      }
      // Refresh sidebar after a short delay to pick up new conversations
      setTimeout(() => setSidebarRefreshKey((k) => k + 1), 1500);
    },
    [conversationId, currentDesign, reviseDesign, sendMessage],
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
        <PreviewPanel
          stlBytes={stlBytes}
          isLoading={previewLoading}
          error={previewError}
          category={currentDesign?.params.category}
          params={currentDesign?.params as Record<string, unknown> | undefined}
          onRetry={regenerate}
        />
      }
    />
  );
}
