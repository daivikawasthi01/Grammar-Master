import { redirect } from "next/navigation";
import { getSessionUserFromCookies } from "@/server/auth/session";
import { AppShell } from "@/components/app/app-shell";

export const dynamic = "force-dynamic";

/** The real gate for every /app page: the session is checked against the database, not just the cookie signature. */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUserFromCookies();
  if (!user) redirect("/login");
  return <AppShell user={{ name: user.name, email: user.email }}>{children}</AppShell>;
}
