import type { Metadata } from "next";
import { DocumentEditor } from "@/components/editor/document-editor";

export const metadata: Metadata = { title: "Editor" };

export default async function EditorPage({ params }: { params: Promise<{ docId: string }> }) {
  const { docId } = await params;
  return <DocumentEditor id={docId} />;
}
