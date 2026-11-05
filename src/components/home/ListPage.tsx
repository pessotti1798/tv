"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ListItem, Show } from "@/types";
import { parseEpisodeId } from "@/lib/episodes";
import { useEpisodic } from "@/components/EpisodicProvider";
import { DETAIL_TEXT, GRAY, LIGHT_GRAY, LIST_TEXT, STACKED_ROW_GAP, homeGrid, leftText, withAlign } from "./styles";
import { ACTION, SectionShell } from "./SectionShell";
import { EditableText } from "./EditableText";
import { listSummary } from "./ListsPage";
import { useLeftAlign } from "./useLeftAlign";

function showItem(show: Show): ListItem {
  return {
    id: show.id,
    title: show.title,
    posterUrl: show.posterUrl,
    subtitle: [show.firstAirYear, `${show.totalSeasons} temporada${show.totalSeasons === 1 ? "" : "s"}`]
      .filter(Boolean)
      .join(" · "),
  };
}

/** Uma lista: título e descrição editáveis, itens com link para a série. */
export default function ListPage({ id }: { id: string }) {
  const { userLists, shows, handleUpdateList, handleDeleteList } = useEpisodic();
  const align = useLeftAlign();
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const list = userLists.find((l) => l.id === id);

  if (!list) {
    return (
      <SectionShell title="listas" current="/listas" align={align} backHref="/listas">
        <p className={`${DETAIL_TEXT} ${GRAY}`}>Lista não encontrada.</p>
      </SectionShell>
    );
  }

  // Item de série (id da série) ou de episódio (id do episódio): o link vai para a série, se ela estiver na sua lista.
  const showFor = (item: ListItem) => {
    const showId = shows.some((s) => s.id === item.id) ? item.id : parseEpisodeId(item.id)?.showId;
    return showId && shows.some((s) => s.id === showId) ? showId : null;
  };

  const inList = new Set(list.items.map((i) => i.id));
  const candidates = shows.filter((s) => !inList.has(s.id)).sort((a, b) => a.title.localeCompare(b.title));

  const remove = () => {
    if (!confirm(`Apagar a lista "${list.title}"?`)) return;
    handleDeleteList(list.id);
    router.push(withAlign("/listas", align));
  };

  return (
    <SectionShell title="lista" current="/listas" align={align} backHref="/listas">
      <div className={`${homeGrid(align)} ${LIST_TEXT}`}>
        <h1 className={`font-semibold ${leftText(align)} break-words`}>
          <EditableText
            value={list.title}
            label="Nome da lista"
            onSave={(title) => title && handleUpdateList(list.id, { title })}
            className={leftText(align)}
          />
        </h1>
        <span className={GRAY}>{listSummary(list)}</span>
      </div>

      <div className={`${homeGrid(align)} ${DETAIL_TEXT}`}>
        <span className={`${GRAY} ${leftText(align)}`}>descrição</span>
        <span className="max-w-[38rem]">
          <EditableText
            value={list.description}
            label="Descrição da lista"
            placeholder="+descrição"
            multiline
            onSave={(description) => handleUpdateList(list.id, { description })}
          />
        </span>
      </div>

      <div className={`${homeGrid(align)} ${LIST_TEXT}`}>
        {list.items.map((item) => {
          const showId = showFor(item);
          return (
            <div key={item.id} className="contents">
              {showId ? (
                <Link
                  href={withAlign(`/serie/${encodeURIComponent(showId)}`, align)}
                  className={`${leftText(align)} break-words decoration-1 underline-offset-[0.18em] hover:underline`}
                >
                  {item.title}
                </Link>
              ) : (
                <span className={`${leftText(align)} break-words`}>{item.title}</span>
              )}
              {/* Em listas de episódios o episódio é o conteúdo (preto); em listas de séries, só informação (cinza). */}
              <span className={`${list.itemType === "episodes" ? "" : GRAY} ${STACKED_ROW_GAP} break-words`}>
                {item.subtitle?.replace(/^(S\d+E\d+)\s*•\s*/, "$1 ").replace(/\s*•\s*/g, " · ")}
                <button
                  type="button"
                  onClick={() => handleUpdateList(list.id, { items: list.items.filter((i) => i.id !== item.id) })}
                  className={`${ACTION} text-[0.6em] ml-[0.8em] align-middle`}
                >
                  tirar
                </button>
              </span>
            </div>
          );
        })}

        {adding ? (
          <>
            <button
              type="button"
              onClick={() => setAdding(false)}
              className={`mt-[0.6em] text-black ${leftText(align)} cursor-pointer`}
            >
              adicionar série
            </button>
            <span className={`${LIGHT_GRAY} min-[480px]:mt-[0.6em]`}>
              {candidates.length === 0 ? "todas as suas séries já estão aqui" : "clique para incluir"}
            </span>
            {candidates.map((show) => (
              <div key={show.id} className="contents">
                <button
                  type="button"
                  onClick={() => handleUpdateList(list.id, { items: [...list.items, showItem(show)] })}
                  className={`${GRAY} ${leftText(align)} break-words hover:text-black cursor-pointer transition-colors`}
                >
                  {show.title}
                </button>
                <span className={`${LIGHT_GRAY} ${STACKED_ROW_GAP}`}>{show.firstAirYear}</span>
              </div>
            ))}
            <button type="button" onClick={() => setAdding(false)} className={`mt-[0.6em] ${ACTION} ${leftText(align)}`}>
              pronto
            </button>
            <span />
          </>
        ) : (
          <>
            <button type="button" onClick={() => setAdding(true)} className={`mt-[0.6em] ${ACTION} ${leftText(align)}`}>
              +adicionar série
            </button>
            <span className="mt-[0.6em]" />
          </>
        )}
      </div>

      <div className={`${homeGrid(align)} ${DETAIL_TEXT}`}>
        <button type="button" onClick={remove} className={`${ACTION} ${leftText(align)}`}>
          apagar lista
        </button>
        <span />
      </div>
    </SectionShell>
  );
}
