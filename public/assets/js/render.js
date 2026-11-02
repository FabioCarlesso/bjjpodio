// Helpers de renderização compartilhados entre as páginas.
// Tudo que vem dos JSON passa por esc(): os dados são editados à mão.

import { carregarDados } from './data.js';
import { temporadaDe } from './ranking.js';

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

/** "1 pt", "6 pts": abreviação no singular quando for exatamente 1. */
export const rotuloPts = (n) => (n === 1 ? 'pt' : 'pts');

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
    niveis: idx(dados.categorias.niveis ?? []),
    campeonatos: idx(dados.campeonatos),
    atletas: idx(dados.atletas),
  };
}

/**
 * Carrega os dados e chama renderizar(dados, ctx). Cuida do aviso de carregamento/erro (#estado).
 */
export async function montarPagina(renderizar) {
  const estado = document.getElementById('estado');
  let dados;
  try {
    dados = await carregarDados();
  } catch (erro) {
    console.error(erro);
    if (estado) {
      estado.textContent = 'Não foi possível carregar os dados. Confira a conexão e tente de novo.';
      estado.classList.add('is-erro');
    }
    return;
  }
  renderizar(dados, criarContexto(dados));
  if (estado) estado.hidden = true;
  document.body.classList.add('is-pronto');
}

export const parametro = (nome) => new URLSearchParams(location.search).get(nome);

/** Temporada pedida na URL (?temporada=2025) ou a temporada atual de regras.json. */
export function temporadaDaPagina(dados) {
  const pedida = Number(parametro('temporada'));
  return Number.isInteger(pedida) && pedida > 1900 ? pedida : Number(dados.regras.temporada);
}

export function definirTitulo(titulo, descricao) {
  document.title = `${titulo} · BJJ Pódio`;
  if (descricao) document.querySelector('meta[name="description"]')?.setAttribute('content', descricao);
}

/** Bloco padrão de "não encontrado" (id errado no link). */
export function naoEncontrado(raiz, titulo, texto, link) {
  definirTitulo(titulo);
  raiz.innerHTML = `
    <div class="container page-header">
      <h1>${esc(titulo)}</h1>
      <p>${esc(texto)}</p>
    </div>
    <div class="container section"><a href="${esc(link.href)}">${esc(link.texto)}</a></div>`;
}

/** "Azul · Adulto · Leve" (+ " · Masculino" se sexo for informado). */
export function rotuloCategoria({ faixa, idade, peso, sexo }, ctx) {
  return [ctx.faixas.get(faixa)?.nome, ctx.idades.get(idade)?.nome, ctx.pesos.get(peso)?.nome, sexo && ctx.sexos.get(sexo)?.nome]
    .filter(Boolean).join(' · ');
}

export const nomeNivel = (id, ctx) => ctx.niveis.get(id)?.nome ?? id;
export const nomeModalidade = (id, ctx) => ctx.modalidades.get(id)?.nome ?? id;

/** Link para a página de um ranking (modalidade + gênero + idade + faixa, peso opcional). */
export function urlRanking({ modalidade, sexo, idade, faixa, peso, temporada } = {}) {
  const params = new URLSearchParams(Object.entries({ modalidade, sexo, idade, faixa, peso, temporada }).filter(([, v]) => v));
  const qs = params.toString();
  return qs ? `/ranking?${qs}` : '/ranking';
}

/** Link para a academia na página de academias (abre o acordeão dela). */
export const urlAcademia = (id) => `/academias#academia-${encodeURIComponent(id)}`;

/** Nome do ranking no padrão da CBJJ: "Masculino Adulto Azul". */
export function rotuloRanking({ sexo, idade, faixa }, ctx) {
  return [ctx.sexos.get(sexo)?.nome, ctx.idades.get(idade)?.nome, ctx.faixas.get(faixa)?.nome].filter(Boolean).join(' ');
}

/** Etapas de uma temporada: realizadas (com resultado), última realizada e próxima sem resultado. */
export function etapasDaTemporada(dados, temporada) {
  const comResultado = new Set(dados.resultados.map((r) => r.campeonatoId));
  const todas = dados.campeonatos.filter((c) => temporadaDe(c) === Number(temporada)).sort((a, b) => a.data.localeCompare(b.data));
  const realizadas = todas.filter((c) => comResultado.has(c.id));
  return { todas, realizadas, ultima: realizadas.at(-1), proxima: todas.find((c) => !comResultado.has(c.id)) };
}

/** Conta aberta de um resultado: "9 × 4 × 3 = 108". */
export function contaPontos({ base, pesoEtapa, pesoTemporada, pontos }) {
  return `${formatarPontos(base)} × ${formatarPontos(pesoEtapa)} × ${formatarPontos(pesoTemporada)} = ${formatarPontos(pontos)}`;
}

/** Pódio visual (2º, 1º, 3º) das três primeiras linhas de um ranking. */
export function podioHTML(top, ctx) {
  if (!top.length) return '<p class="podio__vazio">Ninguém pontuou neste ranking ainda.</p>';
  return `<ol class="podio__lista">${top.map((l, i) => `
    <li class="podio__item podio__item--${i + 1} ${classePosicao(l.posicao)}">
      <a class="podio__atleta" href="${urlAtleta(l.atletaId)}">${esc(l.atleta.nome)}</a>
      <span class="podio__academia">${faixaBadge(l.atleta.faixa, ctx)}${esc(ctx.academias.get(l.atleta.academiaId)?.nome)}</span>
      <span class="podio__pontos">${formatarPontos(l.pontos)} <small>${rotuloPts(l.pontos)}</small></span>
      <span class="podio__base"><span class="podio__pos">${posicaoTexto(l.posicao)}</span></span>
    </li>`).join('')}
  </ol>`;
}

/** Linhas do ranking (cards no celular, tabela no desktop). */
export function linhasRankingHTML(linhas, ctx) {
  return linhas.map((l) => `
    <li class="linha">
      <span class="linha__pos ${classePosicao(l.posicao)}"><span class="visually-hidden">Posição </span>${posicaoTexto(l.posicao)}</span>
      <span class="linha__atleta">
        <a class="linha__nome" href="${urlAtleta(l.atletaId)}">${esc(l.atleta.nome)}</a>
        <span class="linha__academia">${faixaBadge(l.atleta.faixa, ctx)}${esc(ctx.academias.get(l.atleta.academiaId)?.nome)}</span>
      </span>
      <span class="linha__stats">
        ${medalha('ouros', l.ouros)}${medalha('pratas', l.pratas)}${medalha('bronzes', l.bronzes)}
        <span class="linha__etapas">${l.campeonatosDisputados}<span class="linha__etapas-rot"> ${l.campeonatosDisputados === 1 ? 'etapa' : 'etapas'}</span></span>
      </span>
      <span class="linha__pontos"><strong>${formatarPontos(l.pontos)}</strong> <small>${rotuloPts(l.pontos)}</small></span>
    </li>`).join('');
}

/** Selo de posição (1º/2º/3º) colorido. */
export function seloPosicao(p) {
  return `<span class="selo-pos ${classePosicao(p)}">${posicaoTexto(p)}</span>`;
}

/** Bloco de data "22 / NOV" para cards de etapa. */
export function blocoData(iso) {
  const [, m, d] = iso.split('-').map(Number);
  return `<span class="bloco-data" aria-hidden="true"><span class="bloco-data__dia">${d}</span><span class="bloco-data__mes">${MESES[m - 1]}</span></span>`;
}

/**
 * Marquinha colorida da faixa. Com decorativo: true fica só visual (aria-hidden), para usar
 * onde o texto ao lado já diz a faixa (ex.: "Masculino Adulto Azul") e o leitor de tela não repetir.
 */
export function faixaBadge(faixaId, ctx, { decorativo = false } = {}) {
  const faixa = ctx.faixas.get(faixaId);
  if (!faixa) return '';
  if (decorativo) return `<span class="faixa" data-faixa="${esc(faixaId)}" aria-hidden="true"></span>`;
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

/** Contagem de uma medalha. Leitor de tela ouve "5 ouros"; na tela aparece o ponto colorido e o número. */
export function medalha(tipo, qtd) {
  const [, um, varios] = MEDALHAS.find(([t]) => t === tipo);
  return `<span class="medalha medalha--${tipo}${qtd ? '' : ' is-zero'}"><span class="medalha__dot" aria-hidden="true"></span>${qtd}<span class="visually-hidden"> ${qtd === 1 ? um : varios}</span></span>`;
}

export function posicaoTexto(p) {
  return `${p}º`;
}

/** Classe de cor pela posição: ouro, prata, bronze. */
export function classePosicao(p) {
  return p === 1 ? 'is-ouro' : p === 2 ? 'is-prata' : p === 3 ? 'is-bronze' : '';
}
