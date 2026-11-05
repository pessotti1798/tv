"use client";

import dynamic from "next/dynamic";

// Os dados ficam no localStorage, que só existe no navegador: o provider é
// montado só no cliente para não divergir da renderização do servidor.
const EpisodicProvider = dynamic(
  () => import("@/components/EpisodicProvider").then((m) => m.EpisodicProvider),
  { ssr: false, loading: () => <div className="min-h-screen bg-white" /> }
);

export default function ClientRoot({ children }: { children: React.ReactNode }) {
  return <EpisodicProvider>{children}</EpisodicProvider>;
}
