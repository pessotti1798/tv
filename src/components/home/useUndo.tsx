"use client";

import React, { useEffect, useState } from "react";

const UNDO_TIMEOUT_MS = 6000;

interface Pending {
  id: number;
  message: string;
  undo: () => void;
}

/**
 * Aviso discreto no rodapé com "desfazer", para ações de um clique
 * (ex.: marcar episódio como visto). Some sozinho depois de alguns segundos.
 */
export function useUndo() {
  const [pending, setPending] = useState<Pending | null>(null);

  useEffect(() => {
    if (!pending) return;
    const timer = setTimeout(() => setPending(null), UNDO_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [pending]);

  const offerUndo = (message: string, undo: () => void) => setPending({ id: Date.now(), message, undo });

  const element = (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-6 inset-x-0 flex justify-center px-4 pointer-events-none"
    >
      {pending && (
        <p key={pending.id} className="pointer-events-auto bg-white px-3 py-1.5 text-[0.95rem] text-black">
          {pending.message} ·{" "}
          <button
            type="button"
            onClick={() => {
              pending.undo();
              setPending(null);
            }}
            className="underline underline-offset-[0.18em] cursor-pointer hover:text-[#8a8a8a]"
          >
            desfazer
          </button>
        </p>
      )}
    </div>
  );

  return { offerUndo, undoElement: element };
}
