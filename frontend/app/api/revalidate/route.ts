// frontend/app/api/revalidate/route.ts
import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

export async function POST(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  if (!process.env.REVALIDATE_SECRET || secret !== process.env.REVALIDATE_SECRET) {
    return NextResponse.json({ revalidated: false, message: "Invalid secret" }, { status: 401 });
  }

  // Bust the sitemap and homepage caches immediately after a scrape run so
  // Google and returning visitors see the newly synced listings right away
  // instead of waiting out the ISR window.
  revalidatePath("/sitemap.xml");
  revalidatePath("/");

  return NextResponse.json({ revalidated: true, now: Date.now() });
}