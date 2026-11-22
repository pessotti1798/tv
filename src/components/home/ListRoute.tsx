"use client";

import { useSearchParams } from "next/navigation";
import ListPage from "./ListPage";

/** /lista/?id=… — o ID vem da query (o site é estático, sem rotas dinâmicas). */
export default function ListRoute() {
  const id = useSearchParams().get("id") ?? "";
  return <ListPage key={id} id={id} />;
}
