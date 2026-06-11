"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Toaster } from "react-hot-toast";
import { ThemeProvider, useTheme } from "next-themes";
import { useAppStore } from "@/lib/store";

function ThemeSync() {
  const { theme, setTheme } = useTheme();
  const storeTheme = useAppStore((s) => s.theme);

  useEffect(() => {
    if (storeTheme !== "system" && theme !== storeTheme) {
      setTheme(storeTheme);
    }
  }, [storeTheme, theme, setTheme]);

  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 1000 * 60 * 5,
            retry: 1,
          },
        },
      }),
  );

  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
      <ThemeSync />
      <QueryClientProvider client={queryClient}>
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: "var(--color-card)",
              color: "var(--color-foreground)",
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius-md)",
            },
            success: {
              iconTheme: {
                primary: "var(--color-accent)",
                secondary: "var(--color-background)",
              },
            },
          }}
        />
      </QueryClientProvider>
    </ThemeProvider>
  );
}
