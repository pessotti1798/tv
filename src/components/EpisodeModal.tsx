"use client";

import React, { useState } from "react";
import Image from "next/image";
import { DiaryLogOptions, Episode, Review } from "@/types";
import { toISODate } from "@/lib/episodes";
import { Check, Star, X, MessageSquare, Heart, ShieldAlert, Users, Film } from "lucide-react";

interface EpisodeModalProps {
  episode: Episode | null;
  isOpen: boolean;
  isWatched: boolean;
  userRating: number;
  reviews: Review[];
  onClose: () => void;
  onToggleWatch: (log: DiaryLogOptions) => void;
  /** Registra mais uma sessão de um episódio já visto (rewatch). */
  onLogWatch: (log: DiaryLogOptions) => void;
  onMarkSeasonWatched: () => void;
  onMarkShowWatched: () => void;
  onSetRating: (rating: number) => void;
  onAddReview: (content: string, hasSpoilers: boolean, log: DiaryLogOptions) => void;
  onLikeReview?: (reviewId: string) => void;
}

export const EpisodeModal: React.FC<EpisodeModalProps> = ({
  episode,
  isOpen,
  isWatched,
  userRating,
  reviews,
  onClose,
  onToggleWatch,
  onLogWatch,
  onMarkSeasonWatched,
  onMarkShowWatched,
  onSetRating,
  onAddReview,
  onLikeReview,
}) => {
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [forceUnlock, setForceUnlock] = useState<boolean>(false);
  const [reviewInput, setReviewInput] = useState<string>("");
  const [hasSpoilersFlag, setHasSpoilersFlag] = useState<boolean>(false);
  const [saveToDiary, setSaveToDiary] = useState<boolean>(true);
  // Se o episódio já foi visto, o próximo registro é naturalmente um rewatch.
  const [isRewatch, setIsRewatch] = useState<boolean>(isWatched);
  const [today] = useState(() => toISODate(new Date()));
  const [watchDate, setWatchDate] = useState<string>(today);

  if (!isOpen || !episode) return null;

  const isUnlocked = isWatched || forceUnlock;

  const logOptions = (): DiaryLogOptions => ({ save: saveToDiary, isRewatch, date: watchDate || today });

  const handlePostReview = () => {
    if (!reviewInput.trim()) return;
    onAddReview(reviewInput.trim(), hasSpoilersFlag, logOptions());
    setReviewInput("");
  };

  const handleToggleLike = (revId: string) => {
    if (onLikeReview) onLikeReview(revId);
  };

  const currentDisplayRating = hoverRating !== null ? hoverRating : userRating;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-fadeIn">
      <div className="bg-[#1b2228] border border-[#2c3642] w-full max-w-3xl rounded-2xl overflow-hidden shadow-2xl my-auto transition-all max-h-[92vh] flex flex-col">
        
        {/* Modal Hero Header with Backdrop */}
        <div className="relative h-56 sm:h-64 w-full overflow-hidden shrink-0">
          <Image fill sizes="(max-width: 768px) 100vw, 768px" loading="eager"
            src={episode.backdropUrl || episode.stillUrl}
            alt={episode.title}
            className="w-full h-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#1b2228] via-[#1b2228]/50 to-transparent" />
          
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-black/60 hover:bg-black text-white flex items-center justify-center transition-colors cursor-pointer z-10"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Episode Info Overlay */}
          <div className="absolute bottom-4 left-6 right-6 flex items-end justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold uppercase tracking-wider text-[#00e054]">
                  {episode.showTitle}
                </span>
                <span className="text-xs text-[#8b9baa]">•</span>
                <span className="text-xs font-mono bg-black/50 px-2 py-0.5 rounded text-white border border-white/10">
                  {episode.code}
                </span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white leading-tight">
                {episode.title}
              </h2>
              <div className="flex items-center gap-3 text-xs text-[#8b9baa] mt-1">
                <span>{episode.runtime} min</span>
                <span>•</span>
                <span>{episode.airDate}</span>
                {episode.averageRating > 0 && (
                  <>
                    <span>•</span>
                    <span className="text-[#ffaa00]">Média: {episode.averageRating}/10</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          
          {/* Primary Action Box: Watched Button & Star Rating */}
          <div className="p-4 rounded-xl bg-[#14181c] border border-[#2c3642] flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4 w-full sm:w-auto">
              
              {/* Watch Toggle Button */}
              <button
                onClick={() => onToggleWatch(logOptions())}
                className={`w-full sm:w-auto px-5 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  isWatched
                    ? "bg-[#242f38] text-[#00e054] hover:bg-[#2c3642]"
                    : "bg-[#00e054] text-black hover:bg-[#00c749] shadow-md"
                }`}
              >
                <Check className="w-4 h-4 stroke-[3]" />
                <span>{isWatched ? "Assistido ✓" : "Marcar como Assistido"}</span>
              </button>

              {/* Star Rating System (Letterboxd Style with half stars) */}
              <div className="flex items-center gap-1.5 text-[#8b9baa]">
                <span className="text-xs text-[#687684]">Sua Nota:</span>
                <div
                  className="flex items-center"
                  onMouseLeave={() => setHoverRating(null)}
                >
                  {[1, 2, 3, 4, 5].map((starIdx) => {
                    const isFullyFilled = currentDisplayRating >= starIdx;
                    const isHalfFilled = currentDisplayRating >= starIdx - 0.5 && !isFullyFilled;

                    return (
                      <div key={starIdx} className="relative p-0.5">
                        {/* Invisible left half hit target */}
                        <div
                          className="absolute inset-y-0 left-0 w-1/2 z-10 cursor-pointer"
                          onMouseEnter={() => setHoverRating(starIdx - 0.5)}
                          onClick={() => onSetRating(starIdx - 0.5)}
                        />
                        {/* Invisible right half hit target */}
                        <div
                          className="absolute inset-y-0 right-0 w-1/2 z-10 cursor-pointer"
                          onMouseEnter={() => setHoverRating(starIdx)}
                          onClick={() => onSetRating(starIdx)}
                        />

                        <Star
                          className={`w-5 h-5 transition-colors pointer-events-none ${
                            isFullyFilled
                              ? "fill-[#00e054] text-[#00e054]"
                              : isHalfFilled
                              ? "fill-[#00e054]/50 text-[#00e054]"
                              : "fill-transparent text-[#404f5e]"
                          }`}
                        />
                      </div>
                    );
                  })}
                </div>
                <span className="text-xs font-bold text-white min-w-8">
                  {currentDisplayRating > 0 ? `${currentDisplayRating.toFixed(1)} ★` : "—"}
                </span>
                {userRating > 0 && (
                  <button
                    onClick={() => onSetRating(0)}
                    className="text-[10px] text-[#8b9baa] hover:text-red-400 ml-1 transition-colors cursor-pointer"
                    title="Remover nota"
                  >
                    limpar
                  </button>
                )}
              </div>
            </div>

            {/* Diary Options: valem para "Marcar como Assistido", "Registrar no Diário" e "Publicar Resenha" */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-[#8b9baa] w-full">
              <label className="flex items-center gap-1.5 cursor-pointer select-none hover:text-white transition-colors">
                <input
                  type="checkbox"
                  checked={saveToDiary}
                  onChange={(e) => setSaveToDiary(e.target.checked)}
                  className="accent-[#00e054] rounded"
                />
                <span>Salvar no Diário</span>
              </label>
              <label className={`flex items-center gap-1.5 ${saveToDiary ? "" : "opacity-40"}`}>
                <span>Assistido em</span>
                <input
                  type="date"
                  value={watchDate}
                  max={today}
                  disabled={!saveToDiary}
                  onChange={(e) => setWatchDate(e.target.value)}
                  className="bg-[#1b2228] border border-[#2c3642] rounded-md px-1.5 py-0.5 text-white [color-scheme:dark] disabled:cursor-not-allowed"
                />
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer select-none hover:text-white transition-colors">
                <input
                  type="checkbox"
                  checked={isRewatch}
                  onChange={(e) => setIsRewatch(e.target.checked)}
                  className="accent-[#00e054] rounded"
                />
                <span>🔁 Rewatch</span>
              </label>
              {isWatched && (
                <button
                  type="button"
                  onClick={() => onLogWatch({ ...logOptions(), save: true })}
                  className="ml-auto px-2.5 py-1 rounded-lg bg-[#1f272f] hover:bg-[#242f38] text-white font-medium border border-[#2c3642] transition-colors cursor-pointer"
                  title="Adiciona mais uma sessão deste episódio ao diário"
                >
                  + Registrar no Diário
                </button>
              )}
            </div>

            {/* Batch Actions */}
            <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-[#242d36]/60 w-full text-xs">
              <span className="text-[#687684]">Ações rápidas:</span>
              <button
                type="button"
                onClick={onMarkSeasonWatched}
                className="px-2.5 py-1 rounded-lg bg-[#1f272f] hover:bg-[#242f38] text-[#00e054] font-medium border border-[#2c3642] transition-colors cursor-pointer flex items-center gap-1"
              >
                <span>✓ Marcar Temporada {episode.seasonNumber} Inteira</span>
              </button>
              <button
                type="button"
                onClick={onMarkShowWatched}
                className="px-2.5 py-1 rounded-lg bg-[#1f272f] hover:bg-[#242f38] text-[#ffaa00] font-medium border border-[#2c3642] transition-colors cursor-pointer flex items-center gap-1"
              >
                <span>✓✓ Marcar Série Toda</span>
              </button>
            </div>
          </div>

          {/* Synopsis & Credits */}
          <div className="space-y-3">
            <div>
              <h4 className="text-xs uppercase tracking-wider font-semibold text-[#8b9baa] mb-1">
                Sinopse do Episódio
              </h4>
              <p className="text-xs sm:text-sm text-[#e1e7ed] leading-relaxed">
                {episode.overview}
              </p>
            </div>

            {(episode.director || (episode.guestStars && episode.guestStars.length > 0)) && (
              <div className="p-3 rounded-lg bg-[#14181c] border border-[#2c3642] flex flex-wrap items-center gap-4 text-xs text-[#8b9baa]">
                {episode.director && (
                  <div className="flex items-center gap-1.5">
                    <Film className="w-3.5 h-3.5 text-[#00e054]" />
                    <span>Direção: <strong className="text-white">{episode.director}</strong></span>
                  </div>
                )}
                {episode.guestStars && episode.guestStars.length > 0 && (
                  <div className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-[#ffaa00]" />
                    <span>Convidados: <strong className="text-white">{episode.guestStars.join(", ")}</strong></span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* O MURO ANTI-SPOILER: FEED DE DISCUSSÃO DO EPISÓDIO */}
          <div className="space-y-4 pt-4 border-t border-[#242d36]">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-[#00e054]" />
                <span>Discussão da Comunidade</span>
                <span className="text-xs bg-[#242f38] text-[#00e054] px-2 py-0.5 rounded-full font-mono font-normal">
                  {reviews.length} resenhas
                </span>
              </h3>
              <span className="text-xs text-[#8b9baa]">Portão Anti-Spoiler Ativo</span>
            </div>

            {/* Locked State: Unwatched Warning */}
            {!isUnlocked ? (
              <div className="relative rounded-xl p-8 text-center bg-gradient-to-b from-[#14181c]/90 to-[#14181c] border border-[#ffaa00]/30 overflow-hidden space-y-3">
                <div className="w-12 h-12 rounded-full bg-[#ffaa00]/10 text-[#ffaa00] flex items-center justify-center mx-auto">
                  <ShieldAlert className="w-6 h-6" />
                </div>
                <h4 className="text-base font-bold text-white">
                  Conteúdo Bloqueado para Evitar Spoilers
                </h4>
                <p className="text-xs text-[#8b9baa] max-w-md mx-auto leading-relaxed">
                  Você ainda não marcou este episódio como assistido. Para proteger sua experiência e não revelar desfechos cruciais, as resenhas e discussões da comunidade estão ocultadas.
                </p>
                <div className="flex items-center justify-center gap-4 pt-2">
                  <button
                    onClick={() => onToggleWatch(logOptions())}
                    className="px-4 py-2 rounded-xl bg-[#00e054] hover:bg-[#00c749] text-black font-bold text-xs transition-colors cursor-pointer"
                  >
                    Marcar como Visto & Desbloquear
                  </button>
                  <button
                    onClick={() => setForceUnlock(true)}
                    className="text-xs text-[#8b9baa] hover:text-white underline cursor-pointer"
                  >
                    Ver resenhas mesmo assim
                  </button>
                </div>
              </div>
            ) : (
              /* Unlocked State: Review Form + Community Comments */
              <div className="space-y-4">
                
                {/* Form to write review */}
                <div className="bg-[#14181c] border border-[#2c3642] rounded-xl p-3 space-y-2">
                  <textarea
                    value={reviewInput}
                    onChange={(e) => setReviewInput(e.target.value)}
                    placeholder="Escreva sua análise ou impressão crítica sobre este episódio..."
                    className="w-full bg-transparent text-xs text-white placeholder-[#687684] focus:outline-none resize-none h-16"
                  />
                  <div className="flex items-center justify-between pt-2 border-t border-[#242d36]">
                    <label className="flex items-center gap-1.5 text-xs text-[#8b9baa] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={hasSpoilersFlag}
                        onChange={(e) => setHasSpoilersFlag(e.target.checked)}
                        className="accent-[#ffaa00]"
                      />
                      <span>Contém spoilers expressos</span>
                    </label>
                    <button
                      onClick={handlePostReview}
                      disabled={!reviewInput.trim()}
                      className="px-4 py-1.5 rounded-lg bg-[#00e054] hover:bg-[#00c749] disabled:opacity-50 disabled:cursor-not-allowed text-black font-bold text-xs transition-colors cursor-pointer"
                    >
                      Publicar Resenha
                    </button>
                  </div>
                </div>

                {/* Existing Reviews List */}
                <div className="space-y-3">
                  {reviews.length === 0 ? (
                    <p className="text-xs text-[#8b9baa] py-4 text-center">
                      Nenhuma resenha publicada ainda. Seja o primeiro a registrar seus pensamentos!
                    </p>
                  ) : (
                    reviews.map((rev) => {
                      const isLikedByUser = !!rev.userLiked;
                      const displayLikesCount = rev.likesCount;

                      return (
                        <div
                          key={rev.id}
                          className="bg-[#14181c] border border-[#2c3642] p-4 rounded-xl space-y-2"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                              <Image width={24} height={24} unoptimized
                                src={rev.userAvatar}
                                alt={rev.userName}
                                className="w-6 h-6 rounded-full object-cover"
                              />
                              <span className="text-xs font-bold text-white">{rev.userName}</span>
                              <span className="text-[11px] text-[#00e054] font-bold">
                                {"★".repeat(Math.floor(rev.rating))}
                                {rev.rating % 1 !== 0 && "½"}
                              </span>
                              {rev.hasSpoilers && (
                                <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.2 rounded bg-[#ffaa00]/10 text-[#ffaa00] border border-[#ffaa00]/20">
                                  Spoiler
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-[#687684]">{rev.createdAt}</span>
                          </div>
                          <p className="text-xs text-[#e1e7ed] leading-relaxed">
                            {rev.content}
                          </p>
                          <div className="flex items-center gap-4 text-[11px] text-[#8b9baa] pt-1">
                            <button
                              onClick={() => handleToggleLike(rev.id)}
                              className={`flex items-center gap-1 transition-colors cursor-pointer ${
                                isLikedByUser ? "text-red-400" : "hover:text-[#00e054]"
                              }`}
                            >
                              <Heart className={`w-3.5 h-3.5 ${isLikedByUser ? "fill-current" : ""}`} />
                              <strong>{displayLikesCount}</strong>
                            </button>
                            <span className="text-[#404f5e]">•</span>
                            <span className="text-[#687684]">Episódio verificado</span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

              </div>
            )}

          </div>

        </div>

      </div>
    </div>
  );
};
