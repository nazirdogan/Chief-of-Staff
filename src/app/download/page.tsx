"use client";

import Link from "next/link";
import { Monitor, Shield, Zap, ArrowLeft, Lock } from "lucide-react";
import { useWebsiteOnly } from "@/hooks/useWebsiteOnly";

/* ─────────────────────────────────────────────
   Brand tokens — The Editor palette
───────────────────────────────────────────── */
const c = {
  parchment: "#FAF9F6",
  linen: "#F1EDEA",
  charcoal: "#2D2D2D",
  dawn: "#E8845C",
  dusk: "#4E7DAA",
  slate: "#8D99AE",
  sage: "#52B788",
  border: "rgba(45,45,45,0.08)",
  borderStrong: "rgba(45,45,45,0.16)",
};

const fonts = {
  display: "var(--font-playfair), 'Playfair Display', Georgia, serif",
  body: "var(--font-dm-sans), 'DM Sans', system-ui, sans-serif",
  mono: "var(--font-jetbrains-mono), 'JetBrains Mono', monospace",
};

export default function DownloadPage() {
  useWebsiteOnly();
  return (
    <>
    <style>{`
      @media (max-width: 600px) {
        .download-card { padding: 32px 24px !important; }
        .download-back { top: 20px !important; left: 20px !important; }
        .download-wordmark { font-size: 36px !important; }
        .download-wordmark-wrap { margin-bottom: 40px !important; }
        .download-heading { font-size: 22px !important; }
        .download-body { font-size: 14px !important; }
        .download-btn { padding: 13px 24px !important; font-size: 14px !important; width: 100% !important; justify-content: center !important; }
        .download-feature-row { gap: 12px !important; }
      }
      @media (max-width: 380px) {
        .download-card { padding: 28px 18px !important; }
      }
    `}</style>
    <div
      style={{
        minHeight: "100vh",
        background: c.parchment,
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
        className="download-back"
        style={{
          position: "absolute",
          top: 32,
          left: 32,
          display: "flex",
          alignItems: "center",
          gap: 6,
          color: c.slate,
          textDecoration: "none",
          fontFamily: fonts.mono,
          fontSize: 11,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          transition: "color 0.15s",
        }}
        onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = c.charcoal)}
        onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = c.slate)}
      >
        <ArrowLeft size={14} /> Back
      </Link>

      {/* Logo wordmark */}
      <div className="download-wordmark-wrap" style={{ textAlign: "center", marginBottom: 56 }}>
        <h1
          className="download-wordmark"
          style={{
            fontFamily: fonts.display,
            fontSize: 44,
            fontWeight: 700,
            color: c.charcoal,
            letterSpacing: "-0.01em",
            margin: "0 0 8px",
          }}
        >
          Donna<span style={{ color: c.dawn }}>.</span>
        </h1>
        <p
          style={{
            fontFamily: fonts.mono,
            fontSize: 10,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            color: c.slate,
            margin: 0,
          }}
        >
          Personal Intelligence
        </p>
      </div>

      {/* Main card */}
      <div
        className="download-card"
        style={{
          background: "#FFFFFF",
          border: `1px solid ${c.border}`,
          borderRadius: 16,
          padding: "48px 44px",
          maxWidth: 520,
          width: "100%",
          textAlign: "center",
          boxShadow: "0 2px 24px rgba(45,45,45,0.06)",
        }}
      >
        {/* Icon */}
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: 16,
            background: c.linen,
            border: `1px solid ${c.border}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 28px",
          }}
        >
          <Monitor size={26} color={c.dawn} />
        </div>

        {/* Heading */}
        <h2
          className="download-heading"
          style={{
            fontFamily: fonts.display,
            fontSize: 28,
            fontWeight: 400,
            color: c.charcoal,
            margin: "0 0 14px",
            lineHeight: 1.25,
          }}
        >
          Donna lives on your desktop
        </h2>

        <p
          className="download-body"
          style={{
            fontSize: 15,
            lineHeight: 1.65,
            color: `rgba(45,45,45,0.65)`,
            margin: "0 0 36px",
          }}
        >
          To give you real intelligence, Donna needs to see what you see —
          your apps, your conversations, your workflow. That only works as a
          desktop app with your permission.
        </p>

        {/* Download button */}
        <a
          href="#"
          className="download-btn"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 10,
            background: c.dawn,
            color: "#FFFFFF",
            fontFamily: fonts.body,
            fontWeight: 600,
            fontSize: 15,
            padding: "14px 32px",
            borderRadius: 10,
            textDecoration: "none",
            transition: "transform 0.15s, box-shadow 0.15s",
            boxShadow: `0 4px 20px ${c.dawn}33`,
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.transform = "translateY(-1px)";
            (e.currentTarget as HTMLElement).style.boxShadow = `0 8px 28px ${c.dawn}55`;
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
            (e.currentTarget as HTMLElement).style.boxShadow = `0 4px 20px ${c.dawn}33`;
          }}
        >
          {/* Apple icon */}
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
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
            color: c.slate,
            marginTop: 14,
          }}
        >
          macOS 13+ &middot; Apple Silicon &amp; Intel
        </p>

        {/* Divider */}
        <div
          style={{
            marginTop: 36,
            paddingTop: 36,
            borderTop: `1px solid ${c.border}`,
            display: "flex",
            flexDirection: "column",
            gap: 22,
            textAlign: "left",
          }}
        >
          {[
            {
              icon: <Shield size={15} color={c.sage} />,
              iconBg: "rgba(82,183,136,0.1)",
              title: "Private by design",
              desc: "Your data stays on your machine. Donna observes locally and only sends what you approve.",
            },
            {
              icon: <Zap size={15} color={c.dawn} />,
              iconBg: "rgba(232,132,92,0.1)",
              title: "Full context awareness",
              desc: "Reads across your apps, emails, calendar, and messages to build a complete picture.",
            },
            {
              icon: <Monitor size={15} color={c.dusk} />,
              iconBg: "rgba(78,125,170,0.1)",
              title: "Always running, never in the way",
              desc: "Sits quietly in your menu bar. Opens instantly when you need it.",
            },
            {
              icon: <Lock size={15} color={c.slate} />,
              iconBg: c.linen,
              title: "You stay in control",
              desc: "Every observation requires explicit permission. Revoke access to any app at any time.",
            },
          ].map((item) => (
            <div key={item.title} className="download-feature-row" style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: item.iconBg,
                  border: `1px solid ${c.border}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  marginTop: 1,
                }}
              >
                {item.icon}
              </div>
              <div>
                <p style={{ fontSize: 13, fontWeight: 600, color: c.charcoal, margin: "0 0 3px" }}>
                  {item.title}
                </p>
                <p style={{ fontSize: 12, lineHeight: 1.55, color: `rgba(45,45,45,0.55)`, margin: 0 }}>
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
          color: c.slate,
          textTransform: "uppercase",
          marginTop: 48,
          opacity: 0.6,
        }}
      >
        &copy; 2026 Donna
      </p>
    </div>
    </>
  );
}
