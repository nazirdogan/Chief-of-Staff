export const dynamic = 'force-dynamic';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      {/* Brand panel */}
      <div className="hidden w-1/2 flex-col justify-between bg-foreground p-10 text-background lg:flex">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-background text-foreground">
            <span className="text-xs font-bold">CS</span>
          </div>
          <span className="text-lg font-semibold tracking-tight">Chief of Staff</span>
        </div>

        <div className="max-w-md space-y-4">
          <h2 className="text-3xl font-bold leading-tight tracking-tight">
            Your AI-powered
            <br />
            intelligence layer.
          </h2>
          <p className="text-base leading-relaxed text-background/70">
            One proactive daily briefing across your entire digital life.
            Know what matters, what you promised, and what to do first.
          </p>
        </div>

        <p className="text-xs text-background/40">
          Secure by default. Your data never leaves your control.
        </p>
      </div>

      {/* Form panel */}
      <div className="flex w-full flex-1 items-center justify-center bg-background px-4 lg:w-1/2">
        {children}
      </div>
    </div>
  );
}
