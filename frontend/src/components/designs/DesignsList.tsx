"use client";

import { useState, useEffect, useCallback } from "react";
import { listDesigns, deleteConversation, duplicateDesign } from "@/lib/api";
import type { SavedDesign } from "@shared/api-types";
import DesignCard from "./DesignCard";

const CATEGORIES = [
  { value: "", label: "All" },
  { value: "mounting_bracket", label: "Brackets" },
  { value: "enclosure", label: "Enclosures" },
  { value: "organizer", label: "Organizers" },
];

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
  const [designs, setDesigns] = useState<SavedDesign[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("");
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const list = await listDesigns({
        category: category || undefined,
        search: search || undefined,
      });
      setDesigns(list);
    } catch {
      // silently fail — sidebar is non-critical
    } finally {
      setLoading(false);
    }
  }, [category, search]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  // Debounce search
  const [searchInput, setSearchInput] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const handleDelete = useCallback(async (design: SavedDesign) => {
    const confirmed = window.confirm(
      "Delete this design? This cannot be undone.",
    );
    if (!confirmed) return;

    try {
      await deleteConversation(design.conversation_id);
      setDesigns((prev) => prev.filter((d) => d.id !== design.id));
    } catch {
      // ignore
    }
  }, []);

  const handleDuplicate = useCallback(
    async (design: SavedDesign) => {
      try {
        const dup = await duplicateDesign(design.id);
        // Add to list and navigate to new conversation
        setDesigns((prev) => [dup, ...prev]);
        onSelect(dup.conversation_id);
      } catch {
        // ignore
      }
    },
    [onSelect],
  );

  return (
    <div className="flex h-full flex-col">
      {/* Search */}
      <div className="px-2 pt-2">
        <input
          type="text"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search designs..."
          className="w-full rounded border border-gray-200 bg-white px-2 py-1 text-xs text-gray-700 placeholder-gray-400 focus:border-indigo-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:placeholder-zinc-500"
        />
      </div>

      {/* Category tabs */}
      <div className="flex gap-1 overflow-x-auto px-2 pt-2 pb-1">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.value}
            onClick={() => setCategory(cat.value)}
            className={`whitespace-nowrap rounded px-2 py-0.5 text-[10px] font-medium transition-colors ${
              category === cat.value
                ? "bg-indigo-600 text-white"
                : "bg-gray-200 text-gray-600 hover:bg-gray-300 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Design list */}
      <div className="flex-1 overflow-y-auto">
        {loading && designs.length === 0 ? (
          <div className="p-4 text-center text-xs text-gray-400 dark:text-zinc-500">
            Loading...
          </div>
        ) : designs.length === 0 ? (
          <div className="p-4 text-center text-xs text-gray-400 dark:text-zinc-500">
            {search || category
              ? "No matching designs"
              : "No designs yet. Start a conversation!"}
          </div>
        ) : (
          <div className="space-y-1 p-2">
            {designs.map((design) => (
              <DesignCard
                key={design.id}
                design={design}
                isActive={design.conversation_id === activeConversationId}
                onClick={() => onSelect(design.conversation_id)}
                onDelete={() => handleDelete(design)}
                onDuplicate={() => handleDuplicate(design)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
