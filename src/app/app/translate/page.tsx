import type { Metadata } from "next";
import { Translator } from "@/components/app/translator";

export const metadata: Metadata = { title: "Translate" };

export default function TranslatePage() {
  return <Translator />;
}
