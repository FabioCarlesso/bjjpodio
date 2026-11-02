// Escolha do ranking (modalidade + gênero + idade + faixa, peso opcional) e sincronização com a URL.
// A URL guarda o ranking (/ranking?modalidade=kimono&sexo=M&idade=adulto&faixa=azul) para o link poder ser compartilhado.

import { rankingsDisponiveis, filtrarResultados, temporadaDe } from './ranking.js';

export const MODALIDADE_PADRAO = 'kimono';
const CAMPOS_URL = ['modalidade', 'sexo', 'idade', 'faixa', 'peso', 'q', 'temporada'];

/** Temporadas com campeonato cadastrado, da mais recente para a mais antiga. */
export function temporadasDisponiveis(dados) {
  const anos = new Set(dados.campeonatos.map(temporadaDe));
  anos.add(Number(dados.regras.temporada));
  return [...anos].sort((a, b) => b - a);
}

/** Modalidades com algum resultado valendo na temporada de referência, na ordem de categorias.json. */
export function modalidadesDisponiveis(dados, temporada) {
  return dados.categorias.modalidades.filter((m) => rankingsDisponiveis(dados, { temporada, modalidade: m.id }).length);
}

/** Pesos (incluindo absoluto) com resultado num ranking, na ordem de categorias.json. */
export function pesosDoRanking(dados, filtro) {
  const { peso, ...semPeso } = filtro;
  const usados = new Set(filtrarResultados(dados.resultados, dados, semPeso).map((r) => r.peso));
  return dados.categorias.pesos.filter((p) => usados.has(p.id));
}

/**
 * Lê o ranking pedido na URL e corrige o que não existe:
 * modalidade inválida → kimono; combinação gênero/idade/faixa inexistente → a mais parecida que exista.
 * Retorna { temporada, modalidade, sexo, idade, faixa, peso, q } ou null se não houver ranking nenhum.
 */
export function lerRankingDaURL(search, dados) {
  const params = new URLSearchParams(search);
  const temporadas = temporadasDisponiveis(dados);
  const pedida = Number(params.get('temporada'));
  const temporada = temporadas.includes(pedida) ? pedida : Number(dados.regras.temporada);

  const modalidades = modalidadesDisponiveis(dados, temporada).map((m) => m.id);
  if (!modalidades.length) return null;
  const modalidade = modalidades.includes(params.get('modalidade')) ? params.get('modalidade')
    : modalidades.includes(MODALIDADE_PADRAO) ? MODALIDADE_PADRAO : modalidades[0];

  const escolhido = escolherRanking(dados, { temporada, modalidade }, {
    sexo: params.get('sexo') ?? '', idade: params.get('idade') ?? '', faixa: params.get('faixa') ?? '',
  });
  const filtro = { temporada, modalidade, ...escolhido, peso: '', q: (params.get('q') ?? '').slice(0, 60) };
  const peso = params.get('peso') ?? '';
  if (pesosDoRanking(dados, filtro).some((p) => p.id === peso)) filtro.peso = peso;
  return filtro;
}

/**
 * Dentre os rankings que existem, o que mais combina com o pedido (prioridade: faixa, gênero, idade).
 * Usado também quando o usuário troca um campo e a combinação nova não existe: o campo trocado
 * (prioridade) vale mais que todos os outros, para a escolha da pessoa sempre ser respeitada.
 */
export function escolherRanking(dados, { temporada, modalidade }, pedido, prioridade = '') {
  const lista = rankingsDisponiveis(dados, { temporada, modalidade });
  const peso = { faixa: 4, sexo: 2, idade: 1 };
  if (prioridade in peso) peso[prioridade] = 8;
  const nota = (c) => ['faixa', 'sexo', 'idade'].reduce((n, campo) => n + (c[campo] === pedido[campo] ? peso[campo] : 0), 0);
  const melhor = lista.reduce((a, b) => (nota(b) > nota(a) ? b : a), lista[0]);
  return melhor ? { sexo: melhor.sexo, idade: melhor.idade, faixa: melhor.faixa } : { sexo: '', idade: '', faixa: '' };
}

/** Query string do ranking; omite vazios e a temporada atual para o link ficar curto. */
export function rankingParaQuery(filtro, padraoTemporada) {
  const params = new URLSearchParams();
  for (const campo of CAMPOS_URL) {
    const valor = filtro[campo];
    if (!valor) continue;
    if (campo === 'temporada' && Number(valor) === Number(padraoTemporada)) continue;
    params.set(campo, valor);
  }
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}
