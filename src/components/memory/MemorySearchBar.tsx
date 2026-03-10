'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';

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

interface MemorySearchBarProps {
  onSearch: (query: string) => void;
  resultCount?: number;
}

export function MemorySearchBar({ onSearch, resultCount }: MemorySearchBarProps) {
  const [value, setValue] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const debouncedSearch = useCallback(
    (query: string) => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      debounceRef.current = setTimeout(() => {
        onSearch(query);
      }, 300);
    },
    [onSearch]
  );

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setValue(newValue);
    debouncedSearch(newValue);
  };

  const handleClear = () => {
    setValue('');
    onSearch('');
  };

  return (
    <div className="flex flex-col gap-2">
      <div
        className="flex items-center gap-3 rounded-xl px-4 py-3"
        style={{
          backgroundColor: c.surface,
          border: `1px solid ${c.border}`,
        }}
      >
        <Search size={20} style={{ color: c.textMuted, flexShrink: 0 }} />
        <input
          type="text"
          value={value}
          onChange={handleChange}
          placeholder="Search your memory..."
          className="flex-1 bg-transparent text-base outline-none placeholder:opacity-100"
          style={{
            color: c.text,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ['--tw-placeholder-color' as any]: c.textMuted,
          }}
        />
        {value && (
          <button
            onClick={handleClear}
            className="flex items-center justify-center rounded-md p-1 transition-colors"
            style={{ color: c.textTertiary }}
            aria-label="Clear search"
          >
            <X size={18} />
          </button>
        )}
      </div>
      {value && resultCount !== undefined && (
        <p className="text-[13px] px-1" style={{ color: c.textTertiary }}>
          Found {resultCount} result{resultCount !== 1 ? 's' : ''}
        </p>
      )}
    </div>
  );
}
