// Importa os pódios de um torneio do Torneio Fácil para public/data (resultados, atletas, academias).
//
// Uso:
//   npm run importar -- <link-ou-slug> [<outro: ex. o no-gi>] --campeonato <id> [--gravar] [--substituir]
//
//   <link-ou-slug>  https://torneiofacil.com/resultados/<slug>  ou só o <slug>
//   --campeonato    id da etapa em public/data/campeonatos.json (cadastre a etapa antes: data, cidade, nível)
//   --gravar        grava os arquivos; sem isso é só simulação (mostra o relatório e não muda nada)
//   --substituir    apaga os resultados já lançados desta etapa antes (para reimportar após correções)
//   --arquivo <f>   lê a resposta da API de um arquivo .json em vez de baixar (pode repetir)
//   --dados <dir>   pasta dos dados (padrão: public/data)
//
// Depois de gravar: confira o relatório, rode `npm test` e faça o commit.

import { readFileSync, writeFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validarDados } from '../public/assets/js/ranking.js';
import { API_RESULTADOS, slugDoLink, converterResultados, resolverJuntos, ligarAtletas } from './torneiofacil.mjs';

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ARQUIVOS = ['regras', 'categorias', 'campeonatos', 'academias', 'atletas', 'resultados'];

function lerArgs(argv) {
  const args = { fontes: [], arquivos: [], gravar: false, substituir: false, campeonato: '', dados: join(raiz, 'public/data') };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--gravar') args.gravar = true;
    else if (a === '--substituir') args.substituir = true;
    else if (a === '--campeonato') args.campeonato = argv[++i] ?? '';
    else if (a === '--arquivo') args.arquivos.push(argv[++i]);
    else if (a === '--dados') args.dados = resolve(argv[++i]);
    else if (a.startsWith('--')) sair(`Opção desconhecida: ${a}`);
    else args.fontes.push(slugDoLink(a));
  }
  if (!args.campeonato) sair('Informe a etapa: --campeonato <id> (o id está em public/data/campeonatos.json).');
  if (!args.fontes.length && !args.arquivos.length) sair('Informe o link do torneio no Torneio Fácil (…/resultados/<slug>).');
  return args;
}

function sair(msg) {
  console.error(`\n✘ ${msg}\n`);
  process.exit(1);
}

async function baixar(slug) {
  const resp = await fetch(API_RESULTADOS(slug), { headers: { Accept: 'application/json', 'User-Agent': 'bjjpodio-importador' } });
  if (!resp.ok) sair(`Torneio Fácil respondeu ${resp.status} para "${slug}". Confira o link (a página /resultados/${slug} abre?).`);
  return resp.json();
}

// Mesmo formato dos arquivos atuais: academias "bonito"; atletas e resultados um por linha (fácil de revisar no diff).
const formatoBonito = (v) => JSON.stringify(v, null, 2) + '\n';
const umPorLinha = (arr) => '[\n' + arr.map((o) => '  ' + JSON.stringify(o)).join(',\n') + '\n]\n';

const args = lerArgs(process.argv.slice(2));
const dados = Object.fromEntries(ARQUIVOS.map((n) => [n, JSON.parse(readFileSync(join(args.dados, `${n}.json`), 'utf8'))]));
const mapa = JSON.parse(readFileSync(join(raiz, 'ferramentas/torneiofacil-mapa.json'), 'utf8'));

const campeonato = dados.campeonatos.find((c) => c.id === args.campeonato);
if (!campeonato) sair(`Etapa "${args.campeonato}" não existe em campeonatos.json. Cadastre antes (id, nome, data, cidade, nível, modalidade).`);

const respostas = [
  ...await Promise.all(args.fontes.map(baixar)),
  ...args.arquivos.map((f) => JSON.parse(readFileSync(f, 'utf8'))),
];

let podios = [];
let pendentes = 0;
const desconhecidos = new Set();
for (const resposta of respostas) {
  const c = converterResultados(resposta, mapa);
  podios = podios.concat(c.podios);
  pendentes += c.pendentes;
  c.desconhecidos.forEach((d) => desconhecidos.add(d));
}
if (desconhecidos.size) {
  sair(`Termos do Torneio Fácil sem tradução. Adicione em ferramentas/torneiofacil-mapa.json (e em categorias.json, se for categoria nova):\n  - ${[...desconhecidos].join('\n  - ')}`);
}
const foraDaEtapa = [...new Set(podios.map((p) => p.modalidade))].filter((m) => !campeonato.modalidade.includes(m));
if (foraDaEtapa.length) sair(`O torneio tem ${foraDaEtapa.join(', ')}, mas a etapa "${campeonato.id}" só tem ${campeonato.modalidade.join(', ')}. Ajuste a modalidade da etapa em campeonatos.json.`);

const { resolvidos, semCategoria } = resolverJuntos(podios);

const jaLancados = dados.resultados.filter((r) => r.campeonatoId === campeonato.id);
if (jaLancados.length && !args.substituir) sair(`A etapa "${campeonato.id}" já tem ${jaLancados.length} resultados. Use --substituir para trocar pelos do Torneio Fácil.`);
const base = { ...dados, resultados: dados.resultados.filter((r) => r.campeonatoId !== campeonato.id) };

const lig = ligarAtletas(resolvidos, base, campeonato);
const novo = {
  ...base,
  academias: [...dados.academias, ...lig.academiasNovas],
  atletas: [...dados.atletas.map((a) => (lig.atualizacoes.has(a.id) ? { ...a, ...lig.atualizacoes.get(a.id) } : a)), ...lig.atletasNovos],
  resultados: [...base.resultados, ...lig.resultados],
};
const erros = validarDados(novo);

// ---------- relatório ----------
const nomeAcad = new Map(novo.academias.map((a) => [a.id, a.nome]));
const porModalidade = lig.resultados.reduce((m, r) => ((m[r.modalidade] = (m[r.modalidade] ?? 0) + 1), m), {});
const ligadosExistentes = new Set(lig.resultados.map((r) => r.atletaId).filter((id) => !lig.atletasNovos.some((a) => a.id === id))).size;
const linha = (t) => console.log(t);

linha(`\nImportação Torneio Fácil → etapa "${campeonato.nome}" (${campeonato.data}, ${campeonato.id})`);
respostas.forEach((r) => linha(`  • ${r.tournament?.name ?? '?'} (${r.tournament?.slug ?? '?'})`));
linha(`\nCategorias: ${new Set(podios.map((p) => p.bracketKey)).size} encerradas com pódio${pendentes ? `, ${pendentes} sem resultado (ignoradas)` : ''}`);
linha(`Resultados: ${lig.resultados.length} (${Object.entries(porModalidade).map(([m, n]) => `${m} ${n}`).join(', ')}; absoluto ${lig.resultados.filter((r) => r.peso === 'absoluto').length})`);
const resolvidosJuntos = resolvidos.filter((p) => p.resolvidoPor).length;
if (resolvidosJuntos) linha(`Categorias juntadas: ${resolvidosJuntos} colocações com idade/faixa tiradas da categoria de peso do atleta`);
if (jaLancados.length) linha(`Substituídos: ${jaLancados.length} resultados antigos desta etapa`);
linha(`Atletas: ${ligadosExistentes} já cadastrados, ${lig.atletasNovos.length} novos`);
lig.atletasNovos.forEach((a) => linha(`  + ${a.nome} · ${nomeAcad.get(a.academiaId)} · ${a.faixa} (${a.id})`));
if (lig.academiasNovas.length) {
  linha(`Academias novas: ${lig.academiasNovas.length} (complete a cidade em academias.json; o nome pode ser ajustado, o original fica em "apelidos")`);
  lig.academiasNovas.forEach((a) => linha(`  + ${a.nome} (${a.id})`));
}
if (lig.atualizacoes.size) {
  linha('Cadastro atualizado (torneio mais recente do atleta):');
  lig.atualizacoes.forEach((m, id) => linha(`  ~ ${id}: ${Object.entries(m).map(([k, v]) => `${k} → ${v}`).join(', ')}`));
}
const revisar = [
  ...semCategoria.map((p) => `${p.nome} · ${p.bracketKey} · ${p.posicao}º: sem categoria de peso no torneio para saber idade/faixa reais`),
  ...lig.ignorados.map((p) => `${p.nome} · ${p.bracketKey} · ${p.posicao}º: ${p.motivo}`),
];
if (revisar.length) { linha(`\n⚠ Ficaram de fora (${revisar.length}) — lance à mão se for o caso:`); revisar.forEach((t) => linha(`  - ${t}`)); }
if (lig.avisos.length) { linha(`\n⚠ Avisos (${lig.avisos.length}):`); [...new Set(lig.avisos)].forEach((t) => linha(`  - ${t}`)); }

if (erros.length) sair(`Validação falhou, nada gravado:\n  - ${erros.slice(0, 20).join('\n  - ')}`);
linha('\n✓ Validação ok');

if (!args.gravar) {
  linha('Simulação: nada foi gravado. Rode de novo com --gravar para salvar.\n');
} else {
  // Academias novas guardam o nome original do Torneio Fácil em "apelidos" (para casar de novo mesmo se o nome for editado).
  const academias = novo.academias.map((a) => (lig.academiasNovas.includes(a) ? { ...a, apelidos: [a.nome] } : a));
  writeFileSync(join(args.dados, 'academias.json'), formatoBonito(academias));
  writeFileSync(join(args.dados, 'atletas.json'), umPorLinha(novo.atletas));
  writeFileSync(join(args.dados, 'resultados.json'), umPorLinha(novo.resultados));
  linha(`Gravado em ${args.dados}. Rode "npm test" e faça o commit.\n`);
}
