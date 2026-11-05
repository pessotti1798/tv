"use client";

import React, { useState, useMemo } from "react";
import Image from "next/image";
import { UserProfile, Show, WatchLog } from "@/types";
import { Edit2, Download, Upload, RotateCcw, X, Check } from "lucide-react";
import { exportBackupData, importBackupData, resetToDemoData } from "@/lib/storage";

interface ProfileSectionProps {
  profile: UserProfile;
  shows: Show[];
  diaryLogs: WatchLog[];
  totalReviewsCount: number;
  onUpdateProfile: (newProfile: UserProfile) => void;
  onRefreshAllData: () => void;
}

export const ProfileSection: React.FC<ProfileSectionProps> = ({
  profile,
  shows,
  diaryLogs,
  totalReviewsCount,
  onUpdateProfile,
  onRefreshAllData,
}) => {
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [isEditFavoritesOpen, setIsEditFavoritesOpen] = useState(false);

  // Edit form state
  const [editName, setEditName] = useState(profile.name);
  const [editHandle, setEditHandle] = useState(profile.handle);
  const [editBio, setEditBio] = useState(profile.bio);
  const [editAvatar, setEditAvatar] = useState(profile.avatarUrl);

  // Favorites selection state (up to 4 show IDs)
  const [selectedFavs, setSelectedFavs] = useState<string[]>(profile.favoriteShowIds || []);

  const days = Math.floor(profile.totalMinutesWatched / (60 * 24));
  const hours = Math.floor((profile.totalMinutesWatched % (60 * 24)) / 60);

  // Calculate dynamic rating histogram from diaryLogs
  const { histogramBars, averageRatingText } = useMemo(() => {
    const buckets: Record<string, number> = {
      "0.5": 0, "1.0": 0, "1.5": 0, "2.0": 0, "2.5": 0,
      "3.0": 0, "3.5": 0, "4.0": 0, "4.5": 0, "5.0": 0,
    };

    let totalSum = 0;
    let totalRatedCount = 0;

    diaryLogs.forEach((log) => {
      if (log.rating && log.rating > 0) {
        const roundedKey = (Math.round(log.rating * 2) / 2).toFixed(1);
        if (buckets[roundedKey] !== undefined) {
          buckets[roundedKey]++;
          totalSum += log.rating;
          totalRatedCount++;
        }
      }
    });

    const maxCount = Math.max(...Object.values(buckets), 1);

    const bars = Object.entries(buckets).map(([label, count]) => {
      const heightPercent = totalRatedCount === 0 ? 8 : Math.max(8, Math.round((count / maxCount) * 100));
      return {
        label,
        count,
        height: `${heightPercent}%`,
        isMax: count === maxCount && count > 0,
      };
    });

    const avg = totalRatedCount > 0 ? (totalSum / totalRatedCount).toFixed(1) : "—";

    return { histogramBars: bars, averageRatingText: avg };
  }, [diaryLogs]);

  // Resolve 4 favorite shows
  const favoriteShows = useMemo(() => {
    const favs: Show[] = [];
    const ids = profile.favoriteShowIds || [];

    ids.forEach((id) => {
      const found = shows.find((s) => s.id === id);
      if (found) favs.push(found);
    });

    // If less than 4 found in shows, fill from shows
    shows.forEach((s) => {
      if (favs.length < 4 && !favs.some((f) => f.id === s.id)) {
        favs.push(s);
      }
    });

    return favs.slice(0, 4);
  }, [profile.favoriteShowIds, shows]);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateProfile({
      ...profile,
      name: editName.trim() || profile.name,
      handle: editHandle.trim() || profile.handle,
      bio: editBio.trim() || profile.bio,
      avatarUrl: editAvatar.trim() || profile.avatarUrl,
    });
    setIsEditProfileOpen(false);
  };

  const handleSaveFavorites = () => {
    onUpdateProfile({
      ...profile,
      favoriteShowIds: selectedFavs.slice(0, 4),
    });
    setIsEditFavoritesOpen(false);
  };

  const toggleFavSelect = (id: string) => {
    if (selectedFavs.includes(id)) {
      setSelectedFavs(selectedFavs.filter((item) => item !== id));
    } else {
      if (selectedFavs.length < 4) {
        setSelectedFavs([...selectedFavs, id]);
      }
    }
  };

  const handleExportBackup = () => {
    const json = exportBackupData();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `episodic-backup-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportBackup = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        if (text && importBackupData(text)) {
          alert("Backup restaurado com sucesso!");
          onRefreshAllData();
        } else {
          alert("Arquivo de backup inválido.");
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const handleResetDemo = () => {
    if (confirm("Deseja restaurar os dados de demonstração iniciais? Suas alterações serão substituídas.")) {
      resetToDemoData();
      onRefreshAllData();
    }
  };

  return (
    <section className="space-y-8 animate-fadeIn">
      
      {/* Profile Header Card */}
      <div className="bg-[#1b2228] border border-[#2c3642] rounded-2xl p-6 lg:p-8">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
          <Image width={96} height={96} unoptimized
            src={profile.avatarUrl}
            alt={profile.name}
            className="w-24 h-24 rounded-full object-cover ring-4 ring-[#00e054]/30 shrink-0"
          />
          <div className="flex-1 text-center sm:text-left space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h1 className="text-2xl font-bold text-white">{profile.name}</h1>
                <p className="text-xs text-[#8b9baa]">
                  @{profile.handle} • Membro desde {profile.memberSince}
                </p>
              </div>
              <div className="flex items-center justify-center gap-2">
                <button
                  onClick={() => setIsEditProfileOpen(true)}
                  className="px-4 py-1.5 rounded-full bg-[#242f38] hover:bg-[#2c3642] text-xs font-semibold text-white transition-colors border border-[#2c3642] flex items-center gap-1.5 cursor-pointer"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Editar Perfil</span>
                </button>
              </div>
            </div>
            <p className="text-xs text-[#e1e7ed] max-w-xl">
              {profile.bio}
            </p>
          </div>
        </div>

        {/* TV Time Lifetime Stats */}
        <div className="mt-8 pt-6 border-t border-[#242d36] grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div className="p-3.5 rounded-xl bg-[#14181c] border border-[#242d36]">
            <span className="text-[11px] text-[#8b9baa] uppercase tracking-wider font-semibold">
              Tempo Total Gasto
            </span>
            <div className="text-lg lg:text-xl font-extrabold text-[#00e054] mt-1">
              {days}d {hours}h
            </div>
            <span className="text-[10px] text-[#687684]">
              {Math.round(profile.totalMinutesWatched / 60)} horas da sua vida
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-[#14181c] border border-[#2c3642]">
            <span className="text-[11px] text-[#8b9baa] uppercase tracking-wider font-semibold">
              Episódios Vistos
            </span>
            <div className="text-lg lg:text-xl font-extrabold text-white mt-1">
              {profile.totalEpisodesWatched}
            </div>
            <span className="text-[10px] text-[#687684]">Registrados no sistema</span>
          </div>

          <div className="p-3.5 rounded-xl bg-[#14181c] border border-[#2c3642]">
            <span className="text-[11px] text-[#8b9baa] uppercase tracking-wider font-semibold">
              Séries Finalizadas
            </span>
            <div className="text-lg lg:text-xl font-extrabold text-[#ffaa00] mt-1">
              {profile.totalShowsCompleted}
            </div>
            <span className="text-[10px] text-[#687684]">100% de conclusão</span>
          </div>

          <div className="p-3.5 rounded-xl bg-[#14181c] border border-[#2c3642]">
            <span className="text-[11px] text-[#8b9baa] uppercase tracking-wider font-semibold">
              Resenhas Escritas
            </span>
            <div className="text-lg lg:text-xl font-extrabold text-[#40bcf4] mt-1">
              {totalReviewsCount}
            </div>
            <span className="text-[10px] text-[#687684]">No Diário & Discussões</span>
          </div>
        </div>
      </div>

      {/* 4 Favorite TV Shows */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm uppercase tracking-wider font-bold text-[#8b9baa] flex items-center gap-2">
            <span>★ 4 Séries Favoritas</span>
          </h2>
          <button
            onClick={() => {
              setSelectedFavs(profile.favoriteShowIds || []);
              setIsEditFavoritesOpen(true);
            }}
            className="text-xs text-[#00e054] hover:underline cursor-pointer"
          >
            Alterar favoritas
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {favoriteShows.length === 0 ? (
            <div className="col-span-4 p-8 text-center bg-[#1b2228] border border-dashed border-[#2c3642] rounded-xl text-xs text-[#8b9baa]">
              Nenhuma série favorita selecionada ainda. Clique em &ldquo;Alterar favoritas&rdquo; para escolher as 4 que definem seu gosto.
            </div>
          ) : (
            favoriteShows.map((show) => (
              <div
                key={show.id}
                className="group relative rounded-xl overflow-hidden bg-[#1b2228] border border-[#2c3642] hover:border-[#00e054] transition-all"
              >
                <Image width={300} height={450}
                  src={show.posterUrl}
                  alt={show.title}
                  className="w-full aspect-[2/3] object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3">
                  <span className="text-xs font-bold text-white leading-tight">{show.title}</span>
                  <span className="text-[11px] text-[#00e054]">{show.network}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Dynamic Rating Distribution Histogram */}
      <div className="bg-[#1b2228] border border-[#2c3642] rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-bold text-white">
              Distribuição de Avaliações
            </h2>
            <p className="text-xs text-[#8b9baa]">
              Média ponderada do diário: <strong className="text-white">{averageRatingText} ★</strong>
            </p>
          </div>
          <span className="text-xs text-[#687684]">Baseado em {diaryLogs.length} episódios</span>
        </div>

        <div className="h-32 flex items-end justify-between gap-1 sm:gap-2 px-2 border-b border-[#2c3642] pb-2">
          {histogramBars.map((bar) => (
            <div key={bar.label} className="flex-1 flex flex-col items-center gap-1 group">
              <div
                className={`w-full rounded-t transition-all cursor-pointer ${
                  bar.isMax
                    ? "bg-[#00e054] shadow-sm"
                    : bar.count > 0
                    ? "bg-[#00e054]/60 group-hover:bg-[#00e054]"
                    : "bg-[#242f38] group-hover:bg-[#2c3642]"
                }`}
                style={{ height: bar.height }}
                title={`${bar.count} episódios com nota ${bar.label}`}
              />
              <span className="text-[9px] text-[#8b9baa] group-hover:text-white">
                {bar.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Data Management & Settings */}
      <div className="bg-[#1b2228] border border-[#2c3642] rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold text-white">Gerenciamento & Backup de Dados</h3>
          <p className="text-xs text-[#8b9baa]">
            Exporte todo o seu histórico em formato JSON ou recarregue os dados demo do catálogo.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <button
            onClick={handleExportBackup}
            className="px-3.5 py-1.5 rounded-lg bg-[#242f38] hover:bg-[#2c3642] text-white transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-[#00e054]" />
            <span>Exportar Backup</span>
          </button>

          <button
            onClick={handleImportBackup}
            className="px-3.5 py-1.5 rounded-lg bg-[#242f38] hover:bg-[#2c3642] text-white transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5 text-[#40bcf4]" />
            <span>Importar</span>
          </button>

          <button
            onClick={handleResetDemo}
            className="px-3.5 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Dados Demo</span>
          </button>
        </div>
      </div>

      {/* Modal: Edit Profile */}
      {isEditProfileOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
          <div className="bg-[#1b2228] border border-[#2c3642] w-full max-w-md rounded-2xl overflow-hidden shadow-2xl">
            <form onSubmit={handleSaveProfile}>
              <div className="p-5 border-b border-[#242d36] flex items-center justify-between">
                <h3 className="text-base font-bold text-white">Editar Perfil</h3>
                <button
                  type="button"
                  onClick={() => setIsEditProfileOpen(false)}
                  className="text-[#8b9baa] hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-5 space-y-4 text-xs">
                <div>
                  <label className="block text-[#8b9baa] font-semibold mb-1">Nome Completo</label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full bg-[#14181c] border border-[#2c3642] focus:border-[#00e054] rounded-xl px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-[#8b9baa] font-semibold mb-1">Handle (@)</label>
                  <input
                    type="text"
                    value={editHandle}
                    onChange={(e) => setEditHandle(e.target.value)}
                    className="w-full bg-[#14181c] border border-[#2c3642] focus:border-[#00e054] rounded-xl px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-[#8b9baa] font-semibold mb-1">Bio</label>
                  <textarea
                    rows={3}
                    value={editBio}
                    onChange={(e) => setEditBio(e.target.value)}
                    className="w-full bg-[#14181c] border border-[#2c3642] focus:border-[#00e054] rounded-xl p-3 text-white resize-none"
                  />
                </div>
                <div>
                  <label className="block text-[#8b9baa] font-semibold mb-1">URL do Avatar</label>
                  <input
                    type="text"
                    value={editAvatar}
                    onChange={(e) => setEditAvatar(e.target.value)}
                    className="w-full bg-[#14181c] border border-[#2c3642] focus:border-[#00e054] rounded-xl px-3 py-2 text-white"
                  />
                </div>
              </div>

              <div className="p-4 border-t border-[#242d36] flex justify-end gap-2 bg-[#14181c]">
                <button
                  type="button"
                  onClick={() => setIsEditProfileOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs text-[#8b9baa] hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#00e054] hover:bg-[#00c749] text-black font-bold text-xs"
                >
                  Salvar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit 4 Favorites */}
      {isEditFavoritesOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
          <div className="bg-[#1b2228] border border-[#2c3642] w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl">
            <div className="p-5 border-b border-[#242d36] flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white">Escolha suas 4 Séries Favoritas</h3>
                <p className="text-xs text-[#8b9baa]">Selecione até 4 séries do seu radar ({selectedFavs.length}/4)</p>
              </div>
              <button
                onClick={() => setIsEditFavoritesOpen(false)}
                className="text-[#8b9baa] hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 max-h-72 overflow-y-auto space-y-2 text-xs">
              {shows.map((show) => {
                const isSelected = selectedFavs.includes(show.id);
                return (
                  <div
                    key={show.id}
                    onClick={() => toggleFavSelect(show.id)}
                    className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                      isSelected
                        ? "bg-[#242f38] border-[#00e054] text-white"
                        : "bg-[#14181c] border-[#2c3642] text-[#8b9baa] hover:border-[#384656]"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Image width={40} height={56} src={show.posterUrl} alt={show.title} className="w-10 h-14 object-cover rounded-md" />
                      <div>
                        <h4 className="font-bold text-white">{show.title}</h4>
                        <span className="text-[11px] text-[#687684]">{show.network} • {show.firstAirYear}</span>
                      </div>
                    </div>
                    {isSelected && (
                      <div className="w-6 h-6 rounded-full bg-[#00e054] text-black flex items-center justify-center font-bold">
                        <Check className="w-4 h-4" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="p-4 border-t border-[#242d36] flex justify-end gap-2 bg-[#14181c]">
              <button
                onClick={() => setIsEditFavoritesOpen(false)}
                className="px-4 py-2 rounded-xl text-xs text-[#8b9baa] hover:text-white"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveFavorites}
                className="px-4 py-2 rounded-xl bg-[#00e054] hover:bg-[#00c749] text-black font-bold text-xs"
              >
                Confirmar ({selectedFavs.length}/4)
              </button>
            </div>
          </div>
        </div>
      )}

    </section>
  );
};
