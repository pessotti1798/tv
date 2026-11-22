export function pad2(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

export function episodeCode(season: number, episode: number): string {
  return `S${pad2(season)}E${pad2(episode)}`;
}

/** Formato canônico de ID de episódio: `${showId}-${temporada}-${episódio}`. */
export function makeEpisodeId(showId: string, season: number, episode: number): string {
  return `${showId}-${season}-${episode}`;
}
