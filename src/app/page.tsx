"use client";

import dynamic from "next/dynamic";

// O app guarda tudo no localStorage, que só existe no navegador. Renderizar só
// no cliente evita divergência entre servidor e cliente na hidratação.
const EpisodicApp = dynamic(() => import("@/components/EpisodicApp"), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-[#14181c] flex items-center justify-center text-xs text-[#8b9baa]">
      Carregando Episodic...
    </div>
  ),
});

export default function Home() {
  return <EpisodicApp />;
}
