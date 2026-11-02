// Gera as imagens do site a partir de HTML (usa o Chromium do Playwright).
//   node ferramentas/gerar-imagens.cjs
// Saída em public/assets/img/: og-image.png (prévia de link no WhatsApp/redes),
// apple-touch-icon.png, icon-192.png, icon-512.png, icon-maskable-512.png, favicon-32.png.
// Requer Playwright instalado (npm i -D playwright, ou global).

const { chromium } = require('playwright');
const path = require('node:path');
const fs = require('node:fs');

const raiz = path.resolve(__dirname, '..');
const img = path.join(raiz, 'public/assets/img');
// Fontes embutidas como data URL: páginas em branco não podem ler file://.
const fonte = (arquivo) =>
  `data:font/woff2;base64,${fs.readFileSync(path.join(raiz, 'public/assets/fonts', arquivo)).toString('base64')}`;

const base = `
  <style>
    @font-face { font-family: Barlow; font-weight: 700; src: url(${fonte('barlow-condensed-700-latin.woff2')}); }
    @font-face { font-family: Inter; font-weight: 400 600; src: url(${fonte('inter-400-600-latin.woff2')}); }
    * { box-sizing: border-box; margin: 0; }
    body { background: #0b0d10; color: #f2f4f7; font-family: Inter, sans-serif; }
  </style>`;

// Pódio estilizado (prata, ouro, bronze), o mesmo desenho do favicon.
const podio = (escala) => `
  <svg viewBox="0 0 64 64" width="${64 * escala}" height="${64 * escala}">
    <rect x="24" y="14" width="16" height="36" rx="2" fill="#f5b301"/>
    <rect x="8" y="26" width="15" height="24" rx="2" fill="#c0c6cf"/>
    <rect x="41" y="32" width="15" height="18" rx="2" fill="#cd7f32"/>
  </svg>`;

const og = `${base}
  <style>
    body { width: 1200px; height: 630px; overflow: hidden; position: relative;
      background: radial-gradient(ellipse 70% 80% at 85% 20%, rgba(245,179,1,.18), transparent 60%), #0b0d10; }
    .conteudo { position: absolute; left: 88px; top: 0; bottom: 0; display: flex; flex-direction: column; justify-content: center; }
    .eyebrow { color: #f5b301; font-weight: 600; font-size: 30px; letter-spacing: .08em; text-transform: uppercase; }
    h1 { font-family: Barlow; font-size: 168px; line-height: .95; text-transform: uppercase; margin: 18px 0 22px; }
    h1 span { color: #f5b301; }
    .slogan { font-size: 44px; color: #9aa4b2; }
    .podio { position: absolute; right: 70px; bottom: 40px; }
    .chao { position: absolute; left: 0; right: 0; bottom: 0; height: 12px; background: linear-gradient(90deg, #c0c6cf, #f5b301, #cd7f32); }
  </style>
  <div class="conteudo">
    <p class="eyebrow">Ranking de jiu-jitsu · Paraná</p>
    <h1>BJJ <span>Pódio</span></h1>
    <p class="slogan">Cada luta conta.</p>
  </div>
  <div class="podio">${podio(6)}</div>
  <div class="chao"></div>`;

// Ícone quadrado; "seguro" deixa margem para máscaras do Android (maskable).
const icone = (lado, { seguro = false, cantos = true } = {}) => `${base}
  <style>
    body { width: ${lado}px; height: ${lado}px; display: grid; place-items: center; overflow: hidden;
      background: #0b0d10; ${cantos ? `border-radius: ${lado * 0.1875}px;` : ''} }
  </style>
  ${podio((lado * (seguro ? 0.62 : 0.9)) / 64)}`;

(async () => {
  const b = await chromium.launch();
  const tirar = async (html, w, h, nome, { transparente = false } = {}) => {
    const p = await b.newPage({ viewport: { width: w, height: h } });
    await p.setContent(html, { waitUntil: 'load' });
    await p.evaluate(async () => {
      await Promise.all([document.fonts.load('700 40px Barlow'), document.fonts.load('400 20px Inter')]);
      const ok = document.fonts.check('700 40px Barlow') && document.fonts.check('400 20px Inter');
      if (!ok) throw new Error('fontes não carregaram');
    });
    await p.screenshot({ path: path.join(img, nome), omitBackground: transparente });
    await p.close();
    console.log(nome, fs.statSync(path.join(img, nome)).size, 'bytes');
  };
  await tirar(og, 1200, 630, 'og-image.png');
  await tirar(icone(180, { cantos: false }), 180, 180, 'apple-touch-icon.png'); // iOS arredonda sozinho
  await tirar(icone(192), 192, 192, 'icon-192.png', { transparente: true });
  await tirar(icone(512), 512, 512, 'icon-512.png', { transparente: true });
  await tirar(icone(512, { seguro: true, cantos: false }), 512, 512, 'icon-maskable-512.png');
  await tirar(icone(32), 32, 32, 'favicon-32.png', { transparente: true });
  await b.close();
})();
