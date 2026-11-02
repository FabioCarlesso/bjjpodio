// Ranking por academia: soma dos pontos de todos os atletas na modalidade (kimono ou no-gi).
// Cada academia abre em acordeão com seus atletas; /academias#academia-<id> já abre a academia.

import { calcularRankingAcademias } from '../ranking.js';
import { modalidadesDisponiveis, MODALIDADE_PADRAO } from '../filters.js';
import {
  esc, formatarPontos, rotuloPts, plural, urlAtleta, montarPagina, temporadaDaPagina, nomeModalidade,
  medalha, posicaoTexto, classePosicao, faixaBadge, pintarFaixas,
} from '../render.js';

montarPagina((dados, ctx) => {
  const temporada = temporadaDaPagina(dados);
  const modalidades = modalidadesDisponiveis(dados, temporada);
  const pedida = new URLSearchParams(location.search).get('modalidade');
  const modalidade = modalidades.some((m) => m.id === pedida) ? pedida : MODALIDADE_PADRAO;
  const ranking = calcularRankingAcademias(dados, { temporada, modalidade });

  document.getElementById('academias-resumo').textContent =
    `${plural(ranking.length, 'academia pontuando', 'academias pontuando')} no ${nomeModalidade(modalidade, ctx).toLowerCase()}, temporada ${temporada}.`;

  const nav = document.getElementById('modalidades');
  if (modalidades.length > 1) {
    nav.innerHTML = modalidades.map((m) => `<a class="chip-link" href="${m.id === MODALIDADE_PADRAO ? '/academias' : `/academias?modalidade=${m.id}`}"${m.id === modalidade ? ' aria-current="page"' : ''}>${esc(m.nome)}</a>`).join('');
    nav.hidden = false;
  }

  const lista = document.getElementById('ranking-academias');
  lista.innerHTML = ranking.map((a) => `
    <li>
      <details class="acordeao__item academia" id="academia-${esc(a.academiaId)}">
        <summary>
          <span class="academia__pos ${classePosicao(a.posicao)}"><span class="visually-hidden">Posição </span>${posicaoTexto(a.posicao)}</span>
          <span class="academia__info">
            <span class="academia__nome">${esc(a.academia?.nome ?? a.academiaId)}</span>
            <span class="academia__meta">${esc(a.academia?.cidade ?? '')} · ${plural(a.atletas, 'atleta', 'atletas')}</span>
            <span class="academia__medalhas">${medalha('ouros', a.ouros)}${medalha('pratas', a.pratas)}${medalha('bronzes', a.bronzes)}</span>
          </span>
          <span class="academia__pontos"><strong>${formatarPontos(a.pontos)}</strong> <small>${rotuloPts(a.pontos)}</small></span>
        </summary>
        <ol class="podio-categoria">${a.membros.map((m) => `
          <li>
            ${faixaBadge(m.atleta.faixa, ctx)}
            <span class="podio-categoria__atleta">
              <a href="${urlAtleta(m.atletaId)}">${esc(m.atleta.nome)}</a>
              <span class="text-mute">${medalha('ouros', m.ouros)} ${medalha('pratas', m.pratas)} ${medalha('bronzes', m.bronzes)}</span>
            </span>
            <span class="podio-categoria__pts">${formatarPontos(m.pontos)} <small>${rotuloPts(m.pontos)}</small></span>
          </li>`).join('')}
        </ol>
      </details>
    </li>`).join('');
  pintarFaixas(lista, ctx);

  // Link direto para uma academia (/academias#academia-x): abre e rola até ela.
  const alvo = location.hash && document.getElementById(decodeURIComponent(location.hash.slice(1)));
  if (alvo?.tagName === 'DETAILS') {
    alvo.open = true;
    alvo.scrollIntoView({ block: 'start' });
  }
});
