export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import User from "@/app/db/schema";
import dbConnect from "@/lib/mongodb";
import { requireUser } from "@/lib/api-auth";
import { logger } from "@/lib/logger";

interface DocumentParamsType {
  params: Promise<{
    document: string;
  }>;
}

export async function POST(req: Request, props: DocumentParamsType) {
  try {
    const auth = await requireUser(req);
    if ("response" in auth) {
      return auth.response;
    }

    const params = await props.params;
    const searchTerm = params?.document ? decodeURIComponent(params.document).trim() : "";

    if (!searchTerm) {
      return NextResponse.json(
        { error: "No search term provided" },
        { status: 400 }
      );
    }

    await dbConnect();
    const user = await User.findById(auth.user.id).select("documents");
    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    const filteredDocument = (user.documents || []).filter((doc: any) =>
      doc.title?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return NextResponse.json({
      status: "searched",
      filteredDocument,
    });
  } catch (error) {
    logger.error({ err: error }, "Search document error");
    return NextResponse.json(
      { error: "Failed to search documents" },
      { status: 500 }
    );
  }
}