"use client";

import { ThemeProvider } from "next-themes";

export function AppThemeProvider({ children, ...props }) {
  return (
    <ThemeProvider {...props}>
      {children}
    </ThemeProvider>
  );
}
