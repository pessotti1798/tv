"use client";

import React, { useEffect, useRef, useState } from "react";

/** Animações de "marcar como visto". Padrão: contador; as outras seguem disponíveis com ?marcar= na URL. */
export const MARK_ANIMATIONS = ["subir", "contador", "digitar", "check"] as const;
export type MarkAnimation = (typeof MARK_ANIMATIONS)[number];

export function useMarkAnimation(): MarkAnimation {
  const [variant] = useState<MarkAnimation>(() => {
    const param = new URLSearchParams(window.location.search).get("marcar");
    return (MARK_ANIMATIONS as readonly string[]).includes(param ?? "") ? (param as MarkAnimation) : "contador";
  });
  return variant;
}

/** Duração da saída (igual às animações em globals.css). "check" inclui uma pausa para ler o ✓. */
const LEAVE_MS: Record<Exclude<MarkAnimation, "digitar">, number> = {
  subir: 260,
  contador: 280,
  check: 560,
};
/** Velocidade de apagar/digitar, por caractere. */
const ERASE_MS = 14;
const TYPE_MS = 22;

interface WatchableEpisodeProps {
  code: string;
  title: string;
  variant: MarkAnimation;
  /** true quando este episódio acabou de substituir o anterior (anima a chegada). */
  entering: boolean;
  /** Marca o episódio como visto. Chamado ao fim da animação de saída. */
  onCommit: () => void;
  className?: string;
}

/**
 * Episódio clicável da lista inicial. O clique roda a animação de saída e só
 * então marca como visto; o próximo episódio entra como um elemento novo
 * (chave pelo id do episódio) com `entering` ligado.
 */
export function WatchableEpisode({ code, title, variant, entering, onCommit, className = "" }: WatchableEpisodeProps) {
  const full = `${code} ${title}`;
  const [leaving, setLeaving] = useState(false);
  const typingIn = entering && variant === "digitar";
  const [typed, setTyped] = useState(typingIn ? 0 : Infinity);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach((t) => clearTimeout(t));
  }, []);

  // "digitar": o próximo episódio é digitado letra a letra.
  useEffect(() => {
    if (!typingIn) return;
    let count = 0;
    const id = setInterval(() => {
      count += 1;
      setTyped(count);
      if (count >= full.length) clearInterval(id);
    }, TYPE_MS);
    return () => clearInterval(id);
    // Só na montagem.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleClick = () => {
    if (leaving) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      onCommit();
      return;
    }
    setLeaving(true);

    if (variant === "digitar") {
      // Apaga do fim para o começo, como backspace.
      let count = full.length;
      const id = setInterval(() => {
        count -= 1;
        setTyped(Math.max(count, 0));
        if (count <= 0) {
          clearInterval(id);
          onCommit();
        }
      }, ERASE_MS);
      timers.current.push(id as unknown as ReturnType<typeof setTimeout>);
      return;
    }
    timers.current.push(setTimeout(onCommit, LEAVE_MS[variant]));
  };

  let content: React.ReactNode;
  switch (variant) {
    case "subir":
      content = (
        <span className={`ep-anim ${leaving ? "ep-rise-out" : entering ? "ep-rise-in" : ""}`}>{full}</span>
      );
      break;

    case "contador":
      content = (
        <>
          <span className="ep-roll-window">
            <span className={`ep-anim ${leaving ? "ep-roll-out" : entering ? "ep-roll-in" : ""}`}>{code}</span>
          </span>{" "}
          <span className={`ep-anim ${leaving ? "ep-fade-out" : entering ? "ep-fade-in-late" : ""}`}>{title}</span>
        </>
      );
      break;

    case "digitar": {
      const visible = full.slice(0, Math.min(typed, full.length));
      // Espaço invisível mantém a altura da linha enquanto o texto está vazio.
      content = <span>{visible || "​"}</span>;
      break;
    }

    case "check":
      content = (
        <span className={entering ? "ep-anim ep-fade-in" : ""}>
          {leaving && <span className="ep-check">✓&nbsp;</span>}
          <span className={leaving ? "text-[#8a8a8a] transition-colors duration-200" : ""}>{full}</span>
        </span>
      );
      break;
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      title="Marcar como visto"
      aria-label={`Marcar ${full} como visto`}
      className={`${className} text-left break-words cursor-pointer transition-colors duration-150 hover:text-[#8a8a8a] focus-visible:text-[#8a8a8a]`}
    >
      {content}
    </button>
  );
}
