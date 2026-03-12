'use client';

export default function ChatGreeting() {
  return (
    <div className="flex flex-col items-center text-center">
      <h1
        className="text-[32px] font-bold leading-tight tracking-tight"
        style={{ color: 'var(--foreground)' }}
      >
        What can I help you with?
      </h1>
      <p
        className="mt-2 text-[15px] leading-relaxed"
        style={{ color: 'var(--foreground-tertiary)' }}
      >
        I have access to your emails, calendar, tasks, and everything connected to Donna.
      </p>
    </div>
  );
}
