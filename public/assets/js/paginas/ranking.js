// Página de um ranking (/ranking?modalidade=kimono&sexo=M&idade=adulto&faixa=azul[&peso=leve][&temporada=2025]):
// pódio, filtro de peso (com absoluto) que recalcula como na CBJJ, busca e lista completa.

import { calcularRanking, rankingsDisponiveis } from '../ranking.js';
import {
  temporadasDisponiveis, modalidadesDisponiveis, pesosDoRanking, lerRankingDaURL, escolherRanking, rankingParaQuery,
} from '../filters.js';
import {
  esc, plural, formatarData, urlCampeonato, montarPagina, definirTitulo, rotuloRanking, nomeModalidade,
  etapasDaTemporada, podioHTML, linhasRankingHTML, pintarFaixas,
} from '../render.js';

const $ = (sel) => document.querySelector(sel);

montarPagina((dados, ctx) => {
  const padraoTemporada = Number(dados.regras.temporada);
  const temporadas = temporadasDisponiveis(dados);
  let filtro = lerRankingDaURL(location.search, dados);
  if (!filtro) {
    $('#pagina-ranking').innerHTML = '<div class="container section"><div class="card placeholder"><strong>Nenhum ranking ainda</strong>Os rankings aparecem depois da primeira etapa.</div></div>';
    return;
  }

  $('#busca').value = filtro.q;
  montarFiltros();
  renderizar();

  $('#filtros').addEventListener('submit', (e) => e.preventDefault());
  $('#filtros-campos').addEventListener('change', (e) => aoMudar(e.target.name));
  $('#busca').addEventListener('input', () => {
    filtro.q = $('#busca').value.trim();
    renderizar();
  });

  function aoMudar(campo) {
    const form = new FormData($('#filtros'));
    const novo = { ...filtro };
    for (const c of ['modalidade', 'sexo', 'idade', 'faixa', 'peso', 'temporada']) if (form.has(c)) novo[c] = form.get(c);
    novo.temporada = Number(novo.temporada || filtro.temporada);

    // Se a modalidade não existe na temporada nova, volta para a primeira disponível.
    const modalidades = modalidadesDisponiveis(dados, novo.temporada).map((m) => m.id);
    if (!modalidades.includes(novo.modalidade)) novo.modalidade = modalidades[0];
    // A combinação gênero + idade + faixa pode não existir: escolhe a mais parecida, respeitando o campo trocado.
    Object.assign(novo, escolherRanking(dados, novo, novo, campo));
    if (!pesosDoRanking(dados, novo).some((p) => p.id === novo.peso)) novo.peso = '';

    filtro = novo;
    montarFiltros();
    $(`#filtros-campos [name="${campo}"]`)?.focus();
    renderizar();
  }

  function montarFiltros() {
    const disponiveis = rankingsDisponiveis(dados, filtro);
    const usados = (campo, lista) => lista.filter((x) => disponiveis.some((c) => c[campo] === x.id));
    const { categorias } = dados;
    const modalidades = modalidadesDisponiveis(dados, filtro.temporada);
    const partes = [];

    if (modalidades.length > 1) {
      partes.push(`<div class="filtros__chips"><fieldset class="chips"><legend class="visually-hidden">Modalidade</legend>${modalidades.map((m) => `
        <label class="chip"><input type="radio" name="modalidade" value="${esc(m.id)}"${m.id === filtro.modalidade ? ' checked' : ''}><span>${esc(m.nome)}</span></label>`).join('')}
      </fieldset></div>`);
    }
    partes.push('<div class="filtros__selects">');
    partes.push(seletor('sexo', 'Gênero', usados('sexo', categorias.sexos)));
    partes.push(seletor('idade', 'Idade', usados('idade', categorias.idades)));
    partes.push(seletor('faixa', 'Faixa', usados('faixa', categorias.faixas)));
    partes.push(seletor('peso', 'Peso', pesosDoRanking(dados, filtro), 'Todos'));
    if (temporadas.length > 1) {
      partes.push(seletor('temporada', 'Temporada', temporadas.map((t) => ({ id: String(t), nome: t === padraoTemporada ? `${t} (atual)` : String(t) }))));
    }
    partes.push('</div>');
    $('#filtros-campos').innerHTML = partes.join('');
  }

  function seletor(nome, rotulo, lista, rotuloTodos) {
    const atual = String(filtro[nome] ?? '');
    const opts = lista.map((o) => `<option value="${esc(o.id)}"${o.id === atual ? ' selected' : ''}>${esc(o.nome)}</option>`);
    if (rotuloTodos) opts.unshift(`<option value="">${esc(rotuloTodos)}</option>`);
    const ativo = nome === 'peso' && atual ? ' is-ativo' : '';
    return `
      <label class="campo">
        <span class="campo__rotulo">${esc(rotulo)}</span>
        <select name="${nome}" class="campo__select${ativo}">${opts.join('')}</select>
      </label>`;
  }

  function renderizar() {
    history.replaceState(null, '', location.pathname + rankingParaQuery(filtro, padraoTemporada));

    const nome = rotuloRanking(filtro, ctx);
    const modalidade = nomeModalidade(filtro.modalidade, ctx);
    const peso = filtro.peso ? ctx.pesos.get(filtro.peso)?.nome : '';
    definirTitulo(`${nome} · ${modalidade}`, `Ranking ${nome} (${modalidade}) da temporada ${filtro.temporada} no BJJ Pódio.`);
    $('#trilha-atual').textContent = nome;
    $('#titulo-ranking').textContent = nome;

    const { ultima } = etapasDaTemporada(dados, filtro.temporada);
    $('#ranking-sub').innerHTML = [
      esc(modalidade),
      `Temporada ${filtro.temporada}`,
      ultima ? `atualizado após <a href="${urlCampeonato(ultima.id)}">${esc(ultima.nome)}</a> (${formatarData(ultima.data)})` : '',
    ].filter(Boolean).join(' <span aria-hidden="true">·</span> ');

    const { q, ...semBusca } = filtro;
    const ranking = calcularRanking(dados, semBusca);
    const linhas = q ? calcularRanking(dados, { ...semBusca, busca: q }) : ranking;

    $('#podio-peso').textContent = peso || '';
    $('#podio-peso').hidden = !peso;
    $('#podio').innerHTML = podioHTML(ranking.slice(0, 3), ctx);
    $('#ranking').innerHTML = linhasRankingHTML(linhas, ctx);
    pintarFaixas($('#pagina-ranking'), ctx);

    $('#ranking-resumo').textContent = q
      ? `${plural(linhas.length, 'atleta encontrado', 'atletas encontrados')} de ${ranking.length}`
      : `${plural(ranking.length, 'atleta', 'atletas')}${peso ? ` com pontos no ${peso.toLowerCase()}` : ''}`;
    $('#ranking-vazio').hidden = linhas.length > 0;
    $('#ranking-cab').hidden = linhas.length === 0;
    if (!linhas.length) $('#ranking-vazio p').textContent = `Ninguém com "${q}" no nome neste ranking.`;
  }
});
