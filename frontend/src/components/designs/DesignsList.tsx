"use client";

import { useState, useEffect, useCallback } from "react";
import { listConversations, deleteConversation } from "@/lib/api";
import type { ConversationSummary } from "@shared/api-types";
import DesignCard from "./DesignCard";

interface DesignsListProps {
  activeConversationId: string | null;
  onSelect: (id: string) => void;
  /** Bumped externally to force a refresh */
  refreshKey?: number;
}

export default function DesignsList({
  activeConversationId,
  onSelect,
  refreshKey,
}: DesignsListProps) {
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const list = await listConversations();
      setConversations(list);
    } catch {
      // silently fail — sidebar is non-critical
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  const handleDelete = useCallback(async (id: string) => {
    const confirmed = window.confirm(
      "Delete this conversation? This cannot be undone.",
    );
    if (!confirmed) return;

    try {
      await deleteConversation(id);
      setConversations((prev) => prev.filter((c) => c.id !== id));
    } catch {
      // ignore
    }
  }, []);

  if (loading && conversations.length === 0) {
    return (
      <div className="p-4 text-center text-xs text-zinc-500">Loading...</div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="p-4 text-center text-xs text-zinc-500">
        No designs yet. Start a conversation!
      </div>
    );
  }

  return (
    <div className="space-y-1 p-2">
      {conversations.map((conv) => (
        <DesignCard
          key={conv.id}
          conversation={conv}
          isActive={conv.id === activeConversationId}
          onClick={() => onSelect(conv.id)}
          onDelete={() => handleDelete(conv.id)}
        />
      ))}
    </div>
  );
}
