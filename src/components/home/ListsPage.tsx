"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { UserList } from "@/types";
import { useEpisodic } from "@/components/EpisodicProvider";
import { GRAY, LIGHT_GRAY, LIST_TEXT, STACKED_ROW_GAP, homeGrid, leftText, withAlign } from "./styles";
import { SectionShell } from "./SectionShell";
import { useLeftAlign } from "./useLeftAlign";

export function listSummary(list: UserList): string {
  const n = list.items.length;
  const noun = list.itemType === "episodes" ? (n === 1 ? "episódio" : "episódios") : n === 1 ? "série" : "séries";
  return `${n} ${noun}`;
}

/** Índice das listas: mesma forma da página de concluídas. */
export default function ListsPage() {
  const { userLists, handleCreateList } = useEpisodic();
  const align = useLeftAlign();
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");

  const create = () => {
    const name = title.trim();
    if (!name) return;
    const list: UserList = {
      id: `list-${Date.now()}`,
      title: name,
      description: "",
      authorName: "Você",
      itemType: "shows",
      items: [],
      likesCount: 0,
      createdAt: new Date().toISOString().slice(0, 10),
    };
    handleCreateList(list);
    router.push(withAlign(`/listas/${list.id}`, align));
  };

  return (
    <SectionShell title="listas" current="/listas" align={align}>
      <div className={`${homeGrid(align)} ${LIST_TEXT}`}>
        {userLists.map((list) => (
          <div key={list.id} className="contents">
            <Link
              href={withAlign(`/listas/${list.id}`, align)}
              className={`${leftText(align)} break-words decoration-1 underline-offset-[0.18em] hover:underline`}
            >
              {list.title}
            </Link>
            <span className={`${GRAY} ${STACKED_ROW_GAP}`}>{listSummary(list)}</span>
          </div>
        ))}

        {creating ? (
          <>
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") create();
                if (e.key === "Escape") setCreating(false);
              }}
              onBlur={() => !title && setCreating(false)}
              placeholder="nome da lista"
              aria-label="Nome da nova lista"
              className={`mt-[0.6em] w-full min-w-0 bg-transparent ${leftText(align)} font-light outline-none placeholder:text-[#c8c8c8] caret-black`}
            />
            <span className={`${LIGHT_GRAY} min-[480px]:mt-[0.6em]`}>{title.trim() ? "enter para criar" : ""}</span>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => setCreating(true)}
              className={`mt-[0.6em] ${LIGHT_GRAY} ${leftText(align)} hover:text-black transition-colors cursor-pointer`}
            >
              +nova lista
            </button>
            <span className="mt-[0.6em]" />
          </>
        )}
      </div>
    </SectionShell>
  );
}
