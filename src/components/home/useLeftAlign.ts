"use client";

import { useState } from "react";
import { LeftAlign } from "./styles";

/** Lê o teste de alinhamento da URL (?alinhar=esquerda). Os componentes rodam só no cliente. */
export function useLeftAlign(): LeftAlign {
  const [align] = useState<LeftAlign>(() =>
    new URLSearchParams(window.location.search).get("alinhar") === "esquerda" ? "left" : "right"
  );
  return align;
}
