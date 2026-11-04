import { NextRequest, NextResponse } from "next/server";
import { getTMDBShowFullDetails } from "@/lib/tmdb";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "ID não fornecido" }, { status: 400 });
  }

  const show = await getTMDBShowFullDetails(id);
  if (!show) {
    return NextResponse.json({ error: "Série não encontrada" }, { status: 404 });
  }

  return NextResponse.json({ show });
}
