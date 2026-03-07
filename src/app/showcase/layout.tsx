import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Chief of Staff — Landing Page Showcase",
  description: "Browse and preview landing page design options",
};

export default function ShowcaseLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <> {/* eslint-disable @next/next/no-page-custom-font */}
      <link
        href="https://api.fontshare.com/v2/css?f[]=satoshi@300,400,500,600,700,800,900&display=swap"
        rel="stylesheet"
      />
      <link
        href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap"
        rel="stylesheet"
      />
      <link
        href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;0,800;0,900;1,400;1,500;1,600&display=swap"
        rel="stylesheet"
      />
      {children}
    </>
  );
}
