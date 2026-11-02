// Motor do ranking: funções puras, sem DOM, sem fetch.
// Roda no navegador e no Node (testes em tests/ranking.test.js).
//
// pontos   = pontosPorPosicao[posicao] × pesoPorNivel[nivel do campeonato]
// total    = soma dos pontos (ou só os N melhores, se regras.melhoresResultados for número)
// desempate: pontos → critérios de regras.desempate, na ordem

const MEDALHA = { 1: 'ouros', 2: 'pratas', 3: 'bronzes' };

const arredondar = (n) => Math.round(n * 100) / 100;

/** Pontos de um resultado, conforme a regra e o nível do campeonato. */
export function pontosDoResultado(resultado, campeonato, regras) {
  const base = regras.pontosPorPosicao[String(resultado.posicao)] ?? 0;
  const peso = regras.pesoPorNivel[campeonato?.nivel] ?? 1;
  return arredondar(base * peso);
}

/** Temporada (ano) de um campeonato. */
export const temporadaDe = (campeonato) => Number(campeonato.data.slice(0, 4));

/**
 * Filtra resultados. Campos de filtro vazios/ausentes são ignorados.
 * filtro: { temporada, modalidade, faixa, idade, peso, sexo, academiaId }
 * (a busca por nome não entra aqui: ela não muda o ranking, só esconde linhas; ver calcularRanking)
 */
export function filtrarResultados(resultados, { campeonatos, atletas }, filtro = {}) {
  const campPorId = indexar(campeonatos);
  const atletaPorId = indexar(atletas);

  return resultados.filter((r) => {
    const camp = campPorId.get(r.campeonatoId);
    const atleta = atletaPorId.get(r.atletaId);
    if (!camp || !atleta) return false;
    if (filtro.temporada && temporadaDe(camp) !== Number(filtro.temporada)) return false;
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
 * Ranking individual.
 * dados: { resultados, campeonatos, atletas, regras }
 * filtro: os de filtrarResultados + busca (nome do atleta, sem acento/maiúscula).
 *   Os filtros de categoria recalculam as posições (ex.: ranking só da faixa branca);
 *   a busca mantém a posição real do atleta e só esconde as outras linhas.
 * Retorna linhas ordenadas: { posicao, atletaId, atleta, pontos, ouros, pratas, bronzes,
 *   campeonatosDisputados, resultados: [{ ...resultado, campeonato, pontos, contaNoTotal }] }
 * Atletas sem resultado no filtro não aparecem.
 */
export function calcularRanking(dados, filtro = {}) {
  const { campeonatos, atletas, regras } = dados;
  const campPorId = indexar(campeonatos);
  const atletaPorId = indexar(atletas);
  const { busca = '', ...filtroCategorias } = filtro;
  const filtrados = filtrarResultados(dados.resultados, dados, filtroCategorias);

  const porAtleta = new Map();
  for (const r of filtrados) {
    const campeonato = campPorId.get(r.campeonatoId);
    const item = { ...r, campeonato, pontos: pontosDoResultado(r, campeonato, regras), contaNoTotal: true };
    if (!porAtleta.has(r.atletaId)) porAtleta.set(r.atletaId, []);
    porAtleta.get(r.atletaId).push(item);
  }

  const linhas = [...porAtleta].map(([atletaId, itens]) => {
    // Mais recente primeiro (para histórico); empate de data: mais pontos primeiro.
    itens.sort((a, b) => b.campeonato.data.localeCompare(a.campeonato.data) || b.pontos - a.pontos);
    marcarMelhores(itens, regras.melhoresResultados);
    return {
      atletaId,
      atleta: atletaPorId.get(atletaId),
      pontos: arredondar(itens.filter((i) => i.contaNoTotal).reduce((s, i) => s + i.pontos, 0)),
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
 * Ranking por academia: soma dos totais dos atletas (já com a regra dos N melhores aplicada).
 * Retorna: { posicao, academiaId, academia, pontos, atletas, ouros, pratas, bronzes, campeonatosDisputados }
 */
export function calcularRankingAcademias(dados, filtro = {}) {
  const academiaPorId = indexar(dados.academias ?? []);
  const { busca, ...filtroCategorias } = filtro; // busca é por atleta, não se aplica aqui
  const individual = calcularRanking(dados, filtroCategorias);
  const porAcademia = new Map();

  for (const l of individual) {
    const id = l.atleta.academiaId;
    if (!porAcademia.has(id)) {
      porAcademia.set(id, { academiaId: id, academia: academiaPorId.get(id), pontos: 0, atletas: 0, ouros: 0, pratas: 0, bronzes: 0, campeonatos: new Set() });
    }
    const a = porAcademia.get(id);
    a.pontos = arredondar(a.pontos + l.pontos);
    a.atletas += 1;
    a.ouros += l.ouros;
    a.pratas += l.pratas;
    a.bronzes += l.bronzes;
    l.resultados.forEach((r) => a.campeonatos.add(r.campeonatoId));
  }

  const linhas = [...porAcademia.values()].map(({ campeonatos, ...a }) => ({ ...a, campeonatosDisputados: campeonatos.size }));
  return ordenarEPosicionar(linhas, dados.regras.desempate, (l) => l.academia?.nome ?? l.academiaId);
}

/**
 * Confere a integridade dos dados (referências, posições, categorias).
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
    if (!(String(r.posicao) in regras.pontosPorPosicao)) erros.push(`${onde}: posição sem pontuação "${r.posicao}"`);
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

function normalizar(s) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

function contarMedalhas(itens) {
  const m = { ouros: 0, pratas: 0, bronzes: 0 };
  itens.forEach((i) => MEDALHA[i.posicao] && (m[MEDALHA[i.posicao]] += 1));
  return m;
}

/** Se N estiver definido, só os N resultados de maior pontuação contam no total. Medalhas contam todas. */
function marcarMelhores(itens, n) {
  if (!Number.isInteger(n) || n <= 0 || itens.length <= n) return;
  const melhores = new Set([...itens].sort((a, b) => b.pontos - a.pontos).slice(0, n));
  itens.forEach((i) => (i.contaNoTotal = melhores.has(i)));
}

/**
 * Ordena por pontos e critérios de desempate (todos "maior é melhor").
 * Quem empata em tudo divide a posição (1, 2, 2, 4) e é listado em ordem alfabética.
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
