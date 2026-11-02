import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  pontosDoResultado,
  filtrarResultados,
  calcularRanking,
  calcularRankingAcademias,
  validarDados,
} from '../public/assets/js/ranking.js';

const regras = {
  temporada: 2026,
  pontosPorPosicao: { 1: 9, 2: 3, 3: 1 },
  pesoPorNivel: { regional: 1, estadual: 1.5, grande: 2 },
  melhoresResultados: null,
  desempate: ['ouros', 'pratas', 'bronzes', 'campeonatosDisputados'],
};
const categorias = {
  sexos: [{ id: 'M' }, { id: 'F' }],
  faixas: [{ id: 'branca' }, { id: 'azul' }],
  idades: [{ id: 'adulto' }],
  pesos: [{ id: 'leve' }, { id: 'medio' }],
  modalidades: [{ id: 'kimono' }, { id: 'nogi' }],
};
const campeonatos = [
  { id: 'reg', data: '2026-03-01', nivel: 'regional', modalidade: ['kimono', 'nogi'] },
  { id: 'est', data: '2026-05-01', nivel: 'estadual', modalidade: ['kimono'] },
  { id: 'gp',  data: '2026-08-01', nivel: 'grande',   modalidade: ['kimono'] },
  { id: 'velho', data: '2025-08-01', nivel: 'regional', modalidade: ['kimono'] },
];
const academias = [{ id: 'x', nome: 'Academia X' }, { id: 'y', nome: 'Academia Y' }];
const atletas = [
  { id: 'ana',   nome: 'Ana Souza',   academiaId: 'x', sexo: 'F', faixa: 'branca' },
  { id: 'beto',  nome: 'Beto Lima',   academiaId: 'x', sexo: 'M', faixa: 'azul' },
  { id: 'caio',  nome: 'Caio Ramos',  academiaId: 'y', sexo: 'M', faixa: 'azul' },
  { id: 'davi',  nome: 'Davi Rocha',  academiaId: 'y', sexo: 'M', faixa: 'azul' },
  { id: 'edu',   nome: 'Édu Prado',   academiaId: 'y', sexo: 'M', faixa: 'azul' },
];
const R = (campeonatoId, atletaId, posicao, extra = {}) =>
  ({ campeonatoId, atletaId, posicao, modalidade: 'kimono', faixa: 'azul', idade: 'adulto', peso: 'leve', ...extra });

const base = { regras, categorias, campeonatos, academias, atletas };

test('pontos = posição × peso do nível', () => {
  assert.equal(pontosDoResultado(R('reg', 'beto', 1), campeonatos[0], regras), 9);
  assert.equal(pontosDoResultado(R('est', 'beto', 1), campeonatos[1], regras), 13.5);
  assert.equal(pontosDoResultado(R('gp', 'beto', 3), campeonatos[2], regras), 2);
  assert.equal(pontosDoResultado(R('gp', 'beto', 4), campeonatos[2], regras), 0);
});

test('soma pontos e conta medalhas e campeonatos', () => {
  const resultados = [
    R('reg', 'beto', 1),
    R('reg', 'beto', 2, { modalidade: 'nogi' }),
    R('est', 'beto', 3),
    R('reg', 'caio', 2),
  ];
  const [beto, caio] = calcularRanking({ ...base, resultados });
  assert.equal(beto.atletaId, 'beto');
  assert.equal(beto.pontos, 9 + 3 + 1.5);
  assert.deepEqual([beto.ouros, beto.pratas, beto.bronzes], [1, 1, 1]);
  assert.equal(beto.campeonatosDisputados, 2);
  assert.equal(beto.posicao, 1);
  assert.equal(caio.posicao, 2);
  assert.equal(beto.resultados[0].campeonatoId, 'est', 'histórico do mais recente para o mais antigo');
});

test('desempate: ouros antes de pratas', () => {
  // Caio: 1 ouro regional = 9. Davi: 3 pratas regionais = 9.
  const resultados = [
    R('reg', 'davi', 2), R('reg', 'davi', 2, { modalidade: 'nogi' }), R('reg', 'davi', 2, { peso: 'medio' }),
    R('reg', 'caio', 1),
  ];
  const r = calcularRanking({ ...base, resultados });
  assert.deepEqual(r.map((l) => [l.atletaId, l.pontos, l.posicao]), [['caio', 9, 1], ['davi', 9, 2]]);
});

test('desempate: mais campeonatos disputados', () => {
  // Mesmos pontos e medalhas; Davi disputou 2 campeonatos, Caio 1.
  const resultados = [
    R('reg', 'caio', 3), R('reg', 'caio', 3, { modalidade: 'nogi' }),
    R('reg', 'davi', 3), R('velho', 'davi', 3),
  ];
  const r = calcularRanking({ ...base, resultados });
  assert.deepEqual(r.map((l) => l.atletaId), ['davi', 'caio']);
});

test('empate total divide a posição e ordena por nome', () => {
  const resultados = [R('reg', 'edu', 1), R('reg', 'caio', 1, { peso: 'medio' }), R('reg', 'beto', 2)];
  const r = calcularRanking({ ...base, resultados });
  assert.deepEqual(r.map((l) => [l.atletaId, l.posicao]), [['caio', 1], ['edu', 1], ['beto', 3]]);
});

test('melhoresResultados: só os N melhores somam, medalhas contam todas', () => {
  const resultados = [R('reg', 'beto', 3), R('est', 'beto', 1), R('gp', 'beto', 2), R('velho', 'beto', 3)];
  const [beto] = calcularRanking({ ...base, regras: { ...regras, melhoresResultados: 2 }, resultados });
  assert.equal(beto.pontos, 13.5 + 6);
  assert.equal(beto.resultados.filter((i) => i.contaNoTotal).length, 2);
  assert.deepEqual([beto.ouros, beto.pratas, beto.bronzes], [1, 1, 2]);
});

test('filtros: temporada, modalidade, faixa, peso, sexo e academia', () => {
  const resultados = [
    R('reg', 'ana', 1, { faixa: 'branca' }),
    R('reg', 'beto', 1, { modalidade: 'nogi' }),
    R('velho', 'caio', 1),
    R('est', 'edu', 2, { peso: 'medio' }),
  ];
  const dados = { ...base, resultados };
  const ids = (f) => filtrarResultados(resultados, dados, f).map((r) => r.atletaId).sort();
  assert.deepEqual(ids({ temporada: 2026 }), ['ana', 'beto', 'edu']);
  assert.deepEqual(ids({ temporada: '2025' }), ['caio']);
  assert.deepEqual(ids({ modalidade: 'nogi' }), ['beto']);
  assert.deepEqual(ids({ faixa: 'branca' }), ['ana']);
  assert.deepEqual(ids({ peso: 'medio' }), ['edu']);
  assert.deepEqual(ids({ sexo: 'F' }), ['ana']);
  assert.deepEqual(ids({ academiaId: 'y' }), ['caio', 'edu']);
  assert.deepEqual(ids({ faixa: '', peso: undefined }), ['ana', 'beto', 'caio', 'edu']);
});

test('filtro de categoria recalcula posições; busca mantém a posição real', () => {
  const resultados = [R('reg', 'caio', 1), R('reg', 'edu', 2), R('reg', 'ana', 3, { faixa: 'branca' })];
  const dados = { ...base, resultados };
  assert.deepEqual(calcularRanking(dados, { faixa: 'branca' }).map((l) => [l.atletaId, l.posicao]), [['ana', 1]]);
  assert.deepEqual(calcularRanking(dados, { busca: 'EDU' }).map((l) => [l.atletaId, l.posicao]), [['edu', 2]]);
  assert.deepEqual(calcularRanking(dados, { busca: 'ana souza' }).map((l) => [l.atletaId, l.posicao]), [['ana', 3]]);
  assert.equal(calcularRanking(dados, { busca: 'ninguém' }).length, 0);
});

test('ranking por academia soma os atletas', () => {
  const resultados = [R('reg', 'beto', 1), R('reg', 'ana', 1, { faixa: 'branca' }), R('reg', 'caio', 2), R('est', 'davi', 1)];
  const r = calcularRankingAcademias({ ...base, resultados });
  assert.deepEqual(
    r.map((a) => [a.academiaId, a.pontos, a.atletas, a.ouros, a.posicao]),
    [['x', 18, 2, 2, 1], ['y', 16.5, 2, 1, 2]],
  );
});

test('validarDados aponta referências e categorias inválidas', () => {
  const resultados = [
    R('reg', 'beto', 1),
    R('nao-existe', 'beto', 1),
    R('reg', 'fantasma', 1),
    R('reg', 'caio', 7),
    R('est', 'caio', 1, { modalidade: 'nogi' }),
    R('reg', 'beto', 1),
  ];
  const erros = validarDados({ ...base, resultados });
  assert.equal(erros.length, 5, erros.join('\n'));
  assert.match(erros.join('\n'), /campeonato inexistente/);
  assert.match(erros.join('\n'), /atleta inexistente/);
  assert.match(erros.join('\n'), /posição sem pontuação/);
  assert.match(erros.join('\n'), /não tem a modalidade "nogi"/);
  assert.match(erros.join('\n'), /duplicado/);
});

// ---------- dados reais do site ----------

const ler = (nome) => JSON.parse(readFileSync(new URL(`../public/data/${nome}.json`, import.meta.url)));
const reais = Object.fromEntries(
  ['regras', 'categorias', 'campeonatos', 'academias', 'atletas', 'resultados'].map((n) => [n, ler(n)]),
);

test('public/data: dados íntegros', () => {
  assert.deepEqual(validarDados(reais), []);
});

test('public/data: ranking da temporada calcula sem erros', () => {
  const r = calcularRanking(reais, { temporada: reais.regras.temporada });
  assert.ok(r.length > 0);
  assert.equal(r[0].posicao, 1);
  r.forEach((l) => assert.ok(Number.isFinite(l.pontos) && l.atleta));
  assert.ok(calcularRankingAcademias(reais, { temporada: reais.regras.temporada }).length > 0);
});
