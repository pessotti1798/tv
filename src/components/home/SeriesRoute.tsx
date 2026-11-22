"use client";

import { useSearchParams } from "next/navigation";
import SeriesPage from "./SeriesPage";

/** /serie/?id=… — o ID vem da query (o site é estático, sem rotas dinâmicas). */
export default function SeriesRoute() {
  const id = useSearchParams().get("id") ?? "";
  // A chave refaz a página (e seus estados) quando o ID muda.
  return <SeriesPage key={id} id={id} />;
}
