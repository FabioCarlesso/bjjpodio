// Sincroniza as etapas com o Torneio Fácil: todos os torneios do estado viram etapas, e os pódios
// publicados lá são importados. Pode rodar quantas vezes quiser (ex.: toda segunda-feira).
//
// Uso:
//   npm run sincronizar                # simula: mostra o que mudaria, não grava
//   npm run sincronizar -- --gravar    # grava em public/data
//
// Opções: --dados <dir> (padrão public/data) · --lista <arquivo.json> e --cache <pasta> (usar arquivos
// já baixados em vez da internet) · --hoje AAAA-MM-DD · --pausa <ms entre chamadas, padrão 500>
//
// Regras (ferramentas/torneiofacil-etapas.json):
//   - torneio do estado (local "… - PR" ou link "…-pr-gi") vira etapa; gi e no-gi do mesmo evento = uma etapa
//   - etapa nova entra com o nível padrão (regional). Nome, cidade e nível editados à mão em campeonatos.json
//     NÃO são sobrescritos; a sincronização só acrescenta links/modalidades e atualiza a situação dos resultados
//   - pódios publicados substituem os resultados da etapa. Sem pódio publicado, os resultados existentes ficam

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as esperar } from 'node:timers/promises';
import { validarDados } from '../public/assets/js/ranking.js';
import { API_RESULTADOS, agruparTorneios, importarEtapa } from './torneiofacil.mjs';

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ARQUIVOS = ['regras', 'categorias', 'campeonatos', 'academias', 'atletas', 'resultados'];
const API_LISTA = 'https://api.torneiofacil.com/tournaments';

const args = { gravar: false, dados: join(raiz, 'public/data'), lista: '', cache: '', hoje: new Date().toISOString().slice(0, 10), pausa: 500 };
for (let i = 2; i < process.argv.length; i++) {
  const a = process.argv[i];
  if (a === '--gravar') args.gravar = true;
  else if (['--dados', '--lista', '--cache', '--hoje', '--pausa'].includes(a)) args[a.slice(2)] = process.argv[++i];
  else sair(`Opção desconhecida: ${a}`);
}
args.pausa = Number(args.pausa);

function sair(msg) {
  console.error(`\n✘ ${msg}\n`);
  process.exit(1);
}

async function baixarJSON(url) {
  const resp = await fetch(url, { headers: { Accept: 'application/json', 'User-Agent': 'bjjpodio-sincronizador' } });
  if (!resp.ok) throw new Error(`${resp.status} em ${url}`);
  return resp.json();
}

async function resultadosDe(slug) {
  const arquivo = args.cache && join(args.cache, `${slug}.json`);
  if (arquivo && existsSync(arquivo)) return JSON.parse(readFileSync(arquivo, 'utf8'));
  const r = await baixarJSON(API_RESULTADOS(slug));
  await esperar(args.pausa); // educação com o servidor deles
  return r;
}

const formatoBonito = (v) => JSON.stringify(v, null, 2) + '\n';
const umPorLinha = (arr) => '[\n' + arr.map((o) => '  ' + JSON.stringify(o)).join(',\n') + '\n]\n';

const cfg = JSON.parse(readFileSync(join(raiz, 'ferramentas/torneiofacil-etapas.json'), 'utf8'));
const mapa = JSON.parse(readFileSync(join(raiz, 'ferramentas/torneiofacil-mapa.json'), 'utf8'));
let dados = Object.fromEntries(ARQUIVOS.map((n) => [n, JSON.parse(readFileSync(join(args.dados, `${n}.json`), 'utf8'))]));
const antes = { etapas: dados.campeonatos.length, atletas: dados.atletas.length, academias: dados.academias.length, resultados: dados.resultados.length };

const lista = args.lista ? JSON.parse(readFileSync(args.lista, 'utf8')) : await baixarJSON(API_LISTA);
const eventos = agruparTorneios(lista, { uf: cfg.estado, ignorar: cfg.ignorar, cidades: cfg.cidades });
console.log(`\nTorneio Fácil: ${lista.length} torneios na lista pública, ${eventos.length} eventos de ${cfg.estado} (gi e no-gi juntos)`);

const linhas = [];
const revisar = [];
const avisos = new Set();
const desconhecidos = new Map();
let novas = 0, consultadas = 0, comPodio = 0, importados = 0, atletasNovos = 0, academiasNovas = 0;

for (const ev of eventos) {
  // Etapa já cadastrada (pelo id ou por algum link em comum) mantém nome, cidade e nível editados à mão.
  const atual = dados.campeonatos.find((c) => c.id === ev.id || c.torneioFacil?.slugs?.some((s) => ev.slugs.includes(s)));
  let etapa = atual
    ? {
      ...atual,
      modalidade: [...new Set([...atual.modalidade, ...ev.modalidade])].sort(),
      torneioFacil: { ...atual.torneioFacil, slugs: [...new Set([...(atual.torneioFacil?.slugs ?? []), ...ev.slugs])].sort() },
    }
    : { id: ev.id, nome: ev.nome, data: ev.data, cidade: ev.cidade, nivel: cfg.nivelPadrao, modalidade: ev.modalidade, torneioFacil: { slugs: ev.slugs } };
  if (!atual) novas += 1;

  let situacao = 'futura';
  if (etapa.data < args.hoje) {
    const respostas = [];
    for (const slug of etapa.torneioFacil.slugs) {
      try { respostas.push(await resultadosDe(slug)); } catch (e) { avisos.add(`${slug}: não consegui ler os resultados (${e.message})`); }
    }
    consultadas += 1;
    const total = respostas.reduce((s, r) => s + (r.results?.length ?? 0), 0);
    const encerradas = respostas.reduce((s, r) => s + (r.results ?? []).filter((x) => x.status === 'FINISHED' && x.podium).length, 0);
    etapa.torneioFacil = { ...etapa.torneioFacil, categorias: total, categoriasComPodio: encerradas, verificadoEm: args.hoje };
    situacao = encerradas ? `${encerradas}/${total} categorias com pódio` : total ? 'sem pódio publicado' : 'sem chaves';

    dados = { ...dados, campeonatos: atual ? dados.campeonatos.map((c) => (c === atual ? etapa : c)) : [...dados.campeonatos, etapa] };
    if (encerradas) {
      comPodio += 1;
      const r = importarEtapa(dados, etapa, respostas, mapa, { ajustarModalidade: true });
      if (r.desconhecidos.size) {
        r.desconhecidos.forEach((d) => desconhecidos.set(d, [...(desconhecidos.get(d) ?? []), etapa.id]));
        situacao += ' — NÃO importada (termo desconhecido)';
      } else {
        dados = r.dados;
        etapa = r.etapa;
        importados += r.resultados.length;
        atletasNovos += r.atletasNovos.length;
        academiasNovas += r.academiasNovas.length;
        situacao += ` → ${r.resultados.length} colocações`;
        r.semCategoria.forEach((p) => revisar.push(`${etapa.id}: ${p.nome} · ${p.bracketKey} · ${p.posicao}º (categoria juntada sem categoria de peso)`));
        r.ignorados.forEach((p) => revisar.push(`${etapa.id}: ${p.nome} · ${p.bracketKey} · ${p.posicao}º (${p.motivo})`));
        r.avisos.forEach((a) => avisos.add(`${etapa.id}: ${a}`));
      }
    }
  } else {
    dados = { ...dados, campeonatos: atual ? dados.campeonatos.map((c) => (c === atual ? etapa : c)) : [...dados.campeonatos, etapa] };
  }
  linhas.push(`  ${etapa.data} ${atual ? ' ' : '+'} ${etapa.nome} (${etapa.cidade}) · ${situacao}`);
}

dados.campeonatos.sort((a, b) => a.data.localeCompare(b.data) || a.nome.localeCompare(b.nome));
console.log(linhas.join('\n'));

if (desconhecidos.size) {
  console.log(`\n⚠ Termos sem tradução (etapas não importadas). Inclua em ferramentas/torneiofacil-mapa.json:`);
  desconhecidos.forEach((ids, d) => console.log(`  - ${d} (${ids.length} etapa(s), ex.: ${ids[0]})`));
}
if (revisar.length) { console.log(`\n⚠ Ficaram de fora para revisar (${revisar.length}):`); revisar.forEach((t) => console.log(`  - ${t}`)); }
if (avisos.size) {
  console.log(`\n⚠ Avisos (${avisos.size}):`);
  [...avisos].slice(0, 25).forEach((t) => console.log(`  - ${t}`));
  if (avisos.size > 25) console.log(`  … e mais ${avisos.size - 25}`);
}

console.log(`\nResumo: ${novas} etapas novas (${dados.campeonatos.length} no total) · ${consultadas} consultadas · ${comPodio} com pódio publicado`);
console.log(`        ${importados} colocações importadas · ${atletasNovos} atletas novos · ${academiasNovas} academias novas`);
console.log(`        antes: ${antes.etapas} etapas, ${antes.resultados} resultados → depois: ${dados.campeonatos.length} etapas, ${dados.resultados.length} resultados`);

const erros = validarDados(dados);
if (erros.length) sair(`Validação falhou, nada gravado:\n  - ${erros.slice(0, 20).join('\n  - ')}`);
console.log('✓ Validação ok');

if (!args.gravar) {
  console.log('Simulação: nada foi gravado. Rode com --gravar para salvar.\n');
} else {
  writeFileSync(join(args.dados, 'campeonatos.json'), umPorLinha(dados.campeonatos));
  writeFileSync(join(args.dados, 'academias.json'), formatoBonito(dados.academias));
  writeFileSync(join(args.dados, 'atletas.json'), umPorLinha(dados.atletas));
  writeFileSync(join(args.dados, 'resultados.json'), umPorLinha(dados.resultados));
  console.log(`Gravado em ${args.dados}. Confira, rode "npm test" e faça o commit.\n`);
}
