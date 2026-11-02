// Conversão dos resultados públicos do Torneio Fácil para o formato do BJJ Pódio.
// Funções puras (sem rede, sem disco): usadas por importar-torneiofacil.mjs e pelos testes.
//
// Fonte: GET https://api.torneiofacil.com/public/tournaments/<slug>/results (mesma chamada da página
// pública torneiofacil.com/resultados/<slug>). Resposta:
//   { tournament: { id, name, slug }, results: [{ bracketKey, status, podium: { firstName, firstGym,
//     firstName2, firstGym2, secondName, secondGym, thirdName, thirdGym, thirdName2, thirdGym2, …Wo } }] }
// bracketKey: "idade/gênero/faixa/peso", às vezes com prefixo de modalidade ("GI - adulto/masculino/azul/leve").

export const API_RESULTADOS = (slug) => `https://api.torneiofacil.com/public/tournaments/${encodeURIComponent(slug)}/results`;

// Posições do pódio: dois 1º (luta fechada), um 2º, dois 3º.
const PODIO = [
  ['firstName', 'firstGym', 1],
  ['firstName2', 'firstGym2', 1],
  ['secondName', 'secondGym', 2],
  ['thirdName', 'thirdGym', 3],
  ['thirdName2', 'thirdGym2', 3],
];
const PARTICULAS = new Set(['da', 'de', 'do', 'das', 'dos', 'e', 'di', 'du', 'del', 'van', 'von']);

/** Aceita o slug ou um link do Torneio Fácil (…/resultados/<slug>, …/check/<slug>/…). */
export function slugDoLink(texto) {
  const t = String(texto).trim();
  const m = t.match(/torneiofacil\.com\/(?:resultados|check|tournament\/verificar-lutas)\/([^/?#]+)/i);
  return (m ? m[1] : t).replace(/^\/+|\/+$/g, '');
}

/** Normaliza para comparar nomes: sem acento, minúsculo, só letras/números e um espaço entre palavras. */
export function chave(texto) {
  return String(texto ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ').trim();
}

export const slug = (texto) => chave(texto).replace(/ /g, '-');

/** "JOÃO DA SILVA" → "João da Silva". Siglas sem vogal ou de até 2 letras (CT, BJJ, GF) continuam maiúsculas. */
export function nomeProprio(texto, { siglas = false } = {}) {
  const limpo = String(texto ?? '').replace(/\s+/g, ' ').trim();
  if (!limpo || limpo !== limpo.toUpperCase()) return limpo; // já tem maiúsculas e minúsculas: respeita
  return limpo.toLowerCase().split(' ').map((p, i) => {
    if (i > 0 && PARTICULAS.has(p)) return p;
    if (siglas && (p.length <= 2 || !/[aeiouáéíóúâêôãõà]/.test(p))) return p.toUpperCase();
    return p.replace(/^(\p{L})/u, (c) => c.toUpperCase()).replace(/-(\p{L})/gu, (_, c) => `-${c.toUpperCase()}`);
  }).join(' ');
}

/** Iniciais para sigla de academia nova ("Gralha Azul BJJ" → "GAB"). */
export const sigla = (nome) => chave(nome).split(' ').filter((p) => !PARTICULAS.has(p)).map((p) => p[0]).join('').toUpperCase().slice(0, 4) || 'X';

/**
 * Lê um bracketKey. Retorna { modalidadeTF, idade, genero, faixa, peso } com os termos do Torneio Fácil.
 * O prefixo de modalidade é opcional ("GI - …", "NOGI - …").
 */
export function lerBracketKey(bracketKey) {
  let resto = String(bracketKey).trim();
  let modalidadeTF = null;
  const m = resto.match(/^([A-Za-z]+)\s+-\s+(.+)$/); // "GI - adulto/…" (espaços obrigatórios: "pre-mirim" não é prefixo)
  if (m && !m[1].includes('/')) { modalidadeTF = m[1].toUpperCase(); resto = m[2]; }
  const partes = resto.split('/').map((p) => p.trim().toLowerCase());
  if (partes.length !== 4) return null;
  const [idade, genero, faixa, peso] = partes;
  return { modalidadeTF, idade, genero, faixa, peso };
}

/** Modalidade pelo nome/slug do torneio quando a chave não tem prefixo ("…-gi", "… NOGI 2026"). */
export function modalidadeDoTorneio(torneio) {
  const texto = `${torneio?.slug ?? ''} ${torneio?.name ?? ''}`.toLowerCase();
  if (/(^|[^a-z])no-?gi([^a-z]|$)/.test(texto)) return 'NOGI';
  if (/(^|[^a-z])gi([^a-z]|$)/.test(texto)) return 'GI';
  return null;
}

/**
 * Converte a resposta da API em pódios no vocabulário do BJJ Pódio (sem ligar atletas ainda).
 * Retorna { podios: [{ bracketKey, modalidade, sexo, idade, faixa, peso, juntos, posicao, nome, academia }],
 *           pendentes, desconhecidos: Set de "campo: termo" }
 * juntos = categoria juntada: idade/faixa precisam ser resolvidas pela categoria de peso do atleta.
 */
export function converterResultados(resposta, mapa) {
  const podios = [];
  const desconhecidos = new Set();
  let pendentes = 0;
  const modalidadePadrao = modalidadeDoTorneio(resposta.tournament);

  for (const r of resposta.results ?? []) {
    if (r.status !== 'FINISHED' || !r.podium) { pendentes += 1; continue; }
    const k = lerBracketKey(r.bracketKey);
    if (!k) { desconhecidos.add(`categoria fora do padrão: ${r.bracketKey}`); continue; }

    const modTF = k.modalidadeTF ?? modalidadePadrao;
    const modalidade = mapa.modalidade[modTF];
    const sexo = mapa.genero[k.genero];
    const faixa = mapa.faixa[k.faixa];
    const peso = mapa.peso[k.peso];
    const idadeConhecida = Object.hasOwn(mapa.idade, k.idade);
    const idade = mapa.idade[k.idade];
    if (!modalidade) desconhecidos.add(`modalidade: ${modTF ?? '(não informada no torneio)'}`);
    if (!sexo) desconhecidos.add(`gênero: ${k.genero}`);
    if (!faixa) desconhecidos.add(`faixa: ${k.faixa}`);
    if (!peso) desconhecidos.add(`peso: ${k.peso}`);
    if (!idadeConhecida) desconhecidos.add(`idade: ${k.idade}`);
    if (!modalidade || !sexo || !faixa || !peso || !idadeConhecida) continue;

    for (const [campoNome, campoGym, posicao] of PODIO) {
      const nome = nomeProprio(r.podium[campoNome]);
      if (!nome) continue;
      podios.push({
        bracketKey: r.bracketKey, modalidade, sexo, idade, faixa, peso, juntos: idade === null, posicao,
        nome, academia: nomeProprio(r.podium[campoGym], { siglas: true }),
      });
    }
  }
  return { podios, pendentes, desconhecidos };
}

/**
 * Categoria juntada ("adulto e master (juntos)"): usa a idade e a faixa da categoria de peso
 * que o mesmo atleta (mesmo nome normalizado, gênero e modalidade) lutou no mesmo torneio.
 * Retorna { resolvidos, semCategoria } — semCategoria fica de fora do ranking e vai para revisão.
 */
export function resolverJuntos(podios) {
  const porAtleta = new Map();
  for (const p of podios) {
    if (p.juntos || p.peso === 'absoluto') continue;
    const k = `${chave(p.nome)}|${p.sexo}|${p.modalidade}`;
    if (!porAtleta.has(k)) porAtleta.set(k, p);
  }
  const resolvidos = [];
  const semCategoria = [];
  for (const p of podios) {
    if (!p.juntos) { resolvidos.push(p); continue; }
    const base = porAtleta.get(`${chave(p.nome)}|${p.sexo}|${p.modalidade}`);
    if (base) resolvidos.push({ ...p, idade: base.idade, faixa: base.faixa, juntos: false, resolvidoPor: base.bracketKey });
    else semCategoria.push(p);
  }
  return { resolvidos, semCategoria };
}

/**
 * Liga cada pódio a um atleta e uma academia existentes, ou cria novos.
 * Regras de ligação (o nome do pódio é texto livre, então tudo que não é certeza vai para revisão):
 *   - academia: mesmo nome normalizado (ou um dos "apelidos" dela); senão, academia nova
 *   - atleta: mesmo nome normalizado. 1 candidato → mesmo atleta (avisa se academia/gênero diferem);
 *     vários (homônimos) → o da mesma academia; se não der para decidir, fica de fora e vai para revisão;
 *     nenhum → atleta novo
 * Retorna { resultados, atletasNovos, academiasNovas, atualizacoes, avisos, ignorados }.
 */
export function ligarAtletas(podios, dados, campeonato) {
  const academias = [...dados.academias];
  const atletas = [...dados.atletas];
  const academiasNovas = [];
  const atletasNovos = [];
  const avisos = [];
  const ignorados = [];
  const atualizacoes = new Map(); // atletaId -> { academiaId?, faixa? }
  const idsUsados = new Set([...atletas.map((a) => a.id), ...academias.map((a) => a.id)]);
  const novoId = (base) => { let id = base || 'x'; let n = 2; while (idsUsados.has(id)) id = `${base}-${n++}`; idsUsados.add(id); return id; };

  const academiaPorChave = new Map();
  for (const a of academias) for (const nome of [a.nome, ...(a.apelidos ?? [])]) academiaPorChave.set(chave(nome), a);

  function academiaDe(nome) {
    const texto = nome || 'Academia não informada';
    const existente = academiaPorChave.get(chave(texto));
    if (existente) return existente;
    const nova = { id: novoId(slug(texto)), nome: texto, sigla: sigla(texto), cidade: '', apelidos: [] };
    academias.push(nova); academiasNovas.push(nova); academiaPorChave.set(chave(texto), nova);
    if (!nome) avisos.push('Pódio sem academia: atletas ligados a "Academia não informada"');
    return nova;
  }

  const ultimaDataDoAtleta = new Map();
  const campPorId = new Map(dados.campeonatos.map((c) => [c.id, c]));
  for (const r of dados.resultados) {
    const d = campPorId.get(r.campeonatoId)?.data ?? '';
    if (d > (ultimaDataDoAtleta.get(r.atletaId) ?? '')) ultimaDataDoAtleta.set(r.atletaId, d);
  }

  // Já decidido nesta importação: nome|gênero|academia -> atleta (o mesmo atleta aparece no peso e no absoluto).
  const decididos = new Map();
  const resultados = [];
  for (const p of podios) {
    const academia = academiaDe(p.academia);
    const k = chave(p.nome);
    const kk = `${k}|${p.sexo}|${academia.id}`;
    let atleta = decididos.get(kk);
    if (!atleta) {
      // Só o cadastro anterior conta como candidato; atletas criados agora são decididos por nome + academia.
      const candidatos = atletas.filter((a) => chave(a.nome) === k && !atletasNovos.includes(a));
      if (candidatos.length === 1) {
        atleta = candidatos[0];
        if (atleta.sexo !== p.sexo) { ignorados.push({ ...p, motivo: `gênero diferente do cadastro de ${atleta.id}` }); continue; }
        if (atleta.academiaId !== academia.id) {
          avisos.push(`${atleta.nome}: academia no torneio "${academia.nome}" ≠ cadastro (${atleta.academiaId}). Mantido o mesmo atleta (troca de academia não muda pontos).`);
        }
      } else if (candidatos.length > 1) {
        const mesmaAcademia = candidatos.filter((a) => a.academiaId === academia.id && a.sexo === p.sexo);
        if (mesmaAcademia.length === 1) atleta = mesmaAcademia[0];
        else { ignorados.push({ ...p, motivo: `homônimos no cadastro (${candidatos.map((a) => a.id).join(', ')})` }); continue; }
      } else {
        if (atletasNovos.some((a) => chave(a.nome) === k)) avisos.push(`Dois atletas novos chamados "${p.nome}" em academias diferentes: cadastrados separados, confira`);
        atleta = { id: novoId(`${slug(p.nome)}-${academia.sigla.toLowerCase()}`), nome: p.nome, academiaId: academia.id, sexo: p.sexo, faixa: p.faixa };
        atletas.push(atleta); atletasNovos.push(atleta);
      }
      decididos.set(kk, atleta);
    }

    // Cadastro do atleta acompanha o torneio mais recente dele (academia e faixa atuais).
    if (!atletasNovos.includes(atleta) && campeonato.data >= (ultimaDataDoAtleta.get(atleta.id) ?? '')) {
      const mudanca = atualizacoes.get(atleta.id) ?? {};
      if (atleta.academiaId !== academia.id) mudanca.academiaId = academia.id;
      if (p.peso !== 'absoluto' && atleta.faixa !== p.faixa) mudanca.faixa = p.faixa;
      if (Object.keys(mudanca).length) atualizacoes.set(atleta.id, mudanca);
    }

    resultados.push({
      campeonatoId: campeonato.id, atletaId: atleta.id, modalidade: p.modalidade,
      faixa: p.faixa, idade: p.idade, peso: p.peso, posicao: p.posicao,
    });
  }

  // Mesmo atleta duas vezes na mesma categoria (ex.: nome repetido no pódio): fica só a melhor colocação.
  const unicos = new Map();
  for (const r of resultados) {
    const k = [r.atletaId, r.modalidade, r.faixa, r.idade, r.peso].join('|');
    if (!unicos.has(k) || unicos.get(k).posicao > r.posicao) {
      if (unicos.has(k)) avisos.push(`Atleta ${r.atletaId} aparece duas vezes em ${r.faixa}/${r.idade}/${r.peso}: mantida a melhor colocação`);
      unicos.set(k, r);
    }
  }
  return { resultados: [...unicos.values()], atletasNovos, academiasNovas, atualizacoes, avisos, ignorados };
}
