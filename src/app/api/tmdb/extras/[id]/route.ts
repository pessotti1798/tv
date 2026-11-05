import { NextRequest, NextResponse } from "next/server";
import { getSeriesExtras } from "@/lib/tmdb";

// GET /api/tmdb/extras/:tmdbId -> notas (IMDb, Metacritic, TMDB) e onde assistir no Brasil
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^\d+$/.test(id)) {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  }
  const extras = await getSeriesExtras(id);
  if (!extras) {
    return NextResponse.json({ error: "Série não encontrada" }, { status: 404 });
  }
  return NextResponse.json({ extras });
}
