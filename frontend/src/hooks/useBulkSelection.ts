"use client";

import { useCallback, useMemo, useState } from "react";

function toKey(id: string | number): string {
  return String(id);
}

export function useBulkSelection<T>(items: T[], getId: (item: T) => string | number) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const pageKeys = useMemo(() => items.map((item) => toKey(getId(item))), [items, getId]);

  const toggle = useCallback((id: string | number) => {
    const key = toKey(id);
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelected(new Set(pageKeys));
  }, [pageKeys]);

  const clear = useCallback(() => {
    setSelected(new Set());
  }, []);

  const isSelected = useCallback((id: string | number) => selected.has(toKey(id)), [selected]);

  const isAllSelected = pageKeys.length > 0 && pageKeys.every((key) => selected.has(key));
  const isSomeSelected = pageKeys.some((key) => selected.has(key)) && !isAllSelected;
  const selectedCount = selected.size;

  const selectedIds = useMemo(() => Array.from(selected), [selected]);

  return {
    toggle,
    selectAll,
    clear,
    isSelected,
    isAllSelected,
    isSomeSelected,
    selectedCount,
    selectedIds,
  };
}
