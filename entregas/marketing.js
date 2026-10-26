/* Entrega do planeta Marketing.
   painel(): resumo no painel lateral (resposta, PDF com download e a balança de pesos).
   abrir(aba): visão em tela cheia com a balança, os gráficos interativos e o documento. */
(function () {
  'use strict';

  var PDF_URL = 'Desafio_Marketing_CITi_JoaoFelipe.pdf';   // na mesma pasta do index.html
  var PDFJS = window.MK_PDFJS_BASE || 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/';
  var COR = { v: '#e65f50', i: '#4a8ce0' };   // Varejo, Indústria

  /* ---------- matriz de decisão (notas de 1 a 5, do documento) ---------- */
  var CRIT = [
    { nome: 'Crescimento em PE', v: 5, i: 4 },
    { nome: 'Urgência', v: 5, i: 3 },
    { nome: 'Combina com o que o CITi oferece', v: 4, i: 4 },
    { nome: 'Espaço frente às alternativas', v: 2, i: 3 },
    { nome: 'Facilidade de contratar uma EJ', v: 3, i: 4 },
    { nome: 'Potencial para campanha', v: 5, i: 3 }
  ];
  var PRESETS = [
    { nome: 'Pesos iguais', w: [5, 5, 5, 5, 5, 5] },
    { nome: 'Visão cética', w: [2, 2, 2, 10, 10, 2] },
    { nome: 'Sem campanha', w: [5, 5, 5, 5, 5, 0] }
  ];
  var W = PRESETS[0].w.slice();   // pesos atuais, compartilhados entre o painel e a tela cheia
  var views = [];                 // instâncias da balança e do gráfico da matriz, redesenhadas juntas
  var uid = 0;

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function node(html) { var t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; }
  function dec(x) { return x.toFixed(1).replace('.', ','); }
  function round1(x) { return Math.round(x * 10) / 10; }
  var REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // nota de cada setor = soma(peso × nota) / soma(pesos)
  function notas() {
    var sw = 0, sv = 0, si = 0;
    CRIT.forEach(function (c, k) { sw += W[k]; sv += W[k] * c.v; si += W[k] * c.i; });
    if (!sw) return null;
    return { v: round1(sv / sw), i: round1(si / sw) };
  }
  function redraw() { views.forEach(function (fn) { fn(); }); }

  /* ---------- tempestade do planeta: brilha na cor do setor vencedor ---------- */
  var storm = { cur: [0, 0, 0], tgt: [0, 0, 0], raf: 0 };
  function hexRgb(h) { var n = parseInt(h.slice(1), 16); return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255]; }
  function stormUpdate() {
    if (typeof window.CITI_STORM !== 'function') return;
    var n = notas(), k = 0, rgb = [0, 0, 0];
    if (n && n.v !== n.i) { rgb = hexRgb(n.v > n.i ? COR.v : COR.i); k = 0.35 + Math.min(1, Math.abs(n.v - n.i) / 1.2) * 0.65; }
    storm.tgt = rgb.map(function (c) { return c * k * 0.9; });
    if (REDUCED) { storm.cur = storm.tgt.slice(); window.CITI_STORM(storm.cur[0], storm.cur[1], storm.cur[2]); return; }
    if (!storm.raf) (function step() {
      var done = true;
      storm.cur = storm.cur.map(function (c, j) { var d = storm.tgt[j] - c; if (Math.abs(d) > 0.004) done = false; return c + d * 0.12; });
      window.CITI_STORM(storm.cur[0], storm.cur[1], storm.cur[2]);
      storm.raf = done ? 0 : requestAnimationFrame(step);
    })();
  }

  /* ================= BALANÇA ================= */
  var L = 140, PX = 180, PY = 60;   // meia haste e pivô, em unidades do desenho
  function panSvg(cls, nome, cor) {
    return '<g class="mk-pan ' + cls + '" style="color:' + cor + '">' +
      '<line x1="0" y1="0" x2="-28" y2="52" stroke="#8fa39a" stroke-width="1.2"/><line x1="0" y1="0" x2="28" y2="52" stroke="#8fa39a" stroke-width="1.2"/>' +
      '<path class="plate" d="M-42 52 Q0 78 42 52 Z" fill="' + cor + '"/>' +
      '<text x="0" y="96" text-anchor="middle" font-size="14" font-weight="600" fill="#e9f5ee" font-family="Manrope, system-ui, sans-serif">' + nome + '</text>' +
      '<text class="score" x="0" y="122" text-anchor="middle" font-size="22" font-weight="800" fill="#e9f5ee" font-family="Unbounded, system-ui, sans-serif">4,0</text></g>';
  }
  function balanca(container, big) {
    var id = 'mk' + (++uid);
    var el = node('<div class="mk-bal' + (big ? ' is-big' : '') + '"></div>');
    var left = node('<div class="mk-bal-left"></div>');
    left.appendChild(node('<div class="mk-stage"><svg viewBox="0 0 360 232" role="img" aria-labelledby="' + id + '-v">' +
      '<path d="M146 222 L214 222 L203 208 L157 208 Z" fill="#2a3a32"/>' +
      '<rect x="177" y="62" width="6" height="148" rx="3" fill="#41564b"/>' +
      '<g class="mk-beam" style="transform-origin:' + PX + 'px ' + PY + 'px"><rect x="' + (PX - L - 2) + '" y="' + (PY - 3) + '" width="' + (2 * L + 4) + '" height="6" rx="3" fill="#a9bdb2"/>' +
      '<circle cx="' + (PX - L) + '" cy="' + PY + '" r="4" fill="#a9bdb2"/><circle cx="' + (PX + L) + '" cy="' + PY + '" r="4" fill="#a9bdb2"/></g>' +
      panSvg('is-v', 'Varejo', COR.v) + panSvg('is-i', 'Indústria', COR.i) +
      '<circle cx="' + PX + '" cy="' + PY + '" r="8" fill="#4fe577"/><circle cx="' + PX + '" cy="' + PY + '" r="3" fill="#04160c"/></svg></div>'));
    left.appendChild(node('<p class="mk-verdict" id="' + id + '-v" aria-live="polite"></p>'));
    var pre = node('<div class="mk-presets" role="group" aria-label="Atalhos de pesos"></div>');
    PRESETS.forEach(function (p) {
      var b = node('<button class="mk-preset" type="button"></button>'); b.textContent = p.nome;
      b.addEventListener('click', function () { W = p.w.slice(); redraw(); stormUpdate(); });
      pre.appendChild(b);
    });
    left.appendChild(pre);
    var fixed = node('<p class="mk-fixed">Testei 200 mil combinações aleatórias de pesos: o varejo vence em 84% delas. A indústria só passa à frente quando “espaço frente às alternativas” e “facilidade de contratar uma EJ” juntos valem mais de 56% do peso total.</p>');

    var sl = node('<div class="mk-sliders"></div>'), inputs = [];
    CRIT.forEach(function (c, k) {
      var sid = id + '-s' + k;
      var row = node('<div class="mk-sl"><div class="mk-sl-top"><label for="' + sid + '"></label><output for="' + sid + '"></output></div>' +
        '<input type="range" id="' + sid + '" min="0" max="10" step="1" aria-describedby="' + sid + '-n">' +
        '<p class="mk-sl-notes" id="' + sid + '-n"><span style="--dot:' + COR.v + '">Varejo ' + c.v + '</span><span style="--dot:' + COR.i + '">Indústria ' + c.i + '</span></p></div>');
      row.querySelector('label').textContent = c.nome;
      var inp = row.querySelector('input');
      inp.addEventListener('input', function () { W[k] = +inp.value; redraw(); stormUpdate(); });
      // setas mexem no slider, não trocam de planeta
      inp.addEventListener('keydown', function (e) { if (/^Arrow|^Page|^Home$|^End$/.test(e.key)) e.stopPropagation(); });
      inputs.push(inp); sl.appendChild(row);
    });

    if (big) { left.appendChild(fixed); el.appendChild(left); el.appendChild(sl); }
    else { el.appendChild(left); el.appendChild(sl); el.appendChild(fixed); }
    container.appendChild(el);

    var beam = el.querySelector('.mk-beam'), pv = el.querySelector('.is-v'), pi = el.querySelector('.is-i');
    var verdict = el.querySelector('.mk-verdict'), btns = pre.querySelectorAll('.mk-preset');
    function render() {
      var n = notas(), ang = 0;
      if (n) ang = Math.max(-15, Math.min(15, -(n.v - n.i) * 12));   // inclina para o lado do vencedor
      var r = ang * Math.PI / 180, cx = L * Math.cos(r), cy = L * Math.sin(r);
      beam.style.transform = 'rotate(' + ang + 'deg)';
      pv.style.transform = 'translate(' + (PX - cx) + 'px,' + (PY - cy) + 'px)';
      pi.style.transform = 'translate(' + (PX + cx) + 'px,' + (PY + cy) + 'px)';
      pv.querySelector('.score').textContent = n ? dec(n.v) : '–';
      pi.querySelector('.score').textContent = n ? dec(n.i) : '–';
      pv.classList.toggle('is-win', !!n && n.v > n.i); pi.classList.toggle('is-win', !!n && n.i > n.v);
      if (!n) verdict.textContent = 'Defina ao menos um peso';
      else if (n.v === n.i) verdict.innerHTML = 'Com esses pesos, dá <b>empate</b> (' + dec(n.v) + ' a ' + dec(n.i) + ')';
      else {
        var vw = n.v > n.i;
        verdict.innerHTML = '<i style="--dot:' + (vw ? COR.v : COR.i) + '"></i>Com esses pesos, ' + (vw ? 'o <b>varejo</b>' : 'a <b>indústria</b>') + ' vence por ' + dec(Math.abs(n.v - n.i)) +
          ' <span style="color:var(--ink-faint);font-weight:500">(' + dec(n.v) + ' a ' + dec(n.i) + ')</span>';
      }
      inputs.forEach(function (inp, k) {
        if (+inp.value !== W[k]) inp.value = W[k];
        inp.setAttribute('aria-valuetext', 'peso ' + W[k] + ' de 10');
        inp.parentNode.querySelector('output').textContent = W[k];
      });
      btns.forEach(function (b, k) { b.setAttribute('aria-pressed', PRESETS[k].w.every(function (x, j) { return x === W[j]; }) ? 'true' : 'false'); });
    }
    views.push(render); render();
  }

  /* ================= GRÁFICOS ================= */
  function tooltip(box) {
    var tip = node('<div class="mk-tip" role="status" hidden></div>');
    box.appendChild(tip);
    return {
      show: function (html, svg, x, y, vbw) {
        var rect = svg.getBoundingClientRect(), br = box.getBoundingClientRect(), s = rect.width / vbw;
        tip.innerHTML = html; tip.hidden = false;
        var left = rect.left - br.left + x * s, half = tip.offsetWidth / 2;
        tip.style.left = Math.max(half, Math.min(br.width - half, left)) + 'px';
        tip.style.top = (rect.top - br.top + y * s) + 'px';
      },
      hide: function () { tip.hidden = true; }
    };
  }
  function bindHits(svg, tip, vbw) {
    svg.querySelectorAll('[data-tip]').forEach(function (h) {
      var g = h.parentNode;
      function on() { g.classList.add('is-hot'); tip.show(h.dataset.tip, svg, +h.dataset.x, +h.dataset.y, vbw); }
      function off() { g.classList.remove('is-hot'); tip.hide(); }
      h.addEventListener('mouseenter', on); h.addEventListener('mouseleave', off);
      h.addEventListener('focus', on); h.addEventListener('blur', off);
    });
  }
  function colTop(x, y, w, h, r) { return 'M' + x + ' ' + (y + h) + 'V' + (y + r) + 'Q' + x + ' ' + y + ' ' + (x + r) + ' ' + y + 'H' + (x + w - r) + 'Q' + (x + w) + ' ' + y + ' ' + (x + w) + ' ' + (y + r) + 'V' + (y + h) + 'Z'; }
  function barRight(x, y, w, h, r) { return 'M' + x + ' ' + y + 'H' + (x + w - r) + 'Q' + (x + w) + ' ' + y + ' ' + (x + w) + ' ' + (y + r) + 'V' + (y + h - r) + 'Q' + (x + w) + ' ' + (y + h) + ' ' + (x + w - r) + ' ' + (y + h) + 'H' + x + 'Z'; }
  function tabela(head, rows) {
    return '<details class="mk-table"><summary>Ver os dados em tabela</summary><table><thead><tr>' + head.map(function (h) { return '<th>' + h + '</th>'; }).join('') + '</tr></thead><tbody>' +
      rows.map(function (r) { return '<tr>' + r.map(function (c, k) { return '<td' + (k ? ' class="n"' : '') + '>' + c + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table></details>';
  }

  // Gráfico 1: volume de vendas do varejo restrito, PE × Brasil
  function grafVarejo(container) {
    var box = node('<figure class="mk-card mk-chart" style="margin:0"></figure>'), VW = 380, VH = 240, ml = 40, mr = 14, mt = 22, mb = 34;
    var data = [{ n: 'Pernambuco', v: 10.4, c: COR.v }, { n: 'Brasil', v: 1.8, c: '#5d7266' }];
    var y = function (v) { return mt + (VH - mt - mb) * (1 - v / 12); }, band = (VW - ml - mr) / 2, bw = 30;
    var s = '<svg style="max-width:' + Math.round(VW * 1.3) + 'px" viewBox="0 0 ' + VW + ' ' + VH + '" role="img" aria-label="Volume de vendas do varejo restrito de janeiro a julho de 2026, comparado ao mesmo período de 2025: Pernambuco cresceu 10,4% e o Brasil 1,8%">';
    [0, 3, 6, 9, 12].forEach(function (t) { s += '<line class="grid" x1="' + ml + '" x2="' + (VW - mr) + '" y1="' + y(t) + '" y2="' + y(t) + '"/><text class="tick" x="' + (ml - 8) + '" y="' + (y(t) + 4) + '" text-anchor="end">' + t + '%</text>'; });
    data.forEach(function (d, k) {
      var cx = ml + band * k + band / 2, x = cx - bw / 2, top = y(d.v);
      s += '<g><rect class="hit" tabindex="0" x="' + (cx - band / 2 + 8) + '" y="' + mt + '" width="' + (band - 16) + '" height="' + (VH - mt - mb) + '" data-x="' + cx + '" data-y="' + top + '" data-tip="<b>' + d.n + '</b><br>+' + dec(d.v) + '% no volume de vendas" aria-label="' + d.n + ': ' + dec(d.v) + '%"/>' +
        '<path class="mark" d="' + colTop(x, top, bw, y(0) - top, 4) + '" fill="' + d.c + '"/>' +
        '<text class="val" x="' + cx + '" y="' + (top - 8) + '" text-anchor="middle">' + dec(d.v) + '%</text>' +
        '<text x="' + cx + '" y="' + (VH - 12) + '" text-anchor="middle" font-size="12.5">' + d.n + '</text></g>';
    });
    box.innerHTML = '<h4>Volume de vendas do varejo restrito (jan–jul 2026 × jan–jul 2025)</h4>' + s + '</svg>' +
      '<p class="mk-src">Fonte: IBGE (Pesquisa Mensal de Comércio), via Movimento Econômico. Supermercados e similares responderam por cerca de 6 dos 9,2 pontos de alta do varejo ampliado em Pernambuco.</p>' +
      tabela(['Local', 'Crescimento'], data.map(function (d) { return [d.n, dec(d.v) + '%']; }));
    container.appendChild(box);
    bindHits(box.querySelector('svg'), tooltip(box), VW);
  }

  // Gráfico 2: empresas que usaram IA em 2025, por setor e por porte
  function grafIA(container) {
    var box = node('<figure class="mk-card mk-chart" style="margin:0"></figure>'), VW = 420, lx = 158, rx = 396, bh = 18;
    var x = function (v) { return lx + (rx - lx) * v / 60; };
    var grupos = [['Por setor', [['Indústria de transformação', 14], ['Comércio', 17]]], ['Por porte (todos os setores)', [['50 a 249 pessoas', 32], ['250 pessoas ou mais', 50]]]];
    var rows = [], yy = 22;
    grupos.forEach(function (g) { rows.push({ head: g[0], y: yy }); yy += 20; g[1].forEach(function (b) { rows.push({ n: b[0], v: b[1], y: yy }); yy += 34; }); yy += 6; });
    var VH = yy + 22;
    var s = '<svg style="max-width:' + Math.round(VW * 1.3) + 'px" viewBox="0 0 ' + VW + ' ' + VH + '" role="img" aria-label="Uso de inteligência artificial em 2025: indústria de transformação 14%, comércio 17%, empresas de 50 a 249 pessoas 32%, de 250 pessoas ou mais 50%">';
    [0, 20, 40, 60].forEach(function (t) { s += '<line class="grid" x1="' + x(t) + '" x2="' + x(t) + '" y1="14" y2="' + (VH - 22) + '"/><text class="tick" x="' + x(t) + '" y="' + (VH - 6) + '" text-anchor="middle">' + t + '%</text>'; });
    rows.forEach(function (r) {
      if (r.head) { s += '<text x="0" y="' + r.y + '" font-size="11" font-family="JetBrains Mono, monospace" letter-spacing=".08em" fill="#93ab9d">' + r.head.toUpperCase() + '</text>'; return; }
      var w = x(r.v) - lx;
      s += '<g><rect class="hit" tabindex="0" x="0" y="' + (r.y - 8) + '" width="' + VW + '" height="' + (bh + 16) + '" data-x="' + x(r.v) + '" data-y="' + r.y + '" data-tip="<b>' + r.n + '</b><br>' + r.v + '% usaram IA em 2025" aria-label="' + r.n + ': ' + r.v + '%"/>' +
        '<text x="' + (lx - 10) + '" y="' + (r.y + 13) + '" text-anchor="end" font-size="12.5">' + r.n + '</text>' +
        '<path class="mark" d="' + barRight(lx, r.y, w, bh, 4) + '" fill="#3fb866"/>' +
        '<text class="val" x="' + (x(r.v) + 6) + '" y="' + (r.y + 13) + '">' + r.v + '%</text></g>';
    });
    box.innerHTML = '<h4>Empresas que usaram inteligência artificial em 2025</h4>' + s + '</svg>' +
      '<p class="mk-src">Fonte: Cetic.br, TIC Empresas 2025, tabela H9. O porte da empresa pesa mais que o setor, o que reforça o foco do CITi em médias e grandes.</p>' +
      tabela(['Grupo', 'Usaram IA'], [['Indústria de transformação', '14%'], ['Comércio', '17%'], ['50 a 249 pessoas', '32%'], ['250 pessoas ou mais', '50%']]);
    container.appendChild(box);
    bindHits(box.querySelector('svg'), tooltip(box), VW);
  }

  // Gráfico 3: a matriz de decisão, ligada aos pesos da balança
  function grafMatriz(container) {
    var box = node('<figure class="mk-card mk-chart" style="margin:0"></figure>'), VW = 720, lx = 270, rx = 700, rh = 46, top = 16;
    var VH = top + CRIT.length * rh + 26, x = function (n) { return lx + (rx - lx) * (n - 1) / 4; };
    box.innerHTML = '<h4>Notas da matriz de decisão, critério a critério</h4><div class="mk-legend"><span style="--dot:' + COR.v + '">Varejo</span><span style="--dot:' + COR.i + '">Indústria</span><span style="--dot:#4fe577">Barra verde: peso atual na balança</span></div>';
    var svgWrap = node('<div></div>'); box.appendChild(svgWrap);
    box.insertAdjacentHTML('beforeend', '<p class="mk-src">Notas de 1 a 5, minha interpretação dos dados do documento. Critérios com peso maior aparecem mais fortes.</p>' +
      tabela(['Critério', 'Varejo', 'Indústria'], CRIT.map(function (c) { return [c.nome, c.v, c.i]; })));
    container.appendChild(box);
    var tip = tooltip(box);
    function render() {
      var s = '<svg style="max-width:' + Math.round(VW * 1.25) + 'px" viewBox="0 0 ' + VW + ' ' + VH + '" role="img" aria-label="Notas de varejo e indústria em cada critério">';
      [1, 2, 3, 4, 5].forEach(function (t) { s += '<line class="grid" x1="' + x(t) + '" x2="' + x(t) + '" y1="' + top + '" y2="' + (VH - 22) + '"/><text class="tick" x="' + x(t) + '" y="' + (VH - 6) + '" text-anchor="middle">' + t + '</text>'; });
      CRIT.forEach(function (c, k) {
        var cy = top + k * rh + rh / 2, op = (0.35 + 0.65 * W[k] / 10).toFixed(2);
        s += '<g style="opacity:' + op + '"><rect class="hit" tabindex="0" x="0" y="' + (cy - rh / 2) + '" width="' + VW + '" height="' + rh + '" data-x="' + x((c.v + c.i) / 2) + '" data-y="' + (cy - 10) + '" data-tip="<b>' + esc(c.nome) + '</b><br>Varejo ' + c.v + ' · Indústria ' + c.i + ' · peso ' + W[k] + '" aria-label="' + esc(c.nome) + ': varejo ' + c.v + ', indústria ' + c.i + ', peso ' + W[k] + '"/>' +
          '<text x="0" y="' + (cy - 2) + '" font-size="12.5" fill="#e9f5ee">' + esc(c.nome) + '</text>' +
          '<rect x="0" y="' + (cy + 6) + '" width="120" height="4" rx="2" fill="rgba(146,230,170,.12)"/><rect x="0" y="' + (cy + 6) + '" width="' + (W[k] * 12) + '" height="4" rx="2" fill="#4fe577"/>' +
          '<line class="mark" x1="' + x(c.v) + '" x2="' + x(c.i) + '" y1="' + cy + '" y2="' + cy + '" stroke="#5d7266" stroke-width="2"/>' +
          '<circle class="mark" cx="' + x(c.i) + '" cy="' + (cy + 5) + '" r="6" fill="' + COR.i + '" stroke="#0b1a14" stroke-width="2"/>' +
          '<circle class="mark" cx="' + x(c.v) + '" cy="' + (cy - 5) + '" r="6" fill="' + COR.v + '" stroke="#0b1a14" stroke-width="2"/></g>';
      });
      svgWrap.innerHTML = s + '</svg>';
      bindHits(svgWrap.querySelector('svg'), tip, VW);
    }
    views.push(render); render();
  }

  /* ================= PDF ================= */
  var libP, docP;
  function loadLib() {
    if (window.pdfjsLib) return Promise.resolve(window.pdfjsLib);
    return libP || (libP = new Promise(function (res, rej) {
      var s = document.createElement('script'); s.src = PDFJS + 'pdf.min.js';
      s.onload = function () { window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS + 'pdf.worker.min.js'; res(window.pdfjsLib); };
      s.onerror = rej; document.head.appendChild(s);
    }));
  }
  function getDoc() { return docP || (docP = loadLib().then(function (lib) { return lib.getDocument(PDF_URL).promise; })); }
  function pdfView(container, full) {
    var box = node('<div class="mk-pdf ' + (full ? 'is-full' : 'is-compact') + '" tabindex="0" aria-label="Documento da entrega de Marketing"><p class="mk-pdf-msg">Carregando o documento…</p></div>');
    container.appendChild(box);
    getDoc().then(function (doc) {
      var pages = node('<div class="mk-pdf-pages"></div>');
      box.innerHTML = ''; box.appendChild(pages);
      var width = Math.min(860, (full ? pages.clientWidth : pages.clientWidth - 24)) || 400, dpr = Math.min(window.devicePixelRatio || 1, 2);
      var chain = Promise.resolve();
      for (var p = 1; p <= doc.numPages; p++) (function (p) {
        chain = chain.then(function () { return doc.getPage(p); }).then(function (page) {
          var vp1 = page.getViewport({ scale: 1 }), vp = page.getViewport({ scale: width / vp1.width * dpr });
          var cv = document.createElement('canvas'); cv.width = vp.width; cv.height = vp.height;
          cv.setAttribute('role', 'img'); cv.setAttribute('aria-label', 'Página ' + p + ' de ' + doc.numPages);
          pages.appendChild(cv);
          return page.render({ canvasContext: cv.getContext('2d'), viewport: vp }).promise;
        });
      })(p);
      return chain;
    }).catch(function () {
      box.innerHTML = '<p class="mk-pdf-msg">Não foi possível mostrar o documento aqui. Use o botão para baixar o PDF.</p>';
    });
  }
  function pdfButtons(extra) {
    return '<a class="mk-btn is-main" href="' + PDF_URL + '" download="' + PDF_URL + '">Baixar PDF ↓</a>' +
      '<a class="mk-btn" href="' + PDF_URL + '" target="_blank" rel="noopener">Abrir em nova aba ↗</a>' + (extra || '');
  }

  /* ================= TELA CHEIA ================= */
  var root, body, lastFocus, aba = 'balanca';
  function build() {
    root = node('<div id="mk" role="dialog" aria-modal="true" aria-labelledby="mk-title" hidden></div>');
    root.innerHTML =
      '<header class="mk-top"><div class="mk-top-row">' +
        '<div><div class="mk-eyebrow">Marketing · Órbita 2 · Entrega</div><h2 class="mk-title" id="mk-title">Em qual setor o CITi deve focar agora?</h2></div>' +
        '<div class="mk-top-actions"><a class="mk-btn" href="' + PDF_URL + '" download="' + PDF_URL + '">Baixar PDF ↓</a><button class="mk-btn" type="button" data-close>Voltar ao planeta ✕</button></div></div>' +
        '<div class="mk-tabs" role="tablist" aria-label="Partes da entrega">' +
          '<button class="mk-tab" type="button" role="tab" data-tab="balanca">Balança de pesos</button>' +
          '<button class="mk-tab" type="button" role="tab" data-tab="numeros">Os números</button>' +
          '<button class="mk-tab" type="button" role="tab" data-tab="documento">Documento</button>' +
        '</div></header>' +
      '<div class="mk-body"><div class="mk-wrap" id="mk-content"></div></div>';
    body = root.querySelector('#mk-content');
    root.querySelector('[data-close]').addEventListener('click', fechar);
    root.querySelectorAll('[data-tab]').forEach(function (b) { b.addEventListener('click', function () { setAba(b.dataset.tab); }); });
    document.body.appendChild(root);
    window.addEventListener('keydown', function (e) {
      if (root.hidden) return;
      if (e.key === 'Escape') { fechar(); e.stopImmediatePropagation(); }
      else if ((e.key === 'ArrowLeft' || e.key === 'ArrowRight') && !(e.target && e.target.type === 'range')) e.stopImmediatePropagation();
    }, true);
  }
  function hero() {
    var h = node('<div class="mk-hero"></div>');
    h.innerHTML =
      '<div class="mk-card mk-hero-main"><p class="mk-label">✓ Minha resposta</p>' +
        '<p class="mk-big">Focar no <mark>varejo alimentar de Pernambuco</mark></p>' +
        '<p class="mk-lead">Principalmente redes regionais de porte médio e grande. A comunicação começaria por um problema concreto e com prazo: os dados de produto, estoque e clientes estarem prontos para a reforma tributária de 2027. A indústria de alimentos fica como segunda opção.</p></div>' +
      '<div class="mk-stats">' +
        '<div class="mk-stat"><b>+10,4%</b><span>vendas do varejo em PE em 2026 (Brasil: 1,8%)</span></div>' +
        '<div class="mk-stat"><b>84%</b><span>das 200 mil combinações de pesos dão varejo</span></div>' +
        '<div class="mk-stat"><b>4,0 × 3,5</b><span>nota de varejo e indústria com pesos iguais</span></div>' +
        '<div class="mk-stat"><b>2027</b><span>CBS passa a valer integralmente</span></div></div>';
    return h;
  }
  function setAba(t) {
    aba = t;
    root.querySelectorAll('[data-tab]').forEach(function (b) { b.setAttribute('aria-selected', b.dataset.tab === t ? 'true' : 'false'); });
    views = views.filter(function (fn) { return !fn.inOverlay; });
    var before = views.length;
    body.innerHTML = '';
    body.appendChild(hero());
    if (t === 'balanca') {
      var c = node('<div class="mk-card"><p class="mk-label">Teste você mesmo: mude os pesos</p></div>');
      body.appendChild(c); balanca(c, true);
      grafMatriz(body);
    } else if (t === 'numeros') {
      var g = node('<div class="mk-charts"></div>'); body.appendChild(g);
      grafVarejo(g); grafIA(g);
    } else {
      var d = node('<div class="mk-card" style="display:grid;gap:14px"><div class="mk-doc-bar"><p>Desafio de Marketing · 7 páginas · PDF</p><div class="mk-actions">' + pdfButtons() + '</div></div></div>');
      body.appendChild(d); pdfView(d, true);
    }
    views.slice(before).forEach(function (fn) { fn.inOverlay = true; });
    root.querySelector('.mk-body').scrollTop = 0;
  }
  function abrir(t) {
    if (!root) build();
    lastFocus = document.activeElement;
    root.hidden = false;
    setAba(t || aba);
    requestAnimationFrame(function () { root.classList.add('is-open'); });
    root.querySelector('[data-close]').focus({ preventScroll: true });
  }
  function fechar() {
    if (!root || root.hidden) return;
    root.classList.remove('is-open');
    setTimeout(function () { root.hidden = true; }, 280);
    views = views.filter(function (fn) { return !fn.inOverlay; });
    if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
  }

  /* ================= PAINEL LATERAL ================= */
  function painel(container) {
    views = views.filter(function (fn) { return fn.inOverlay; });   // descarta balanças de aberturas anteriores do painel
    function sec(title) { var s = document.createElement('section'); s.className = 'p-sec'; var h3 = document.createElement('h3'); h3.textContent = title; s.appendChild(h3); container.appendChild(s); return s; }
    var a = sec('Minha resposta');
    a.appendChild(node('<div class="mk-answer"><strong>Varejo alimentar de Pernambuco</strong><span>Redes regionais de porte médio e grande. A indústria de alimentos fica como segunda opção.</span></div>'));
    var e = sec('Minha entrega');
    pdfView(e, false);
    var acts = node('<div class="mk-actions">' + pdfButtons('<button class="mk-btn" type="button" data-full>Tela cheia ⤢</button>') + '</div>');
    acts.querySelector('[data-full]').addEventListener('click', function () { abrir('documento'); });
    e.appendChild(acts);
    var c = sec('Como pensei');
    c.appendChild(node('<p class="mk-sub">Teste você mesmo: mude os pesos</p>'));
    balanca(c, false);
    var x = node('<button class="mk-expand" type="button"><svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M9.5 2.5h4v4M6.5 13.5h-4v-4M13.5 2.5l-5 5M2.5 13.5l5-5" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>Abrir entrega completa</button>');
    x.addEventListener('click', function () { abrir('balanca'); });
    container.appendChild(x);
  }

  window.CITI_ENTREGAS = window.CITI_ENTREGAS || {};
  window.CITI_ENTREGAS.marketing = { painel: painel, abrir: abrir };
})();
