"use client";

import React from "react";
import Link from "next/link";
import { DETAIL_TEXT, GRAY, LIGHT_GRAY, LeftAlign, homeGrid, leftText, withAlign } from "./styles";

/** Seções principais (mesmo menu do rodapé da página inicial). */
export const SECTIONS = [
  { href: "/calendario", label: "calendário" },
  { href: "/diario", label: "diário" },
  { href: "/listas", label: "listas" },
  { href: "/perfil", label: "perfil" },
] as const;

export type SectionHref = (typeof SECTIONS)[number]["href"];

interface SectionShellProps {
  /** Nome da página, em cinza ao lado do "← voltar". */
  title: string;
  /** Seção atual no menu do rodapé (fica em preto, sem link). */
  current?: SectionHref;
  align: LeftAlign;
  /** Destino do "← voltar" (padrão: página inicial). */
  backHref?: string;
  children: React.ReactNode;
  /** Elementos fixos (ex.: aviso de "desfazer"). */
  overlay?: React.ReactNode;
}

/**
 * Estrutura comum das páginas de seção: "← voltar | título" no topo, conteúdo
 * em duas colunas e o mesmo menu do rodapé da página inicial.
 */
export function SectionShell({ title, current, align, backHref = "/", children, overlay }: SectionShellProps) {
  return (
    <main className="min-h-screen bg-white text-black flex flex-col items-center px-4">
      <div className="flex-1 w-full flex flex-col items-center justify-center py-24 gap-[clamp(2rem,5vw,3.5rem)]">
        <div className={`${homeGrid(align)} ${DETAIL_TEXT}`}>
          <Link href={withAlign(backHref, align)} className={`${GRAY} hover:text-black ${leftText(align)}`}>
            ← voltar
          </Link>
          <span className={GRAY}>{title}</span>
        </div>
        {children}
      </div>

      <nav aria-label="Seções" className={`${LIGHT_GRAY} text-sm pb-8 flex flex-wrap justify-center gap-x-4`}>
        <Link href={withAlign("/", align)} className="hover:text-black">
          início
        </Link>
        {SECTIONS.map(({ href, label }) =>
          href === current ? (
            <span key={href} aria-current="page" className="text-black font-normal">
              {label}
            </span>
          ) : (
            <Link key={href} href={withAlign(href, align)} className="hover:text-black">
              {label}
            </Link>
          )
        )}
      </nav>

      {overlay}
    </main>
  );
}

/** Ação em texto (cinza-claro, preta no hover), como "+adicionar" e "remover série". */
export const ACTION = `${LIGHT_GRAY} hover:text-black cursor-pointer transition-colors`;

/** Opções de filtro em texto: a ativa em preto, as outras em cinza. */
export function TextOptions<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  label: string;
}) {
  return (
    <span role="group" aria-label={label} className="flex flex-wrap gap-x-[0.9em]">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={o.value === value}
          onClick={() => onChange(o.value)}
          className={o.value === value ? "text-black" : `${GRAY} hover:text-black cursor-pointer transition-colors`}
        >
          {o.label}
        </button>
      ))}
    </span>
  );
}
