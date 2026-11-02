// Lista de etapas da temporada: próximas primeiro, depois as realizadas (mais recente no topo).
// Links para as outras temporadas que ainda contam no ranking (peso ×2, ×1).

import { temporadaDe, pesoDaTemporada } from '../ranking.js';
import { temporadasDisponiveis } from '../filters.js';
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

  const atual = Number(dados.regras.temporada);
  const pesoT = pesoDaTemporada(temporada, atual, dados.regras);
  document.getElementById('etapas-resumo').textContent =
    `Temporada ${temporada}: ${plural(daTemporada.length, 'etapa', 'etapas')}, ${realizadas.length} ${realizadas.length === 1 ? 'realizada' : 'realizadas'}. `
    + (pesoT ? `No ranking ${atual}, os pontos desta temporada valem ×${formatarPontos(pesoT)}.` : `Os pontos desta temporada não contam mais no ranking ${atual}.`);

  const temporadas = temporadasDisponiveis(dados);
  const nav = document.getElementById('temporadas');
  if (temporadas.length > 1) {
    nav.innerHTML = temporadas.map((t) => `<a class="chip-link" href="${t === atual ? '/campeonatos' : `/campeonatos?temporada=${t}`}"${t === temporada ? ' aria-current="page"' : ''}>${t}</a>`).join('');
    nav.hidden = false;
  }

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
          <span class="etapa__meta">${esc(c.cidade)} · ${esc(nomeNivel(c.nivel, ctx))} ×${formatarPontos(peso)} · ${c.modalidade.map((m) => esc(nomeModalidade(m, ctx))).join(' e ')}</span>
          <span class="etapa__detalhe">${detalhe}</span>
        </div>
      </li>`;
  }
});
