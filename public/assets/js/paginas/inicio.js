// Página inicial: ranking geral com pódio, filtros de categoria e busca.

import { carregarDados } from '../data.js';
import { calcularRanking } from '../ranking.js';
import {
  temporadasDisponiveis, opcoesDisponiveis, lerFiltroDaURL, filtroParaQuery, temFiltroDeCategoria,
} from '../filters.js';
import {
  esc, formatarPontos, formatarData, plural, urlAtleta, urlCampeonato, criarContexto,
  faixaBadge, pintarFaixas, medalha, posicaoTexto, classePosicao,
} from '../render.js';

const $ = (sel) => document.querySelector(sel);
const el = {
  temporada: $('[data-temporada]'),
  meta: $('#hero-meta'),
  form: $('#filtros'),
  campos: $('#filtros-campos'),
  limpar: $('#limpar-filtros'),
  podioTitulo: $('#podio-categoria'),
  podio: $('#podio'),
  busca: $('#busca'),
  resumo: $('#ranking-resumo'),
  lista: $('#ranking'),
  cabecalho: $('#ranking-cab'),
  vazio: $('#ranking-vazio'),
  estado: $('#estado'),
  nota: $('#ranking-nota'),
};

let dados, ctx, temporadas, padraoTemporada, filtro;

iniciar();

async function iniciar() {
  try {
    dados = await carregarDados();
  } catch (erro) {
    console.error(erro);
    el.estado.textContent = 'Não foi possível carregar o ranking. Confira a conexão e tente de novo.';
    el.estado.classList.add('is-erro');
    return;
  }
  ctx = criarContexto(dados);
  temporadas = temporadasDisponiveis(dados);
  padraoTemporada = Number(dados.regras.temporada);
  filtro = lerFiltroDaURL(location.search, {
    temporadas,
    padraoTemporada,
    opcoesPara: (t) => opcoesDisponiveis(dados, t),
  });

  el.busca.value = filtro.q;
  const pontos = Object.entries(dados.regras.pontosPorPosicao).map(([pos, pts]) => `${pos}º = ${formatarPontos(pts)}`).join(', ');
  el.nota.innerHTML = `Pontos por pódio: ${esc(pontos)}, multiplicados pelo peso da etapa. <a href="/regras">Ver regras</a>`;
  montarFiltros();
  renderizar();
  el.estado.hidden = true;
  document.body.classList.add('is-pronto');

  el.form.addEventListener('submit', (e) => e.preventDefault());
  el.campos.addEventListener('change', aoMudarFiltro);
  el.busca.addEventListener('input', () => {
    filtro.q = el.busca.value.trim();
    renderizar();
  });
  el.limpar.addEventListener('click', () => {
    filtro = { temporada: filtro.temporada, modalidade: '', sexo: '', faixa: '', idade: '', peso: '', q: '' };
    el.busca.value = '';
    montarFiltros();
    renderizar();
  });
}

function aoMudarFiltro(evento) {
  const form = new FormData(el.form);
  const temporadaAnterior = filtro.temporada;
  for (const campo of ['modalidade', 'sexo', 'faixa', 'idade', 'peso']) filtro[campo] = form.get(campo) ?? '';
  if (form.has('temporada')) filtro.temporada = Number(form.get('temporada'));

  // Trocar de temporada muda as opções disponíveis: remonta e descarta o que não existe mais.
  if (filtro.temporada !== temporadaAnterior) {
    const opcoes = opcoesDisponiveis(dados, filtro.temporada);
    for (const campo of Object.keys(opcoes)) {
      if (!opcoes[campo].some((o) => o.id === filtro[campo])) filtro[campo] = '';
    }
    montarFiltros();
    el.campos.querySelector(`[name="${evento.target.name}"]`)?.focus();
  }
  renderizar();
}

// ---------- filtros ----------

function montarFiltros() {
  const opcoes = opcoesDisponiveis(dados, filtro.temporada);
  const partes = [];

  partes.push('<div class="filtros__chips">');
  if (opcoes.modalidade.length > 1) partes.push(grupoChips('modalidade', 'Modalidade', 'Todas', opcoes.modalidade));
  if (opcoes.sexo.length > 1) partes.push(grupoChips('sexo', 'Sexo', 'Todos', opcoes.sexo));
  partes.push('</div><div class="filtros__selects">');
  if (temporadas.length > 1) {
    partes.push(seletor('temporada', 'Temporada', null, temporadas.map((t) => ({ id: String(t), nome: String(t) }))));
  }
  partes.push(seletor('faixa', 'Faixa', 'Todas as faixas', opcoes.faixa));
  partes.push(seletor('idade', 'Idade', 'Todas as idades', opcoes.idade));
  partes.push(seletor('peso', 'Peso', 'Todos os pesos', opcoes.peso));
  partes.push('</div>');

  el.campos.innerHTML = partes.join('');
}

function grupoChips(nome, legenda, rotuloTodos, lista) {
  const chip = (valor, rotulo) => `
    <label class="chip">
      <input type="radio" name="${nome}" value="${esc(valor)}"${String(filtro[nome]) === valor ? ' checked' : ''}>
      <span>${esc(rotulo)}</span>
    </label>`;
  return `
    <fieldset class="chips">
      <legend class="visually-hidden">${esc(legenda)}</legend>
      ${chip('', rotuloTodos)}
      ${lista.map((o) => chip(o.id, o.nome)).join('')}
    </fieldset>`;
}

function seletor(nome, rotulo, rotuloTodos, lista) {
  const atual = String(filtro[nome] ?? '');
  const opts = lista.map((o) => `<option value="${esc(o.id)}"${o.id === atual ? ' selected' : ''}>${esc(o.nome)}</option>`);
  if (rotuloTodos) opts.unshift(`<option value="">${esc(rotuloTodos)}</option>`);
  return `
    <label class="campo">
      <span class="campo__rotulo">${esc(rotulo)}</span>
      <select name="${nome}" class="campo__select">${opts.join('')}</select>
    </label>`;
}

/** "Azul · Adulto · Leve · Kimono", ou vazio se não houver filtro de categoria. */
function rotuloCategoria() {
  const nomes = [
    ['faixa', ctx.faixas], ['idade', ctx.idades], ['peso', ctx.pesos], ['sexo', ctx.sexos], ['modalidade', ctx.modalidades],
  ].filter(([campo]) => filtro[campo]).map(([campo, mapa]) => mapa.get(filtro[campo])?.nome);
  return nomes.join(' · ');
}

// ---------- renderização ----------

function renderizar() {
  history.replaceState(null, '', location.pathname + filtroParaQuery(filtro, padraoTemporada));

  const { q, ...categorias } = filtro;
  const ranking = calcularRanking(dados, categorias);
  const linhas = q ? calcularRanking(dados, { ...categorias, busca: q }) : ranking;

  el.temporada.textContent = filtro.temporada;
  renderizarMeta();

  const categoria = rotuloCategoria();
  el.podioTitulo.textContent = categoria || 'Geral';
  renderizarPodio(ranking.slice(0, 3));
  renderizarLista(linhas);

  el.resumo.textContent = q
    ? `${plural(linhas.length, 'atleta encontrado', 'atletas encontrados')} de ${ranking.length}`
    : plural(ranking.length, 'atleta pontuando', 'atletas pontuando');

  el.limpar.hidden = !(temFiltroDeCategoria(filtro) || q);
  el.campos.querySelectorAll('select:not([name="temporada"])').forEach((s) => s.classList.toggle('is-ativo', Boolean(s.value)));

  el.vazio.hidden = linhas.length > 0;
  el.cabecalho.hidden = linhas.length === 0;
  if (!linhas.length) {
    el.vazio.querySelector('p').textContent = q
      ? `Ninguém com "${q}" no nome${categoria ? ' nesta categoria' : ''}.`
      : 'Nenhum resultado nesta categoria ainda.';
  }
}

/** Última etapa com resultados e próxima etapa sem resultados, da temporada escolhida. */
function renderizarMeta() {
  const comResultado = new Set(dados.resultados.map((r) => r.campeonatoId));
  const daTemporada = dados.campeonatos
    .filter((c) => c.data.startsWith(String(filtro.temporada)))
    .sort((a, b) => a.data.localeCompare(b.data));
  const realizadas = daTemporada.filter((c) => comResultado.has(c.id));
  const ultima = realizadas.at(-1);
  const proxima = daTemporada.find((c) => !comResultado.has(c.id));

  const itens = [];
  if (ultima) {
    itens.push(`<div><dt>Atualizado após</dt><dd><a href="${urlCampeonato(ultima.id)}">${esc(ultima.nome)}</a> · ${formatarData(ultima.data)}</dd></div>`);
  }
  itens.push(`<div><dt>Etapas</dt><dd>${realizadas.length} de ${daTemporada.length} realizadas</dd></div>`);
  if (proxima) {
    itens.push(`<div><dt>Próxima etapa</dt><dd><a href="${urlCampeonato(proxima.id)}">${esc(proxima.nome)}</a> · ${formatarData(proxima.data)} · ${esc(proxima.cidade)}</dd></div>`);
  }
  el.meta.innerHTML = itens.join('');
  el.meta.hidden = false;
}

function renderizarPodio(top) {
  if (!top.length) {
    el.podio.innerHTML = '<p class="podio__vazio">Ninguém pontuou nesta categoria ainda.</p>';
    return;
  }
  el.podio.innerHTML = `<ol class="podio__lista">${top.map((l, i) => `
    <li class="podio__item podio__item--${i + 1} ${classePosicao(l.posicao)}">
      <a class="podio__atleta" href="${urlAtleta(l.atletaId)}">${esc(l.atleta.nome)}</a>
      <span class="podio__academia">${faixaBadge(l.atleta.faixa, ctx)}${esc(ctx.academias.get(l.atleta.academiaId)?.nome)}</span>
      <span class="podio__pontos">${formatarPontos(l.pontos)} <small>pts</small></span>
      <span class="podio__base"><span class="podio__pos">${posicaoTexto(l.posicao)}</span></span>
    </li>`).join('')}
  </ol>`;
  pintarFaixas(el.podio, ctx);
}

function renderizarLista(linhas) {
  el.lista.innerHTML = linhas.map((l) => `
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
      <span class="linha__pontos"><strong>${formatarPontos(l.pontos)}</strong> <small>pts</small></span>
    </li>`).join('');
  pintarFaixas(el.lista, ctx);
}
