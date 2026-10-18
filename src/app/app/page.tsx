import type { Metadata } from "next";
import { Dashboard } from "@/components/app/dashboard";

export const metadata: Metadata = { title: "Documents" };

export default function AppHome() {
  return <Dashboard />;
}
