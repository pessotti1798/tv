import { ReleaseStatus } from "@/lib/episodes";

/**
 * Linguagem visual nova: fundo branco, Inter, só tipografia.
 * Duas colunas: à esquerda o rótulo, à direita o conteúdo. Em telas estreitas
 * (< 480px) as colunas viram uma só, com o rótulo em cima.
 */

const GAP = "gap-x-[clamp(1.25rem,4.5vw,4.5rem)]";
// As colunas ficam lado a lado a partir de 480px (variante `min-[480px]:`).
// As classes ficam escritas por extenso porque o Tailwind só gera o que aparece
// literalmente no código.

export const TWO_COLUMNS = `grid grid-cols-1 min-[480px]:grid-cols-2 ${GAP}`;

/**
 * Tamanho da lista principal (≈36px em telas grandes, como no layout).
 * Em tamanho grande a Inter pede espaçamento um pouco mais justo; os números
 * têm largura fixa para os códigos S00E00 alinharem entre as linhas.
 */
export const LIST_TEXT =
  "text-[clamp(1.375rem,2.5vw,2.25rem)] leading-[1.33] tracking-[-0.02em] tabular-nums inter-display";

/** Tamanho dos detalhes (sinopse, notas, episódios na página da série). */
export const DETAIL_TEXT = "text-[clamp(1rem,1.5vw,1.375rem)] leading-[1.45] tabular-nums";

/**
 * Cinzas com contraste mínimo de 3:1 sobre o branco (WCAG para texto grande).
 * GRAY: rótulos e episódios ainda não lançados (3,45:1).
 * LIGHT_GRAY: ações e séries concluídas (3,0:1); usado com peso leve para ficar
 * visualmente abaixo do GRAY.
 */
export const GRAY = "text-[#8a8a8a]";
export const LIGHT_GRAY = "text-[#959595] font-light";

/** Estreou nesta semana: negrito. Ainda não estreou (ou carregando): cinza. */
export function statusClass(status: ReleaseStatus | "completed"): string {
  switch (status) {
    case "this-week":
      return "font-semibold text-black";
    case "aired":
      return "text-black";
    case "completed":
      return LIGHT_GRAY;
    default:
      return GRAY;
  }
}

// ---------------------------------------------------------------------------
// Teste de alinhamento da coluna esquerda (?alinhar=esquerda na URL).
// Padrão: alinhada à direita, formando um eixo central entre as colunas.
// No celular (colunas empilhadas) tudo fica alinhado à esquerda.
// ---------------------------------------------------------------------------

export type LeftAlign = "right" | "left";

/** Alinhamento do texto na coluna esquerda. */
export function leftText(align: LeftAlign): string {
  return align === "left" ? "text-left" : "text-left min-[480px]:text-right";
}

/** Alinhamento de blocos (pôster) na coluna esquerda. */
export function leftItems(align: LeftAlign): string {
  return align === "left" ? "items-start" : "items-start min-[480px]:items-end";
}

/**
 * Grade da lista inicial. Alinhada à esquerda, a coluna dos títulos tem a
 * largura do maior título, para o espaço entre as colunas ficar constante.
 */
export function homeGrid(align: LeftAlign): string {
  return align === "left"
    ? `grid grid-cols-1 min-[480px]:grid-cols-[max-content_minmax(0,1fr)] ${GAP} w-full min-[480px]:w-fit max-w-6xl`
    : `${TWO_COLUMNS} w-full max-w-6xl`;
}

/**
 * Grades da página da série. Alinhada à esquerda, a coluna dos rótulos tem
 * largura fixa, igual em todas as seções, para manter um eixo só.
 */
export function pageGrid(align: LeftAlign): string {
  return align === "left"
    ? `grid grid-cols-1 min-[480px]:grid-cols-[clamp(8rem,22vw,16rem)_minmax(0,1fr)] ${GAP}`
    : TWO_COLUMNS;
}

/** Espaço extra abaixo de cada item quando as colunas estão empilhadas (celular). */
export const STACKED_ROW_GAP = "mb-[0.55em] min-[480px]:mb-0";

/** Mantém o parâmetro de teste ao navegar entre páginas. */
export function withAlign(href: string, align: LeftAlign): string {
  if (align !== "left") return href;
  return `${href}${href.includes("?") ? "&" : "?"}alinhar=esquerda`;
}
