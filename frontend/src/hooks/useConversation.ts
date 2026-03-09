"use client";

import { useState, useCallback, useRef } from "react";
import {
  createConversation,
  getConversation,
  streamMessage,
  streamRevision,
} from "@/lib/api";
import type { DesignParams } from "@shared/api-types";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
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
          case "text":
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId
                  ? { ...m, content: m.content + event.data }
                  : m,
              ),
            );
            break;

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

          case "clarification":
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId
                  ? { ...m, content: m.content + event.data }
                  : m,
              ),
            );
            break;

          case "error":
            setError(event.data);
            break;

          case "done":
            // Stream finished
            break;
        }
      }
    },
    [],
  );

  const sendMessage = useCallback(
    async (text: string, photoId?: string) => {
      if (isStreaming || !text.trim()) return;

      setError(null);
      setIsStreaming(true);
      abortRef.current = false;

      try {
        let convId = conversationId;

        // If no active conversation, create one first
        if (!convId) {
          const created = await createConversation(text);
          convId = created.conversation_id;
          setConversationId(convId);
        }

        // Add user message
        setMessages((prev) => [
          ...prev,
          { id: nextId(), role: "user", content: text },
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
    [conversationId, isStreaming, processStream],
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
    sendMessage,
    reviseDesign,
    loadConversation,
    startNew,
  };
}
