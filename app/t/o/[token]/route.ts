import { after, NextRequest } from "next/server";
import { verifyOpen } from "@/lib/tracking-token";
import { recordOpen } from "@/lib/events";

// A 1x1 transparent GIF
const GIF = Uint8Array.from(
  Buffer.from("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", "base64")
);

export async function GET(req: NextRequest, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  const messageId = verifyOpen(token);

  if (messageId) {
    const ua = req.headers.get("user-agent") ?? undefined;
    after(() => recordOpen(messageId, ua).catch((e) => console.error("recordOpen failed", e)));
  }

  // Always return the image, even for a bad token. Never show an error in someone's email.
  return new Response(GIF, {
    headers: {
      "Content-Type": "image/gif",
      "Content-Length": String(GIF.length),
      "Cache-Control": "no-store, max-age=0",
    },
  });
}