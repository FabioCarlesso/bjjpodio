// Ranking por academia: soma dos pontos dos atletas na temporada.

import { calcularRankingAcademias } from '../ranking.js';
import {
  esc, formatarPontos, rotuloPts, plural, urlRanking, montarPagina, temporadaDaPagina, medalha, posicaoTexto, classePosicao,
} from '../render.js';

montarPagina((dados) => {
  const temporada = temporadaDaPagina(dados);
  const ranking = calcularRankingAcademias(dados, { temporada });

  document.getElementById('academias-resumo').textContent =
    `${plural(ranking.length, 'academia pontuando', 'academias pontuando')} na temporada ${temporada}.`;

  document.getElementById('ranking-academias').innerHTML = ranking.map((a) => `
    <li class="linha">
      <span class="linha__pos ${classePosicao(a.posicao)}"><span class="visually-hidden">Posição </span>${posicaoTexto(a.posicao)}</span>
      <span class="linha__atleta">
        <a class="linha__nome" href="${urlRanking({ academia: a.academiaId })}">${esc(a.academia?.nome ?? a.academiaId)}</a>
        <span class="linha__academia">${esc(a.academia?.cidade ?? '')}</span>
      </span>
      <span class="linha__stats">
        ${medalha('ouros', a.ouros)}${medalha('pratas', a.pratas)}${medalha('bronzes', a.bronzes)}
        <span class="linha__etapas">${a.atletas}<span class="linha__etapas-rot"> ${a.atletas === 1 ? 'atleta' : 'atletas'}</span></span>
      </span>
      <span class="linha__pontos"><strong>${formatarPontos(a.pontos)}</strong> <small>${rotuloPts(a.pontos)}</small></span>
    </li>`).join('');
});
