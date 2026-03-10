"use client";

import { ThemeProvider } from "./ThemeProvider";

/**
 * Thin client wrapper so the server RootLayout can include ThemeProvider
 * without becoming a client component itself.
 */
export function ThemeRoot({ children }: { children: React.ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>;
}
