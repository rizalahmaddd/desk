import { redirect } from "next/navigation";
import { exchangeShareToken, setShareCookie } from "@/lib/share";
import { APP_NAME } from "@/lib/constants";

export const dynamic = "force-dynamic";

const LINK_PREVIEW_BOTS =
  /whatsapp|facebookexternalhit|facebot|telegrambot|slackbot|twitterbot|discordbot|linkedinbot|skypeuripreview|googlebot|bingbot|applebot|embedly|pinterest|vkshare|redditbot|iframely/i;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  // Chat apps fetch links to build previews; that must not open a session or mark the link as used.
  if (LINK_PREVIEW_BOTS.test(request.headers.get("user-agent") ?? "")) {
    return new Response(
      `<!doctype html><html lang="id"><head><meta charset="utf-8"><title>Portal Project — ${APP_NAME}</title><meta property="og:title" content="Portal Project — ${APP_NAME}"><meta property="og:description" content="Pantau progress, pembayaran, file, dan diskusi project Anda."><meta name="robots" content="noindex"></head><body></body></html>`,
      { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } },
    );
  }

  const { token } = await params;
  const result = await exchangeShareToken(token);

  if (!result) redirect("/share/unavailable");

  await setShareCookie(result.sessionId, result.expiresAt);
  redirect("/portal");
}
