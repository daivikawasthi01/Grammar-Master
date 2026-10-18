import type { Metadata } from "next";
import { StyleGuideEditor } from "@/components/app/style-guide-editor";

export const metadata: Metadata = { title: "Style guide" };

export default function StyleGuidePage() {
  return <StyleGuideEditor />;
}
