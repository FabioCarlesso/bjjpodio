import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  pesoDaTemporada,
  detalharPontos,
  pontosDoResultado,
  filtrarResultados,
  calcularRanking,
  calcularRankingAcademias,
  rankingsDisponiveis,
  validarDados,
} from '../public/assets/js/ranking.js';

// Regras no modelo da CBJJ (as mesmas de public/data/regras.json).
const regras = {
  temporada: 2026,
  pontosPorPosicao: {
    categoria: { 1: 9, 2: 3, 3: 1 },
    absoluto: { 1: 13.5, 2: 4.5, 3: 1.5 },
  },
  pesoPorNivel: { regional: 1, estadual: 2, grande: 4 },
  pesoPorTemporada: [3, 2, 1],
  desempate: [],
};
const categorias = {
  sexos: [{ id: 'M' }, { id: 'F' }],
  faixas: [{ id: 'branca' }, { id: 'azul' }, { id: 'roxa' }],
  idades: [{ id: 'adulto' }, { id: 'master1' }],
  pesos: [{ id: 'leve' }, { id: 'medio' }, { id: 'absoluto' }],
  modalidades: [{ id: 'kimono' }, { id: 'nogi' }],
};
const campeonatos = [
  { id: 'reg26', data: '2026-03-01', nivel: 'regional', modalidade: ['kimono', 'nogi'] },
  { id: 'est26', data: '2026-05-01', nivel: 'estadual', modalidade: ['kimono'] },
  { id: 'gp26',  data: '2026-08-01', nivel: 'grande',   modalidade: ['kimono'] },
  { id: 'gp25',  data: '2025-08-01', nivel: 'grande',   modalidade: ['kimono'] },
  { id: 'reg24', data: '2024-08-01', nivel: 'regional', modalidade: ['kimono'] },
  { id: 'reg23', data: '2023-08-01', nivel: 'regional', modalidade: ['kimono'] },
];
const academias = [{ id: 'x', nome: 'Academia X' }, { id: 'y', nome: 'Academia Y' }];
const atletas = [
  { id: 'ana',  nome: 'Ana Souza',  academiaId: 'x', sexo: 'F', faixa: 'azul' },
  { id: 'beto', nome: 'Beto Lima',  academiaId: 'x', sexo: 'M', faixa: 'azul' },
  { id: 'caio', nome: 'Caio Ramos', academiaId: 'y', sexo: 'M', faixa: 'azul' },
  { id: 'davi', nome: 'Davi Rocha', academiaId: 'y', sexo: 'M', faixa: 'azul' },
  { id: 'edu',  nome: 'Édu Prado',  academiaId: 'y', sexo: 'M', faixa: 'roxa' },
];
// Resultado padrão: kimono, azul, adulto, leve.
const R = (campeonatoId, atletaId, posicao, extra = {}) =>
  ({ campeonatoId, atletaId, posicao, modalidade: 'kimono', faixa: 'azul', idade: 'adulto', peso: 'leve', ...extra });
const base = { regras, categorias, campeonatos, academias, atletas };
const camp = (id) => campeonatos.find((c) => c.id === id);
const AZUL_M = { modalidade: 'kimono', sexo: 'M', idade: 'adulto', faixa: 'azul' };

test('peso da temporada: atual ×3, anterior ×2, retrasada ×1, mais antiga não conta', () => {
  assert.equal(pesoDaTemporada(2026, 2026, regras), 3);
  assert.equal(pesoDaTemporada(2025, 2026, regras), 2);
  assert.equal(pesoDaTemporada(2024, 2026, regras), 1);
  assert.equal(pesoDaTemporada(2023, 2026, regras), 0);
  assert.equal(pesoDaTemporada(2027, 2026, regras), 0, 'temporada futura não conta');
});

test('exemplos oficiais da CBJJ: colocação × peso da etapa × peso da temporada', () => {
  // "1º Lugar Meio Pesado Campeonato Brasileiro 2023 = 9 pts x 4 x 1 = 36 pts" (referência 2025)
  const brasileiro23 = { data: '2023-06-01', nivel: 'grande' };
  assert.equal(pontosDoResultado({ posicao: 1, peso: 'leve' }, brasileiro23, regras, 2025), 36);
  // "2º Lugar Absoluto Campeonato Brasileiro 2024 = 4.5 pts x 4 x 2 = 36 pts"
  const brasileiro24 = { data: '2024-06-01', nivel: 'grande' };
  assert.equal(pontosDoResultado({ posicao: 2, peso: 'absoluto' }, brasileiro24, regras, 2025), 36);
  // "3º Lugar Peso leve Floripa Winter 2025 = 1 pts x 1 x 3 = 3 pts"
  const open25 = { data: '2025-07-01', nivel: 'regional' };
  assert.equal(pontosDoResultado({ posicao: 3, peso: 'leve' }, open25, regras, 2025), 3);
});

test('detalharPontos abre a conta', () => {
  assert.deepEqual(detalharPontos(R('est26', 'beto', 1, { peso: 'absoluto' }), camp('est26'), regras),
    { base: 13.5, pesoEtapa: 2, pesoTemporada: 3, pontos: 81 });
  assert.equal(detalharPontos(R('reg23', 'beto', 1), camp('reg23'), regras).pontos, 0);
});

test('soma pontos das 3 temporadas e ignora a quarta', () => {
  const resultados = [
    R('reg26', 'beto', 1), //  9 × 1 × 3 = 27
    R('gp25', 'beto', 2),  //  3 × 4 × 2 = 24
    R('reg24', 'beto', 3), //  1 × 1 × 1 = 1
    R('reg23', 'beto', 1), //  fora da janela
  ];
  const [beto] = calcularRanking({ ...base, resultados }, AZUL_M);
  assert.equal(beto.pontos, 27 + 24 + 1);
  assert.equal(beto.resultados.length, 3);
  assert.deepEqual([beto.ouros, beto.pratas, beto.bronzes], [1, 1, 1]);
  assert.equal(beto.campeonatosDisputados, 3);
  assert.equal(beto.resultados[0].campeonatoId, 'reg26', 'histórico do mais recente para o mais antigo');
});

test('ranking de outra temporada de referência muda os pesos', () => {
  const resultados = [R('gp25', 'beto', 1), R('reg24', 'beto', 1)];
  const [b25] = calcularRanking({ ...base, resultados }, { ...AZUL_M, temporada: 2025 });
  assert.equal(b25.pontos, 9 * 4 * 3 + 9 * 1 * 2);
});

test('pontos valem só na faixa, idade e modalidade em que foram conquistados', () => {
  const resultados = [
    R('gp25', 'beto', 1, { faixa: 'branca' }), // conquistado na branca: não vai para a azul
    R('reg26', 'beto', 2),
    R('reg26', 'beto', 1, { modalidade: 'nogi' }),
    R('est26', 'beto', 1, { idade: 'master1' }),
  ];
  const dados = { ...base, resultados };
  assert.equal(calcularRanking(dados, AZUL_M)[0].pontos, 3 * 1 * 3);
  assert.equal(calcularRanking(dados, { ...AZUL_M, faixa: 'branca' })[0].pontos, 9 * 4 * 2);
  assert.equal(calcularRanking(dados, { ...AZUL_M, modalidade: 'nogi' })[0].pontos, 9 * 1 * 3);
  assert.equal(calcularRanking(dados, { ...AZUL_M, idade: 'master1' })[0].pontos, 9 * 2 * 3);
});

test('absoluto soma no ranking da faixa; filtro de peso recalcula só com aquele peso', () => {
  const resultados = [
    R('est26', 'beto', 1, { peso: 'absoluto' }), // 13,5 × 2 × 3 = 81
    R('est26', 'beto', 2),                       //  3 × 2 × 3 = 18
    R('est26', 'caio', 1),                       //  9 × 2 × 3 = 54
  ];
  const dados = { ...base, resultados };
  assert.deepEqual(calcularRanking(dados, AZUL_M).map((l) => [l.atletaId, l.pontos, l.posicao]), [['beto', 99, 1], ['caio', 54, 2]]);
  assert.deepEqual(calcularRanking(dados, { ...AZUL_M, peso: 'leve' }).map((l) => [l.atletaId, l.pontos, l.posicao]), [['caio', 54, 1], ['beto', 18, 2]]);
  assert.deepEqual(calcularRanking(dados, { ...AZUL_M, peso: 'absoluto' }).map((l) => [l.atletaId, l.pontos]), [['beto', 81]]);
});

test('sem critério de desempate (como a CBJJ): pontos iguais dividem a posição, ordem alfabética', () => {
  const resultados = [
    R('reg26', 'caio', 1),                     // 9 × 1 × 3 = 27 (1 ouro)
    R('reg26', 'davi', 2),                     // 3 × 1 × 3 = 9
    R('reg26', 'davi', 2, { peso: 'medio' }),  // 3 × 1 × 3 = 9
    R('reg24', 'davi', 1),                     // 9 × 1 × 1 = 9  → Davi 27 (1 ouro, 2 pratas)
    R('reg26', 'beto', 3),                     // 1 × 1 × 3 = 3
  ];
  const r = calcularRanking({ ...base, resultados }, AZUL_M);
  assert.deepEqual(r.map((l) => [l.atletaId, l.pontos, l.posicao]), [['caio', 27, 1], ['davi', 27, 1], ['beto', 3, 3]]);
});

test('critério de desempate configurável continua funcionando', () => {
  const resultados = [R('reg26', 'caio', 1), R('reg26', 'davi', 2), R('reg26', 'davi', 2, { peso: 'medio' }), R('reg24', 'davi', 1)];
  const r = calcularRanking({ ...base, regras: { ...regras, desempate: ['pratas'] }, resultados }, AZUL_M);
  assert.deepEqual(r.map((l) => [l.atletaId, l.posicao]), [['davi', 1], ['caio', 2]]);
});

test('busca mantém a posição real; filtros de sexo e academia', () => {
  const resultados = [R('reg26', 'caio', 1), R('reg26', 'davi', 2), R('reg26', 'beto', 3), R('reg26', 'ana', 1)];
  const dados = { ...base, resultados };
  assert.deepEqual(calcularRanking(dados, { ...AZUL_M, busca: 'BETO' }).map((l) => [l.atletaId, l.posicao]), [['beto', 3]]);
  assert.deepEqual(calcularRanking(dados, { ...AZUL_M, sexo: 'F' }).map((l) => l.atletaId), ['ana']);
  assert.deepEqual(filtrarResultados(resultados, dados, { academiaId: 'y' }).map((r) => r.atletaId), ['caio', 'davi']);
});

test('rankingsDisponiveis: gênero + idade + faixa com resultado, faixa mais alta primeiro', () => {
  const resultados = [
    R('reg26', 'caio', 1), R('reg26', 'davi', 2), R('reg26', 'ana', 1),
    R('reg26', 'edu', 1, { faixa: 'roxa' }),
    R('reg23', 'beto', 1, { faixa: 'branca' }), // fora da janela
    R('reg26', 'beto', 1, { modalidade: 'nogi' }),
  ];
  const lista = rankingsDisponiveis({ ...base, resultados }, { modalidade: 'kimono' });
  assert.deepEqual(lista.map((c) => [c.sexo, c.idade, c.faixa, c.atletas]), [
    ['M', 'adulto', 'roxa', 1], ['M', 'adulto', 'azul', 2], ['F', 'adulto', 'azul', 1],
  ]);
});

test('ranking por academia soma todos os atletas da modalidade', () => {
  const resultados = [
    R('reg26', 'beto', 1),                         // x: 27
    R('reg26', 'ana', 1),                          // x: 27
    R('reg26', 'caio', 2),                         // y: 9
    R('est26', 'davi', 1),                         // y: 9 × 2 × 3 = 54
    R('reg26', 'edu', 1, { modalidade: 'nogi' }),  // no-gi: fora do ranking de kimono
  ];
  const r = calcularRankingAcademias({ ...base, resultados }, { modalidade: 'kimono' });
  assert.deepEqual(r.map((a) => [a.academiaId, a.pontos, a.atletas, a.posicao]), [['y', 63, 2, 1], ['x', 54, 2, 2]]);
  assert.deepEqual(r[0].membros.map((m) => m.atletaId), ['davi', 'caio']);
});

test('validarDados aponta referências, categorias e regras inválidas', () => {
  const resultados = [
    R('reg26', 'beto', 1),
    R('nao-existe', 'beto', 1),
    R('reg26', 'fantasma', 1),
    R('reg26', 'caio', 7),
    R('est26', 'caio', 1, { modalidade: 'nogi' }),
    R('reg26', 'beto', 1),
    R('reg26', 'davi', 1, { peso: 'pesadinho' }),
  ];
  const erros = validarDados({ ...base, resultados });
  const texto = erros.join('\n');
  assert.equal(erros.length, 6, texto);
  for (const trecho of ['campeonato inexistente', 'atleta inexistente', 'posição sem pontuação', 'não tem a modalidade "nogi"', 'duplicado', 'peso desconhecido']) {
    assert.match(texto, new RegExp(trecho));
  }
  const semAbsoluto = validarDados({ ...base, regras: { ...regras, pontosPorPosicao: { categoria: regras.pontosPorPosicao.categoria } }, resultados: [] });
  assert.match(semAbsoluto.join('\n'), /pontosPorPosicao\.absoluto/);
});

// ---------- dados reais do site ----------

const ler = (nome) => JSON.parse(readFileSync(new URL(`../public/data/${nome}.json`, import.meta.url)));
const reais = Object.fromEntries(
  ['regras', 'categorias', 'campeonatos', 'academias', 'atletas', 'resultados'].map((n) => [n, ler(n)]),
);

test('public/data: dados íntegros', () => {
  assert.deepEqual(validarDados(reais), []);
});

test('public/data: cada ranking disponível calcula sem erros (vale também com os dados vazios)', () => {
  for (const modalidade of ['kimono', 'nogi']) {
    const lista = rankingsDisponiveis(reais, { modalidade });
    for (const cat of lista) {
      const r = calcularRanking(reais, { modalidade, ...cat });
      assert.equal(r.length, cat.atletas);
      assert.equal(r[0].posicao, 1);
      r.forEach((l) => assert.ok(Number.isFinite(l.pontos) && l.pontos > 0 && l.atleta));
    }
  }
  assert.ok(Array.isArray(calcularRankingAcademias(reais, { modalidade: 'kimono' })));
});

test('sem nenhum dado lançado, nada quebra', () => {
  const vazio = { ...base, campeonatos: [], academias: [], atletas: [], resultados: [] };
  assert.deepEqual(validarDados(vazio), []);
  assert.deepEqual(rankingsDisponiveis(vazio, { modalidade: 'kimono' }), []);
  assert.deepEqual(calcularRanking(vazio, AZUL_M), []);
  assert.deepEqual(calcularRankingAcademias(vazio, { modalidade: 'kimono' }), []);
});
