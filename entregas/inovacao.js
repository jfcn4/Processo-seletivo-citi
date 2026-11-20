/* Entrega de Inovação: BAQIAO (巴桥), a ponte entre empreendedores brasileiros e o mercado chinês.
   Não é um planeta: abre no fim da viagem da nave (inovacao/missao.js), ou direto pelo modo lista
   e pelo painel do Sol. Duas abas: Apresentação (problema, pitch em vídeo, proposta) e Plataforma
   (o que o site real faz, com o link para ele). O conteúdo segue a documentação e o README da BAQIAO:
   sem estatísticas, sem recursos que a plataforma não tenha.

   Contrato com o index.html (window.CITI_ENTREGAS.inova):
   - abrir(): tela cheia direto, sem a viagem
   - preparar(): monta a tela por baixo do 3D para a revelação; devolve { geom, cortina, revelarTitulo, concluir, descartar }
   - fechar(), aberta(), conectar({ duck, aoFechar }) */
(function () {
  'use strict';

  // --- configuração: o que depende de arquivos e endereços externos ---
  var CONFIG = {
    plataforma: 'https://ponte-brasil-china.vercel.app',   // endereço de produção (README da BAQIAO)
    video: 'assets/inovacao/baqiao-pitch.mp4',               // pitch: adicionar este arquivo para o player aparecer
    poster: 'assets/inovacao/baqiao-pitch-poster.jpg',       // opcional: primeiro quadro do pitch
    fontes: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Noto+Sans+SC:wght@400;500&display=swap'
  };

  var hooks = { duck: function () {}, aoFechar: function () {} };
  var root, scroll, painel, video = null, lastFocus = null, aba = 'apresentacao', videoOk = null, fontesPedidas = false;

  function node(html) { var d = document.createElement('div'); d.innerHTML = html.trim(); return d.firstChild; }
  function urlOk(u) { return /^https:\/\/[^\s"'<>]+$/.test(u || ''); }

  // as fontes da BAQIAO (Inter e Noto Sans SC) só são pedidas quando a entrega vai aparecer
  function pedirFontes() {
    if (fontesPedidas) return; fontesPedidas = true;
    var l = document.createElement('link'); l.rel = 'stylesheet'; l.href = CONFIG.fontes; document.head.appendChild(l);
  }

  // o vídeo só vira player se o arquivo existir: nada de player quebrado
  function checarVideo() {
    if (videoOk !== null) return Promise.resolve(videoOk);
    if (!window.fetch) { videoOk = false; return Promise.resolve(false); }
    return fetch(CONFIG.video, { method: 'HEAD', cache: 'no-store' }).then(function (r) {
      var tipo = r.headers.get('content-type') || '';
      videoOk = r.ok && !/text\/html/.test(tipo);
      return videoOk;
    }, function () { videoOk = false; return false; });
  }

  /* ---------- arco da capa: o mesmo desenho que a missão leva da Terra até aqui ---------- */
  // pontos em px, relativos à caixa do SVG: a = Brasil (esquerda), b = China (direita), c = controle
  function arcoLocal(w, h) {
    var m = Math.max(10, w * 0.04), base = h * 0.9, topo = h * 0.08;
    return { a: { x: m, y: base }, b: { x: w - m, y: base }, c: { x: w / 2, y: 2 * topo - base } };
  }
  function desenhaArco() {
    if (!root) return;
    var svg = root.querySelector('.iv-arco'), r = svg.getBoundingClientRect();
    if (!r.width) return;
    var g = arcoLocal(r.width, r.height);
    svg.setAttribute('viewBox', '0 0 ' + r.width.toFixed(1) + ' ' + r.height.toFixed(1));
    svg.querySelector('.iv-arco-linha').setAttribute('d', 'M' + g.b.x + ' ' + g.b.y + 'Q' + g.c.x + ' ' + g.c.y + ' ' + g.a.x + ' ' + g.a.y);
    var cn = svg.querySelector('.iv-arco-cn'), br = svg.querySelector('.iv-arco-br');
    cn.setAttribute('cx', g.b.x); cn.setAttribute('cy', g.b.y);
    br.setAttribute('cx', g.a.x); br.setAttribute('cy', g.a.y);
    var tcn = svg.querySelector('.iv-arco-tcn'), tbr = svg.querySelector('.iv-arco-tbr');
    tcn.setAttribute('x', g.b.x); tcn.setAttribute('y', g.b.y + 22);
    tbr.setAttribute('x', g.a.x); tbr.setAttribute('y', g.a.y + 22);
  }
  function geomTela() {
    var svg = root.querySelector('.iv-arco'), r = svg.getBoundingClientRect(), g = arcoLocal(r.width, r.height);
    [g.a, g.b, g.c].forEach(function (p) { p.x += r.left; p.y += r.top; });
    return g;
  }

  /* ---------- estrutura ---------- */
  var PASSOS = [
    ['Apresentar', 'Nome e vitrine em chinês, a partir do que o produtor escreve em português.'],
    ['Compartilhar', 'Link e QR Code para feiras e mensagens.'],
    ['Conversar', 'O produtor responde em português; o comprador recebe em chinês.']
  ];
  var RECURSOS = [
    ['Nome em chinês', 'Três propostas da IA (fonética, semântica e equilibrada), com pinyin e significado. A escolha é do produtor.'],
    ['Vitrine e loja', 'Vitrine de cada produto e catálogo da loja em chinês, com preço de referência em yuan.'],
    ['Link e QR Code', 'QR da loja e de cada produto, com endereço fixo, e cartão bilíngue para feiras.'],
    ['Conversa', 'Cotação (询价) sem cadastro. O copiloto aponta pendências e o produtor revisa a tradução antes de enviar.']
  ];
  var TABS = [['apresentacao', 'Apresentação'], ['plataforma', 'Plataforma']];

  function build() {
    root = node('<div id="iv" role="dialog" aria-modal="true" aria-labelledby="iv-title" hidden></div>');
    root.innerHTML =
      '<div class="iv-fundo" aria-hidden="true"></div>' +
      '<header class="iv-top">' +
        '<span class="iv-onde">Inovação · A nave · Entrega</span>' +
        '<button class="iv-fechar" type="button" data-close>Voltar ao sistema <span aria-hidden="true">✕</span></button>' +
      '</header>' +
      '<div class="iv-scroll">' +
        '<section class="iv-hero">' +
          '<p class="iv-eyebrow">Desafio de Inovação · CITi 2026.2</p>' +
          '<div class="iv-ponte">' +
            '<svg class="iv-arco" aria-hidden="true"><path class="iv-arco-linha" fill="none"/>' +
              '<circle class="iv-arco-br" r="4"/><circle class="iv-arco-cn" r="4"/>' +
              '<text class="iv-arco-t iv-arco-tbr" text-anchor="middle">Brasil</text><text class="iv-arco-t iv-arco-tcn" text-anchor="middle">China</text></svg>' +
            '<h1 class="iv-titulo" id="iv-title"><img src="assets/inovacao/baqiao-nome-clara.png" width="315" height="126" alt="BAQIAO 巴桥" decoding="async"></h1>' +
          '</div>' +
          '<p class="iv-sub">Uma ponte entre empreendedores brasileiros e o mercado chinês.</p>' +
        '</section>' +
        '<div class="iv-corpo">' +
          '<div class="iv-tabs" role="tablist" aria-label="Partes da entrega">' +
            TABS.map(function (t, i) { return '<button class="iv-tab" type="button" role="tab" id="iv-tab-' + t[0] + '" aria-controls="iv-painel" data-tab="' + t[0] + '" tabindex="' + (i ? -1 : 0) + '">' + t[1] + '</button>'; }).join('') +
          '</div>' +
          '<div class="iv-painel" id="iv-painel" role="tabpanel" tabindex="-1"></div>' +
          '<footer class="iv-creditos">Terra: NASA Blue Marble. Nuvens: Solar System Scope (CC BY 4.0).</footer>' +
        '</div>' +
      '</div>';
    scroll = root.querySelector('.iv-scroll');
    painel = root.querySelector('.iv-painel');
    root.querySelector('[data-close]').addEventListener('click', function () { fechar(); });
    var tabs = root.querySelectorAll('[data-tab]');
    tabs.forEach(function (b) { b.addEventListener('click', function () { setAba(b.dataset.tab); }); });
    // setas, Home e End movem entre as abas (padrão de tablist)
    function teclaAba(e) {
      var i = Array.prototype.indexOf.call(tabs, e.target);
      if (i < 0) return false;
      var j = e.key === 'Home' ? 0 : e.key === 'End' ? tabs.length - 1 : (i + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
      e.preventDefault(); setAba(tabs[j].dataset.tab); tabs[j].focus();
      return true;
    }
    document.body.appendChild(root);
    // Esc: tela cheia do vídeo sai primeiro (o navegador cuida); durante a revelação, quem decide é a missão
    window.addEventListener('keydown', function (e) {
      if (!root || root.hidden || root.classList.contains('is-staging')) return;
      if (e.key === 'Escape') {
        if (document.fullscreenElement || document.webkitFullscreenElement) return;
        e.preventDefault(); e.stopImmediatePropagation(); fechar();
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'Home' || e.key === 'End') {
        // a captura chega antes das abas: trata a navegação aqui e impede que as setas troquem de planeta por trás
        if (!teclaAba(e) && (e.key === 'Home' || e.key === 'End')) return;
        e.stopImmediatePropagation();
      }
    }, true);
    window.addEventListener('resize', function () { if (root && !root.hidden) desenhaArco(); });
  }

  /* ---------- abas ---------- */
  function blocoVideo() {
    var box = node('<figure class="iv-video"></figure>');
    if (videoOk) {
      var v = document.createElement('video');
      v.controls = true; v.preload = 'metadata'; v.setAttribute('playsinline', ''); v.src = CONFIG.video;
      v.setAttribute('aria-label', 'Pitch em vídeo da BAQIAO');
      if (CONFIG.poster) v.poster = CONFIG.poster;
      v.addEventListener('play', function () { hooks.duck(true); });
      v.addEventListener('pause', function () { hooks.duck(false); });
      v.addEventListener('ended', function () { hooks.duck(false); });
      v.addEventListener('error', function () { if (!v.currentSrc || v.error) { videoOk = false; box.replaceWith(blocoVideo()); } });
      box.appendChild(v); video = v;
    } else {
      // sem o arquivo, um aviso honesto no lugar do player
      box.classList.add('is-vazio');
      box.innerHTML = '<div class="iv-video-vazio"><span class="iv-video-marca" aria-hidden="true"></span>' +
        '<strong>Pitch em vídeo</strong><span>O vídeo de apresentação da BAQIAO será publicado aqui.</span></div>';
    }
    return box;
  }
  function linkPlataforma(cls, texto) {
    if (!urlOk(CONFIG.plataforma)) return '<p class="iv-pend">Link da plataforma em configuração.</p>';
    return '<a class="' + cls + '" href="' + CONFIG.plataforma + '" target="_blank" rel="noopener noreferrer">' + texto +
      ' <span aria-hidden="true">↗</span><span class="iv-sr"> (abre em nova aba)</span></a>';
  }
  function apresentacao() {
    var sv = node('<section class="iv-sec"><p class="iv-lead">Um bom produto nem sempre chega ao comprador chinês: nome, vitrine e conversa em outro idioma travam o primeiro contato.</p>' +
      '<h2 class="iv-h">Pitch · 5 min</h2></section>');
    sv.appendChild(blocoVideo());
    painel.appendChild(sv);
    painel.appendChild(node('<section class="iv-sec"><h2 class="iv-h">Como funciona</h2>' +
      '<ol class="iv-passos">' + PASSOS.map(function (p) { return '<li><b>' + p[0] + '</b><span>' + p[1] + '</span></li>'; }).join('') + '</ol>' +
      '<p class="iv-nota">MVP funcional. Caso de demonstração: cachaça artesanal.</p></section>'));
    var cta = node('<div class="iv-acoes">' + linkPlataforma('iv-btn is-main', 'Explorar a BAQIAO') +
      '<button class="iv-btn" type="button" data-ir="plataforma">Ver recursos</button></div>');
    cta.querySelector('[data-ir]').addEventListener('click', function () { setAba('plataforma'); root.querySelector('#iv-tab-plataforma').focus({ preventScroll: true }); });
    painel.appendChild(cta);
  }
  function plataforma() {
    painel.appendChild(node('<section class="iv-sec"><h2 class="iv-h">A plataforma</h2>' +
      '<p class="iv-lead">Do cadastro em português à resposta que chega ao comprador em chinês.</p></section>'));
    painel.appendChild(node('<dl class="iv-recursos">' + RECURSOS.map(function (r, i) {
      return '<div><dt><span class="iv-num" aria-hidden="true">0' + (i + 1) + '</span>' + r[0] + '</dt><dd>' + r[1] + '</dd></div>';
    }).join('') + '</dl>'));
    var host = urlOk(CONFIG.plataforma) ? CONFIG.plataforma.replace(/^https:\/\//, '') : '';
    painel.appendChild(node('<section class="iv-sec iv-destino">' + linkPlataforma('iv-btn is-main is-grande', 'Explorar a BAQIAO') +
      (host ? '<p class="iv-url"><span>' + host + '</span> · abre em nova aba</p>' : '') +
      '<p class="iv-nota">Dados de demonstração; lojas fictícias aparecem identificadas.</p></section>'));
  }
  function setAba(t) {
    if (video) { video.pause(); video = null; }
    aba = t;
    root.querySelectorAll('[data-tab]').forEach(function (b) {
      var on = b.dataset.tab === t;
      b.setAttribute('aria-selected', on ? 'true' : 'false'); b.tabIndex = on ? 0 : -1;
    });
    painel.setAttribute('aria-labelledby', 'iv-tab-' + t);
    painel.innerHTML = '';
    if (t === 'plataforma') plataforma(); else apresentacao();
  }

  /* ---------- abrir e fechar ---------- */
  function montar(t) {
    if (!root) build();
    pedirFontes();
    root.hidden = false;
    root.classList.remove('is-open', 'is-titulo', 'is-pronto', 'is-staging');
    root.style.removeProperty('--cortina');
    scroll.scrollTop = 0;
    setAba(t || 'apresentacao');
    desenhaArco();
    // se o vídeo existir, a aba é redesenhada com o player assim que a checagem terminar
    if (videoOk === null) checarVideo().then(function (ok) { if (ok && root && !root.hidden && aba === 'apresentacao') setAba('apresentacao'); });
  }
  // foco: para onde o teclado volta ao fechar (padrão: o que estava focado ao abrir)
  function abrir(t, foco) {
    if (root && !root.hidden && !root.classList.contains('is-staging')) { if (t && t !== aba) setAba(t); return; }
    var estava = root && !root.hidden;
    if (!estava) lastFocus = foco || document.activeElement;
    montar(t);
    root.classList.add('is-titulo', 'is-pronto');
    requestAnimationFrame(function () { root.classList.add('is-open'); desenhaArco(); });
    root.querySelector('[data-close]').focus({ preventScroll: true });
  }
  // revelação vinda da missão: a tela nasce transparente por cima do 3D e escurece aos poucos
  function preparar() {
    lastFocus = null;
    montar('apresentacao');
    root.classList.add('is-staging');
    root.style.setProperty('--cortina', '0');
    desenhaArco();
    return {
      geom: geomTela,
      cortina: function (v) { root.style.setProperty('--cortina', v.toFixed(3)); },
      revelarTitulo: function () { root.classList.add('is-titulo'); },
      concluir: function () {
        root.style.setProperty('--cortina', '1');
        root.classList.add('is-titulo', 'is-pronto', 'is-open');
        root.classList.remove('is-staging');
        root.querySelector('[data-close]').focus({ preventScroll: true });
      },
      descartar: function () { esconder(); }
    };
  }
  function esconder() {
    if (!root) return;
    if (video) { video.pause(); hooks.duck(false); }
    root.classList.remove('is-open', 'is-titulo', 'is-pronto', 'is-staging');
    root.hidden = true;
  }
  function fechar() {
    if (!root || root.hidden) return;
    if (video) { video.pause(); video = null; }
    hooks.duck(false);
    root.classList.remove('is-open');
    setTimeout(function () { if (!root.classList.contains('is-open')) { root.hidden = true; root.classList.remove('is-titulo', 'is-pronto'); } }, 280);
    var volta = lastFocus; lastFocus = null;
    if (volta && volta.focus && document.contains(volta) && volta.offsetParent !== null) volta.focus({ preventScroll: true });
    hooks.aoFechar();
  }

  window.CITI_ENTREGAS = window.CITI_ENTREGAS || {};
  window.CITI_ENTREGAS.inova = {
    abrir: abrir, preparar: preparar, fechar: fechar, pedirFontes: pedirFontes,
    aberta: function () { return !!root && !root.hidden; },
    conectar: function (h) { if (h.duck) hooks.duck = h.duck; if (h.aoFechar) hooks.aoFechar = h.aoFechar; },
    config: CONFIG
  };
})();
