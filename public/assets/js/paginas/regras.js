// Regras lidas de regras.json: a página nunca fica diferente do cálculo. Modelo: ranking de atletas da CBJJ.

import { esc, formatarPontos, montarPagina, nomeNivel, seloPosicao } from '../render.js';
import { temporadaDe } from '../ranking.js';

const CRITERIOS = {
  ouros: 'Mais ouros',
  pratas: 'Mais pratas',
  bronzes: 'Mais bronzes',
  campeonatosDisputados: 'Mais etapas com pódio',
};

montarPagina((dados, ctx) => {
  const { regras } = dados;
  const { categoria, absoluto } = regras.pontosPorPosicao;
  const posicoes = Object.keys(categoria).sort((a, b) => a - b);
  const niveis = Object.entries(regras.pesoPorNivel).sort((a, b) => a[1] - b[1]);
  const atual = Number(regras.temporada);
  const temporadas = regras.pesoPorTemporada.map((peso, i) => [atual - i, peso]);
  const etapasPorNivel = (nivel) => dados.campeonatos
    .filter((c) => c.nivel === nivel && temporadaDe(c) === atual)
    .map((c) => esc(c.nome)).join(', ');
  const f = formatarPontos;

  // Exemplos no formato da CBJJ, com os valores das regras atuais.
  const [nivelMaior, pesoMaior] = niveis.at(-1);
  const [nivelMedio, pesoMedio] = niveis[Math.min(1, niveis.length - 1)];
  const [nivelMenor, pesoMenor] = niveis[0];
  const exemplos = [
    ['1º lugar', 'categoria de peso', nivelMaior, pesoMaior, temporadas.at(-1), categoria[1]],
    ['2º lugar', 'absoluto', nivelMedio, pesoMedio, temporadas[Math.min(1, temporadas.length - 1)], absoluto[2]],
    ['3º lugar', 'categoria de peso', nivelMenor, pesoMenor, temporadas[0], categoria[3]],
  ].map(([pos, cat, nivel, pesoEtapa, [t, pesoT], base]) =>
    `<li>${pos} · ${cat} · etapa ${esc(nomeNivel(nivel, ctx).toLowerCase())} de ${t} = ${f(base)} × ${f(pesoEtapa)} × ${f(pesoT)} = <strong class="text-ouro">${f(base * pesoEtapa * pesoT)} pts</strong></li>`);

  document.getElementById('pagina').innerHTML = `
    <section class="container section" aria-labelledby="titulo-conta">
      <h2 id="titulo-conta">Como a pontuação funciona</h2>
      <p class="formula">Pontos = <strong>colocação</strong> × <strong>peso da etapa</strong> × <strong>peso da temporada</strong></p>
      <ul class="lista-regras lista-exemplos">${exemplos.join('')}</ul>
    </section>

    <section class="container section regras-tabelas" aria-label="Tabelas de pontos">
      <div>
        <h3>Colocação</h3>
        <div class="tabela-rolagem" tabindex="0" role="region" aria-label="Tabela: colocação">
          <table class="tabela">
            <thead><tr><th scope="col">Lugar</th><th scope="col">Categoria de peso</th><th scope="col">Absoluto</th></tr></thead>
            <tbody>${posicoes.map((p) => `
              <tr><th scope="row">${seloPosicao(Number(p))}</th><td class="tabela__num">${f(categoria[p])}</td><td class="tabela__num">${f(absoluto[p])}</td></tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>
      <div>
        <h3>Peso da etapa</h3>
        <div class="tabela-rolagem" tabindex="0" role="region" aria-label="Tabela: peso da etapa">
          <table class="tabela tabela--texto">
            <thead><tr><th scope="col">Nível</th><th scope="col">Peso</th></tr></thead>
            <tbody>${niveis.slice().reverse().map(([n, p]) => `
              <tr><th scope="row">${esc(nomeNivel(n, ctx))}<small class="tabela__nota">${etapasPorNivel(n) || '—'}</small></th><td class="tabela__num">×${f(p)}</td></tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>
      <div>
        <h3>Peso da temporada</h3>
        <div class="tabela-rolagem" tabindex="0" role="region" aria-label="Tabela: peso da temporada">
          <table class="tabela">
            <thead><tr><th scope="col">Temporada</th><th scope="col">Peso</th></tr></thead>
            <tbody>${temporadas.map(([t, p], i) => `
              <tr><th scope="row">${t}${i === 0 ? ' <small class="tabela__nota">atual</small>' : ''}</th><td class="tabela__num">×${f(p)}</td></tr>`).join('')}
              <tr><th scope="row">${atual - temporadas.length} e antes</th><td class="tabela__num">não conta</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>

    <section class="container section" aria-labelledby="titulo-como">
      <h2 id="titulo-como">Como funciona o ranking</h2>
      <ul class="lista-regras">
        <li>Cada ranking é de um <strong>gênero, idade e faixa</strong> (ex.: Masculino Adulto Azul). Categoria de peso e absoluto somam no mesmo ranking.</li>
        <li>Os pontos valem <strong>só na faixa e na idade em que foram conquistados</strong> e não se transferem. Quem troca de faixa começa do zero na faixa nova; os pontos antigos ficam no ranking da faixa anterior.</li>
        <li>Contam a temporada atual e as ${temporadas.length - 1} anteriores. A temporada é o ano-calendário.</li>
        <li>Trocar de academia ou de professor não muda os pontos.</li>
        <li>Atleta <strong>sozinho na chave</strong> também pontua.</li>
        <li><strong>Kimono e no-gi são rankings separados</strong>. A CBJJ só tem ranking de kimono; o circuito mantém o no-gi à parte, como a IBJJF.</li>
        <li>O ranking por academia soma os pontos de todos os seus atletas na modalidade.</li>
      </ul>
    </section>

    <section class="container section" aria-labelledby="titulo-desempate">
      <h2 id="titulo-desempate">Empate</h2>
      ${regras.desempate.length ? `
        <p class="text-mute">Com a mesma pontuação, vale a ordem abaixo.</p>
        <ol class="lista-numerada">
          ${regras.desempate.map((c) => `<li>${esc(CRITERIOS[c] ?? c)}</li>`).join('')}
          <li>Empate em tudo: os atletas dividem a posição.</li>
        </ol>` : `
        <p>Atletas com a mesma pontuação <strong>dividem a posição</strong>, como no ranking da CBJJ. Exemplo: dois atletas em 6º e o seguinte em 8º.</p>`}
    </section>

    <section class="container section" aria-labelledby="titulo-premiacao">
      <h2 id="titulo-premiacao">Premiação</h2>
      <div class="card"><p>${esc(regras.premiacao)}</p></div>
    </section>

    ${regras.fonte ? `<div class="container"><p class="ranking-nota text-mute">Regras baseadas no <a href="${esc(regras.fonte)}" rel="noopener">ranking de atletas da CBJJ</a>.</p></div>` : ''}`;
});
