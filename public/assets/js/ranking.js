// Motor do ranking: funções puras, sem DOM, sem fetch.
// Roda no navegador e no Node (testes em tests/ranking.test.js).
//
// Regras no modelo da CBJJ (https://cbjj.com.br/athlete-ranking-info), lidas de regras.json:
//   pontos = pontos da colocação × peso da etapa × peso da temporada
//     - colocação: categoria de peso 9/3/1; absoluto 13,5/4,5/1,5
//     - peso da etapa: pelo nível do campeonato (regional 1, estadual 2, grande 4)
//     - peso da temporada: atual ×3, anterior ×2, retrasada ×1; mais antigas não contam
//   - o ranking é sempre de um gênero + idade + faixa, numa modalidade (kimono e no-gi separados)
//   - os pontos valem só na faixa e idade em que foram conquistados (ficam no resultado)
//   - atleta sozinho na chave pontua normalmente
//   desempate (a CBJJ não publica): pontos → critérios de regras.desempate, na ordem

export const PESO_ABSOLUTO = 'absoluto';

const MEDALHA = { 1: 'ouros', 2: 'pratas', 3: 'bronzes' };

const arredondar = (n) => Math.round(n * 100) / 100;

/** Temporada (ano-calendário) de um campeonato. */
export const temporadaDe = (campeonato) => Number(campeonato.data.slice(0, 4));

/** Tabela de pontos da colocação: absoluto ou categoria de peso. */
export const tabelaDePontos = (resultado, regras) =>
  regras.pontosPorPosicao[resultado.peso === PESO_ABSOLUTO ? 'absoluto' : 'categoria'];

/**
 * Peso da temporada do resultado em relação à temporada de referência do ranking.
 * Ex.: pesoPorTemporada [3, 2, 1] e referência 2026 → 2026 ×3, 2025 ×2, 2024 ×1, 2023 ×0 (não conta).
 */
export function pesoDaTemporada(temporadaDoResultado, temporadaReferencia, regras) {
  const distancia = Number(temporadaReferencia) - Number(temporadaDoResultado);
  if (distancia < 0) return 0;
  return regras.pesoPorTemporada[distancia] ?? 0;
}

/**
 * Pontos de um resultado, com a conta aberta para mostrar na tela.
 * Retorna { base, pesoEtapa, pesoTemporada, pontos }.
 */
export function detalharPontos(resultado, campeonato, regras, temporadaReferencia = regras.temporada) {
  const base = tabelaDePontos(resultado, regras)?.[String(resultado.posicao)] ?? 0;
  const pesoEtapa = regras.pesoPorNivel[campeonato?.nivel] ?? 1;
  const pesoTemporada = campeonato ? pesoDaTemporada(temporadaDe(campeonato), temporadaReferencia, regras) : 0;
  return { base, pesoEtapa, pesoTemporada, pontos: arredondar(base * pesoEtapa * pesoTemporada) };
}

export const pontosDoResultado = (resultado, campeonato, regras, temporadaReferencia) =>
  detalharPontos(resultado, campeonato, regras, temporadaReferencia).pontos;

/**
 * Filtra resultados que contam no ranking da temporada de referência.
 * filtro: { temporada (referência; padrão regras.temporada), modalidade, sexo, idade, faixa, peso, academiaId }
 * Campos vazios/ausentes são ignorados. Resultados fora da janela de temporadas ficam de fora.
 * (A busca por nome não entra aqui: ela não muda o ranking, só esconde linhas; ver calcularRanking.)
 */
export function filtrarResultados(resultados, { campeonatos, atletas, regras }, filtro = {}) {
  const campPorId = indexar(campeonatos);
  const atletaPorId = indexar(atletas);
  const referencia = filtro.temporada || regras.temporada;

  return resultados.filter((r) => {
    const camp = campPorId.get(r.campeonatoId);
    const atleta = atletaPorId.get(r.atletaId);
    if (!camp || !atleta) return false;
    if (pesoDaTemporada(temporadaDe(camp), referencia, regras) <= 0) return false;
    if (filtro.modalidade && r.modalidade !== filtro.modalidade) return false;
    if (filtro.faixa && r.faixa !== filtro.faixa) return false;
    if (filtro.idade && r.idade !== filtro.idade) return false;
    if (filtro.peso && r.peso !== filtro.peso) return false;
    if (filtro.sexo && atleta.sexo !== filtro.sexo) return false;
    if (filtro.academiaId && atleta.academiaId !== filtro.academiaId) return false;
    return true;
  });
}

/**
 * Ranking de atletas. No uso normal o filtro traz modalidade + sexo + idade + faixa (um ranking da CBJJ);
 * peso é opcional e recalcula só com os pontos daquele peso (como o filtro de peso da CBJJ).
 * busca (nome, sem acento/maiúscula) mantém a posição real do atleta e só esconde as outras linhas.
 * Retorna linhas ordenadas: { posicao, atletaId, atleta, pontos, ouros, pratas, bronzes,
 *   campeonatosDisputados, resultados: [{ ...resultado, campeonato, temporada, base, pesoEtapa, pesoTemporada, pontos }] }
 */
export function calcularRanking(dados, filtro = {}) {
  const { campeonatos, atletas, regras } = dados;
  const campPorId = indexar(campeonatos);
  const atletaPorId = indexar(atletas);
  const { busca = '', ...filtroCategorias } = filtro;
  const referencia = filtroCategorias.temporada || regras.temporada;
  const filtrados = filtrarResultados(dados.resultados, dados, filtroCategorias);

  const porAtleta = new Map();
  for (const r of filtrados) {
    const campeonato = campPorId.get(r.campeonatoId);
    const item = { ...r, campeonato, temporada: temporadaDe(campeonato), ...detalharPontos(r, campeonato, regras, referencia) };
    if (!porAtleta.has(r.atletaId)) porAtleta.set(r.atletaId, []);
    porAtleta.get(r.atletaId).push(item);
  }

  const linhas = [...porAtleta].map(([atletaId, itens]) => {
    // Mais recente primeiro (para histórico); empate de data: mais pontos primeiro.
    itens.sort((a, b) => b.campeonato.data.localeCompare(a.campeonato.data) || b.pontos - a.pontos);
    return {
      atletaId,
      atleta: atletaPorId.get(atletaId),
      pontos: arredondar(itens.reduce((s, i) => s + i.pontos, 0)),
      ...contarMedalhas(itens),
      campeonatosDisputados: new Set(itens.map((i) => i.campeonatoId)).size,
      resultados: itens,
    };
  });

  const ranking = ordenarEPosicionar(linhas, regras.desempate, (l) => l.atleta.nome);
  const termo = normalizar(busca);
  return termo ? ranking.filter((l) => normalizar(l.atleta.nome).includes(termo)) : ranking;
}

/**
 * Rankings que existem (têm resultado na janela) para a modalidade: cada um é gênero + idade + faixa.
 * Ordem: faixa mais alta primeiro, depois idade e gênero na ordem de categorias.json.
 * Retorna [{ sexo, idade, faixa, atletas }].
 */
export function rankingsDisponiveis(dados, { temporada, modalidade } = {}) {
  const { categorias } = dados;
  const atletaPorId = indexar(dados.atletas);
  const grupos = new Map();
  for (const r of filtrarResultados(dados.resultados, dados, { temporada, modalidade })) {
    const sexo = atletaPorId.get(r.atletaId).sexo;
    const chave = `${sexo}|${r.idade}|${r.faixa}`;
    if (!grupos.has(chave)) grupos.set(chave, { sexo, idade: r.idade, faixa: r.faixa, ids: new Set() });
    grupos.get(chave).ids.add(r.atletaId);
  }
  const ordem = (lista, id) => lista.findIndex((x) => x.id === id);
  return [...grupos.values()]
    .map(({ ids, ...g }) => ({ ...g, atletas: ids.size }))
    .sort((a, b) =>
      ordem(categorias.faixas, b.faixa) - ordem(categorias.faixas, a.faixa)
      || ordem(categorias.idades, a.idade) - ordem(categorias.idades, b.idade)
      || ordem(categorias.sexos, a.sexo) - ordem(categorias.sexos, b.sexo));
}

/**
 * Ranking por academia: soma dos pontos de todos os seus atletas na modalidade (todas as categorias).
 * Retorna: { posicao, academiaId, academia, pontos, atletas, ouros, pratas, bronzes, campeonatosDisputados, membros }
 * membros: linhas do ranking individual dos atletas da academia, por pontos.
 */
export function calcularRankingAcademias(dados, filtro = {}) {
  const academiaPorId = indexar(dados.academias ?? []);
  const { busca, ...filtroCategorias } = filtro; // busca é por atleta, não se aplica aqui
  const individual = calcularRanking(dados, filtroCategorias);
  const porAcademia = new Map();

  for (const l of individual) {
    const id = l.atleta.academiaId;
    if (!porAcademia.has(id)) {
      porAcademia.set(id, { academiaId: id, academia: academiaPorId.get(id), pontos: 0, atletas: 0, ouros: 0, pratas: 0, bronzes: 0, campeonatos: new Set(), membros: [] });
    }
    const a = porAcademia.get(id);
    a.pontos = arredondar(a.pontos + l.pontos);
    a.atletas += 1;
    a.ouros += l.ouros;
    a.pratas += l.pratas;
    a.bronzes += l.bronzes;
    a.membros.push(l);
    l.resultados.forEach((r) => a.campeonatos.add(r.campeonatoId));
  }

  const linhas = [...porAcademia.values()].map(({ campeonatos, ...a }) => ({ ...a, campeonatosDisputados: campeonatos.size }));
  return ordenarEPosicionar(linhas, dados.regras.desempate, (l) => l.academia?.nome ?? l.academiaId);
}

/**
 * Confere a integridade dos dados (referências, posições, categorias, regras).
 * Retorna lista de mensagens de erro; vazia = tudo certo.
 */
export function validarDados({ resultados, campeonatos, atletas, academias, regras, categorias }) {
  const erros = [];
  const ids = (lista, nome) => {
    const set = new Set();
    lista.forEach((x, i) => {
      if (!x.id) erros.push(`${nome}[${i}] sem id`);
      else if (set.has(x.id)) erros.push(`${nome}: id duplicado "${x.id}"`);
      set.add(x.id);
    });
    return set;
  };
  const idsCamp = ids(campeonatos, 'campeonatos');
  const idsAtleta = ids(atletas, 'atletas');
  const idsAcad = ids(academias, 'academias');
  const cat = (chave) => new Set((categorias?.[chave] ?? []).map((c) => c.id));
  const faixas = cat('faixas'), idades = cat('idades'), pesos = cat('pesos'), modalidades = cat('modalidades'), sexos = cat('sexos');
  const campPorId = indexar(campeonatos);

  for (const tabela of ['categoria', 'absoluto']) {
    if (!regras.pontosPorPosicao?.[tabela]) erros.push(`regras: falta pontosPorPosicao.${tabela}`);
  }
  if (!Array.isArray(regras.pesoPorTemporada) || !regras.pesoPorTemporada.length) erros.push('regras: pesoPorTemporada deve ser uma lista, ex.: [3, 2, 1]');
  if (!pesos.has(PESO_ABSOLUTO)) erros.push(`categorias: falta o peso "${PESO_ABSOLUTO}"`);

  campeonatos.forEach((c) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(c.data ?? '')) erros.push(`campeonato "${c.id}": data inválida "${c.data}" (use AAAA-MM-DD)`);
    if (!(c.nivel in regras.pesoPorNivel)) erros.push(`campeonato "${c.id}": nível desconhecido "${c.nivel}"`);
    (c.modalidade ?? []).forEach((m) => modalidades.has(m) || erros.push(`campeonato "${c.id}": modalidade desconhecida "${m}"`));
  });
  atletas.forEach((a) => {
    if (!idsAcad.has(a.academiaId)) erros.push(`atleta "${a.id}": academia inexistente "${a.academiaId}"`);
    if (!faixas.has(a.faixa)) erros.push(`atleta "${a.id}": faixa desconhecida "${a.faixa}"`);
    if (!sexos.has(a.sexo)) erros.push(`atleta "${a.id}": sexo desconhecido "${a.sexo}"`);
  });

  const vistos = new Set();
  resultados.forEach((r, i) => {
    const onde = `resultado #${i + 1} (${r.atletaId} em ${r.campeonatoId})`;
    if (!idsCamp.has(r.campeonatoId)) erros.push(`${onde}: campeonato inexistente`);
    if (!idsAtleta.has(r.atletaId)) erros.push(`${onde}: atleta inexistente`);
    if (!(String(r.posicao) in (regras.pontosPorPosicao?.categoria ?? {}))) erros.push(`${onde}: posição sem pontuação "${r.posicao}"`);
    if (!modalidades.has(r.modalidade)) erros.push(`${onde}: modalidade desconhecida "${r.modalidade}"`);
    else if (campPorId.has(r.campeonatoId) && !campPorId.get(r.campeonatoId).modalidade.includes(r.modalidade)) {
      erros.push(`${onde}: o campeonato não tem a modalidade "${r.modalidade}"`);
    }
    if (!faixas.has(r.faixa)) erros.push(`${onde}: faixa desconhecida "${r.faixa}"`);
    if (!idades.has(r.idade)) erros.push(`${onde}: idade desconhecida "${r.idade}"`);
    if (!pesos.has(r.peso)) erros.push(`${onde}: peso desconhecido "${r.peso}"`);
    const chave = [r.campeonatoId, r.atletaId, r.modalidade, r.faixa, r.idade, r.peso].join('|');
    if (vistos.has(chave)) erros.push(`${onde}: resultado duplicado na mesma categoria`);
    vistos.add(chave);
  });

  return erros;
}

// ---------- auxiliares ----------

function indexar(lista) {
  return new Map(lista.map((x) => [x.id, x]));
}

export function normalizar(s) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

function contarMedalhas(itens) {
  const m = { ouros: 0, pratas: 0, bronzes: 0 };
  itens.forEach((i) => MEDALHA[i.posicao] && (m[MEDALHA[i.posicao]] += 1));
  return m;
}

/**
 * Ordena por pontos e critérios de desempate (todos "maior é melhor").
 * Quem empata em tudo divide a posição (1, 2, 2, 4), como na CBJJ, e é listado em ordem alfabética.
 */
function ordenarEPosicionar(linhas, desempate = [], nome) {
  const criterios = ['pontos', ...desempate];
  const comparar = (a, b) => {
    for (const c of criterios) {
      const d = (b[c] ?? 0) - (a[c] ?? 0);
      if (d !== 0) return d;
    }
    return 0;
  };
  linhas.sort((a, b) => comparar(a, b) || nome(a).localeCompare(nome(b), 'pt-BR'));
  linhas.forEach((l, i) => {
    l.posicao = i > 0 && comparar(linhas[i - 1], l) === 0 ? linhas[i - 1].posicao : i + 1;
  });
  return linhas;
}
