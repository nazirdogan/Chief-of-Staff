# Donna — macOS DMG Distribution Build Prompt

## Context

Donna is a Next.js + Tauri desktop app. The Tauri config already produces a `.dmg` and `.app`
bundle. The GitHub Actions release workflow (`/.github/workflows/release.yml`) already builds
and publishes the DMG as a GitHub Release artifact when a version tag is pushed.

This prompt covers everything needed to make the DMG **easily downloadable from the website
and runnable on a user's MacBook** — including the download page, correct HTTP headers, Chrome
compatibility, macOS Gatekeeper handling, and architecture detection.

---

## 1. Tauri Config — Confirm Universal Binary

In `src-tauri/tauri.conf.json`, the `bundle` section must target a **universal binary** so the
same DMG works on both Apple Silicon (M1/M2/M3) and Intel Macs.

```json
"bundle": {
  "active": true,
  "targets": ["dmg", "app"],
  "macOS": {
    "minimumSystemVersion": "10.15"
  }
}
```

In the GitHub Actions workflow, the Tauri action must pass `--target universal-apple-darwin`:

```yaml
with:
  args: --target universal-apple-darwin
```

This produces a single DMG that runs on all modern Macs. No need to serve separate ARM/Intel
builds unless you want smaller download sizes (optional optimisation, not required for launch).

---

## 2. DMG Appearance — Custom Background & Layout

Tauri uses `create-dmg` under the hood. You can customise the DMG window that opens when a
user double-clicks it. Add the following to `src-tauri/tauri.conf.json`:

```json
"bundle": {
  "macOS": {
    "dmg": {
      "background": "icons/dmg-background.png",
      "windowSize": { "width": 660, "height": 400 },
      "appPosition": { "x": 180, "y": 200 },
      "applicationFolderPosition": { "x": 480, "y": 200 }
    }
  }
}
```

Create `src-tauri/icons/dmg-background.png` at exactly 660×400px (or 1320×800px for Retina).
The background should show: the Donna logo on the left, an arrow pointing right, and the
Applications folder icon on the right — guiding users to drag the app to install it.

If you do not have a custom background, remove the `dmg` block and Tauri will use a plain
white background. This is fine for launch.

---

## 3. Website Download Page

### 3a. Download Button Component

Create `components/DownloadButton.tsx` in the website/landing page repo. This component:
- Detects whether the visitor is on macOS
- Detects CPU architecture (ARM vs Intel) via the user-agent string
- Shows the correct download button
- Falls back gracefully on non-Mac platforms

```tsx
"use client";

import { useEffect, useState } from "react";

type Platform = "mac-universal" | "mac-arm" | "mac-intel" | "windows" | "other";

function detectPlatform(): Platform {
  const ua = navigator.userAgent;
  if (!ua.includes("Mac")) {
    if (ua.includes("Win")) return "windows";
    return "other";
  }
  // Distinguish Apple Silicon from Intel
  // Note: navigator.userAgentData is more reliable but not universally supported
  if (ua.includes("Mac") && (ua.includes("AppleWebKit") && window.navigator.hardwareConcurrency >= 8)) {
    // heuristic — use universal build for all Macs to avoid misdetection
    return "mac-universal";
  }
  return "mac-universal";
}

const GITHUB_REPO = "nazirdogan/Chief-of-Staff"; // update if repo is renamed
const DMG_FILENAME = "Donna_universal.dmg"; // must match what tauri-action produces

export function DownloadButton() {
  const [platform, setPlatform] = useState<Platform>("other");
  const downloadUrl = `https://github.com/${GITHUB_REPO}/releases/latest/download/${DMG_FILENAME}`;

  useEffect(() => {
    setPlatform(detectPlatform());
  }, []);

  if (platform === "windows") {
    return (
      <p className="text-sm text-muted-foreground">
        Windows version coming soon. Join the waitlist to be notified.
      </p>
    );
  }

  if (platform === "other") {
    return (
      <a href={downloadUrl} className="btn-primary">
        Download Donna
      </a>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <a
        href={downloadUrl}
        className="btn-primary flex items-center gap-2"
        onClick={() => {
          // Optional: track download event
          // analytics.track("dmg_download_clicked", { platform });
        }}
      >
        {/* Apple icon */}
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <path d="M11.182 0c.247 1.438-.37 2.862-1.243 3.862-.882 1.01-2.297 1.77-3.7 1.663-.3-1.395.44-2.84 1.27-3.78C8.39.755 9.878.013 11.182 0zM14.5 11.5c-.39.87-.577 1.26-1.077 2.03-.7 1.07-1.685 2.4-2.9 2.41-1.085.01-1.365-.71-2.84-.7-1.475.01-1.78.715-2.87.705-1.215-.01-2.15-1.22-2.85-2.29C.32 11.7-.21 9.32.59 7.31c.56-1.43 1.98-2.34 3.27-2.34 1.22 0 1.99.72 3 .72.98 0 1.58-.73 3-.73 1.14 0 2.39.62 3.27 1.7-.09.04-1.95 1.14-1.93 3.4.02 2.7 2.37 3.59 2.3 3.64z"/>
        </svg>
        Download for Mac — Free
      </a>
      <p className="text-xs text-muted-foreground">
        macOS 10.15 Catalina or later · Apple Silicon &amp; Intel
      </p>
    </div>
  );
}
```

### 3b. Post-Download Instructions

After the user clicks download, show a helper modal or inline tip explaining what to do.
This is critical for first-time Mac users who have never installed a non-App-Store app.

Create `components/InstallInstructions.tsx`:

```tsx
export function InstallInstructions() {
  return (
    <div className="rounded-xl border border-border bg-muted/40 p-5 text-sm max-w-md">
      <h3 className="font-semibold mb-3">How to install Donna</h3>
      <ol className="space-y-2 text-muted-foreground list-decimal list-inside">
        <li>Open the <strong>.dmg</strong> file from your Downloads</li>
        <li>Drag <strong>Donna</strong> into your <strong>Applications</strong> folder</li>
        <li>Open Donna from Applications or Spotlight</li>
        <li>
          If macOS says <em>"Donna can't be opened"</em>:{" "}
          <strong>right-click → Open → Open</strong>. You only need to do this once.
        </li>
      </ol>
    </div>
  );
}
```

---

## 4. Serving the DMG with Correct HTTP Headers

If you host the DMG yourself (S3, Cloudflare R2, or your own server), you must serve it
with the correct MIME type and Content-Disposition header. Without these, Chrome may
flag the download or refuse to start it.

### Required headers for the DMG file:

```
Content-Type: application/x-apple-diskimage
Content-Disposition: attachment; filename="Donna.dmg"
Content-Length: <file size in bytes>
Cache-Control: public, max-age=3600
```

### If hosting on GitHub Releases (recommended for launch):

GitHub automatically serves the correct headers. No configuration needed. Your download
URL format is:

```
https://github.com/nazirdogan/Chief-of-Staff/releases/latest/download/Donna_universal.dmg
```

The `latest` path segment always resolves to the most recent published (non-draft) release,
so you never need to update the URL on your website when you ship a new version.

### If hosting on AWS S3:

Set the object metadata when uploading:

```bash
aws s3 cp Donna.dmg s3://your-bucket/releases/Donna.dmg \
  --content-type "application/x-apple-diskimage" \
  --content-disposition "attachment; filename=\"Donna.dmg\""
```

Or configure via a Next.js API route that streams the file with correct headers:

```ts
// app/api/download/mac/route.ts
import { NextResponse } from "next/server";

export async function GET() {
  const LATEST_DMG_URL =
    "https://github.com/nazirdogan/Chief-of-Staff/releases/latest/download/Donna_universal.dmg";

  return NextResponse.redirect(LATEST_DMG_URL, {
    headers: {
      "X-Robots-Tag": "noindex",
    },
  });
}
```

This lets you change the underlying download source later without updating any links on
the site — just change the env var `LATEST_DMG_URL`.

---

## 5. Chrome Download Compatibility

Chrome applies extra scrutiny to `.dmg` downloads. Follow these rules to prevent Chrome
from blocking or warning about the download:

**Rule 1 — Serve over HTTPS.** Never serve the DMG over HTTP. GitHub Releases and S3
both use HTTPS by default. If using a custom CDN, ensure the certificate is valid.

**Rule 2 — Correct MIME type.** Use `application/x-apple-diskimage`. Do not use
`application/octet-stream` — Chrome is more likely to add an "unusual" warning to it.

**Rule 3 — Avoid redirects that strip headers.** If you use a redirect chain
(e.g. your site → your API → S3), ensure each hop preserves the Content-Type and
Content-Disposition headers or the final response delivers them.

**Rule 4 — Do not use URL parameters that look suspicious.** A clean URL like
`/releases/latest/download/Donna.dmg` is treated as safer than a URL with query strings
like `/download?file=donna&token=abc123`.

**Rule 5 — Let the user see the filename.** The `Content-Disposition: attachment;
filename="Donna.dmg"` header ensures Chrome shows "Donna.dmg" in the downloads bar,
not a UUID or temp filename.

---

## 6. macOS Gatekeeper — What Users Will See

Since Donna is not signed with an Apple Developer certificate, macOS Gatekeeper will
show a warning the first time a user opens it. There are two versions of this warning:

### Version A: "Donna can't be opened because it is from an unidentified developer"
This appears on macOS 12 and earlier. Fix:
- User opens **System Preferences → Security & Privacy → General**
- Clicks **"Open Anyway"** next to the Donna warning

### Version B: "Donna can't be opened because Apple cannot check it for malicious software"
This appears on macOS 13 (Ventura) and later. Fix:
- User **right-clicks** (or Ctrl+clicks) Donna.app in Applications
- Selects **Open** from the context menu
- Clicks **Open** in the confirmation dialog

Both of these are one-time steps. After the user opens the app once this way,
Gatekeeper remembers the exception and never shows the warning again.

**Document both flows clearly on your website** with screenshots or a short GIF.

---

## 7. Download Analytics (Optional but Recommended)

Track how many users download the DMG and whether they complete installation. Add a
simple server-side download counter by routing downloads through your API:

```ts
// app/api/download/mac/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/db/client";

export async function GET(request: Request) {
  const supabase = createClient();
  const userAgent = request.headers.get("user-agent") ?? "";

  // Fire-and-forget analytics (don't await — don't block the redirect)
  supabase.from("download_events").insert({
    platform: "mac",
    user_agent: userAgent,
    downloaded_at: new Date().toISOString(),
  }).then(() => {}).catch(() => {});

  return NextResponse.redirect(
    "https://github.com/nazirdogan/Chief-of-Staff/releases/latest/download/Donna_universal.dmg"
  );
}
```

Add the `download_events` table to Supabase with RLS enabled (per the absolute rules in
`CLAUDE.md`). The schema:

```sql
create table download_events (
  id uuid default gen_random_uuid() primary key,
  platform text not null,
  user_agent text,
  downloaded_at timestamptz default now()
);

alter table download_events enable row level security;
-- No user-facing reads needed; write-only from server
```

---

## 8. Release Naming Convention

The filename Tauri produces depends on the `productName` and `version` in `tauri.conf.json`.
With `productName: "Donna"` and `version: "0.1.0"`, the output will be named:

```
Donna_0.1.0_universal.dmg
```

However, this means the GitHub download URL changes with every release:
```
.../releases/download/v0.1.0/Donna_0.1.0_universal.dmg  ← version-specific
.../releases/latest/download/Donna_0.1.0_universal.dmg   ← this STILL includes the version!
```

**The `latest` endpoint only works without a version number in the filename.** To fix this,
rename the artifact in the GitHub Actions workflow before publishing:

```yaml
# In release.yml, add a rename step after the build:
- name: Rename DMG to stable filename
  run: |
    find src-tauri/target/release/bundle/dmg -name "*.dmg" \
      -exec mv {} src-tauri/target/release/bundle/dmg/Donna.dmg \;
```

Then your website's download URL is permanently:
```
https://github.com/nazirdogan/Chief-of-Staff/releases/latest/download/Donna.dmg
```

This URL never changes across versions. Users who bookmark it always get the latest build.

---

## 9. Summary Checklist

Before the first public download goes live, verify each item:

- [ ] `tauri.conf.json` has `"targets": ["dmg", "app"]` and `minimumSystemVersion: "10.15"`
- [ ] GitHub Actions workflow builds `--target universal-apple-darwin`
- [ ] DMG rename step in workflow produces `Donna.dmg` (stable filename)
- [ ] GitHub Release is published (not draft) before linking from website
- [ ] Download button on website links to `.../releases/latest/download/Donna.dmg`
- [ ] Post-install instructions are visible near the download button
- [ ] Gatekeeper bypass instructions ("right-click → Open") are documented on site
- [ ] DMG served over HTTPS with correct MIME type `application/x-apple-diskimage`
- [ ] Tested end-to-end: download → open DMG → drag to Applications → open app
