// Carrega os JSON de public/data. Uma única ida à rede por página.

const ARQUIVOS = ['regras', 'categorias', 'campeonatos', 'academias', 'atletas', 'resultados'];

let cache;

/** Retorna { regras, categorias, campeonatos, academias, atletas, resultados }. */
export function carregarDados() {
  cache ??= Promise.all(
    ARQUIVOS.map(async (nome) => {
      const resp = await fetch(`/data/${nome}.json`);
      if (!resp.ok) throw new Error(`Falha ao carregar ${nome}.json (${resp.status})`);
      return [nome, await resp.json()];
    }),
  ).then(Object.fromEntries);
  return cache;
}
