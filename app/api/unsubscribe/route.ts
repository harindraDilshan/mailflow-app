import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/unsubscribe-token";
import { unsubscribeContact } from "@/lib/unsubscribe";

// Mail apps call this with POST when the user presses their own "Unsubscribe" button.
export async function POST(req: NextRequest) {
  const contactId = verifyToken(req.nextUrl.searchParams.get("t") ?? "");
  if (!contactId) return new NextResponse("Invalid link", { status: 400 });

  await unsubscribeContact(contactId);
  return new NextResponse("Unsubscribed", { status: 200 });
}

// If someone opens this URL in a browser, show them the normal page instead.
export async function GET(req: NextRequest) {
  const t = req.nextUrl.searchParams.get("t") ?? "";
  return NextResponse.redirect(new URL(`/unsubscribe?t=${encodeURIComponent(t)}`, req.url));
}