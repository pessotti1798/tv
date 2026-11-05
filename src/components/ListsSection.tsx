"use client";

import React, { useState } from "react";
import Image from "next/image";
import { UserList, Show, ListItem } from "@/types";
import { Plus, Heart, X, Trash2, Layers } from "lucide-react";

interface ListsSectionProps {
  lists: UserList[];
  shows: Show[];
  onCreateList: (newList: UserList) => void;
  onDeleteList: (listId: string) => void;
  onToggleLikeList: (listId: string) => void;
}

export const ListsSection: React.FC<ListsSectionProps> = ({
  lists,
  shows,
  onCreateList,
  onDeleteList,
  onToggleLikeList,
}) => {
  // Guarda só o ID: a lista exibida é sempre lida das props atuais.
  const [selectedListId, setSelectedListId] = useState<string | null>(null);
  const selectedList = lists.find((l) => l.id === selectedListId) ?? null;
  const [isCreateOpen, setIsCreateOpen] = useState<boolean>(false);

  // Form State
  const [title, setTitle] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [selectedShowIds, setSelectedShowIds] = useState<string[]>([]);

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const chosenItems: ListItem[] = shows
      .filter((s) => selectedShowIds.includes(s.id))
      .map((s) => ({
        id: s.id,
        title: s.title,
        posterUrl: s.posterUrl,
        subtitle: `${s.totalSeasons} Temporadas • ${s.network}`,
      }));

    const newList: UserList = {
      id: `list-${Date.now()}`,
      title: title.trim(),
      description: description.trim() || "Lista temática curada.",
      authorName: "Você",
      itemType: "shows",
      items: chosenItems,
      likesCount: 1,
      userLiked: true,
      createdAt: "Hoje",
    };

    onCreateList(newList);
    setTitle("");
    setDescription("");
    setSelectedShowIds([]);
    setIsCreateOpen(false);
  };

  const toggleShowSelection = (showId: string) => {
    setSelectedShowIds((prev) =>
      prev.includes(showId) ? prev.filter((id) => id !== showId) : [...prev, showId]
    );
  };

  return (
    <section className="space-y-6 animate-fadeIn">
      
      {/* Header */}
      <div className="pb-4 border-b border-[#242d36] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold tracking-wider text-[#00e054] uppercase">
            <span className="w-2 h-2 rounded-full bg-[#00e054] inline-block"></span>
            <span>Curadorias Comunitárias</span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white mt-1">
            Listas & Recomendações
          </h1>
          <p className="text-sm text-[#8b9baa]">
            Compilações temáticas de temporadas, episódios marcantes e universos de TV.
          </p>
        </div>

        <button
          onClick={() => setIsCreateOpen(true)}
          className="px-4 py-2 rounded-xl bg-[#00e054] hover:bg-[#00c749] text-black font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Criar Nova Lista</span>
        </button>
      </div>

      {/* Lists Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {lists.map((list) => (
          <div
            key={list.id}
            onClick={() => setSelectedListId(list.id)}
            className="bg-[#1b2228] border border-[#2c3642] hover:border-[#384656] rounded-2xl p-5 transition-all group cursor-pointer flex flex-col justify-between shadow-sm relative"
          >
            <div>
              {/* Fan of Posters Effect */}
              <div className="flex -space-x-8 overflow-hidden py-2 mb-3">
                {list.items.length === 0 ? (
                  <div className="h-28 w-20 rounded-lg bg-[#242f38] border border-[#2c3642] flex items-center justify-center text-[#687684]">
                    <Layers className="w-6 h-6" />
                  </div>
                ) : (
                  list.items.slice(0, 5).map((item, idx) => (
                    <Image width={80} height={112}
                      key={item.id || idx}
                      className="inline-block h-28 w-20 object-cover rounded-lg ring-2 ring-[#1b2228] shadow-md group-hover:translate-y-[-2px] transition-transform"
                      src={item.posterUrl}
                      alt={item.title}
                    />
                  ))
                )}
              </div>

              <h3 className="text-base font-bold text-white group-hover:text-[#00e054] transition-colors leading-snug">
                {list.title}
              </h3>
              
              <p className="text-xs text-[#8b9baa] mt-1.5 line-clamp-2 leading-relaxed">
                {list.description}
              </p>
            </div>

            <div className="mt-5 pt-3 border-t border-[#242d36] flex items-center justify-between text-[11px] text-[#687684]">
              <span>Por <strong className="text-white">{list.authorName}</strong></span>
              <div className="flex items-center gap-3">
                <span>{list.items.length} itens</span>
                <span>•</span>
                <span className="flex items-center gap-1 text-[#ffaa00]">
                  <Heart className={`w-3 h-3 ${list.userLiked ? "fill-current" : ""}`} />
                  <strong>{list.likesCount}</strong>
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal: View List Details */}
      {selectedList && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-fadeIn">
          <div className="bg-[#1b2228] border border-[#2c3642] w-full max-w-2xl rounded-2xl overflow-hidden shadow-2xl my-auto max-h-[90vh] flex flex-col">
            
            {/* Header */}
            <div className="p-6 border-b border-[#242d36] flex items-start justify-between gap-4">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-widest text-[#00e054]">
                  Lista Curada • {selectedList.items.length} obras
                </span>
                <h2 className="text-2xl font-bold text-white mt-1">
                  {selectedList.title}
                </h2>
                <p className="text-xs text-[#8b9baa] mt-1">
                  {selectedList.description}
                </p>
              </div>

              <button
                onClick={() => setSelectedListId(null)}
                className="p-1.5 rounded-lg text-[#8b9baa] hover:text-white hover:bg-[#242f38] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* List Items */}
            <div className="p-6 overflow-y-auto space-y-3 flex-1">
              {selectedList.items.map((item, idx) => (
                <div
                  key={item.id || idx}
                  className="bg-[#14181c] border border-[#2c3642] p-3 rounded-xl flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-xs font-mono font-bold text-[#687684] w-4 text-center">
                      {idx + 1}
                    </span>
                    <Image width={48} height={64}
                      src={item.posterUrl}
                      alt={item.title}
                      className="w-12 h-16 object-cover rounded-md bg-[#242f38] shrink-0"
                    />
                    <div className="min-w-0">
                      <h4 className="text-sm font-bold text-white truncate">{item.title}</h4>
                      {item.subtitle && (
                        <p className="text-xs text-[#8b9baa]">{item.subtitle}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-[#242d36] flex items-center justify-between text-xs bg-[#14181c]">
              <button
                onClick={() => onToggleLikeList(selectedList.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-colors cursor-pointer ${
                  selectedList.userLiked
                    ? "bg-red-500/10 border-red-500/30 text-red-400"
                    : "bg-[#1b2228] border-[#2c3642] text-[#8b9baa] hover:text-white"
                }`}
              >
                <Heart className={`w-3.5 h-3.5 ${selectedList.userLiked ? "fill-current" : ""}`} />
                <span>Curtir Lista ({selectedList.likesCount})</span>
              </button>

              <button
                onClick={() => {
                  onDeleteList(selectedList.id);
                  setSelectedListId(null);
                }}
                className="text-red-400 hover:text-red-300 transition-colors flex items-center gap-1 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Excluir Lista</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Modal: Create New List */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-fadeIn">
          <div className="bg-[#1b2228] border border-[#2c3642] w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl my-auto">
            <form onSubmit={handleCreateSubmit}>
              <div className="p-5 border-b border-[#242d36] flex items-center justify-between">
                <h3 className="text-lg font-bold text-white">Criar Nova Lista</h3>
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="text-[#8b9baa] hover:text-white cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-5 space-y-4 text-xs">
                <div>
                  <label className="block text-[#8b9baa] font-semibold mb-1">Título da Lista</label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Ex: Minhas Séries Favoritas de Mistério"
                    className="w-full bg-[#14181c] border border-[#2c3642] focus:border-[#00e054] rounded-xl px-3 py-2 text-white placeholder-[#687684] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[#8b9baa] font-semibold mb-1">Descrição</label>
                  <textarea
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Uma breve introdução ou justificativa curatorial..."
                    className="w-full bg-[#14181c] border border-[#2c3642] focus:border-[#00e054] rounded-xl p-3 text-white placeholder-[#687684] focus:outline-none resize-none"
                  />
                </div>

                <div>
                  <label className="block text-[#8b9baa] font-semibold mb-2">
                    Adicionar Séries do seu Radar ({selectedShowIds.length} selecionadas)
                  </label>
                  <div className="max-h-48 overflow-y-auto space-y-2 border border-[#2c3642] rounded-xl p-2 bg-[#14181c]">
                    {shows.length === 0 ? (
                      <p className="text-center py-4 text-[#8b9baa]">Nenhuma série no seu radar para adicionar.</p>
                    ) : (
                      shows.map((show) => {
                        const isSelected = selectedShowIds.includes(show.id);
                        return (
                          <div
                            key={show.id}
                            onClick={() => toggleShowSelection(show.id)}
                            className={`p-2 rounded-lg flex items-center justify-between cursor-pointer transition-colors ${
                              isSelected ? "bg-[#242f38] text-white" : "hover:bg-[#1b2228] text-[#8b9baa]"
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <Image width={32} height={40} src={show.posterUrl} alt={show.title} className="w-8 h-10 object-cover rounded" />
                              <span className="font-semibold text-white">{show.title}</span>
                            </div>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              readOnly
                              className="accent-[#00e054] pointer-events-none"
                            />
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>

              <div className="p-4 border-t border-[#242d36] flex items-center justify-end gap-2 bg-[#14181c]">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-[#8b9baa] hover:text-white transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!title.trim()}
                  className="px-4 py-2 rounded-xl bg-[#00e054] hover:bg-[#00c749] disabled:opacity-50 text-black font-bold text-xs transition-colors cursor-pointer"
                >
                  Salvar Lista
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </section>
  );
};
