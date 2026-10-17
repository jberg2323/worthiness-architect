import { useState, useEffect } from 'react';

// Entries live in this browser's localStorage only; there's no server-side database.
// Items marked `ephemeral` (added while saving is off) stay in memory and are never written.
export const readStored = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};

export const writeStored = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage unavailable (private window, quota); data lasts for this session only
  }
};

export function useStoredCollection(name, saveEnabled, initialItems = []) {
  const key = `wa-${name}`;
  const [items, setItems] = useState(() => readStored(key, initialItems));

  useEffect(() => {
    writeStored(key, items.filter(item => !item.ephemeral));
  }, [key, items]);

  const add = (data) => {
    const id = `${name}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setItems(prev => [{ id, ...data, ...(saveEnabled ? {} : { ephemeral: true }) }, ...prev]);
    return id;
  };

  const update = (id, patch) => {
    setItems(prev => prev.map(item => (item.id === id ? { ...item, ...patch } : item)));
  };

  const remove = (id) => {
    setItems(prev => prev.filter(item => item.id !== id));
  };

  const removeAll = () => setItems([]);

  return { items, add, update, remove, removeAll };
}
