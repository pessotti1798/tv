"use client";

import React, { useState } from "react";

interface EditableTextProps {
  value: string;
  onSave: (value: string) => void;
  /** Nome do campo, para leitores de tela. */
  label: string;
  /** Texto (cinza-claro) quando o valor está vazio. */
  placeholder?: string;
  multiline?: boolean;
  className?: string;
}

/**
 * Texto que vira campo ao clicar, com a mesma fonte e tamanho. Enter (ou sair
 * do campo) salva; Esc cancela. Nos de várias linhas, Enter quebra a linha e
 * ⌘/Ctrl+Enter salva.
 */
export function EditableText({ value, onSave, label, placeholder = "—", multiline, className = "" }: EditableTextProps) {
  const [draft, setDraft] = useState<string | null>(null);

  if (draft === null) {
    return (
      <button
        type="button"
        onClick={() => setDraft(value)}
        title={`Editar ${label.toLowerCase()}`}
        className={`${className} text-left break-words whitespace-pre-line cursor-text transition-colors duration-150 hover:text-[#8a8a8a] ${
          value ? "" : "text-[#959595] font-light"
        }`}
      >
        {value || placeholder}
      </button>
    );
  }

  const commit = () => {
    if (draft.trim() !== value) onSave(draft.trim());
    setDraft(null);
  };
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") setDraft(null);
    if (e.key === "Enter" && (!multiline || e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      commit();
    }
  };
  const fieldClass = `${className} w-full min-w-0 bg-transparent outline-none caret-black border-b border-[#e5e5e5] focus:border-black placeholder:text-[#c8c8c8]`;

  return multiline ? (
    <textarea
      autoFocus
      value={draft}
      aria-label={label}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={onKeyDown}
      className={`${fieldClass} resize-none [field-sizing:content]`}
    />
  ) : (
    <input
      autoFocus
      value={draft}
      aria-label={label}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={onKeyDown}
      className={fieldClass}
    />
  );
}
