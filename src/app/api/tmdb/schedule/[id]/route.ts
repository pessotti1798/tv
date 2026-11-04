import { NextRequest, NextResponse } from "next/server";
import { getTMDBAirSchedule } from "@/lib/tmdb";

// GET /api/tmdb/schedule/:tmdbId?since=YYYY-MM-DD
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const since = request.nextUrl.searchParams.get("since") ?? "";

  if (!/^\d+$/.test(id) || !/^\d{4}-\d{2}-\d{2}$/.test(since)) {
    return NextResponse.json({ error: "Parâmetros inválidos" }, { status: 400 });
  }

  const schedule = await getTMDBAirSchedule(id, since);
  if (!schedule) {
    return NextResponse.json({ error: "Agenda indisponível" }, { status: 502 });
  }
  return NextResponse.json({ schedule });
}
