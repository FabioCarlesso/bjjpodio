// Lista de etapas da temporada: próximas primeiro, depois as realizadas (mais recente no topo).
// Links para as outras temporadas que ainda contam no ranking (peso ×2, ×1).

import { temporadaDe, pesoDaTemporada } from '../ranking.js';
import { temporadasDisponiveis } from '../filters.js';
import {
  esc, formatarPontos, plural, urlCampeonato, montarPagina, temporadaDaPagina, nomeNivel, nomeModalidade, blocoData, formatarData,
  hojeISO, situacaoTorneioFacil,
} from '../render.js';

montarPagina((dados, ctx) => {
  const raiz = document.getElementById('pagina');
  const temporada = temporadaDaPagina(dados);
  const resultadosPorEtapa = new Map();
  for (const r of dados.resultados) {
    if (!resultadosPorEtapa.has(r.campeonatoId)) resultadosPorEtapa.set(r.campeonatoId, []);
    resultadosPorEtapa.get(r.campeonatoId).push(r);
  }

  const hoje = hojeISO();
  const daTemporada = dados.campeonatos.filter((c) => temporadaDe(c) === temporada);
  const proximas = daTemporada.filter((c) => c.data >= hoje).sort((a, b) => a.data.localeCompare(b.data));
  const passadas = daTemporada.filter((c) => c.data < hoje).sort((a, b) => b.data.localeCompare(a.data));
  const realizadas = passadas.filter((c) => resultadosPorEtapa.has(c.id));
  const semResultado = passadas.filter((c) => !resultadosPorEtapa.has(c.id));

  const atual = Number(dados.regras.temporada);
  const pesoT = pesoDaTemporada(temporada, atual, dados.regras);
  document.getElementById('etapas-resumo').textContent = !daTemporada.length
    ? `Temporada ${temporada}: nenhuma etapa cadastrada ainda.`
    : `Temporada ${temporada}: ${plural(daTemporada.length, 'etapa', 'etapas')}, ${realizadas.length} com resultados. `
      + (pesoT ? `No ranking ${atual}, os pontos desta temporada valem ×${formatarPontos(pesoT)}.` : `Os pontos desta temporada não contam mais no ranking ${atual}.`);

  const temporadas = temporadasDisponiveis(dados);
  const nav = document.getElementById('temporadas');
  if (temporadas.length > 1) {
    nav.innerHTML = temporadas.map((t) => `<a class="chip-link" href="${t === atual ? '/campeonatos' : `/campeonatos?temporada=${t}`}"${t === temporada ? ' aria-current="page"' : ''}>${t}</a>`).join('');
    nav.hidden = false;
  }

  const secao = (id, titulo, lista, nota = '') => lista.length ? `
    <section class="container section" aria-labelledby="titulo-${id}">
      <h2 id="titulo-${id}">${titulo} <span class="titulo-contagem">${lista.length}</span></h2>
      ${nota ? `<p class="text-mute">${nota}</p>` : ''}
      <ul class="etapas">${lista.map(card).join('')}</ul>
    </section>` : '';

  raiz.innerHTML = contemplados() + (daTemporada.length
    ? secao('proximas', 'Próximas', proximas)
      + secao('com-resultados', 'Com resultados', realizadas)
      + secao('sem-resultados', 'Sem pódios publicados', semResultado, 'Já aconteceram, mas o organizador não lançou os pódios no Torneio Fácil. Quando lançar, os pontos entram na próxima sincronização.')
    : `<section class="container section"><div class="card placeholder"><strong>Nenhuma etapa cadastrada</strong>As etapas da temporada ${temporada} aparecem aqui quando forem cadastradas.</div></section>`);

  /** Quais torneios o ranking contempla (todas as temporadas) e a situação deles. */
  function contemplados() {
    const doTF = dados.campeonatos.filter((c) => c.torneioFacil);
    if (!doTF.length) return '';
    const comRes = doTF.filter((c) => resultadosPorEtapa.has(c.id)).length;
    const passadas = doTF.filter((c) => c.data < hoje).length;
    const verificado = doTF.map((c) => c.torneioFacil.verificadoEm).filter(Boolean).sort().at(-1);
    const anos = doTF.map((c) => c.data.slice(0, 4)).sort();
    return `
      <section class="container section" aria-labelledby="titulo-contemplados">
        <div class="card contemplados">
          <h2 id="titulo-contemplados">Torneios contemplados</h2>
          <p>O ranking contempla <strong>todos os torneios de jiu-jitsu do Paraná cadastrados no <a href="https://torneiofacil.com" rel="noopener">Torneio Fácil</a></strong>:
            ${plural(doTF.length, 'evento', 'eventos')} de ${anos[0]} a ${anos.at(-1)} (gi e no-gi do mesmo evento contam como uma etapa).</p>
          <p>Só pontuam as categorias com <strong>pódio publicado no Torneio Fácil</strong>. Hoje: <strong>${comRes} de ${passadas}</strong> etapas já realizadas têm pódios publicados.</p>
          ${verificado ? `<p class="text-mute">Última verificação: ${formatarData(verificado, { ano: true })}. Organizador: lance os pódios no Torneio Fácil para os atletas pontuarem.</p>` : ''}
        </div>
      </section>`;
  }

  function card(c) {
    const res = resultadosPorEtapa.get(c.id);
    const peso = dados.regras.pesoPorNivel[c.nivel] ?? 1;
    const sit = situacaoTorneioFacil(c, Boolean(res));
    const detalhe = res
      ? `${plural(new Set(res.map((r) => r.atletaId)).size, 'atleta', 'atletas')} no pódio${sit.tipo === 'parcial' ? ` · parcial (${c.torneioFacil.categoriasComPodio} de ${c.torneioFacil.categorias} categorias)` : ''}`
      : sit.texto;
    return `
      <li class="etapa is-${sit.tipo}">
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
