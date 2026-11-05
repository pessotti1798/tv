import { NextRequest, NextResponse } from "next/server";
import { getTMDBRecentReleases } from "@/lib/tmdb";

// GET /api/tmdb/releases?page=N -> séries lançadas recentemente, da maior para a menor nota
export async function GET(request: NextRequest) {
  const page = Math.max(1, Math.min(500, Number(request.nextUrl.searchParams.get("page")) || 1));
  const data = await getTMDBRecentReleases(page);
  return NextResponse.json(data);
}
