// Helpers de renderização compartilhados entre as páginas.
// Tudo que vem dos JSON passa por esc(): os dados são editados à mão.

import { carregarDados } from './data.js';

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

/** Link para o ranking geral já filtrado. */
export function urlRanking(filtro) {
  const params = new URLSearchParams(Object.entries(filtro).filter(([, v]) => v));
  const qs = params.toString();
  return qs ? `/?${qs}` : '/';
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
