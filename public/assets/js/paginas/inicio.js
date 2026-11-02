// Página inicial: um bloco (top 5) para cada ranking gênero + idade + faixa, como a CBJJ.
// Kimono e no-gi são rankings separados; a busca encontra qualquer atleta.

import { calcularRanking, rankingsDisponiveis, normalizar } from '../ranking.js';
import { modalidadesDisponiveis, MODALIDADE_PADRAO } from '../filters.js';
import {
  esc, formatarPontos, rotuloPts, formatarData, plural, urlAtleta, urlCampeonato, urlRanking, montarPagina,
  rotuloRanking, nomeModalidade, etapasDaTemporada, faixaBadge, pintarFaixas, posicaoTexto, classePosicao,
} from '../render.js';

/** Texto curto de quais torneios entram, para a página inicial. */
function textoContemplados(dados) {
  const doTF = dados.campeonatos.filter((c) => c.torneioFacil);
  if (!doTF.length) return '';
  const comRes = new Set(dados.resultados.map((r) => r.campeonatoId));
  return `Contempla os torneios do Paraná cadastrados no Torneio Fácil: ${doTF.length} eventos, ${doTF.filter((c) => comRes.has(c.id)).length} com pódios publicados. <a href="/campeonatos">Ver torneios contemplados</a>`;
}

const TOP = 5;
const $ = (sel) => document.querySelector(sel);

montarPagina((dados, ctx) => {
  const temporada = Number(dados.regras.temporada);
  const modalidades = modalidadesDisponiveis(dados, temporada);
  const pedida = new URLSearchParams(location.search).get('modalidade');
  let modalidade = modalidades.some((m) => m.id === pedida) ? pedida : MODALIDADE_PADRAO;

  $('[data-temporada]').textContent = temporada;
  renderizarMeta();
  montarModalidades();
  renderizarBlocos();
  configurarBusca();

  const { pontosPorPosicao, pesoPorNivel, pesoPorTemporada } = dados.regras;
  const contemplados = textoContemplados(dados);
  if (contemplados) { $('#contemplados').innerHTML = contemplados; $('#contemplados').hidden = false; }
  $('#ranking-nota').innerHTML = `Pontos = colocação (ouro ${formatarPontos(pontosPorPosicao.categoria[1])}, absoluto ${formatarPontos(pontosPorPosicao.absoluto[1])})
    × peso da etapa (até ×${formatarPontos(Math.max(...Object.values(pesoPorNivel)))})
    × peso da temporada (atual ×${formatarPontos(pesoPorTemporada[0])}). <a href="/regras">Ver regras</a>`;

  function montarModalidades() {
    const raiz = $('#modalidades');
    if (modalidades.length < 2) { raiz.hidden = true; return; }
    raiz.innerHTML = `<legend class="visually-hidden">Modalidade</legend>${modalidades.map((m) => `
      <label class="chip">
        <input type="radio" name="modalidade" value="${esc(m.id)}"${m.id === modalidade ? ' checked' : ''}>
        <span>${esc(m.nome)}</span>
      </label>`).join('')}`;
    raiz.addEventListener('change', (e) => {
      modalidade = e.target.value;
      history.replaceState(null, '', modalidade === MODALIDADE_PADRAO ? location.pathname : `?modalidade=${modalidade}`);
      renderizarBlocos();
    });
  }

  function renderizarBlocos() {
    $('#titulo-modalidade').textContent = nomeModalidade(modalidade, ctx);
    const lista = rankingsDisponiveis(dados, { temporada, modalidade });
    $('#blocos').innerHTML = lista.map((cat, i) => {
      const ranking = calcularRanking(dados, { temporada, modalidade, ...cat });
      const nome = rotuloRanking(cat, ctx);
      return `
        <section class="bloco" aria-labelledby="bloco-${i}">
          <header class="bloco__cab">
            <h3 id="bloco-${i}">${faixaBadge(cat.faixa, ctx, { decorativo: true })} ${esc(nome)}</h3>
            <span class="bloco__qtd">${plural(ranking.length, 'atleta', 'atletas')}</span>
          </header>
          <ol class="bloco__lista">${ranking.slice(0, TOP).map((l) => `
            <li>
              <span class="bloco__pos ${classePosicao(l.posicao)}"><span class="visually-hidden">Posição </span>${posicaoTexto(l.posicao)}</span>
              <span class="bloco__atleta">
                <a href="${urlAtleta(l.atletaId)}">${esc(l.atleta.nome)}</a>
                <span class="text-mute">${esc(ctx.academias.get(l.atleta.academiaId)?.nome)}</span>
              </span>
              <span class="bloco__pts">${formatarPontos(l.pontos)} <small>${rotuloPts(l.pontos)}</small></span>
            </li>`).join('')}
          </ol>
          <a class="bloco__mais" href="${urlRanking({ modalidade, ...cat })}">Ver todos<span class="visually-hidden">: ${esc(nome)}</span></a>
        </section>`;
    }).join('') || `<div class="card placeholder"><strong>Nenhum resultado lançado ainda</strong>Os rankings aparecem aqui depois da primeira etapa${dados.resultados.length ? ` de ${esc(nomeModalidade(modalidade, ctx).toLowerCase())}` : ''}.</div>`;
    pintarFaixas($('#blocos'), ctx);
  }

  function renderizarMeta() {
    const { todas, realizadas, comResultado, ultima, proxima } = etapasDaTemporada(dados, temporada);
    if (!todas.length) return; // nenhuma etapa cadastrada: o hero fica só com nome e slogan
    const itens = [];
    if (ultima) itens.push(`<div><dt>Atualizado após</dt><dd><a href="${urlCampeonato(ultima.id)}">${esc(ultima.nome)}</a> · ${formatarData(ultima.data)}</dd></div>`);
    itens.push(`<div><dt>Etapas ${temporada}</dt><dd><a href="/campeonatos">${realizadas.length} realizadas, ${comResultado.length} com resultados</a></dd></div>`);
    if (proxima) itens.push(`<div><dt>Próxima etapa</dt><dd><a href="${urlCampeonato(proxima.id)}">${esc(proxima.nome)}</a> · ${formatarData(proxima.data)} · ${esc(proxima.cidade)}</dd></div>`);
    $('#hero-meta').innerHTML = itens.join('');
    $('#hero-meta').hidden = false;
  }

  function configurarBusca() {
    const campo = $('#busca');
    const saida = $('#busca-resultados');
    campo.addEventListener('input', () => {
      const termo = normalizar(campo.value);
      if (termo.length < 2) { saida.hidden = true; saida.innerHTML = ''; return; }
      const achados = dados.atletas.filter((a) => normalizar(a.nome).includes(termo)).slice(0, 8);
      saida.innerHTML = achados.length
        ? achados.map((a) => `<li><a href="${urlAtleta(a.id)}">${faixaBadge(a.faixa, ctx)} <span>${esc(a.nome)}</span> <small class="text-mute">${esc(ctx.academias.get(a.academiaId)?.nome)}</small></a></li>`).join('')
        : '<li class="text-mute">Nenhum atleta com esse nome.</li>';
      pintarFaixas(saida, ctx);
      saida.hidden = false;
    });
  }
});
