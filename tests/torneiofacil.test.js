import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  slugDoLink, lerBracketKey, modalidadeDoTorneio, nomeProprio, converterResultados, resolverJuntos, ligarAtletas,
  ehDoEstado, nomeDoEvento, agruparTorneios, importarEtapa,
} from '../ferramentas/torneiofacil.mjs';

const mapa = JSON.parse(readFileSync(new URL('../ferramentas/torneiofacil-mapa.json', import.meta.url)));
const categorias = JSON.parse(readFileSync(new URL('../public/data/categorias.json', import.meta.url)));

// Resposta no formato da API pública do Torneio Fácil (dados inventados).
const podio = (o) => ({
  firstName: null, firstGym: null, firstName2: null, firstGym2: null, secondName: null, secondGym: null,
  thirdName: null, thirdGym: null, thirdName2: null, thirdGym2: null, firstWo: false, secondWo: false,
  thirdWo: false, thirdWo2: false, medalsDelivered: {}, athleteStatuses: [], recordedManual: false, ...o,
});
const resposta = {
  tournament: { id: 1, name: 'COPA TESTE GI 2026', slug: 'copa-teste-pr-gi' },
  results: [
    { bracketKey: 'adulto/masculino/azul/leve', status: 'FINISHED', podium: podio({
      firstName: 'JOÃO  DA SILVA', firstGym: 'CT LEÃO BJJ', secondName: 'PEDRO SOUZA', secondGym: 'EQUIPE ALFA',
      thirdName: 'ANDRÉ LIMA', thirdGym: 'CT LEÃO BJJ', thirdName2: 'CAIO REIS', thirdGym2: 'EQUIPE ALFA' }) },
    { bracketKey: 'pre-mirim/feminino/branca/galo', status: 'FINISHED', podium: podio({ firstName: 'ANA LUZ', firstGym: 'EQUIPE ALFA' }) },
    { bracketKey: 'adulto e master azul e roxa (juntos)/masculino/roxa/absoluto', status: 'FINISHED', podium: podio({
      firstName: 'JOAO DA SILVA', firstGym: 'CT LEÃO BJJ', secondName: 'BETO MARQUES', secondGym: 'EQUIPE ALFA' }) },
    { bracketKey: 'master 1 e 2/masculino/preta/medio', status: 'PENDING', podium: null },
  ],
};

test('link ou slug do Torneio Fácil', () => {
  assert.equal(slugDoLink('https://torneiofacil.com/resultados/copa-teste-pr-gi'), 'copa-teste-pr-gi');
  assert.equal(slugDoLink('https://torneiofacil.com/check/copa-teste-pr-gi/search'), 'copa-teste-pr-gi');
  assert.equal(slugDoLink(' copa-teste-pr-gi '), 'copa-teste-pr-gi');
});

test('bracketKey com e sem prefixo de modalidade; "pre-mirim" não é prefixo', () => {
  assert.deepEqual(lerBracketKey('GI - adulto/masculino/branca/medio'),
    { modalidadeTF: 'GI', idade: 'adulto', genero: 'masculino', faixa: 'branca', peso: 'medio' });
  assert.equal(lerBracketKey('NOGI - juvenil/feminino/azul/leve').modalidadeTF, 'NOGI');
  assert.deepEqual(lerBracketKey('pre-mirim/feminino/branca/galo'),
    { modalidadeTF: null, idade: 'pre-mirim', genero: 'feminino', faixa: 'branca', peso: 'galo' });
  assert.equal(lerBracketKey('adulto/masculino/azul'), null);
  assert.equal(modalidadeDoTorneio({ slug: 'copa-x-pr-gi' }), 'GI');
  assert.equal(modalidadeDoTorneio({ slug: 'copa-x-pr-nogi' }), 'NOGI');
  assert.equal(modalidadeDoTorneio({ name: 'COPA X NO-GI 2026' }), 'NOGI');
});

test('nomes em maiúsculas viram nome próprio; siglas de academia continuam maiúsculas', () => {
  assert.equal(nomeProprio('JOÃO  DA SILVA'), 'João da Silva');
  assert.equal(nomeProprio('MARIA DOS SANTOS-PEREIRA'), 'Maria dos Santos-Pereira');
  assert.equal(nomeProprio('CT LEÃO BJJ', { siglas: true }), 'CT Leão BJJ');
  assert.equal(nomeProprio('GF TEAM', { siglas: true }), 'GF Team');
  assert.equal(nomeProprio('Já Formatado da Silva'), 'Já Formatado da Silva');
  assert.equal(nomeProprio(null), '');
});

test('converte pódios: dois 3º, absoluto, categoria juntada e pendentes', () => {
  const { podios, pendentes, desconhecidos } = converterResultados(resposta, mapa);
  assert.equal(pendentes, 1);
  assert.equal(desconhecidos.size, 0);
  const leve = podios.filter((p) => p.bracketKey === 'adulto/masculino/azul/leve');
  assert.deepEqual(leve.map((p) => p.posicao), [1, 2, 3, 3]);
  assert.deepEqual(leve[0], {
    bracketKey: 'adulto/masculino/azul/leve', modalidade: 'kimono', sexo: 'M', idade: 'adulto', faixa: 'azul',
    peso: 'leve', juntos: false, posicao: 1, nome: 'João da Silva', academia: 'CT Leão BJJ',
  });
  const abs = podios.filter((p) => p.peso === 'absoluto');
  assert.ok(abs.every((p) => p.juntos && p.idade === null));
});

test('termo desconhecido é listado, não importado', () => {
  const r = converterResultados({ tournament: { slug: 'x-gi' }, results: [
    { bracketKey: 'galaxia/masculino/coral/mosca', status: 'FINISHED', podium: podio({ firstName: 'X', firstGym: 'Y' }) },
  ] }, mapa);
  assert.equal(r.podios.length, 0);
  assert.deepEqual([...r.desconhecidos].sort(), ['faixa: coral', 'idade: galaxia', 'peso: mosca']);
});

test('categoria juntada usa idade/faixa da categoria de peso do atleta; sem ela, vai para revisão', () => {
  const { podios } = converterResultados(resposta, mapa);
  const { resolvidos, semCategoria } = resolverJuntos(podios);
  const joao = resolvidos.find((p) => p.peso === 'absoluto' && p.posicao === 1);
  assert.equal(joao.idade, 'adulto');
  assert.equal(joao.faixa, 'azul', 'faixa real (azul), não a do rótulo da chave (roxa)');
  assert.equal(joao.resolvidoPor, 'adulto/masculino/azul/leve');
  assert.deepEqual(semCategoria.map((p) => p.nome), ['Beto Marques']);
});

const dadosBase = () => ({
  campeonatos: [{ id: 'antiga', data: '2025-05-01' }, { id: 'futura', data: '2027-01-01' }],
  academias: [
    { id: 'ct-leao', nome: 'CT Leão Jiu-Jitsu', sigla: 'CL', cidade: 'Curitiba', apelidos: ['CT LEÃO BJJ'] },
    { id: 'alfa', nome: 'Equipe Alfa', sigla: 'EA', cidade: 'Londrina' },
  ],
  atletas: [
    { id: 'joao-da-silva-cl', nome: 'João da Silva', academiaId: 'ct-leao', sexo: 'M', faixa: 'branca' },
    { id: 'pedro-souza-1', nome: 'Pedro Souza', academiaId: 'ct-leao', sexo: 'M', faixa: 'azul' },
    { id: 'pedro-souza-2', nome: 'Pedro Souza', academiaId: 'outra', sexo: 'M', faixa: 'azul' },
  ],
  resultados: [{ campeonatoId: 'antiga', atletaId: 'joao-da-silva-cl' }],
});
const etapa = { id: 'copa-teste-2026', data: '2026-06-01' };

test('liga atletas: existente (sem acento/maiúscula), novos, homônimos e academia por apelido', () => {
  const { podios } = converterResultados(resposta, mapa);
  const { resolvidos } = resolverJuntos(podios);
  const lig = ligarAtletas(resolvidos, dadosBase(), etapa);

  const joao = lig.resultados.filter((r) => r.atletaId === 'joao-da-silva-cl');
  assert.equal(joao.length, 2, 'João no peso e no absoluto, mesmo atleta já cadastrado');
  assert.ok(!lig.atletasNovos.some((a) => a.nome === 'João da Silva'));
  // Academia "CT LEÃO BJJ" casou pelo apelido; "EQUIPE ALFA" pelo nome.
  assert.equal(lig.academiasNovas.length, 0);
  // Pedro Souza: dois no cadastro, nenhum da Equipe Alfa → fica de fora para revisão.
  assert.deepEqual(lig.ignorados.map((p) => p.nome), ['Pedro Souza']);
  assert.match(lig.ignorados[0].motivo, /homônimos/);
  // Novos: André (CT Leão), Caio e Ana (Equipe Alfa); ids no padrão nome-sigla.
  assert.deepEqual(lig.atletasNovos.map((a) => a.id).sort(), ['ana-luz-ea', 'andre-lima-cl', 'caio-reis-ea']);
  assert.equal(lig.atletasNovos.find((a) => a.id === 'ana-luz-ea').sexo, 'F');
  // Etapa mais recente que o último resultado do João: faixa do cadastro passa a azul.
  assert.deepEqual(lig.atualizacoes.get('joao-da-silva-cl'), { faixa: 'azul' });
  assert.ok(lig.resultados.every((r) => r.campeonatoId === 'copa-teste-2026'));
});

test('etapa mais antiga que o último resultado não muda o cadastro', () => {
  const dados = dadosBase();
  dados.resultados = [{ campeonatoId: 'futura', atletaId: 'joao-da-silva-cl' }];
  const { podios } = converterResultados(resposta, mapa);
  const lig = ligarAtletas(resolverJuntos(podios).resolvidos, dados, etapa);
  assert.equal(lig.atualizacoes.has('joao-da-silva-cl'), false);
});

test('mesmo nome novo em academias diferentes vira dois atletas, com aviso; academia vazia', () => {
  const dados = { ...dadosBase(), atletas: [], resultados: [] };
  const podios = [
    { bracketKey: 'a', modalidade: 'kimono', sexo: 'M', idade: 'adulto', faixa: 'azul', peso: 'leve', posicao: 1, nome: 'Rui Alves', academia: 'Equipe Alfa' },
    { bracketKey: 'b', modalidade: 'kimono', sexo: 'M', idade: 'adulto', faixa: 'azul', peso: 'pena', posicao: 1, nome: 'Rui Alves', academia: 'Equipe Beta' },
    { bracketKey: 'c', modalidade: 'kimono', sexo: 'M', idade: 'adulto', faixa: 'azul', peso: 'medio', posicao: 2, nome: 'Zé Nada', academia: '' },
  ];
  const lig = ligarAtletas(podios, dados, etapa);
  assert.equal(lig.atletasNovos.filter((a) => a.nome === 'Rui Alves').length, 2);
  assert.ok(lig.avisos.some((t) => /Dois atletas novos chamados "Rui Alves"/.test(t)));
  assert.deepEqual(lig.academiasNovas.map((a) => a.id).sort(), ['academia-nao-informada', 'equipe-beta']);
});

test('o mapa só aponta para ids que existem em categorias.json', () => {
  const ids = (k) => new Set(categorias[k].map((c) => c.id));
  for (const [campo, chaveCat] of [['idade', 'idades'], ['faixa', 'faixas'], ['peso', 'pesos'], ['modalidade', 'modalidades'], ['genero', 'sexos']]) {
    for (const [termo, id] of Object.entries(mapa[campo])) {
      if (id === null && campo === 'idade') continue; // categoria juntada: resolvida pelo atleta
      assert.ok(ids(chaveCat).has(id), `${campo} "${termo}" → "${id}" não existe em categorias.${chaveCat}`);
    }
  }
});

// ---------- sincronização ----------

const lista = [
  { slug: 'xix-copa-teste-de-jiu-jitsu-cascavel-pr-gi', name: 'XIX COPA TESTE DE JIU JITSU GI', location: 'CASCAVEL - PR', date: '2026-02-22T00:00:00.000Z' },
  { slug: 'xix-copa-teste-de-jiu-jitsu-cascavel-pr-nogi', name: 'XIX COPA TESTE DE JIU JITSU NOGI', location: 'Cáscavel-PR', date: '2026-02-22T00:00:00.000Z' },
  { slug: 'open-teste-de-jiu-jitsu-2026-cascavel-pr-gi', name: 'OPEN TESTE DE JIU JITSU 2026', location: 'Cascavel - PR', date: '2026-05-01' },
  { slug: 'copa-x-de-jiu-jitsu-maringa-pr-gi', name: 'COPA X DE JIU JITSU', location: 'Maringá - AM', date: '2025-04-12' },
  { slug: 'open-candoi-de-jiu-jitsu-candoi-pr-gi', name: 'OPEN CANDÓI DE JIU JITSU', location: 'Ginásio Municipal - CANDÓI - PR', date: '2025-07-27' },
  { slug: 'copa-x-de-jiu-jitsu-maringa-pr-gi-OLD', name: 'COPA X DE JIU JITSU', location: 'MARINGÁ - PR', date: '2025-04-12' },
  { slug: 'copa-manaus-de-jiu-jitsu-manaus-am-gi', name: 'COPA MANAUS', location: 'Manaus - AM', date: '2025-04-12' },
];

test('torneio do estado pelo local ou pelo link (local com UF errada)', () => {
  assert.deepEqual(lista.filter((t) => ehDoEstado(t, 'PR')).length, 6);
  assert.equal(ehDoEstado(lista[3], 'PR'), true, 'Maringá - AM, mas link -pr-gi');
  assert.equal(ehDoEstado(lista[6], 'PR'), false);
});

test('nome do evento: sem GI/NOGI, nome próprio, romanos e acentos certos', () => {
  assert.equal(nomeDoEvento('XIX COPA PARANÁ DE JIU JITSU GI'), 'XIX Copa Paraná de Jiu-Jitsu');
  assert.equal(nomeDoEvento('INTERNATIONAL CIRCUIT NO GI DE JIU-JITSU'), 'International Circuit de Jiu-Jitsu');
  assert.equal(nomeDoEvento('OPEN CANDÓI DE JIU JITSU'), 'Open Candói de Jiu-Jitsu');
  assert.equal(nomeDoEvento('II STI OPEN KIDS'), 'II STI Open Kids');
});

test('agrupa gi + no-gi do mesmo evento, corrige cidade e ignora links da lista', () => {
  const ev = agruparTorneios(lista, { uf: 'PR', ignorar: ['copa-x-de-jiu-jitsu-maringa-pr-gi-OLD'], cidades: { 'Cáscavel': 'Cascavel' } });
  assert.deepEqual(ev.map((e) => e.id), ['copa-x-de-jiu-jitsu-2025', 'open-candoi-de-jiu-jitsu-2025', 'xix-copa-teste-de-jiu-jitsu-2026', 'open-teste-de-jiu-jitsu-2026']);
  const xix = ev.find((e) => e.id === 'xix-copa-teste-de-jiu-jitsu-2026');
  assert.deepEqual(xix.modalidade, ['kimono', 'nogi']);
  assert.equal(xix.slugs.length, 2);
  assert.equal(xix.cidade, 'Cascavel');
  assert.equal(ev.find((e) => e.id === 'copa-x-de-jiu-jitsu-2025').cidade, 'Maringá', 'cidade pelo link quando a UF do local está errada');
  assert.equal(ev.find((e) => e.id === 'open-candoi-de-jiu-jitsu-2025').cidade, 'Candói', 'último trecho do local antes da UF');
});

test('importarEtapa substitui só os resultados da etapa e acrescenta a modalidade se pedido', () => {
  const etapa = { id: 'copa-teste-2026', data: '2026-06-01', modalidade: ['nogi'] };
  const dados = { ...dadosBase(), campeonatos: [...dadosBase().campeonatos, etapa],
    resultados: [{ campeonatoId: 'antiga', atletaId: 'joao-da-silva-cl' }, { campeonatoId: 'copa-teste-2026', atletaId: 'x' }] };
  const recusa = importarEtapa(dados, etapa, [resposta], mapa);
  assert.deepEqual(recusa.foraDaEtapa, ['kimono']);
  assert.equal(recusa.dados, dados, 'sem ajustar, nada muda');
  const r = importarEtapa(dados, etapa, [resposta], mapa, { ajustarModalidade: true });
  assert.deepEqual(r.etapa.modalidade, ['nogi', 'kimono']);
  assert.equal(r.substituidos, 1);
  assert.equal(r.encerradas, 3);
  assert.equal(r.total, 4);
  assert.ok(r.dados.resultados.some((x) => x.campeonatoId === 'antiga'), 'outras etapas intactas');
  assert.ok(!r.dados.resultados.some((x) => x.atletaId === 'x'), 'resultado antigo da etapa substituído');
  assert.ok(r.academiasNovas.every((a) => a.apelidos?.[0] === a.nome));
});
