// Página da etapa (/campeonato?id=slug): dados, quadro de medalhas por academia e pódios por categoria.

import { pontosDoResultado } from '../ranking.js';
import {
  esc, formatarPontos, rotuloPts, formatarData, plural, urlAtleta, urlRanking, montarPagina, parametro,
  definirTitulo, naoEncontrado, rotuloCategoria, nomeNivel, nomeModalidade,
  faixaBadge, pintarFaixas, medalha, seloPosicao,
} from '../render.js';

montarPagina((dados, ctx) => {
  const raiz = document.getElementById('pagina');
  const id = parametro('id');
  const camp = ctx.campeonatos.get(id);
  if (!camp) {
    naoEncontrado(raiz, 'Etapa não encontrada', 'O link pode estar errado ou a etapa mudou de cadastro.', { href: '/campeonatos', texto: 'Ver todas as etapas' });
    return;
  }

  const peso = dados.regras.pesoPorNivel[camp.nivel] ?? 1;
  const resultados = dados.resultados
    .filter((r) => r.campeonatoId === id)
    .map((r) => {
      const atleta = ctx.atletas.get(r.atletaId);
      return { ...r, atleta, sexo: atleta?.sexo, pontos: pontosDoResultado(r, camp, dados.regras) };
    });

  definirTitulo(camp.nome, `${camp.nome}: ${formatarData(camp.data, { ano: true })} em ${camp.cidade}. Pódios por categoria.`);

  raiz.innerHTML = `
    <header class="container page-header perfil">
      <nav class="trilha" aria-label="Você está em"><a href="/campeonatos">Etapas</a> <span aria-hidden="true">/</span> ${esc(camp.nome)}</nav>
      <h1>${esc(camp.nome)}</h1>
      <p class="perfil__sub">${formatarData(camp.data, { ano: true })} <span aria-hidden="true">·</span> ${esc(camp.cidade)}</p>
      <ul class="tags">
        <li class="tag tag--nivel">${esc(nomeNivel(camp.nivel, ctx))} · pontos ×${formatarPontos(peso)}</li>
        ${camp.modalidade.map((m) => `<li class="tag">${esc(nomeModalidade(m, ctx))}</li>`).join('')}
      </ul>
    </header>
    ${resultados.length ? conteudo() : `
      <section class="container section">
        <div class="card placeholder">
          <strong>Resultados ainda não lançados</strong>
          Os pódios aparecem aqui depois da etapa.
        </div>
      </section>`}`;
  pintarFaixas(raiz, ctx);

  function conteudo() {
    const categorias = agruparCategorias();
    const atletas = new Set(resultados.map((r) => r.atletaId)).size;
    const academias = quadroAcademias();
    const variasModalidades = new Set(resultados.map((r) => r.modalidade)).size > 1;

    return `
      <section class="container section" aria-label="Resumo da etapa">
        <dl class="numeros">
          <div class="numeros__item"><dt>Categorias</dt><dd>${categorias.length}</dd></div>
          <div class="numeros__item"><dt>Atletas no pódio</dt><dd>${atletas}</dd></div>
          <div class="numeros__item"><dt>Academias</dt><dd>${academias.length}</dd></div>
          <div class="numeros__item"><dt>Ouro vale</dt><dd>${formatarPontos(pontosDoResultado({ posicao: 1 }, camp, dados.regras))} <small>pts</small></dd></div>
        </dl>
      </section>

      <section class="container section" aria-labelledby="titulo-podios">
        <h2 id="titulo-podios">Pódios por categoria</h2>
        ${camp.modalidade.filter((m) => categorias.some((c) => c.modalidade === m)).map((m) => `
          ${variasModalidades ? `<h3 class="subtitulo">${esc(nomeModalidade(m, ctx))}</h3>` : ''}
          <div class="acordeao">${categorias.filter((c) => c.modalidade === m).map(categoriaHTML).join('')}</div>
        `).join('')}
      </section>

      <section class="container section" aria-labelledby="titulo-quadro">
        <h2 id="titulo-quadro">Quadro de medalhas</h2>
        <div class="tabela-rolagem">
          <table class="tabela">
            <thead><tr><th scope="col">Academia</th><th scope="col">Ouro</th><th scope="col">Prata</th><th scope="col">Bronze</th><th scope="col">Pontos</th></tr></thead>
            <tbody>${academias.map((a) => `
              <tr>
                <th scope="row"><a href="${urlRanking({ academia: a.id })}">${esc(a.nome)}</a></th>
                <td>${medalha('ouros', a.ouros)}</td><td>${medalha('pratas', a.pratas)}</td><td>${medalha('bronzes', a.bronzes)}</td>
                <td class="tabela__num">${formatarPontos(a.pontos)}</td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </section>`;
  }

  /** Agrupa por modalidade + sexo + faixa + idade + peso, na ordem de categorias.json. */
  function agruparCategorias() {
    const ordem = (lista, id) => lista.findIndex((x) => x.id === id);
    const { faixas, idades, pesos, sexos } = dados.categorias;
    const grupos = new Map();
    for (const r of resultados) {
      const chave = [r.modalidade, r.sexo, r.faixa, r.idade, r.peso].join('|');
      if (!grupos.has(chave)) grupos.set(chave, { modalidade: r.modalidade, sexo: r.sexo, faixa: r.faixa, idade: r.idade, peso: r.peso, podio: [] });
      grupos.get(chave).podio.push(r);
    }
    const lista = [...grupos.values()];
    lista.forEach((g) => g.podio.sort((a, b) => a.posicao - b.posicao || a.atleta.nome.localeCompare(b.atleta.nome, 'pt-BR')));
    return lista.sort((a, b) =>
      ordem(faixas, a.faixa) - ordem(faixas, b.faixa)
      || ordem(idades, a.idade) - ordem(idades, b.idade)
      || ordem(sexos, a.sexo) - ordem(sexos, b.sexo)
      || ordem(pesos, a.peso) - ordem(pesos, b.peso));
  }

  function categoriaHTML(cat) {
    const campeao = cat.podio.find((r) => r.posicao === 1);
    return `
      <details class="acordeao__item">
        <summary>
          <span class="acordeao__titulo">${faixaBadge(cat.faixa, ctx)} ${esc(rotuloCategoria(cat, ctx))}</span>
          <span class="acordeao__resumo">${campeao
            ? `<span class="medalha__dot medalha--ouros" aria-hidden="true"></span><span class="visually-hidden">Ouro: </span>${esc(campeao.atleta.nome)}`
            : plural(cat.podio.length, 'atleta', 'atletas')}</span>
        </summary>
        <ol class="podio-categoria">${cat.podio.map((r) => `
          <li>
            ${seloPosicao(r.posicao)}
            <span class="podio-categoria__atleta">
              <a href="${urlAtleta(r.atletaId)}">${esc(r.atleta.nome)}</a>
              <span class="text-mute">${esc(ctx.academias.get(r.atleta.academiaId)?.nome)}</span>
            </span>
            <span class="podio-categoria__pts">${formatarPontos(r.pontos)} <small>${rotuloPts(r.pontos)}</small></span>
          </li>`).join('')}
        </ol>
      </details>`;
  }

  function quadroAcademias() {
    const porAcademia = new Map();
    for (const r of resultados) {
      const acadId = r.atleta.academiaId;
      if (!porAcademia.has(acadId)) {
        porAcademia.set(acadId, { id: acadId, nome: ctx.academias.get(acadId)?.nome ?? acadId, ouros: 0, pratas: 0, bronzes: 0, pontos: 0 });
      }
      const a = porAcademia.get(acadId);
      if (r.posicao === 1) a.ouros += 1;
      if (r.posicao === 2) a.pratas += 1;
      if (r.posicao === 3) a.bronzes += 1;
      a.pontos += r.pontos;
    }
    return [...porAcademia.values()].sort((a, b) => b.ouros - a.ouros || b.pratas - a.pratas || b.bronzes - a.bronzes || a.nome.localeCompare(b.nome, 'pt-BR'));
  }
});
