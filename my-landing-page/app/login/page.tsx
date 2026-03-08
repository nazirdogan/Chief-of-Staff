"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";

const c = {
  bg: "#FAFAF8",
  surface: "#FFFFFF",
  border: "rgba(120,110,80,0.1)",
  borderHover: "rgba(120,110,80,0.22)",
  brass: "#8C7A4A",
  brassSubtle: "rgba(140,122,74,0.06)",
  brassBorder: "rgba(140,122,74,0.12)",
  text: "#1A1917",
  textSecondary: "#3D3C37",
  textTertiary: "#6E6D65",
  textQuaternary: "#9C9B93",
  textGhost: "#C8C7C0",
};

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <div
      className="min-h-screen flex items-center justify-center px-6"
      style={{ fontFamily: "'Satoshi', sans-serif", background: c.bg, color: c.text }}
    >
      <div className="w-full max-w-md">
        {/* Back link */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-[12px] font-medium mb-12 transition-colors hover:text-[#1A1917]"
          style={{ color: c.textQuaternary }}
        >
          <ArrowLeft size={14} />
          Back to home
        </Link>

        {/* Logo */}
        <div className="flex items-center gap-3 mb-10">
          <div
            className="h-9 w-9 rounded-lg flex items-center justify-center text-[11px] font-black"
            style={{ background: c.text, color: c.bg }}
          >
            CS
          </div>
          <span className="text-lg font-bold tracking-[-0.02em]">Donna</span>
        </div>

        <h1
          className="text-3xl font-black tracking-[-0.03em] mb-2"
          style={{ fontFamily: "'Playfair Display', serif" }}
        >
          Welcome back
        </h1>
        <p className="text-[15px] mb-10" style={{ color: c.textTertiary }}>
          Sign in to access your daily briefing.
        </p>

        <form
          onSubmit={(e) => e.preventDefault()}
          className="space-y-5"
        >
          <div>
            <label
              className="block text-[12px] font-semibold uppercase tracking-[0.1em] mb-2"
              style={{ color: c.textQuaternary }}
            >
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              className="w-full text-[15px] px-4 py-3.5 rounded-xl border outline-none transition-all duration-300 focus:border-[rgba(140,122,74,0.3)] focus:shadow-[0_0_0_3px_rgba(140,122,74,0.06)]"
              style={{
                borderColor: c.border,
                background: c.surface,
                color: c.text,
              }}
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label
                className="text-[12px] font-semibold uppercase tracking-[0.1em]"
                style={{ color: c.textQuaternary }}
              >
                Password
              </label>
              <a
                href="#"
                className="text-[12px] font-medium transition-colors hover:text-[#8C7A4A]"
                style={{ color: c.textQuaternary }}
              >
                Forgot password?
              </a>
            </div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              className="w-full text-[15px] px-4 py-3.5 rounded-xl border outline-none transition-all duration-300 focus:border-[rgba(140,122,74,0.3)] focus:shadow-[0_0_0_3px_rgba(140,122,74,0.06)]"
              style={{
                borderColor: c.border,
                background: c.surface,
                color: c.text,
              }}
            />
          </div>

          <button
            type="submit"
            className="w-full text-[14px] font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-all duration-300 hover:shadow-[0_2px_16px_rgba(26,25,23,0.12)]"
            style={{ background: c.text, color: c.bg }}
          >
            Sign in
            <ArrowRight size={15} />
          </button>
        </form>

        <p className="text-center text-[13px] mt-8" style={{ color: c.textQuaternary }}>
          Don&apos;t have an account?{" "}
          <Link
            href="/signup"
            className="font-semibold transition-colors hover:text-[#8C7A4A]"
            style={{ color: c.text }}
          >
            Request access
          </Link>
        </p>
      </div>
    </div>
  );
}
