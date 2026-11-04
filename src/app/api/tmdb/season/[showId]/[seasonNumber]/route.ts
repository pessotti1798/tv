import { NextRequest, NextResponse } from "next/server";
import { getTMDBSeasonDetails } from "@/lib/tmdb";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ showId: string; seasonNumber: string }> }
) {
  const { showId, seasonNumber } = await params;
  const sNum = parseInt(seasonNumber, 10);

  if (!showId || isNaN(sNum)) {
    return NextResponse.json({ error: "Parâmetros inválidos" }, { status: 400 });
  }

  const season = await getTMDBSeasonDetails(showId, sNum);
  if (!season) {
    return NextResponse.json({ error: "Temporada não encontrada" }, { status: 404 });
  }

  return NextResponse.json({ season });
}
