import { cookies } from "next/headers";
import { SiteHeader } from "@/components/marketing/site-header";
import { SiteFooter } from "@/components/marketing/site-footer";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/session-token";

export default async function MarketingLayout({ children }: { children: React.ReactNode }) {
  // Only decides which header buttons to show; /app re-checks the session properly.
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const signedIn = Boolean(await verifySessionToken(token, process.env.JWT_SECRET));
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader signedIn={signedIn} />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}
