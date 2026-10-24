import { NextResponse, type NextRequest } from "next/server";
import { readSignedPhoto } from "@/lib/reports/store";

/** Private report photos, served only through short-lived HMAC-signed URLs. */
export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  const buf = readSignedPhoto(p.get("r") ?? "", Number(p.get("n")), Number(p.get("exp")), p.get("sig") ?? "");
  if (!buf) return new NextResponse("Not found", { status: 404 });
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": "image/webp",
      "Cache-Control": "private, no-store",
      "X-Robots-Tag": "noindex",
    },
  });
}
