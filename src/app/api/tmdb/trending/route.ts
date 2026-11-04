import { NextResponse } from "next/server";
import { getTMDBTrendingShows } from "@/lib/tmdb";

export async function GET() {
  const results = await getTMDBTrendingShows();
  return NextResponse.json({ results });
}
