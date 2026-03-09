"use client";

import Link from "next/link";
import { Monitor, Shield, Zap, ArrowLeft } from "lucide-react";

const c = {
  midnight: "#1B1F3A",
  dawn: "#E8845C",
  dusk: "#4E7DAA",
  paper: "#FBF7F4",
  sage: "#52B788",
  deep: "#0E1225",
  charcoal: "#2D3154",
  mist: "#9BAFC4",
  stone: "#F0EDE9",
};

const fonts = {
  display: "var(--font-cormorant), 'Cormorant Garamond', Georgia, serif",
  body: "var(--font-inter), 'Inter', system-ui, sans-serif",
  mono: "var(--font-jetbrains-mono), 'JetBrains Mono', monospace",
};

export default function DownloadPage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: `linear-gradient(180deg, ${c.deep} 0%, ${c.midnight} 100%)`,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 24px",
        fontFamily: fonts.body,
      }}
    >
      {/* Back to home */}
      <Link
        href="/"
        style={{
          position: "absolute",
          top: 32,
          left: 32,
          display: "flex",
          alignItems: "center",
          gap: 6,
          color: c.mist,
          textDecoration: "none",
          fontFamily: fonts.mono,
          fontSize: 11,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          transition: "color 0.15s",
        }}
        onMouseEnter={(e) => ((e.target as HTMLElement).style.color = c.paper)}
        onMouseLeave={(e) => ((e.target as HTMLElement).style.color = c.mist)}
      >
        <ArrowLeft size={14} /> Back
      </Link>

      {/* Logo */}
      <div style={{ textAlign: "center", marginBottom: 48 }}>
        <h1
          style={{
            fontFamily: fonts.display,
            fontSize: 48,
            fontWeight: 300,
            color: "#fff",
            letterSpacing: "0.02em",
            margin: 0,
          }}
        >
          Donna
        </h1>
        <p
          style={{
            fontFamily: fonts.mono,
            fontSize: 10,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            color: c.mist,
            marginTop: 8,
          }}
        >
          Personal Intelligence
        </p>
      </div>

      {/* Main card */}
      <div
        style={{
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.06)",
          borderRadius: 16,
          padding: "48px 40px",
          maxWidth: 520,
          width: "100%",
          textAlign: "center",
        }}
      >
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: 16,
            background: `linear-gradient(135deg, ${c.dawn}, ${c.dusk})`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 24px",
          }}
        >
          <Monitor size={28} color="#fff" />
        </div>

        <h2
          style={{
            fontFamily: fonts.display,
            fontSize: 28,
            fontWeight: 400,
            color: "#fff",
            margin: "0 0 12px",
          }}
        >
          Donna lives on your desktop
        </h2>

        <p
          style={{
            fontSize: 15,
            lineHeight: 1.6,
            color: c.mist,
            margin: "0 0 32px",
          }}
        >
          To give you real intelligence, Donna needs to see what you see &mdash;
          your apps, your conversations, your workflow. That only works as a
          desktop app with your permission.
        </p>

        {/* Download button */}
        <a
          href="#"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 10,
            background: c.dawn,
            color: "#fff",
            fontFamily: fonts.body,
            fontWeight: 600,
            fontSize: 15,
            padding: "14px 32px",
            borderRadius: 10,
            textDecoration: "none",
            transition: "transform 0.15s, box-shadow 0.15s",
            boxShadow: `0 4px 24px ${c.dawn}44`,
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.transform = "translateY(-1px)";
            (e.currentTarget as HTMLElement).style.boxShadow = `0 8px 32px ${c.dawn}66`;
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
            (e.currentTarget as HTMLElement).style.boxShadow = `0 4px 24px ${c.dawn}44`;
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2z" fill="currentColor" opacity="0.2"/>
            <path d="M18.71 19.5C17.88 20.49 17 20.44 16.18 20.07C15.31 19.69 14.51 19.68 13.6 20.07C12.44 20.57 11.82 20.42 11.08 19.5C6.95 15.18 7.54 8.82 12.18 8.58C13.24 8.64 13.99 9.15 14.63 9.2C15.6 9 16.53 8.46 17.56 8.54C18.8 8.64 19.73 9.14 20.34 10.04C17.48 11.74 18.15 15.54 20.79 16.6C20.24 18.04 19.53 19.46 18.71 19.5ZM14.53 8.54C14.39 6.44 16.1 4.72 18.08 4.56C18.34 6.99 15.87 8.82 14.53 8.54Z" fill="currentColor"/>
          </svg>
          Download for macOS
        </a>

        <p
          style={{
            fontFamily: fonts.mono,
            fontSize: 10,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "#3a4060",
            marginTop: 16,
          }}
        >
          macOS 13+ &middot; Apple Silicon &amp; Intel
        </p>

        {/* Why desktop? */}
        <div
          style={{
            marginTop: 36,
            paddingTop: 32,
            borderTop: "1px solid rgba(255,255,255,0.06)",
            display: "flex",
            flexDirection: "column",
            gap: 20,
            textAlign: "left",
          }}
        >
          {[
            {
              icon: <Shield size={16} color={c.sage} />,
              title: "Private by design",
              desc: "Your data stays on your machine. Donna observes locally and only sends what you approve.",
            },
            {
              icon: <Zap size={16} color={c.dawn} />,
              title: "Full context awareness",
              desc: "Reads across your apps, emails, calendar, and messages to build a complete picture.",
            },
            {
              icon: <Monitor size={16} color={c.dusk} />,
              title: "Always running, never in the way",
              desc: "Sits quietly in your menu bar. Opens instantly when you need it.",
            },
          ].map((item) => (
            <div key={item.title} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: "rgba(255,255,255,0.04)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                {item.icon}
              </div>
              <div>
                <p style={{ fontSize: 13, fontWeight: 600, color: "#fff", margin: "0 0 4px" }}>
                  {item.title}
                </p>
                <p style={{ fontSize: 12, lineHeight: 1.5, color: c.mist, margin: 0 }}>
                  {item.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <p
        style={{
          fontFamily: fonts.mono,
          fontSize: 10,
          letterSpacing: "0.08em",
          color: "#2a3050",
          textTransform: "uppercase",
          marginTop: 48,
        }}
      >
        &copy; 2026 Donna
      </p>
    </div>
  );
}
