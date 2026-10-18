import { after, NextRequest, NextResponse } from "next/server";
import { verifyClick } from "@/lib/tracking-token";
import { recordClick } from "@/lib/events";

export async function GET(req: NextRequest, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  const click = verifyClick(token);
  if (!click) return new NextResponse("This link is not valid.", { status: 400 });

  const ua = req.headers.get("user-agent") ?? undefined;
  after(() =>
    recordClick(click.messageId, click.url, ua).catch((e) => console.error("recordClick failed", e))
  );

  // 302, not 301: a permanent redirect would be cached and later clicks would not reach us.
  const res = NextResponse.redirect(click.url, 302);
  res.headers.set("Cache-Control", "no-store");
  return res;
}