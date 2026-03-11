"use client";

import { useState, useCallback, useEffect } from "react";
import AppShell from "@/components/layout/AppShell";
import ChatPanel from "@/components/chat/ChatPanel";
import PreviewPanel from "@/components/preview/PreviewPanel";
import { useConversation } from "@/hooks/useConversation";
import { usePreview } from "@/hooks/usePreview";
import {
  uploadPhoto,
  uploadStl,
  fetchStlFile,
  revertToVersion,
} from "@/lib/api";
import type { DesignHistoryEntry } from "@/lib/api";

export default function HomeClient() {
  const {
    conversationId,
    messages,
    isStreaming,
    currentDesign,
    setCurrentDesign,
    latestModification,
    costApproved,
    isApprovingCost,
    error,
    ensureConversation,
    sendMessage,
    reviseDesign,
    loadConversation,
    startNew,
    handleApproveCost,
    handleDeclineCost,
  } = useConversation();

  const {
    stlBytes,
    isLoading: previewLoading,
    error: previewError,
    regenerate,
  } = usePreview(currentDesign, { costApproved });

  // Bump to force sidebar refresh after mutations
  const [sidebarRefreshKey, setSidebarRefreshKey] = useState(0);

  const [photoError, setPhotoError] = useState<string | null>(null);
  const [uploadedStlBytes, setUploadedStlBytes] = useState<ArrayBuffer | null>(
    null,
  );

  // Before/after toggle state for STL modifications
  const [previousStlBytes, setPreviousStlBytes] = useState<ArrayBuffer | null>(
    null,
  );
  const [showingPrevious, setShowingPrevious] = useState(false);
  const [modificationDescription, setModificationDescription] = useState<
    string | null
  >(null);

  // When a modification arrives, fetch the new STL and store the old one
  useEffect(() => {
    if (!latestModification) return;

    const fetchModifiedStl = async () => {
      try {
        // Save the current STL as "previous" for before/after toggle
        const currentStl = uploadedStlBytes ?? stlBytes;
        if (currentStl) {
          setPreviousStlBytes(currentStl);
        }

        // Fetch the modified STL
        const modifiedBytes = await fetchStlFile(
          latestModification.stl_file_id,
        );
        setUploadedStlBytes(modifiedBytes);
        setModificationDescription(latestModification.description);
        setShowingPrevious(false);
      } catch {
        // Failed to fetch modified STL — preview stays on current
      }
    };

    fetchModifiedStl();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [latestModification]);

  const handleSend = useCallback(
    async (text: string, photo?: File, stlFile?: File) => {
      setPhotoError(null);
      let photoId: string | undefined;
      let stlFileId: string | undefined;

      const messageText = text || (stlFile ? "Uploaded an STL file" : "");

      if (photo) {
        try {
          const convId = await ensureConversation(messageText);
          const result = await uploadPhoto(convId, photo);
          photoId = result.id;
        } catch (err) {
          const msg =
            err instanceof Error ? err.message : "Photo upload failed";
          setPhotoError(msg);
        }
      }

      if (stlFile) {
        try {
          const convId = await ensureConversation(messageText);
          const result = await uploadStl(convId, stlFile);
          stlFileId = result.id;

          // Load STL into preview panel
          try {
            const stlBytes = await fetchStlFile(result.id);
            setUploadedStlBytes(stlBytes);
          } catch {
            // Preview will be unavailable but upload succeeded
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : "STL upload failed";
          setPhotoError(msg);
          return;
        }
      }

      if (currentDesign) {
        reviseDesign(text);
      } else {
        sendMessage(text, photoId, stlFileId);
      }
      // Refresh sidebar after a short delay to pick up new conversations
      setTimeout(() => setSidebarRefreshKey((k) => k + 1), 1500);
    },
    [ensureConversation, currentDesign, reviseDesign, sendMessage],
  );

  const handleSelectConversation = useCallback(
    (id: string) => {
      loadConversation(id);
    },
    [loadConversation],
  );

  // Version history
  const [versionHistoryRefreshKey, setVersionHistoryRefreshKey] = useState(0);

  const handleSelectVersion = useCallback(
    (entry: DesignHistoryEntry) => {
      // Preview this version's parameters without changing state permanently
      if (!currentDesign) return;
      setCurrentDesign({
        params: entry.parameters as import("@shared/api-types").DesignParams,
        id: entry.id,
        version: entry.version,
      });
    },
    [currentDesign, setCurrentDesign],
  );

  const handleRevertVersion = useCallback(
    async (entry: DesignHistoryEntry) => {
      if (!conversationId) return;
      try {
        const result = await revertToVersion(conversationId, entry.id);
        // Update current design with the new version (copy of reverted params)
        setCurrentDesign({
          params: result.parameters as import("@shared/api-types").DesignParams,
          id: result.design_id,
          version: result.version,
        });
        // Auto-approve cost for reverts (same parameters, no new LLM cost)
        // Trigger version history refresh
        setVersionHistoryRefreshKey((k) => k + 1);
      } catch {
        // Revert failed — keep current state
      }
    },
    [conversationId, setCurrentDesign],
  );

  const handleSuggestedModification = useCallback(
    (suggestion: string) => {
      if (currentDesign) {
        reviseDesign(suggestion);
      }
    },
    [currentDesign, reviseDesign],
  );

  const handleNewDesign = useCallback(() => {
    startNew();
    setUploadedStlBytes(null);
    setPreviousStlBytes(null);
    setShowingPrevious(false);
    setModificationDescription(null);
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
          error={photoError || error}
          hasDesign={!!currentDesign}
          onSend={handleSend}
          onStartNew={startNew}
          onApproveCost={handleApproveCost}
          onDeclineCost={handleDeclineCost}
          isApprovingCost={isApprovingCost}
          costApproved={costApproved}
          onSuggestedModification={handleSuggestedModification}
        />
      }
      previewPanel={
        <PreviewPanel
          stlBytes={
            showingPrevious ? previousStlBytes : (uploadedStlBytes ?? stlBytes)
          }
          isLoading={previewLoading}
          error={previewError}
          category={currentDesign?.params.category}
          params={currentDesign?.params as Record<string, unknown> | undefined}
          onRetry={regenerate}
          previousStlBytes={previousStlBytes}
          showingPrevious={showingPrevious}
          onToggleBeforeAfter={() => setShowingPrevious((v) => !v)}
          modificationDescription={modificationDescription}
          version={currentDesign?.version}
          conversationId={conversationId}
          onSelectVersion={handleSelectVersion}
          onRevertVersion={handleRevertVersion}
          versionHistoryRefreshKey={versionHistoryRefreshKey}
        />
      }
    />
  );
}
