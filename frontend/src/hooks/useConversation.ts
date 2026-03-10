"use client";

import { useState, useCallback, useRef } from "react";
import {
  createConversation,
  getConversation,
  streamMessage,
  streamRevision,
} from "@/lib/api";
import type { DesignParams } from "@shared/api-types";

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

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  /** Photo ID attached to user message */
  photoId?: string;
  /** Dimension inference data from infer_dimensions tool */
  dimensionInference?: DimensionInference;
}

export interface ConversationState {
  conversationId: string | null;
  messages: ChatMessage[];
  isStreaming: boolean;
  currentDesign: { params: DesignParams; id: string } | null;
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
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Ref to allow aborting mid-stream (future use)
  const abortRef = useRef(false);

  const processStream = useCallback(
    async (stream: AsyncGenerator<{ type: string; data: string }>) => {
      const assistantId = nextId();
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
              });
            } catch {
              // Ignore malformed design data
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
    async (text: string, photoId?: string) => {
      if (isStreaming || !text.trim()) return;

      setError(null);
      setIsStreaming(true);
      abortRef.current = false;

      try {
        const convId = await ensureConversation(text);

        // Add user message
        setMessages((prev) => [
          ...prev,
          {
            id: nextId(),
            role: "user",
            content: text,
            ...(photoId && { photoId }),
          },
        ]);

        // Stream assistant response
        const stream = streamMessage(convId, text, photoId);
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

  const startNew = useCallback(() => {
    setConversationId(null);
    setMessages([]);
    setCurrentDesign(null);
    setError(null);
    setIsStreaming(false);
  }, []);

  return {
    conversationId,
    messages,
    isStreaming,
    currentDesign,
    error,
    ensureConversation,
    sendMessage,
    reviseDesign,
    loadConversation,
    startNew,
  };
}
