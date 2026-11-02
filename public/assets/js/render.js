// Helpers de renderização compartilhados entre as páginas.
// Tudo que vem dos JSON passa por esc(): os dados são editados à mão.

const fmtPontos = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 });
const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const MEDALHAS = [
  ['ouros', 'ouro', 'ouros'],
  ['pratas', 'prata', 'pratas'],
  ['bronzes', 'bronze', 'bronzes'],
];

export function esc(valor) {
  return String(valor ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

export const formatarPontos = (n) => fmtPontos.format(n);

/** "2026-10-04" → "4 out" (ou "4 out 2026" com ano). Sem Date para não sofrer com fuso. */
export function formatarData(iso, { ano = false } = {}) {
  const [a, m, d] = iso.split('-').map(Number);
  return `${d} ${MESES[m - 1]}${ano ? ` ${a}` : ''}`;
}

export const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;

export const urlAtleta = (id) => `/atleta?id=${encodeURIComponent(id)}`;
export const urlCampeonato = (id) => `/campeonato?id=${encodeURIComponent(id)}`;

/** Indexa as listas de dados por id, para consulta rápida na renderização. */
export function criarContexto(dados) {
  const idx = (lista) => new Map(lista.map((x) => [x.id, x]));
  return {
    academias: idx(dados.academias),
    faixas: idx(dados.categorias.faixas),
    idades: idx(dados.categorias.idades),
    pesos: idx(dados.categorias.pesos),
    modalidades: idx(dados.categorias.modalidades),
    sexos: idx(dados.categorias.sexos),
  };
}

export function faixaBadge(faixaId, ctx) {
  const faixa = ctx.faixas.get(faixaId);
  if (!faixa) return '';
  return `<span class="faixa" data-faixa="${esc(faixaId)}" title="Faixa ${esc(faixa.nome)}"><span class="visually-hidden">Faixa ${esc(faixa.nome)}</span></span>`;
}

/**
 * Aplica a cor de cada faixa (vinda de categorias.json) via CSSOM.
 * Atributo style no HTML seria bloqueado pela CSP; setProperty não é.
 */
export function pintarFaixas(raiz, ctx) {
  raiz.querySelectorAll('[data-faixa]').forEach((el) => {
    const cor = ctx.faixas.get(el.dataset.faixa)?.cor;
    if (cor) el.style.setProperty('--faixa', cor);
  });
}

/** Contagem de uma medalha, com rótulo acessível ("5 ouros"). */
export function medalha(tipo, qtd) {
  const [, um, varios] = MEDALHAS.find(([t]) => t === tipo);
  return `<span class="medalha medalha--${tipo}${qtd ? '' : ' is-zero'}" aria-label="${esc(plural(qtd, um, varios))}"><span class="medalha__dot" aria-hidden="true"></span><span aria-hidden="true">${qtd}</span></span>`;
}

export function posicaoTexto(p) {
  return `${p}º`;
}

/** Classe de cor pela posição: ouro, prata, bronze. */
export function classePosicao(p) {
  return p === 1 ? 'is-ouro' : p === 2 ? 'is-prata' : p === 3 ? 'is-bronze' : '';
}
