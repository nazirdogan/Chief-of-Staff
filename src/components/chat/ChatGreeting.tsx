'use client';

const c = {
  text: '#2D2D2D',
  textTertiary: 'rgba(45,45,45,0.6)',
};

export default function ChatGreeting() {
  return (
    <div className="flex flex-col items-center text-center">
      <h1
        className="text-[32px] font-bold leading-tight tracking-tight"
        style={{ color: c.text }}
      >
        What can I help you with?
      </h1>
      <p
        className="mt-2 text-[15px] leading-relaxed"
        style={{ color: c.textTertiary }}
      >
        I have access to your emails, calendar, tasks, and everything connected to Donna.
      </p>
    </div>
  );
}
