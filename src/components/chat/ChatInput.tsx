'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowUpIcon,
  Paperclip,
  PlusIcon,
  XIcon,
  FileTextIcon,
  FileIcon,
} from 'lucide-react';

const c = {
  surface: 'rgba(45,45,45,0.04)',
  surfaceElevated: 'rgba(45,45,45,0.06)',
  border: 'rgba(45,45,45,0.08)',
  borderHover: 'rgba(45,45,45,0.16)',
  borderActive: 'rgba(232,132,92,0.35)',
  borderDrag: 'rgba(232,132,92,0.5)',
  dawn: '#E8845C',
  dawnMuted: 'rgba(232,132,92,0.08)',
  text: '#2D2D2D',
  textMuted: 'rgba(45,45,45,0.5)',
  textGhost: 'rgba(45,45,45,0.4)',
};

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB per file
const MAX_FILES = 5;

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface FileEntry {
  id: string;
  file: File;
  preview?: string; // object URL for images
}

export interface ChatInputProps {
  onSend: (message: string, files?: File[]) => void;
  disabled: boolean;
  onNewChat?: () => void;
  showNewChat?: boolean;
}

export default function ChatInput({
  onSend,
  disabled,
  onNewChat,
  showNewChat = false,
}: ChatInputProps) {
  const [value, setValue] = useState('');
  const [focused, setFocused] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [sizeError, setSizeError] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounterRef = useRef(0); // track nested drag enter/leave

  const hasContent = value.trim().length > 0 || files.length > 0;

  /* ── Height auto-adjust ─────────────────────────────────────── */
  const adjustHeight = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 24 * 6)}px`;
  }, []);

  useEffect(() => { adjustHeight(); }, [value, adjustHeight]);

  /* ── Revoke preview URLs on unmount ─────────────────────────── */
  useEffect(() => {
    return () => {
      files.forEach((f) => { if (f.preview) URL.revokeObjectURL(f.preview); });
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Process dropped / picked files ─────────────────────────── */
  const addFiles = useCallback((incoming: FileList | File[]) => {
    setSizeError(null);
    const list = Array.from(incoming);
    const oversized = list.filter((f) => f.size > MAX_FILE_SIZE);
    if (oversized.length) {
      setSizeError(`${oversized.map((f) => f.name).join(', ')} exceeded the 10 MB limit and was skipped.`);
    }
    const valid = list.filter((f) => f.size <= MAX_FILE_SIZE);
    setFiles((prev) => {
      const combined = [...prev, ...valid.map((file) => ({
        id: crypto.randomUUID(),
        file,
        preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
      }))];
      return combined.slice(0, MAX_FILES);
    });
  }, []);

  const removeFile = useCallback((id: string) => {
    setFiles((prev) => {
      const entry = prev.find((f) => f.id === id);
      if (entry?.preview) URL.revokeObjectURL(entry.preview);
      return prev.filter((f) => f.id !== id);
    });
  }, []);

  /* ── Send ────────────────────────────────────────────────────── */
  const handleSend = useCallback(() => {
    const trimmed = value.trim();
    if ((!trimmed && files.length === 0) || disabled) return;
    onSend(trimmed, files.length > 0 ? files.map((f) => f.file) : undefined);
    setValue('');
    setFiles([]);
    setSizeError(null);
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  }, [value, files, disabled, onSend]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad|iPod/.test(navigator.platform);
      const modKey = isMac ? e.metaKey : e.ctrlKey;
      if (e.key === 'Enter' && !modKey && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  /* ── Drag & drop handlers ────────────────────────────────────── */
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    dragCounterRef.current++;
    if (e.dataTransfer.types.includes('Files')) setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    dragCounterRef.current--;
    if (dragCounterRef.current === 0) setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    dragCounterRef.current = 0;
    setIsDragging(false);
    if (e.dataTransfer.files.length > 0) addFiles(e.dataTransfer.files);
  }, [addFiles]);

  /* ── Render ─────────────────────────────────────────────────── */
  return (
    <div
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,.pdf,.doc,.docx,.txt,.csv,.xls,.xlsx,.ppt,.pptx,.md,.json"
        className="sr-only"
        onChange={(e) => {
          if (e.target.files) addFiles(e.target.files);
          e.target.value = '';
        }}
      />

      <div
        className="rounded-xl overflow-hidden transition-all duration-150"
        style={{
          border: `1px solid ${isDragging ? c.borderDrag : focused ? c.borderActive : c.border}`,
          background: isDragging ? c.dawnMuted : c.surfaceElevated,
          boxShadow: isDragging ? `0 0 0 3px rgba(232,132,92,0.12)` : 'none',
        }}
      >
        {/* Drag overlay label */}
        {isDragging && (
          <div
            className="flex items-center justify-center gap-2 px-4 py-2 text-[13px] font-medium"
            style={{ color: c.dawn }}
          >
            <Paperclip className="h-4 w-4" />
            Drop files to attach
          </div>
        )}

        {/* File preview strip */}
        {files.length > 0 && (
          <div className="flex flex-wrap gap-2 px-4 pt-3">
            {files.map((entry) => (
              <div
                key={entry.id}
                className="group relative flex items-center gap-2 rounded-lg px-2.5 py-1.5"
                style={{
                  background: c.surface,
                  border: `1px solid ${c.border}`,
                  maxWidth: 180,
                }}
              >
                {/* Thumbnail or icon */}
                {entry.preview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={entry.preview}
                    alt={entry.file.name}
                    className="h-8 w-8 rounded object-cover shrink-0"
                  />
                ) : entry.file.type.startsWith('text/') ||
                  entry.file.name.endsWith('.pdf') ? (
                  <FileTextIcon
                    className="h-5 w-5 shrink-0"
                    style={{ color: c.dawn }}
                  />
                ) : (
                  <FileIcon
                    className="h-5 w-5 shrink-0"
                    style={{ color: c.textGhost }}
                  />
                )}

                <div className="min-w-0">
                  <p
                    className="truncate text-[11px] font-medium leading-tight"
                    style={{ color: c.text, maxWidth: 100 }}
                  >
                    {entry.file.name}
                  </p>
                  <p className="text-[10px]" style={{ color: c.textGhost }}>
                    {formatBytes(entry.file.size)}
                  </p>
                </div>

                {/* Remove */}
                <button
                  type="button"
                  onClick={() => removeFile(entry.id)}
                  className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ background: c.text, color: '#fff' }}
                  aria-label="Remove file"
                >
                  <XIcon className="h-2.5 w-2.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Size error */}
        {sizeError && (
          <p
            className="px-4 pt-2 text-[11px]"
            style={{ color: '#D64B2A' }}
          >
            {sizeError}
          </p>
        )}

        {/* Textarea */}
        <div className="overflow-y-auto">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder={files.length > 0 ? 'Add a message or just send the files…' : 'Ask Donna anything…'}
            disabled={disabled}
            rows={1}
            className="w-full resize-none bg-transparent px-4 py-3 text-[15px] leading-6 outline-none placeholder:opacity-60"
            style={{
              color: c.text,
              caretColor: c.dawn,
              maxHeight: `${24 * 6}px`,
              overflow: 'hidden',
            }}
            autoFocus
          />
        </div>

        {/* Action bar */}
        <div
          className="flex items-center justify-between px-3 py-2"
          style={{ borderTop: `1px solid ${c.border}` }}
        >
          {/* Left: Attach */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="group flex items-center gap-1 rounded-lg p-1.5 transition-colors"
            style={{ color: files.length > 0 ? c.dawn : c.textGhost }}
            onMouseEnter={(e) => (e.currentTarget.style.background = c.surface)}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            title="Attach files"
          >
            <Paperclip className="h-4 w-4" />
            {files.length > 0 && (
              <span className="text-[11px] font-medium tabular-nums">
                {files.length}
              </span>
            )}
            <span
              className="hidden text-xs group-hover:inline"
              style={{ color: c.textMuted }}
            >
              {files.length > 0 ? 'Add more' : 'Attach'}
            </span>
          </button>

          {/* Right: New Chat + Send */}
          <div className="flex items-center gap-2">
            {showNewChat && onNewChat && (
              <button
                type="button"
                onClick={onNewChat}
                className="flex items-center gap-1 rounded-lg border px-2 py-1 text-xs transition-colors"
                style={{
                  borderColor: c.border,
                  borderStyle: 'dashed',
                  color: c.textGhost,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = c.surface;
                  e.currentTarget.style.borderColor = c.borderHover;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.borderColor = c.border;
                }}
              >
                <PlusIcon className="h-3.5 w-3.5" />
                New Chat
              </button>
            )}

            <button
              type="button"
              onClick={handleSend}
              disabled={disabled || !hasContent}
              className="flex h-8 w-8 items-center justify-center rounded-lg transition-all"
              style={{
                background: hasContent ? c.dawn : c.surface,
                border: `1px solid ${hasContent ? 'transparent' : c.border}`,
                color: hasContent ? '#fff' : c.textGhost,
                opacity: disabled ? 0.5 : 1,
              }}
              aria-label="Send message"
            >
              {disabled ? (
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle
                    cx="12" cy="12" r="10"
                    stroke="currentColor" strokeWidth="3"
                    strokeLinecap="round"
                    strokeDasharray="31.4 31.4" strokeDashoffset="10"
                  />
                </svg>
              ) : (
                <ArrowUpIcon className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
