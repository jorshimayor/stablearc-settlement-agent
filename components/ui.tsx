// Minimal, self-contained UI primitives for the agent app. No component
// library — just Tailwind + the design tokens in tailwind.config.ts.

import { type ButtonHTMLAttributes, type ReactNode } from "react";

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`bg-white border border-black/[0.07] shadow-soft rounded-2xl ${className}`}
    >
      {children}
    </div>
  );
}

export function Button({
  children,
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { children: ReactNode }) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-full bg-emerald text-white px-4 py-2.5 text-sm font-semibold disabled:opacity-40 transition hover:brightness-105 ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
