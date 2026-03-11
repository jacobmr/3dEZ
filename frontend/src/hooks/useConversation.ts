"use client";

import { useState, useCallback, useRef } from "react";
import {
  createConversation,
  getConversation,
  streamMessage,
  streamRevision,
  getCostEstimate,
  approveCost,
} from "@/lib/api";
import type { DesignParams } from "@shared/api-types";
import type { CostEstimateData } from "@/lib/api";

export interface DimensionInference {
  reference_used: string;
  estimated_dimensions: {
    width_mm: number;
    height_mm: number;
    depth_mm?: number;
  };
  confidence: "high" | "medium" | "low";
  notes: string;
}

export interface StlAnalysis {
  stl_file_id: string;
  dimensions: {
    width_mm: number;
    height_mm: number;
    depth_mm: number;
  };
  face_count: number;
  is_watertight: boolean;
  suggested_modifications: string[];
}

export interface StlModification {
  stl_file_id: string;
  original_stl_file_id: string;
  modification_type: "add_feature" | "cut_hole" | "trim";
  description: string;
  dimensions: {
    width_mm: number;
    height_mm: number;
    depth_mm: number;
  };
  face_count: number;
  is_watertight: boolean;
}

export interface ParameterDiffData {
  previous: Record<string, unknown>;
  current: Record<string, unknown>;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  /** Photo ID attached to user message */
  photoId?: string;
  /** STL file ID attached to user message */
  stlFileId?: string;
  /** Dimension inference data from infer_dimensions tool */
  dimensionInference?: DimensionInference;
  /** STL analysis data from analyze_imported_stl tool */
  stlAnalysis?: StlAnalysis;
  /** STL modification data from modify_stl tool */
  stlModification?: StlModification;
  /** Cost estimate data shown before generation */
  costEstimate?: CostEstimateData;
  /** Parameter diff for revision designs (version > 1) */
  parameterDiff?: ParameterDiffData;
}

export interface ConversationState {
  conversationId: string | null;
  messages: ChatMessage[];
  isStreaming: boolean;
  currentDesign: { params: DesignParams; id: string; version: number } | null;
  error: string | null;
}

let messageCounter = 0;
function nextId(): string {
  return `msg-${Date.now()}-${++messageCounter}`;
}

export function useConversation() {
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentDesign, setCurrentDesign] = useState<{
    params: DesignParams;
    id: string;
    version: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [latestModification, setLatestModification] =
    useState<StlModification | null>(null);
  const [costEstimate, setCostEstimate] = useState<CostEstimateData | null>(
    null,
  );
  const [costApproved, setCostApproved] = useState(false);
  const [isApprovingCost, setIsApprovingCost] = useState(false);

  // Ref to allow aborting mid-stream (future use)
  const abortRef = useRef(false);

  const processStream = useCallback(
    async (stream: AsyncGenerator<{ type: string; data: string }>) => {
      const assistantId = nextId();
      let costAutoApproved = false;
      setMessages((prev) => [
        ...prev,
        { id: assistantId, role: "assistant", content: "" },
      ]);

      for await (const event of stream) {
        if (abortRef.current) break;

        switch (event.type) {
          case "text": {
            let text = event.data;
            try {
              const parsed = JSON.parse(event.data);
              if (parsed.content) text = parsed.content;
            } catch {
              // plain text fallback
            }
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId ? { ...m, content: m.content + text } : m,
              ),
            );
            break;
          }

          case "parameters_extracted": {
            try {
              const parsed = JSON.parse(event.data);
              setCurrentDesign({
                params: parsed.parameters ?? parsed,
                id: parsed.design_id ?? "",
                version: parsed.version ?? 1,
              });
              // For revisions with same category, auto-approve cost
              // (no new conversation tokens needed -- just re-generate)
              if (parsed.is_revision && !parsed.category_changed) {
                setCostEstimate(null);
                setCostApproved(true);
                costAutoApproved = true;
              } else {
                // Reset cost state for first generation or category change
                setCostEstimate(null);
                setCostApproved(false);
              }

              // Attach parameter diff for revisions
              if (parsed.is_revision && parsed.previous_parameters) {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantId
                      ? {
                          ...m,
                          parameterDiff: {
                            previous: parsed.previous_parameters,
                            current: parsed.parameters,
                          },
                        }
                      : m,
                  ),
                );
              }
            } catch {
              // Ignore malformed design data
            }
            break;
          }

          case "cost_estimate": {
            // Skip cost display if auto-approved (parameter-only revision)
            if (costAutoApproved) break;

            try {
              const costData: CostEstimateData = JSON.parse(event.data);
              setCostEstimate(costData);
              setCostApproved(false);
              // Attach cost estimate to the assistant message
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId ? { ...m, costEstimate: costData } : m,
                ),
              );
            } catch {
              // Ignore malformed cost data
            }
            break;
          }

          case "dimension_inference": {
            try {
              const dimData = JSON.parse(event.data);
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId
                    ? { ...m, dimensionInference: dimData }
                    : m,
                ),
              );
            } catch {
              // Ignore malformed dimension data
            }
            break;
          }

          case "stl_analysis": {
            try {
              const stlData = JSON.parse(event.data);
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId ? { ...m, stlAnalysis: stlData } : m,
                ),
              );
            } catch {
              // Ignore malformed STL analysis data
            }
            break;
          }

          case "stl_modified": {
            try {
              const modData: StlModification = JSON.parse(event.data);
              setLatestModification(modData);
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId ? { ...m, stlModification: modData } : m,
                ),
              );
            } catch {
              // Ignore malformed modification data
            }
            break;
          }

          case "clarification": {
            let clarText = event.data;
            try {
              const parsed = JSON.parse(event.data);
              if (parsed.question) clarText = parsed.question;
            } catch {
              // plain text fallback
            }
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId
                  ? { ...m, content: m.content + clarText }
                  : m,
              ),
            );
            break;
          }

          case "error": {
            let errMsg = event.data;
            try {
              const parsed = JSON.parse(event.data);
              if (parsed.message) errMsg = parsed.message;
            } catch {
              // plain text fallback
            }
            setError(errMsg);
            break;
          }

          case "done":
            // Stream finished
            break;
        }
      }
    },
    [],
  );

  /** Create conversation if none exists yet. Returns the conversation ID. */
  const ensureConversation = useCallback(
    async (text: string): Promise<string> => {
      if (conversationId) return conversationId;
      const created = await createConversation(text);
      setConversationId(created.conversation_id);
      return created.conversation_id;
    },
    [conversationId],
  );

  const sendMessage = useCallback(
    async (text: string, photoId?: string, stlFileId?: string) => {
      if (isStreaming || (!text.trim() && !stlFileId)) return;

      setError(null);
      setIsStreaming(true);
      abortRef.current = false;

      try {
        const convId = await ensureConversation(text || "Uploaded an STL file");

        // Add user message
        setMessages((prev) => [
          ...prev,
          {
            id: nextId(),
            role: "user",
            content: text || "Uploaded an STL file for analysis",
            ...(photoId && { photoId }),
            ...(stlFileId && { stlFileId }),
          },
        ]);

        // Stream assistant response
        const stream = streamMessage(
          convId,
          text || "Please analyze the uploaded STL file.",
          photoId,
          stlFileId,
        );
        await processStream(stream);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to send message");
      } finally {
        setIsStreaming(false);
      }
    },
    [isStreaming, ensureConversation, processStream],
  );

  const reviseDesign = useCallback(
    async (text: string) => {
      if (isStreaming || !conversationId || !text.trim()) return;

      setError(null);
      setIsStreaming(true);
      abortRef.current = false;

      try {
        setMessages((prev) => [
          ...prev,
          { id: nextId(), role: "user", content: text },
        ]);

        const stream = streamRevision(conversationId, text);
        await processStream(stream);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to revise design",
        );
      } finally {
        setIsStreaming(false);
      }
    },
    [conversationId, isStreaming, processStream],
  );

  const loadConversation = useCallback(async (id: string) => {
    setError(null);
    try {
      const detail = await getConversation(id);
      setConversationId(id);
      setMessages(
        detail.messages.map((m) => ({
          id: nextId(),
          role: m.role,
          content: m.content,
        })),
      );
      if (detail.latest_design) {
        setCurrentDesign({
          params: detail.latest_design.parameters,
          id: detail.latest_design.id,
          version: detail.latest_design.version ?? 1,
        });
      } else {
        setCurrentDesign(null);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load conversation",
      );
    }
  }, []);

  const handleApproveCost = useCallback(async () => {
    if (!conversationId || isApprovingCost) return;
    setIsApprovingCost(true);
    try {
      await approveCost(conversationId);
      setCostApproved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to approve cost");
    } finally {
      setIsApprovingCost(false);
    }
  }, [conversationId, isApprovingCost]);

  const handleDeclineCost = useCallback(() => {
    // Clear cost estimate so user can keep editing
    setCostEstimate(null);
    setCostApproved(false);
    // Remove cost estimate from the last assistant message
    setMessages((prev) =>
      prev.map((m) => (m.costEstimate ? { ...m, costEstimate: undefined } : m)),
    );
  }, []);

  const startNew = useCallback(() => {
    setConversationId(null);
    setMessages([]);
    setCurrentDesign(null);
    setLatestModification(null);
    setCostEstimate(null);
    setCostApproved(false);
    setIsApprovingCost(false);
    setError(null);
    setIsStreaming(false);
  }, []);

  return {
    conversationId,
    messages,
    isStreaming,
    currentDesign,
    latestModification,
    costEstimate,
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
  };
}
