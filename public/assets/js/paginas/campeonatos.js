// Lista de etapas da temporada: próximas primeiro, depois as realizadas (mais recente no topo).

import { temporadaDe } from '../ranking.js';
import {
  esc, formatarPontos, plural, urlCampeonato, montarPagina, temporadaDaPagina, nomeNivel, nomeModalidade, blocoData, formatarData,
} from '../render.js';

montarPagina((dados, ctx) => {
  const raiz = document.getElementById('pagina');
  const temporada = temporadaDaPagina(dados);
  const resultadosPorEtapa = new Map();
  for (const r of dados.resultados) {
    if (!resultadosPorEtapa.has(r.campeonatoId)) resultadosPorEtapa.set(r.campeonatoId, []);
    resultadosPorEtapa.get(r.campeonatoId).push(r);
  }

  const daTemporada = dados.campeonatos.filter((c) => temporadaDe(c) === temporada);
  const proximas = daTemporada.filter((c) => !resultadosPorEtapa.has(c.id)).sort((a, b) => a.data.localeCompare(b.data));
  const realizadas = daTemporada.filter((c) => resultadosPorEtapa.has(c.id)).sort((a, b) => b.data.localeCompare(a.data));

  document.getElementById('etapas-resumo').textContent =
    `Temporada ${temporada}: ${plural(daTemporada.length, 'etapa', 'etapas')}, ${realizadas.length} ${realizadas.length === 1 ? 'realizada' : 'realizadas'}.`;

  const secao = (titulo, lista) => lista.length ? `
    <section class="container section" aria-labelledby="titulo-${titulo.toLowerCase()}">
      <h2 id="titulo-${titulo.toLowerCase()}">${titulo}</h2>
      <ul class="etapas">${lista.map(card).join('')}</ul>
    </section>` : '';

  raiz.innerHTML = daTemporada.length
    ? secao('Próximas', proximas) + secao('Realizadas', realizadas)
    : `<section class="container section"><div class="card placeholder"><strong>Nenhuma etapa cadastrada</strong>A agenda da temporada ${temporada} ainda não foi divulgada.</div></section>`;

  function card(c) {
    const res = resultadosPorEtapa.get(c.id);
    const peso = dados.regras.pesoPorNivel[c.nivel] ?? 1;
    const detalhe = res
      ? `${plural(new Set(res.map((r) => r.atletaId)).size, 'atleta', 'atletas')} no pódio`
      : 'Resultados depois da etapa';
    return `
      <li class="etapa${res ? '' : ' is-proxima'}">
        ${blocoData(c.data)}
        <div class="etapa__info">
          <a class="etapa__nome" href="${urlCampeonato(c.id)}">${esc(c.nome)}</a>
          <span class="visually-hidden">${formatarData(c.data, { ano: true })}</span>
          <span class="etapa__meta">${esc(c.cidade)} · ${esc(nomeNivel(c.nivel, ctx))}${peso !== 1 ? ` ×${formatarPontos(peso)}` : ''} · ${c.modalidade.map((m) => esc(nomeModalidade(m, ctx))).join(' e ')}</span>
          <span class="etapa__detalhe">${detalhe}</span>
        </div>
      </li>`;
  }
});
