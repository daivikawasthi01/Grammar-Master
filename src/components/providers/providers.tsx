"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { MotionConfig } from "motion/react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { isApiError } from "@/lib/api";

function makeClient() {
  const onError = (err: unknown) => {
    if (isApiError(err, "UNAUTHENTICATED")) window.dispatchEvent(new CustomEvent("gm:unauthenticated"));
  };
  return new QueryClient({
    queryCache: new QueryCache({ onError }),
    mutationCache: new MutationCache({ onError }),
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        // Refetch when the user comes back to the tab instead of polling on an interval.
        refetchOnWindowFocus: true,
        retry: (count, err) => count < 2 && !(isApiError(err) && err.status >= 400 && err.status < 500),
      },
    },
  });
}

/** A 401 anywhere means the session ended (expired, revoked, signed out elsewhere): go to login. */
function SessionWatcher() {
  const router = useRouter();
  useEffect(() => {
    const onUnauthenticated = () => {
      if (window.location.pathname.startsWith("/app")) router.replace(`/login?next=${encodeURIComponent(window.location.pathname)}&expired=1`);
    };
    window.addEventListener("gm:unauthenticated", onUnauthenticated);
    return () => window.removeEventListener("gm:unauthenticated", onUnauthenticated);
  }, [router]);
  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(makeClient);
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <QueryClientProvider client={client}>
        <MotionConfig reducedMotion="user">
          <TooltipProvider delayDuration={300}>
            <SessionWatcher />
            {children}
            <Toaster position="bottom-right" richColors closeButton />
          </TooltipProvider>
        </MotionConfig>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
