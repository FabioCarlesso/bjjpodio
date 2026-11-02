// Filtros do ranking: opções disponíveis nos dados e sincronização com a URL.
// A URL guarda os filtros (?faixa=azul&peso=leve) para o link poder ser compartilhado.

import { temporadaDe } from './ranking.js';

export const CAMPOS = ['temporada', 'modalidade', 'sexo', 'faixa', 'idade', 'peso', 'q'];

/** Temporadas com campeonato cadastrado, da mais recente para a mais antiga. */
export function temporadasDisponiveis(dados) {
  const anos = new Set(dados.campeonatos.map(temporadaDe));
  anos.add(Number(dados.regras.temporada));
  return [...anos].sort((a, b) => b - a);
}

/**
 * Opções de cada filtro que aparecem nos resultados da temporada, na ordem de categorias.json.
 * Assim o filtro não oferece combinações que dariam lista vazia logo de cara.
 */
export function opcoesDisponiveis(dados, temporada) {
  const campDaTemporada = new Set(dados.campeonatos.filter((c) => temporadaDe(c) === Number(temporada)).map((c) => c.id));
  const atletaPorId = new Map(dados.atletas.map((a) => [a.id, a]));
  const usados = { modalidade: new Set(), sexo: new Set(), faixa: new Set(), idade: new Set(), peso: new Set() };

  for (const r of dados.resultados) {
    if (!campDaTemporada.has(r.campeonatoId)) continue;
    usados.modalidade.add(r.modalidade);
    usados.faixa.add(r.faixa);
    usados.idade.add(r.idade);
    usados.peso.add(r.peso);
    const sexo = atletaPorId.get(r.atletaId)?.sexo;
    if (sexo) usados.sexo.add(sexo);
  }

  const { categorias } = dados;
  const filtrar = (lista, set) => lista.filter((x) => set.has(x.id));
  return {
    modalidade: filtrar(categorias.modalidades, usados.modalidade),
    sexo: filtrar(categorias.sexos, usados.sexo),
    faixa: filtrar(categorias.faixas, usados.faixa),
    idade: filtrar(categorias.idades, usados.idade),
    peso: filtrar(categorias.pesos, usados.peso),
  };
}

/** Lê os filtros da URL, descartando valores que não existem nas opções. */
export function lerFiltroDaURL(search, { temporadas, padraoTemporada, opcoesPara }) {
  const params = new URLSearchParams(search);
  const temporadaURL = Number(params.get('temporada'));
  const temporada = temporadas.includes(temporadaURL) ? temporadaURL : padraoTemporada;
  const opcoes = opcoesPara(temporada);

  const filtro = { temporada, q: (params.get('q') ?? '').slice(0, 60) };
  for (const campo of ['modalidade', 'sexo', 'faixa', 'idade', 'peso']) {
    const valor = params.get(campo) ?? '';
    filtro[campo] = opcoes[campo].some((o) => o.id === valor) ? valor : '';
  }
  return filtro;
}

/** Monta a query string; omite vazios e a temporada padrão para o link ficar curto. */
export function filtroParaQuery(filtro, padraoTemporada) {
  const params = new URLSearchParams();
  for (const campo of CAMPOS) {
    const valor = filtro[campo];
    if (!valor) continue;
    if (campo === 'temporada' && Number(valor) === Number(padraoTemporada)) continue;
    params.set(campo, valor);
  }
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

/** Há algum filtro de categoria ativo (fora temporada e busca)? */
export const temFiltroDeCategoria = (filtro) => ['modalidade', 'sexo', 'faixa', 'idade', 'peso'].some((c) => filtro[c]);
