'use client';

import { useCallback, useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { MemorySearchBar } from './MemorySearchBar';
import { MemoryFilterPanel } from './MemoryFilterPanel';
import { MemoryTimeline } from './MemoryTimeline';
import type { MemoryChunk } from './MemoryItem';

const c = {
  bg: '#1B1F3A',
  surface: 'rgba(45,45,45,0.04)',
  surfaceHover: 'rgba(45,45,45,0.06)',
  surfaceElevated: 'rgba(45,45,45,0.06)',
  border: 'rgba(45,45,45,0.08)',
  borderHover: 'rgba(45,45,45,0.16)',
  dawn: '#E8845C',
  dawnMuted: 'rgba(232,132,92,0.15)',
  dawnBorder: 'rgba(232,132,92,0.25)',
  text: '#2D2D2D',
  textSecondary: 'rgba(45,45,45,0.8)',
  textTertiary: 'rgba(45,45,45,0.6)',
  textMuted: 'rgba(45,45,45,0.5)',
  textGhost: 'rgba(45,45,45,0.4)',
  critical: '#D64B2A',
  success: '#52B788',
  info: '#4E7DAA',
};

function SkeletonCard() {
  return (
    <div
      className="rounded-xl p-4 animate-pulse"
      style={{
        backgroundColor: c.surface,
        border: `1px solid ${c.border}`,
      }}
    >
      <div className="flex items-center gap-2.5">
        <div
          className="w-4 h-4 rounded"
          style={{ backgroundColor: c.surfaceElevated }}
        />
        <div
          className="h-4 rounded flex-1 max-w-[200px]"
          style={{ backgroundColor: c.surfaceElevated }}
        />
      </div>
      <div
        className="mt-3 h-3 rounded w-full"
        style={{ backgroundColor: c.surfaceElevated }}
      />
      <div
        className="mt-2 h-3 rounded w-3/4"
        style={{ backgroundColor: c.surfaceElevated }}
      />
      <div className="mt-3 flex gap-1.5">
        <div
          className="h-5 w-12 rounded-full"
          style={{ backgroundColor: c.surfaceElevated }}
        />
        <div
          className="h-5 w-16 rounded-full"
          style={{ backgroundColor: c.surfaceElevated }}
        />
      </div>
    </div>
  );
}

export function MemoryExplorer() {
  const [query, setQuery] = useState('');
  const [activeType, setActiveType] = useState<string | null>(null);
  const [chunks, setChunks] = useState<MemoryChunk[]>([]);
  const [loading, setLoading] = useState(true);
  const [resultCount, setResultCount] = useState<number | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  const fetchChunks = useCallback(async (q: string, type: string | null) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (q) params.set('q', q);
      if (type) params.set('type', type);
      const res = await fetch(`/api/context/search?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch memory data');
      const data = await res.json();
      setChunks(data.chunks ?? []);
      setResultCount(data.totalMatches ?? data.chunks?.length ?? 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setChunks([]);
      setResultCount(undefined);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchChunks(query, activeType);
  }, [query, activeType, fetchChunks]);

  const handleSearch = useCallback((q: string) => {
    setQuery(q);
  }, []);

  const handleTypeChange = useCallback((type: string | null) => {
    setActiveType(type);
  }, []);

  const handleRetry = () => {
    fetchChunks(query, activeType);
  };

  return (
    <div className="flex flex-col gap-5 w-full max-w-3xl mx-auto px-4 py-6">
      <div>
        <h1 className="text-[22px] font-semibold mb-1" style={{ color: c.text }}>
          Memory Explorer
        </h1>
        <p className="text-[13px]" style={{ color: c.textTertiary }}>
          Search across everything Donna has seen
        </p>
      </div>

      <MemorySearchBar onSearch={handleSearch} resultCount={query ? resultCount : undefined} />
      <MemoryFilterPanel activeType={activeType} onTypeChange={handleTypeChange} />

      {loading && (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      )}

      {error && !loading && (
        <div
          className="rounded-xl p-6 flex flex-col items-center gap-3 text-center"
          style={{
            backgroundColor: c.surface,
            border: `1px solid ${c.border}`,
          }}
        >
          <p className="text-[14px]" style={{ color: c.critical }}>
            {error}
          </p>
          <button
            onClick={handleRetry}
            className="flex items-center gap-2 rounded-lg px-4 py-2 text-[13px] font-medium transition-colors"
            style={{
              backgroundColor: c.dawnMuted,
              color: c.dawn,
              border: `1px solid ${c.dawnBorder}`,
            }}
          >
            <RefreshCw size={14} />
            Retry
          </button>
        </div>
      )}

      {!loading && !error && chunks.length === 0 && (
        <div
          className="rounded-xl p-8 flex flex-col items-center gap-2 text-center"
          style={{
            backgroundColor: c.surface,
            border: `1px solid ${c.border}`,
          }}
        >
          <p className="text-[15px] font-medium" style={{ color: c.textSecondary }}>
            No memories found
          </p>
          <p className="text-[13px] max-w-xs" style={{ color: c.textMuted }}>
            Try a different search term or connect more integrations in Settings to
            expand your memory.
          </p>
        </div>
      )}

      {!loading && !error && chunks.length > 0 && (
        <MemoryTimeline chunks={chunks} />
      )}
    </div>
  );
}
