import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "StableArc Settlement Agent",
  description:
    "An AI agent that moves African local currencies peer-to-peer on Celo — no US dollar in the path.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
