import { NextResponse } from "next/server";
import { recordFormImpression } from "@/lib/contacts";

export async function POST(
  _: Request,
  { params }: { params: Promise<{ listId: string }> }
) {
  try {
    const { listId } = await params;
    if (!listId) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }
    await recordFormImpression(listId);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
