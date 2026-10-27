"use client";

import { IconContext } from "@phosphor-icons/react";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ThemeProviderProps } from "next-themes";

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return (
    <NextThemesProvider {...props}>
      <IconContext.Provider value={{ weight: "bold" }}>{children}</IconContext.Provider>
    </NextThemesProvider>
  );
}
