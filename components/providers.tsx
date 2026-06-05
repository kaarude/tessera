"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { Toaster } from "react-hot-toast";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 5,
        retry: 1,
      },
    },
  }));

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: "hsl(0 0% 10%)",
            color: "hsl(30 10% 92%)",
            border: "1px solid hsl(0 0% 18%)",
            borderRadius: "0.625rem",
          },
          success: {
            iconTheme: {
              primary: "hsl(24 95% 53%)",
              secondary: "hsl(0 0% 7%)",
            },
          },
        }}
      />
    </QueryClientProvider>
  );
}
