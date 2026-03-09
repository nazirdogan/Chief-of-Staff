export default function ChatLoading() {
  return (
    <div className="flex h-[calc(100vh-80px)] flex-col">
      {/* Header skeleton */}
      <div
        className="flex shrink-0 items-center px-4 py-3"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}
      >
        <div className="h-6 w-28 animate-pulse rounded" style={{ background: 'rgba(255,255,255,0.08)' }} />
      </div>

      {/* Messages skeleton */}
      <div className="flex-1 overflow-hidden px-4 py-6">
        <div className="mx-auto flex max-w-2xl flex-col gap-6">
          <div className="flex justify-end">
            <div className="h-10 w-2/3 animate-pulse rounded-xl" style={{ background: 'rgba(232,132,92,0.10)' }} />
          </div>
          <div className="flex justify-start">
            <div className="h-16 w-3/4 animate-pulse rounded-xl" style={{ background: 'rgba(255,255,255,0.05)' }} />
          </div>
          <div className="flex justify-end">
            <div className="h-10 w-1/2 animate-pulse rounded-xl" style={{ background: 'rgba(232,132,92,0.10)' }} />
          </div>
          <div className="flex justify-start">
            <div className="h-20 w-4/5 animate-pulse rounded-xl" style={{ background: 'rgba(255,255,255,0.05)' }} />
          </div>
        </div>
      </div>

      {/* Input skeleton */}
      <div className="shrink-0 px-4 pb-4">
        <div className="h-12 animate-pulse rounded-xl" style={{ background: 'rgba(255,255,255,0.05)' }} />
      </div>
    </div>
  );
}
