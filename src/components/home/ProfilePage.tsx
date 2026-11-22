"use client";

import React, { useState } from "react";
import Link from "next/link";
import { exportBackupData, importBackupData, resetToDemoData } from "@/lib/storage";
import { useEpisodic } from "@/components/EpisodicProvider";
import { DETAIL_TEXT, GRAY, LIGHT_GRAY, LIST_TEXT, homeGrid, leftText, seriesHref, withAlign } from "./styles";
import { ACTION, SectionShell } from "./SectionShell";
import { EditableText } from "./EditableText";
import { useLeftAlign } from "./useLeftAlign";

const MAX_FAVORITES = 4;

function watchedTime(minutes: number): string {
  const days = Math.floor(minutes / (60 * 24));
  const hours = Math.floor((minutes % (60 * 24)) / 60);
  const parts = [];
  if (days) parts.push(`${days} dia${days === 1 ? "" : "s"}`);
  if (hours || !days) parts.push(`${hours} hora${hours === 1 ? "" : "s"}`);
  return parts.join(" e ");
}

function Label({ children, align }: { children: React.ReactNode; align: "left" | "right" }) {
  return <span className={`${GRAY} ${leftText(align)}`}>{children}</span>;
}

/** Valor da coluna da direita, com espaço extra quando as colunas empilham. */
const VALUE = "mb-[1em] min-[480px]:mb-0";

/** Perfil: dados pessoais editáveis na própria linha, números e backup. */
export default function ProfilePage() {
  const { profile, setProfile, currentProfile, shows, diaryLogs, reloadDataFromStorage } = useEpisodic();
  const align = useLeftAlign();
  const [editingFavorites, setEditingFavorites] = useState(false);

  const favorites = (profile.favoriteShowIds ?? [])
    .map((id) => shows.find((s) => s.id === id))
    .filter((s): s is NonNullable<typeof s> => !!s);

  const toggleFavorite = (id: string) => {
    const ids = profile.favoriteShowIds ?? [];
    const next = ids.includes(id) ? ids.filter((x) => x !== id) : ids.length < MAX_FAVORITES ? [...ids, id] : ids;
    setProfile({ ...profile, favoriteShowIds: next });
  };

  const exportBackup = () => {
    const blob = new Blob([exportBackupData()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `episodic-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importBackup = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json";
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      file.text().then((text) => {
        if (importBackupData(text)) {
          reloadDataFromStorage();
          alert("Backup restaurado.");
        } else {
          alert("Arquivo de backup inválido.");
        }
      });
    };
    input.click();
  };

  const resetDemo = () => {
    if (!confirm("Restaurar os dados de demonstração? Suas alterações serão substituídas.")) return;
    resetToDemoData();
    reloadDataFromStorage();
  };

  const field = (key: "name" | "handle" | "bio") => (value: string) => {
    const clean = key === "handle" ? value.replace(/^@/, "") : value;
    if (key !== "bio" && !clean) return;
    setProfile({ ...profile, [key]: clean });
  };

  return (
    <SectionShell title="perfil" current="/perfil" align={align}>
      <div className={`${homeGrid(align)} ${LIST_TEXT}`}>
        <h1 className={`font-semibold ${leftText(align)} break-words`}>
          <EditableText value={profile.name} label="Nome" onSave={field("name")} className={leftText(align)} />
        </h1>
        <span className={GRAY}>
          @<EditableText value={profile.handle} label="Usuário" onSave={field("handle")} />
        </span>
      </div>

      <div className={`${homeGrid(align)} ${DETAIL_TEXT} gap-y-[0.15em] min-[480px]:gap-y-[1.1em]`}>
        <Label align={align}>bio</Label>
        <span className={`max-w-[38rem] ${VALUE}`}>
          <EditableText value={profile.bio} label="Bio" placeholder="+bio" multiline onSave={field("bio")} />
        </span>

        <Label align={align}>membro desde</Label>
        <span className={VALUE}>{profile.memberSince}</span>

        <Label align={align}>tempo assistido</Label>
        <span className={VALUE}>{watchedTime(currentProfile.totalMinutesWatched)}</span>

        <Label align={align}>episódios vistos</Label>
        <span className={VALUE}>{currentProfile.totalEpisodesWatched}</span>

        <Label align={align}>séries concluídas</Label>
        <span className={VALUE}>
          <Link href={withAlign("/concluidas", align)} className="hover:underline underline-offset-[0.18em]">
            {currentProfile.totalShowsCompleted}
          </Link>
        </span>

        <Label align={align}>no diário</Label>
        <span className={VALUE}>
          <Link href={withAlign("/diario", align)} className="hover:underline underline-offset-[0.18em]">
            {diaryLogs.length} registro{diaryLogs.length === 1 ? "" : "s"}
          </Link>
        </span>

        <Label align={align}>favoritas</Label>
        <span className={`flex flex-col ${VALUE}`}>
          {editingFavorites ? (
            <>
              <span className={LIGHT_GRAY}>
                escolha até {MAX_FAVORITES} · {favorites.length}/{MAX_FAVORITES}
              </span>
              {[...shows]
                .sort((a, b) => a.title.localeCompare(b.title))
                .map((show) => {
                  const selected = profile.favoriteShowIds?.includes(show.id);
                  return (
                    <button
                      key={show.id}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => toggleFavorite(show.id)}
                      className={`text-left cursor-pointer transition-colors ${selected ? "text-black" : `${GRAY} hover:text-black`}`}
                    >
                      {selected ? "✓ " : ""}
                      {show.title}
                    </button>
                  );
                })}
              <button type="button" onClick={() => setEditingFavorites(false)} className={`${ACTION} text-left mt-[0.4em]`}>
                pronto
              </button>
            </>
          ) : (
            <>
              {favorites.map((show) => (
                <Link
                  key={show.id}
                  href={seriesHref(show.id, align)}
                  className="self-start hover:underline underline-offset-[0.18em]"
                >
                  {show.title}
                </Link>
              ))}
              <button type="button" onClick={() => setEditingFavorites(true)} className={`${ACTION} text-left`}>
                {favorites.length ? "editar" : "+escolher favoritas"}
              </button>
            </>
          )}
        </span>

        <Label align={align}>dados</Label>
        <span className={`flex flex-wrap gap-x-[0.9em] ${VALUE}`}>
          <button type="button" onClick={exportBackup} className={ACTION}>
            exportar backup
          </button>
          <button type="button" onClick={importBackup} className={ACTION}>
            importar backup
          </button>
          <button type="button" onClick={resetDemo} className={ACTION}>
            restaurar demonstração
          </button>
        </span>
      </div>
    </SectionShell>
  );
}
