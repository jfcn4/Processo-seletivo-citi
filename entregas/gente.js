/* Entrega do planeta Gente e Gestão: quanto custou o Squad Aurora.
   painel(): resumo no painel lateral (resposta, quem pagou a conta, as 4 ações e o documento).
   abrir(aba): tela cheia com a conta (simulador de renegociação), o plano ligado no Aurora, as horas por pessoa, o clima e o documento.
   Todos os números vêm do enunciado; as contas são refeitas aqui, na hora. */
(function () {
  'use strict';

  var PDF_URL = 'Joao_Felipe_Costa_Neves_-_Desafio_GG.pdf';   // na mesma pasta do index.html
  var PDFJS = window.MK_PDFJS_BASE || 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/';
  var COR = { acc: '#b9a6ff', in: '#4fe577', reneg: '#9be8b0', perda: '#ff6b7d', plan: 'rgba(233,245,238,.26)', extra: '#6f8579', antes: '#6f8579' };

  /* ---------- dados do enunciado ---------- */
  var P = { valor: 12000, hPlan: 300, hReal: 480, sPlan: 8, sReal: 12, regra: 6, membros: 8 };
  var HORA = P.valor / P.hPlan;   // R$ 40/h, o valor da hora do orçamento
  var MUD = [
    { n: 1, sem: 3, nome: 'Nova tela de cadastro', h: 30 },
    { n: 2, sem: 4, nome: 'Troca da identidade visual', h: 25 },
    { n: 3, sem: 6, nome: 'Integração com pagamento', h: 60 },
    { n: 4, sem: 8, nome: 'Novo fluxo de login', h: 25 },
    { n: 5, sem: 10, nome: 'Relatório em PDF', h: 40 }
  ];
  var PESSOAS = [
    ['Gerente de projeto', 30, 45], ['Dev A', 45, 95], ['Dev B', 45, 90], ['Dev C', 40, 55],
    ['Dev D', 40, 50], ['Dev E', 40, 45], ['Produto A', 30, 55], ['Produto B', 30, 45]
  ].map(function (x) { return { nome: x[0], plan: x[1], real: x[2], extra: x[2] - x[1] }; });
  var CLIMA = [
    { k: 'clareza', nome: 'Clareza do meu papel no projeto', a: 4.1, d: 3.9 },
    { k: 'comunic', nome: 'Comunicação com a gerência', a: 4.0, d: 3.2 },
    { k: 'reconh', nome: 'Me sinto reconhecido(a)', a: 3.8, d: 2.6, meta: 3.5 },
    { k: 'carga', nome: 'Carga de trabalho é sustentável', a: 3.5, d: 2.4 },
    { k: 'parte', nome: 'Me sinto parte do CITi', a: 4.5, d: 4.3 },
    { k: 'oport', nome: 'Vejo oportunidade de desenvolvimento', a: 3.9, d: 3.7 }
  ];
  var COMENT = [
    { n: 1, t: 'O cliente muda o escopo toda semana e a gente só fica sabendo na hora de entregar.', liga: ['comunic'], leitura: 'Escopo mudando sem comunicação: 5 mudanças, nenhuma renegociada.' },
    { n: 2, t: 'Fiz a madrugada antes da entrega e ninguém comentou nada.', liga: ['reconh', 'carga'], leitura: 'Esforço extra sem reconhecimento, no mesmo período do pico de horas.' },
    { n: 3, t: 'Gosto muito das pessoas do time, o problema não é com elas.', liga: ['parte'], leitura: 'O que está saudável: o pertencimento segue a nota mais alta.' },
    { n: 4, t: 'Tô pensando se vale a pena continuar no projeto no próximo semestre.', liga: ['clareza', 'oport'], leitura: 'Risco de perder membros: clareza e desenvolvimento também caíram.' }
  ];
  var totalExtra = PESSOAS.reduce(function (s, p) { return s + p.extra; }, 0);   // 180 h

  /* ---------- utilidades ---------- */
  function node(html) { var t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function brl(v) { var neg = v < 0; v = Math.abs(v); var s = v % 1 ? v.toFixed(2).replace('.', ',') : String(Math.round(v)); return (neg ? '−' : '') + 'R$ ' + s.replace(/\B(?=(\d{3})+(?!\d))/g, '.'); }
  function num(v, d) { return v.toFixed(d == null ? 1 : d).replace('.', ','); }
  function pct(v) { return num(v, 1).replace(/,0$/, '') + '%'; }
  var ICON_EXPAND = '<svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M9.5 2.5h4v4M6.5 13.5h-4v-4M13.5 2.5l-5 5M2.5 13.5l5-5" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>';

  /* ---------- tooltip dos gráficos (mesmo estilo de Marketing) ---------- */
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
  function bindHits(svg, tip, vbw, onHot) {
    svg.querySelectorAll('[data-tip]').forEach(function (h) {
      var g = h.parentNode;
      function on() { g.classList.add('is-hot'); tip.show(h.dataset.tip, svg, +h.dataset.x, +h.dataset.y, vbw); if (onHot) onHot(h.dataset.key, true); }
      function off() { g.classList.remove('is-hot'); tip.hide(); if (onHot) onHot(h.dataset.key, false); }
      h.addEventListener('mouseenter', on); h.addEventListener('mouseleave', off);
      h.addEventListener('focus', on); h.addEventListener('blur', off);
    });
  }
  // dentro de .mk-chart o CSS pinta todo texto de cinza; o fill vai no style para valer
  function fixFill(svg) { return svg.replace(/(<text[^>]*?) fill="([^"]+)"/g, '$1 style="fill:$2"'); }
  function barRight(x, y, w, h, r) { if (w <= 0) return ''; r = Math.min(r, w); return 'M' + x + ' ' + y + 'H' + (x + w - r) + 'Q' + (x + w) + ' ' + y + ' ' + (x + w) + ' ' + (y + r) + 'V' + (y + h - r) + 'Q' + (x + w) + ' ' + (y + h) + ' ' + (x + w - r) + ' ' + (y + h) + 'H' + x + 'Z'; }
  function tabela(head, rows) {
    return '<details class="mk-table"><summary>Ver os dados em tabela</summary><table><thead><tr>' + head.map(function (h) { return '<th>' + h + '</th>'; }).join('') + '</tr></thead><tbody>' +
      rows.map(function (r) { return '<tr>' + r.map(function (c, k) { return '<td' + (k ? ' class="n"' : '') + '>' + c + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table></details>';
  }
  function seg(items, aria, cls) {   // grupo de botões (um selecionado)
    var g = node('<div class="gg-seg' + (cls ? ' ' + cls : '') + '" role="group" aria-label="' + aria + '"></div>');
    items.forEach(function (it) { var b = node('<button type="button"></button>'); b.textContent = it[1]; b.dataset.v = it[0]; g.appendChild(b); });
    return g;
  }
  function marcar(g, v) { g.querySelectorAll('button').forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.v === v ? 'true' : 'false'); }); }

  /* ================= A CONTA: simulador de renegociação ================= */
  var reneg = MUD.map(function () { return false; });   // o que aconteceu: nenhuma renegociada
  var contaViews = [];
  function conta() {
    var hR = 0; MUD.forEach(function (m, k) { if (reneg[k]) hR += m.h; });
    var hNR = 180 - hR, cobrado = P.valor + hR * HORA, trabalho = P.hReal * HORA, perdido = trabalho - cobrado;
    return { hR: hR, hNR: hNR, cobrado: cobrado, trabalho: trabalho, perdido: perdido, efetivo: cobrado / P.hReal, perdaPct: perdido / trabalho * 100 };
  }
  function redrawConta() { contaViews.forEach(function (fn) { fn(); }); }

  function simulador(container) {
    var c = node('<div class="mk-card gg-sim"></div>');
    c.innerHTML = '<p class="mk-label">E se cada mudança tivesse sido renegociada?</p>' +
      '<p class="gg-note">O contrato dizia só que as mudanças “serão avaliadas pela equipe”. Clique numa mudança para renegociá-la (novo valor pelas horas a mais, a R$ 40/h) e veja a conta mudar.</p>';
    var pres = seg([['nenhuma', 'O que aconteceu: nenhuma'], ['todas', 'Com a ação 1: todas']], 'Cenários');
    c.appendChild(pres);
    var tl = node('<div class="gg-tl"></div>'); c.appendChild(tl);
    var out = node('<div class="gg-out" aria-live="polite"></div>'); c.appendChild(out);
    container.appendChild(c);
    pres.querySelectorAll('button').forEach(function (b) { b.addEventListener('click', function () { reneg = MUD.map(function () { return b.dataset.v === 'todas'; }); redrawConta(); }); });

    // linha do tempo das 12 semanas
    var VW, VH = 200, ml = 20, mr = 20, base = 146, x = function (s) { return ml + (VW - ml - mr) * (s - 0.5) / 12; }, hmax = 60, hy = function (h) { return 34 + (base - 46) * (1 - h / hmax); };
    function drawTl() {
      var nar = tl.clientWidth > 0 && tl.clientWidth < 560;   // celular: desenho na escala da tela, sem rótulos que se sobrepõem
      VW = nar ? Math.max(320, tl.clientWidth) : 1000;
      var s = '<svg viewBox="0 0 ' + VW + ' ' + VH + '" role="group" aria-label="Linha do tempo das 12 semanas do projeto, com as 5 mudanças de escopo">';
      s += '<rect x="' + x(0.5) + '" y="' + (base - 2) + '" width="' + (x(8.5) - x(0.5)) + '" height="4" rx="2" fill="rgba(79,229,119,.55)"/>';
      s += '<rect x="' + x(8.5) + '" y="' + (base - 2) + '" width="' + (x(12.5) - x(8.5)) + '" height="4" rx="2" fill="rgba(255,107,125,.55)"/>';
      for (var w = 1; w <= 12; w++) s += '<text class="tick" x="' + x(w) + '" y="' + (base + 20) + '" text-anchor="middle">' + w + '</text>';
      s += (nar ? '' : '<text class="tick" x="' + x(0.5) + '" y="' + (base + 40) + '">semana</text>');
      s += '<line x1="' + x(8.5) + '" x2="' + x(8.5) + '" y1="18" y2="' + (base + 6) + '" stroke="#e9f5ee" stroke-opacity=".5" stroke-dasharray="4 4"/>' +
        '<text x="' + (x(8.5) - 6) + '" y="22" text-anchor="end" font-size="11.5" fill="#93ab9d">prazo original</text>' +
        '<text x="' + (x(12.5)) + '" y="' + (base + 40) + '" text-anchor="end" font-size="11.5" fill="#ff9aa6">4 semanas de atraso</text>';
      MUD.forEach(function (m, k) {
        var cx = x(m.sem), top = hy(m.h), w = Math.min(46, (VW - 40) / 12 * 0.78), on = reneg[k], cor = on ? COR.reneg : COR.perda;
        s += '<g class="gg-mud' + (on ? ' is-on' : '') + '"><rect class="hit" tabindex="0" role="button" aria-pressed="' + on + '" data-k="' + k + '" x="' + (cx - (VW - 40) / 24) + '" y="14" width="' + ((VW - 40) / 12) + '" height="' + (base - 10) + '" aria-label="Mudança ' + m.n + ', semana ' + m.sem + ': ' + m.nome + ', ' + m.h + ' horas. ' + (on ? 'Renegociada' : 'Não renegociada') + '. Clique para alternar."/>' +
          '<rect class="mark" x="' + (cx - w / 2) + '" y="' + top + '" width="' + w + '" height="' + (base - 6 - top) + '" rx="6" fill="' + cor + '" fill-opacity="' + (on ? .9 : .78) + '"/>' +
          (nar ? '' : '<text class="val" x="' + cx + '" y="' + (top - 8) + '" text-anchor="middle">' + m.h + ' h</text>') +
          '<text x="' + cx + '" y="' + (top + 18) + '" text-anchor="middle" font-size="12" font-weight="700" fill="#06140d">' + (on ? '✓' : m.n) + '</text></g>';
      });
      tl.innerHTML = s + '</svg><div class="gg-tl-legend"><span style="--dot:' + COR.perda + '">não renegociada: horas dadas de graça</span><span style="--dot:' + COR.reneg + '">renegociada: cobrada a R$ 40/h</span></div>' +
        '<ol class="gg-mud-list">' + MUD.map(function (m, k) { return '<li class="' + (reneg[k] ? 'is-on' : '') + '"><button type="button" data-k="' + k + '" aria-pressed="' + reneg[k] + '"><b>' + m.n + '</b><span>Semana ' + m.sem + ' · ' + esc(m.nome) + '</span><em>' + m.h + ' h · ' + brl(m.h * HORA) + '</em></button></li>'; }).join('') + '</ol>';
      tl.querySelectorAll('[data-k]').forEach(function (b) {
        function tog() { var k = +b.dataset.k; reneg[k] = !reneg[k]; redrawConta(); var again = tl.querySelector((b.tagName === 'rect' ? 'rect' : 'button') + '[data-k="' + k + '"]'); if (again) again.focus(); }
        b.addEventListener('click', tog);
        b.addEventListener('keydown', function (e) { if (b.tagName === 'rect' && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); tog(); } });
      });
    }
    function rotulo(t, v, W) { var f = v / W; return f >= 0.2 ? t + ' · ' + brl(v) : f >= 0.08 ? brl(v) : ''; }
  function drawOut() {
      var r = conta(), W = r.trabalho;
      out.innerHTML =
        '<div class="gg-money"><div class="gg-bar" role="img" aria-label="Valor do trabalho de ' + brl(W) + ': ' + brl(P.valor) + ' do contrato, ' + brl(r.hR * HORA) + ' renegociados e ' + brl(r.perdido) + ' não cobrados">' +
          '<span style="width:' + (P.valor / W * 100) + '%;background:' + COR.in + '">Contrato · ' + brl(P.valor) + '</span>' +
          '<span style="width:' + (r.hR * HORA / W * 100) + '%;background:' + COR.reneg + '">' + rotulo('Renegociado', r.hR * HORA, W) + '</span>' +
          '<span style="width:' + (r.perdido / W * 100) + '%;background:' + COR.perda + '">' + rotulo('Não cobrado', r.perdido, W) + '</span>' +
        '</div><div class="gg-bar-axis"><span>R$ 0</span><span>valor do trabalho real: ' + brl(W) + '</span></div></div>' +
        '<div class="gg-kpis">' +
          '<div class="gg-kpi"><b>' + brl(r.cobrado) + '</b><span>cobrado do cliente</span></div>' +
          '<div class="gg-kpi' + (r.perdido ? ' is-bad' : ' is-good') + '"><b>' + brl(r.perdido) + '</b><span>não cobrado (' + pct(r.perdaPct) + ' do trabalho)</span></div>' +
          '<div class="gg-kpi"><b>' + brl(r.efetivo) + '/h</b><span>valor efetivo da hora (orçamento: R$ 40/h)</span></div>' +
          '<div class="gg-kpi"><b>' + r.hNR + ' h</b><span>entregues de graça</span></div></div>';
      marcar(pres, reneg.every(Boolean) ? 'todas' : reneg.some(Boolean) ? '' : 'nenhuma');
    }
    contaViews.push(function () { drawTl(); drawOut(); }); drawTl(); drawOut();
  }

  function passos(container) {
    var c = node('<div class="mk-card"><p class="mk-label">A conta, passo a passo (apêndice A)</p><div class="gg-steps"></div><p class="mk-src">Os números mudam junto com o simulador acima. Com nenhuma mudança renegociada, é exatamente a tabela do documento.</p></div>');
    var box = c.querySelector('.gg-steps');
    function draw() {
      var r = conta(), nr = MUD.filter(function (m, k) { return !reneg[k]; });
      var rows = [
        ['Valor da hora no orçamento', 'R$ 12.000 ÷ 300 h', 'R$ 40/h'],
        ['Valor das horas reais', '480 h × R$ 40/h', brl(r.trabalho)],
        ['Valor cobrado', 'R$ 12.000' + (r.hR ? ' + ' + r.hR + ' h × R$ 40' : ''), brl(r.cobrado)],
        ['Valor não cobrado', brl(r.trabalho) + ' − ' + brl(r.cobrado), brl(r.perdido), r.perdido > 0],
        ['Valor efetivo da hora', brl(r.cobrado) + ' ÷ 480 h', brl(r.efetivo) + '/h' + (r.efetivo < 40 ? ' (−' + pct((40 - r.efetivo) / 40 * 100) + ')' : '')],
        ['Horas das mudanças não renegociadas', nr.length ? nr.map(function (m) { return m.h; }).join(' + ') : 'nenhuma', r.hNR + ' h'],
        ['Estouro de horas do projeto', '480 h − 300 h', '180 h'],
        ['Valor das mudanças não renegociadas', r.hNR + ' h × R$ 40/h', brl(r.hNR * HORA), r.hNR > 0]
      ];
      box.innerHTML = '<table class="gg-table"><thead><tr><th>Passo</th><th>Cálculo</th><th class="n">Resultado</th></tr></thead><tbody>' +
        rows.map(function (x, i) { return '<tr' + (x[3] ? ' class="is-loss"' : '') + '><td><span class="gg-i">' + (i + 1) + '</span>' + x[0] + '</td><td class="calc">' + x[1] + '</td><td class="n">' + x[2] + '</td></tr>'; }).join('') + '</tbody></table>' +
        '<p class="gg-check">' + (r.hNR === 180 ? '✓ As mudanças não renegociadas explicam <b>100%</b> do estouro: 180 h de 180 h.' : 'Ainda sem cobrança: <b>' + r.hNR + ' h</b> das 180 h de estouro (' + pct(r.hNR / 180 * 100) + ').') + '</p>';
    }
    contaViews.push(draw); draw();
    container.appendChild(c);
  }

  function contrato(container) {
    container.appendChild(node('<div class="gg-contract">' +
      '<div class="mk-card gg-clause is-now"><p class="mk-label">O contrato hoje</p><blockquote>“Eventuais alterações de escopo serão avaliadas pela equipe do projeto.”</blockquote><p class="gg-note">Não diz quem avalia nem que uma mudança gera nova cobrança ou novo prazo. Resultado: 5 pedidos, 180 h, nenhum renegociado.</p></div>' +
      '<div class="mk-card gg-clause is-next"><p class="mk-label">Ação 1 do plano · a prioridade</p><blockquote>Processo formal de mudança de escopo: a mudança só começa com novo valor ou prazo aprovado por escrito, e o pedido registra quem absorve as horas.</blockquote><p class="gg-note">Responsável: diretoria, com o gerente de projeto · prazo de 30 dias · meta: 100% das mudanças registradas e renegociadas.</p></div></div>'));
  }

  /* ================= QUEM PAGOU A CONTA ================= */
  var modoH = 'total';
  function grafPessoas(container, compacto) {
    var box = node('<figure class="mk-chart gg-chart' + (compacto ? '' : ' mk-card') + '" style="margin:0"></figure>');
    if (!compacto) box.innerHTML = '<h4>Duas pessoas pagaram mais da metade da conta</h4>';
    var ctr = seg([['total', 'Horas no projeto'], ['semana', 'Horas por semana']], 'Unidade do gráfico', 'is-sm');
    box.appendChild(ctr);
    box.appendChild(node('<div class="mk-legend"><span style="--dot:' + COR.plan + '">Planejado</span><span style="--dot:' + COR.extra + '">Horas extras</span><span style="--dot:' + COR.acc + '">Extras de quem passou da regra</span></div>'));
    var svgWrap = node('<div></div>'); box.appendChild(svgWrap);
    var src = node('<p class="mk-src"></p>'); box.appendChild(src);
    if (!compacto) box.insertAdjacentHTML('beforeend', tabela(['Membro', 'Planejado', 'Real', 'Extra', 'h/semana real'], PESSOAS.map(function (p) { return [p.nome, p.plan + ' h', p.real + ' h', '+' + p.extra + ' h', num(p.real / 12)]; })));
    container.appendChild(box);
    var tip = tooltip(box);
    ctr.querySelectorAll('button').forEach(function (b) { b.addEventListener('click', function () { modoH = b.dataset.v; draw(); }); });
    var ordem = PESSOAS.slice().sort(function (a, b) { return b.real - a.real || b.extra - a.extra; });
    function draw() {
      marcar(ctr, modoH);
      var nar = !compacto && box.clientWidth > 0 && box.clientWidth < 600, cmp = compacto || nar;
      var sem = modoH === 'semana', VW = compacto ? 420 : nar ? 360 : 1000, lx = nar ? 100 : compacto ? 112 : 150, rx = VW - (nar ? 58 : compacto ? 64 : 90), rh = cmp ? 26 : 32, top = 26, bh = cmp ? 14 : 18;
      var max = sem ? 16 : (nar ? 112 : 100), regra = sem ? P.regra : P.regra * P.sReal, VH = top + ordem.length * rh + 26;
      var x = function (v) { return lx + (rx - lx) * v / max; };
      var s = '<svg viewBox="0 0 ' + VW + ' ' + VH + '" role="img" aria-label="' + (sem ? 'Horas por semana de cada pessoa, planejado e real' : 'Horas totais de cada pessoa no projeto, planejado e extras') + '">';
      (sem ? [0, 4, 8, 12, 16] : [0, 25, 50, 75, 100]).forEach(function (t) { s += '<line class="grid" x1="' + x(t) + '" x2="' + x(t) + '" y1="' + (top - 6) + '" y2="' + (VH - 22) + '"/><text class="tick" x="' + x(t) + '" y="' + (VH - 6) + '" text-anchor="middle">' + t + ' h</text>'; });
      ordem.forEach(function (p, i) {
        var y = top + i * rh + (rh - bh) / 2, cy = y + bh / 2;
        var acima = p.real > P.regra * P.sReal, alta = p.nome === 'Dev A' || p.nome === 'Dev B';
        var tipTxt, marks;
        if (!sem) {
          var wp = x(p.plan) - lx, we = x(p.real) - x(p.plan);
          marks = '<rect class="mark" x="' + lx + '" y="' + y + '" width="' + wp + '" height="' + bh + '" rx="3" fill="' + COR.plan + '"/>' +
            '<path class="mark" d="' + barRight(x(p.plan), y, we, bh, 3) + '" fill="' + (acima ? COR.acc : COR.extra) + '"/>' +
            '<text class="val" x="' + (x(p.real) + 6) + '" y="' + (cy + 4) + '"' + (acima ? ' font-weight="700" style="fill:#e3dbff"' : '') + '>' + p.real + ' h (+' + p.extra + ')</text>';
          tipTxt = '<b>' + p.nome + '</b><br>' + p.plan + ' h planejadas · ' + p.real + ' h reais<br>+' + p.extra + ' h extras (' + pct(p.extra / totalExtra * 100) + ' das 180 h)';
        } else {
          var pr = p.real / P.sReal, pp = p.plan / P.sPlan;
          marks = '<path class="mark" d="' + barRight(lx, y, x(pr) - lx, bh, 3) + '" fill="' + (pr > P.regra ? COR.acc : COR.extra) + '"/>' +
            '<line class="mark" x1="' + x(pp) + '" x2="' + x(pp) + '" y1="' + (y - 3) + '" y2="' + (y + bh + 3) + '" stroke="#e9f5ee" stroke-width="2"/>' +
            (alta ? '<circle class="mark" cx="' + x(15) + '" cy="' + cy + '" r="5" fill="none" stroke="' + COR.perda + '" stroke-width="2"/>' : '') +
            '<text class="val" x="' + (alta ? x(15) + 10 : x(Math.max(pr, pp)) + 8) + '" y="' + (cy + 4) + '">' + num(pr) + (alta ? ' · pico ~15' : '') + '</text>';
          tipTxt = '<b>' + p.nome + '</b><br>Plano: ' + num(pp) + ' h/semana (' + p.plan + ' h em 8)<br>Real: ' + num(pr) + ' h/semana (' + p.real + ' h em 12)' + (alta ? '<br>Pico: ~15 h/semana nas 3 últimas semanas' : '');
        }
        s += '<g><rect class="hit" tabindex="0" x="0" y="' + (top + i * rh) + '" width="' + VW + '" height="' + rh + '" data-x="' + x(sem ? p.real / 12 : p.real) + '" data-y="' + y + '" data-tip="' + esc(tipTxt) + '" aria-label="' + esc(tipTxt.replace(/<br>/g, '. ').replace(/<[^>]+>/g, '')) + '"/>' +
          '<text x="' + (lx - 10) + '" y="' + (cy + 4) + '" text-anchor="end" font-size="' + (cmp ? 11.5 : 12.5) + '"' + (alta ? ' style="fill:#e9f5ee;font-weight:600"' : '') + '>' + p.nome + '</text>' + marks + '</g>';
      });
      s += '<line x1="' + x(regra) + '" x2="' + x(regra) + '" y1="' + (top - 14) + '" y2="' + (VH - 22) + '" stroke="#e9f5ee" stroke-opacity=".7" stroke-dasharray="5 4"/>' +
        '<text x="' + (x(regra) + 5) + '" y="' + (top - 6) + '" font-size="11" fill="#e9f5ee">' + (sem ? 'regra: 6 h/semana' : cmp ? 'regra: 72 h' : 'regra: 6 h × 12 semanas = 72 h') + '</text>';
      svgWrap.innerHTML = fixFill(s + '</svg>');
      bindHits(svgWrap.querySelector('svg'), tip, VW);
      src.innerHTML = sem
        ? 'Barra: média real (horas ÷ 12 semanas). Traço branco: o plano (horas ÷ 8 semanas). Dev A e Dev B já começaram perto do limite (5,6 h/semana) e chegaram a ~15 h/semana no fim: 2,5 vezes a regra. Na média do time, foram 5 h/semana.'
        : 'Fonte: seção 2.4 do desafio. Na média, o time ficou dentro da regra (480 h ÷ 8 pessoas ÷ 12 semanas = 5 h/semana). O problema foi a concentração: só Dev A e Dev B passaram das 72 h.';
    }
    draw();
  }
  function divisaoExtras(container) {
    var c = node('<figure class="mk-card mk-chart" style="margin:0"><h4>Quem absorveu as 180 horas extras</h4></figure>');
    var ordem = PESSOAS.slice().sort(function (a, b) { return b.extra - a.extra; });
    var nar = container.clientWidth > 0 && container.clientWidth < 600;
    var VW = nar ? 360 : 1000, VH = 92, x0 = 0, s = '<svg viewBox="0 0 ' + VW + ' ' + VH + '" role="img" aria-label="Divisão das 180 horas extras: Dev A 50, Dev B 45 e as outras 6 pessoas 85">';
    ordem.forEach(function (p, i) {
      var w = VW * p.extra / totalExtra, alta = p.nome === 'Dev A' || p.nome === 'Dev B', cor = alta ? COR.acc : (i % 2 ? '#5d7266' : '#7b9184');
      var t = '<b>' + p.nome + '</b><br>+' + p.extra + ' h · ' + pct(p.extra / totalExtra * 100) + ' das extras<br>' + brl(p.extra * HORA) + ' pelo valor-hora do orçamento';
      s += '<g><rect class="hit" tabindex="0" x="' + x0 + '" y="0" width="' + w + '" height="46" data-x="' + (x0 + w / 2) + '" data-y="2" data-tip="' + esc(t) + '" aria-label="' + esc(t.replace(/<br>/g, '. ').replace(/<[^>]+>/g, '')) + '"/>' +
        '<rect class="mark" x="' + (x0 + 1) + '" y="4" width="' + Math.max(0, w - 2) + '" height="40" rx="4" fill="' + cor + '"/>' +
        (w > 34 ? '<text x="' + (x0 + w / 2) + '" y="29" text-anchor="middle" font-size="12" font-weight="600" fill="#06140d">' + p.extra + ' h</text>' : '') + '</g>';
      x0 += w;
    });
    var ab = VW * 95 / 180;
    s += '<path d="M2 56 V64 H' + (ab - 2) + ' V56" fill="none" stroke="' + COR.acc + '" stroke-width="1.5"/><text x="' + (ab / 2) + '" y="84" text-anchor="middle" font-size="13" fill="#e3dbff" font-weight="600">' + (nar ? 'Dev A + B: 95 h (53%)' : 'Dev A + Dev B: 95 h, 53% das extras · R$ 3.800') + '</text>' +
      '<text x="' + ((VW + ab) / 2) + '" y="84" text-anchor="middle" font-size="12.5" fill="#93ab9d">' + (nar ? 'outras 6: 85 h' : 'as outras 6 pessoas: 85 h') + '</text>';
    c.insertAdjacentHTML('beforeend', fixFill(s + '</svg>') + '<p class="mk-src">Passe o mouse em cada faixa. O dinheiro que o CITi não cobrou saiu, na prática, das horas dessas pessoas.</p>');
    container.appendChild(c);
    bindHits(c.querySelector('svg'), tooltip(c), VW);
  }

  /* ================= O CLIMA ================= */
  var mostrarMeta = false;
  function grafClima(container) {
    var c = node('<div class="gg-clima"></div>');
    var fig = node('<figure class="mk-card mk-chart" style="margin:0"><h4>O que mudou na pesquisa de clima</h4></figure>');
    var ctr = node('<label class="gg-check-l"><input type="checkbox"> Mostrar a meta da ação 3 (reconhecimento em 3,5 ou mais)</label>');
    fig.appendChild(node('<div class="mk-legend"><span style="--dot:' + COR.antes + '">Semestre passado</span><span style="--dot:' + COR.acc + '">Agora</span><span style="--dot:' + COR.perda + '">Queda de 0,8 ou mais</span></div>'));
    var svgWrap = node('<div></div>'); fig.appendChild(svgWrap); fig.appendChild(ctr);
    fig.insertAdjacentHTML('beforeend', '<p class="mk-src">Escala de 1 a 5. Participaram 7 dos 8 membros. Ordenado pela queda, como no diagnóstico do documento.</p>' +
      tabela(['Dimensão', 'Antes', 'Agora', 'Variação'], CLIMA.map(function (d) { return [d.nome, num(d.a), num(d.d), '−' + num(d.a - d.d)]; })));
    var com = node('<div class="gg-coms"><p class="mk-label" style="margin:0">Comentários anônimos · clique para ligar ao gráfico</p></div>');
    COMENT.forEach(function (m) {
      var b = node('<button type="button" class="gg-com"><span class="gg-com-n">' + m.n + '</span><q></q><span class="gg-com-l"></span></button>');
      b.querySelector('q').textContent = m.t; b.querySelector('.gg-com-l').textContent = m.leitura; b.dataset.n = m.n;
      b.addEventListener('click', function () { sel = sel === m.n ? null : m.n; draw(); });
      com.appendChild(b);
    });
    c.appendChild(fig); c.appendChild(com);
    container.appendChild(c);
    var tip = tooltip(fig), sel = null;
    ctr.querySelector('input').addEventListener('change', function (e) { mostrarMeta = e.target.checked; draw(); });
    var ordem = CLIMA.slice().sort(function (a, b) { return (b.a - b.d) - (a.a - a.d); });
    function draw() {
      var liga = sel ? COMENT[sel - 1].liga : null;
      com.querySelectorAll('.gg-com').forEach(function (b) { b.setAttribute('aria-pressed', +b.dataset.n === sel ? 'true' : 'false'); });
      var nar = svgWrap.clientWidth > 0 && svgWrap.clientWidth < 560, dy = nar ? 10 : 0;
      var VW = nar ? 360 : 760, lx = nar ? 18 : 260, rx = nar ? 342 : 700, rh = nar ? 58 : 46, top = 18, VH = top + ordem.length * rh + 24, x = function (v) { return lx + (rx - lx) * (v - 2) / 3; };
      var s = '<svg viewBox="0 0 ' + VW + ' ' + VH + '" role="img" aria-label="Notas da pesquisa de clima antes e agora">';
      [2, 2.5, 3, 3.5, 4, 4.5, 5].forEach(function (t) { s += '<line class="grid" x1="' + x(t) + '" x2="' + x(t) + '" y1="' + top + '" y2="' + (VH - 22) + '"/><text class="tick" x="' + x(t) + '" y="' + (VH - 6) + '" text-anchor="middle">' + num(t) + '</text>'; });
      ordem.forEach(function (d, i) {
        var cy0 = top + i * rh + rh / 2, cy = cy0 + dy, queda = d.a - d.d, forte = queda >= 0.8, dim = liga && liga.indexOf(d.k) < 0, on = liga && liga.indexOf(d.k) >= 0;
        var t = '<b>' + esc(d.nome) + '</b><br>' + num(d.a) + ' → ' + num(d.d) + ' (−' + num(queda) + ')';
        s += '<g style="opacity:' + (dim ? .28 : 1) + '"' + (on ? ' class="is-hot"' : '') + '><rect class="hit" tabindex="0" x="0" y="' + (cy0 - rh / 2) + '" width="' + VW + '" height="' + rh + '" data-x="' + x(d.d) + '" data-y="' + (cy - 10) + '" data-tip="' + esc(t) + '" aria-label="' + esc(d.nome + ': de ' + num(d.a) + ' para ' + num(d.d)) + '"/>' +
          (on ? '<rect x="0" y="' + (cy0 - rh / 2 + 3) + '" width="' + VW + '" height="' + (rh - 6) + '" rx="8" fill="rgba(185,166,255,.1)" stroke="rgba(185,166,255,.45)"/>' : '') +
          '<text x="' + (nar ? 8 : 10) + '" y="' + (nar ? cy0 - 10 : cy + 5) + '" font-size="' + (nar ? 13 : 14) + '"' + (forte ? ' style="fill:#e9f5ee;font-weight:600"' : '') + '>' + esc(d.nome) + '</text>' +
          '<line class="mark" x1="' + x(d.d) + '" x2="' + x(d.a) + '" y1="' + cy + '" y2="' + cy + '" stroke="' + (forte ? COR.perda : '#5d7266') + '" stroke-width="' + (forte ? 3 : 2) + '"/>' +
          '<circle class="mark" cx="' + x(d.a) + '" cy="' + cy + '" r="6" fill="' + COR.antes + '" stroke="#0b1a14" stroke-width="2"/>' +
          '<circle class="mark" cx="' + x(d.d) + '" cy="' + cy + '" r="7" fill="' + COR.acc + '" stroke="#0b1a14" stroke-width="2"/>' +
          '<text class="val" x="' + (x(d.d) - 12) + '" y="' + (cy + 4) + '" text-anchor="end"' + (forte ? ' style="fill:#ff9aa6"' : '') + '>−' + num(queda) + '</text>' +
          (mostrarMeta && d.meta ? '<line x1="' + x(d.meta) + '" x2="' + x(d.meta) + '" y1="' + (cy - 14) + '" y2="' + (cy + 14) + '" stroke="' + COR.in + '" stroke-width="2.5"/><text x="' + (x(d.meta) + 5) + '" y="' + (cy + 22) + '" font-size="11" fill="#4fe577">meta 3,5</text>' : '') + '</g>';
      });
      svgWrap.innerHTML = fixFill(s + '</svg>');
      bindHits(svgWrap.querySelector('svg'), tip, VW);
    }
    draw();
  }

  /* ================= O PLANO, LIGADO NO AURORA =================
     As 4 ações do documento (seção 4). Ligar uma ação mostra o que ela teria mudado
     nos fatos do Aurora: as mudanças, o pico de horas, a madrugada e a dúvida de sair.
     Não há previsão de nota: só o que a ação teria barrado e a meta que o documento fixa. */
  var ACOES = [
    { n: 1, nome: 'Processo formal de mudança de escopo', curto: 'Escopo formal', desc: 'Só começa com novo valor ou prazo aprovado por escrito; o pedido registra quem absorve as horas.', resolve: 'Processo e pessoas', resp: 'Diretoria, com o gerente de projeto', prazo: '30 dias', dias: 30, medir: '100% das mudanças registradas e renegociadas', causa: true },
    { n: 2, nome: 'Controle semanal de carga', curto: 'Carga semanal', desc: 'Acima de 6 h/semana por 2 semanas, GG é avisada.', resolve: 'Processo e pessoas', resp: 'Gerente de projeto, com GG', prazo: '2 semanas', dias: 14, medir: 'Ninguém acima da regra por mais de 2 semanas' },
    { n: 3, nome: 'Retrospectiva e reconhecimento', curto: 'Reconhecimento', desc: 'Agradecimento nominal ao esforço; vira ritual de fim de projeto.', resolve: 'Pessoas', resp: 'GG e o gerente de projeto', prazo: '2 semanas', dias: 14, medir: 'Reconhecimento em 3,5 ou mais na próxima pesquisa' },
    { n: 4, nome: '1:1 com os 8 membros do squad', curto: 'Conversas 1:1', desc: 'O mesmo roteiro com todo mundo, na mesma semana, para ninguém ser apontado.', resolve: 'Pessoas', resp: 'GG', prazo: '3 semanas', dias: 21, medir: 'Ninguém sai do projeto sem uma conversa antes' }
  ];
  var PROBLEMAS = [
    { k: 'escopo', nome: 'Escopo mudando sem comunicação', dado: 'Comunicação com a gerência −0,8', acao: 1 },
    { k: 'carga', nome: 'Carga insustentável', dado: 'Carga sustentável −1,1', acao: 2 },
    { k: 'reconh', nome: 'Esforço extra sem reconhecimento', dado: 'Reconhecimento −1,2', acao: 3 },
    { k: 'saida', nome: 'Risco de perder membros', dado: 'Comentário 4', acao: 4 }
  ];
  // o que aconteceu no Aurora, semana a semana, e o que cada ação teria feito ali
  var FATOS = MUD.map(function (m) {
    return { sem: 'Sem. ' + m.sem, t: 'Mudança ' + m.n + ': ' + m.nome.charAt(0).toLowerCase() + m.nome.slice(1).replace(' em PDF', ' em PDF'), sem_: m.h + ' h feitas sem cobrar (' + brl(m.h * HORA) + ')' + (m.sem === 8 ? ', na última semana do prazo' : m.sem === 10 ? ', depois do prazo original' : '') + '.',
      acao: 1, com: 'Pedido registrado: só começa com ' + brl(m.h * HORA) + ' ou novo prazo aprovado, e o time fica sabendo antes.' };
  }).concat([
    { sem: 'Sem. 10–12', t: 'Dev A e Dev B a ~15 h/semana', sem_: '2,5 vezes a regra de 6 h, por 3 semanas, sem ninguém de GG saber.', acao: 2, com: 'Na 2ª semana acima de 6 h, GG é avisada: o pico vira conversa durante o projeto, não descoberta na pesquisa. Dev A (7,9 h/sem.) e Dev B (7,5 h/sem.) passaram da regra até na média das 12 semanas.' },
    { sem: 'Entrega', t: 'Uma madrugada antes da entrega', sem_: '“Ninguém comentou nada” (comentário 2).', acao: 3, com: 'Retrospectiva com agradecimento nominal ao esforço, como ritual de fim de projeto.' },
    { sem: 'Depois', t: 'Alguém pensa em sair do projeto', sem_: 'A dúvida só aparece, anônima, na pesquisa (comentário 4).', acao: 4, com: '1:1 com os 8, mesmo roteiro: a dúvida aparece numa conversa, antes da decisão.' }
  ]);
  var plano = [false, false, false, false];
  function planoVivo(container) {
    var wrap = node('<div class="gg-plano"></div>');
    wrap.innerHTML = '<div class="mk-card gg-pl-intro"><p class="mk-label">O plano de ação, ligado no Aurora</p>' +
      '<p class="gg-note">Ligue as ações do documento e veja o que cada uma teria mudado nos fatos do projeto. O placar mostra quais problemas do diagnóstico ficam cobertos e quanto do valor não cobrado volta para a mesa.</p></div>';
    var pres = seg([['nada', 'O que aconteceu'], ['so1', 'Só a prioridade'], ['tudo', 'O plano inteiro']], 'Cenários prontos', 'is-sm');
    wrap.querySelector('.gg-pl-intro').appendChild(pres);
    var grid = node('<div class="gg-pl-grid"></div>');
    var cards = node('<div class="gg-pl-acoes" role="group" aria-label="Ações do plano"></div>');
    ACOES.forEach(function (a, i) {
      var c = node('<div class="gg-pl-acao' + (a.causa ? ' is-causa' : '') + '">' +
        '<button type="button" class="gg-pl-tog" data-i="' + i + '" aria-pressed="false"><span class="gg-pl-n">' + a.n + '</span><span class="gg-pl-nm"><b>' + esc(a.nome) + '</b>' + (a.causa ? '<em>prioridade · ataca a causa</em>' : '') + '</span><span class="gg-pl-sw" aria-hidden="true"></span></button>' +
        '<p>' + esc(a.desc) + '</p>' +
        '<dl><div><dt>Responsável</dt><dd>' + esc(a.resp) + '</dd></div><div><dt>Prazo</dt><dd>' + a.prazo + '</dd></div><div><dt>Como medir</dt><dd>' + esc(a.medir) + '</dd></div></dl></div>');
      if (a.n === 4) c.appendChild(node('<details class="gg-pl-roteiro"><summary>Ver o roteiro da conversa</summary>' +
        '<p><b>Como eu abriria.</b> “Estou conversando com todo mundo do Aurora para entender como foi o projeto para cada pessoa e o que precisa mudar no próximo. Não é avaliação de desempenho. O que você me contar fica entre nós; se algo virar mudança para o time, levo sem dizer de onde veio e só com o seu ok.”</p><ol>' +
        '<li>“Olhando para essas 12 semanas, como foi o projeto para você?” <span>Deixa a pessoa escolher por onde começar.</span></li>' +
        '<li>“Teve algum momento que pesou mais? O que estava acontecendo?” <span>Abre espaço para carga e escopo sem citar a pesquisa.</span></li>' +
        '<li>“Você sentiu que o seu esforço foi visto?” <span>Toca no reconhecimento, a maior queda do clima.</span></li>' +
        '<li>“O que precisaria ser diferente para o próximo semestre valer a pena para você?” <span>Abre espaço para a dúvida sobre continuar, sem perguntar se a pessoa quer sair.</span></li></ol>' +
        '<p class="gg-pl-mini">Não cito a pesquisa nem os comentários e não tento descobrir quem escreveu o quê. O que se repete vai para a diretoria agregado e sem nomes.</p></details>'));
      cards.appendChild(c);
    });
    var lado = node('<div class="gg-pl-lado"><div class="mk-card gg-pl-placar" aria-live="polite"></div><div class="mk-card gg-pl-crono"></div></div>');
    grid.appendChild(cards); grid.appendChild(lado); wrap.appendChild(grid);
    var fatos = node('<div class="mk-card gg-pl-fatos"><p class="mk-label">O Aurora, de novo, com o plano ligado</p><ol></ol></div>');
    wrap.appendChild(fatos);
    container.appendChild(wrap);

    function draw() {
      var liga = plano.filter(Boolean).length, cobertos = PROBLEMAS.filter(function (p) { return plano[p.acao - 1]; }).length;
      var rec = plano[0] ? P.valor * (P.hReal / P.hPlan) - P.valor : 0, perde = (P.hReal - P.hPlan) * HORA - rec;
      cards.querySelectorAll('.gg-pl-tog').forEach(function (b) { var on = plano[+b.dataset.i]; b.setAttribute('aria-pressed', on); b.parentNode.classList.toggle('is-on', on); });
      var cen = liga === 0 ? 'nada' : liga === 4 ? 'tudo' : liga === 1 && plano[0] ? 'so1' : null;
      marcar(pres, cen);
      var aviso = !plano[0] && liga > 0
        ? '<p class="gg-pl-aviso">Sem a ação 1, as outras tratam os sintomas: o próximo squad repete as 180 h não cobradas e a sobrecarga.</p>'
        : liga === 0 ? '<p class="gg-pl-mini">Nenhuma ação ligada: é o Aurora como aconteceu.</p>' : '';
      lado.querySelector('.gg-pl-placar').innerHTML =
        '<p class="mk-label">Placar</p>' +
        '<div class="gg-pl-kpis"><div class="' + (plano[0] ? 'is-ok' : 'is-bad') + '"><b>' + brl(perde) + '</b><span>' + (plano[0] ? 'não cobrado: as 5 mudanças passam pelo processo' : 'de trabalho não cobrado') + '</span></div>' +
        '<div class="' + (cobertos === 4 ? 'is-ok' : '') + '"><b>' + cobertos + ' de 4</b><span>problemas do diagnóstico com uma ação</span></div></div>' +
        '<ul class="gg-pl-probs">' + PROBLEMAS.map(function (p) { var on = plano[p.acao - 1]; return '<li class="' + (on ? 'is-on' : '') + '"><span class="gg-pl-ck" aria-hidden="true">' + (on ? '✓' : '') + '</span><span><b>' + esc(p.nome) + '</b><small>' + esc(p.dado) + (on ? ' · ação ' + p.acao : '') + '</small></span></li>'; }).join('') + '</ul>' + aviso;
      // cronograma: barras de 0 a 30 dias
      var cr = '<p class="mk-label">Cronograma das ações ligadas</p><div class="gg-pl-gantt">';
      ACOES.forEach(function (a, i) { cr += '<div class="gg-pl-row' + (plano[i] ? ' is-on' : '') + '"><span>' + a.n + ' · ' + esc(a.curto) + '</span><i><s style="width:' + (a.dias / 30 * 100) + '%"></s></i><em>' + a.prazo + '</em></div>'; });
      lado.querySelector('.gg-pl-crono').innerHTML = cr + '<div class="gg-pl-eixo"><span>hoje</span><span>2 sem.</span><span>30 dias</span></div></div>';
      fatos.querySelector('ol').innerHTML = FATOS.map(function (f) {
        var on = plano[f.acao - 1];
        return '<li class="' + (on ? 'is-on' : '') + '"><span class="gg-pl-sem">' + f.sem + '</span><div><b>' + esc(f.t) + '</b><p class="gg-pl-antes">' + esc(f.sem_) + '</p>' +
          (on ? '<p class="gg-pl-com"><span>Ação ' + f.acao + '</span>' + esc(f.com) + '</p>' : '') + '</div></li>';
      }).join('');
    }
    cards.querySelectorAll('.gg-pl-tog').forEach(function (b) { b.addEventListener('click', function () { var i = +b.dataset.i; plano[i] = !plano[i]; draw(); }); });
    pres.querySelectorAll('button').forEach(function (b) { b.addEventListener('click', function () { var v = b.dataset.v; plano = ACOES.map(function (a, i) { return v === 'tudo' || (v === 'so1' && i === 0); }); draw(); }); });
    draw();
  }
  function planoMini(container) {   // painel lateral: as 4 ações, cada uma abre o plano já ligada
    var l = node('<ol class="gg-pl-lista"></ol>');
    ACOES.forEach(function (a, i) {
      var b = node('<li><button type="button"><span class="gg-pl-n">' + a.n + '</span><span><b>' + esc(a.nome) + '</b><small>' + esc(a.resp) + ' · ' + a.prazo + '</small></span></button></li>');
      b.querySelector('button').addEventListener('click', function () { plano[i] = true; abrir('plano'); });
      l.appendChild(b);
    });
    container.appendChild(l);
    var bt = node('<div class="mk-actions"><button class="mk-btn" type="button">Ligar o plano no Aurora →</button></div>');
    bt.querySelector('button').addEventListener('click', function () { abrir('plano'); });
    container.appendChild(bt);
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
    var box = node('<div class="mk-pdf ' + (full ? 'is-full' : 'is-compact') + '" tabindex="0" aria-label="Documento da entrega de Gente e Gestão"><p class="mk-pdf-msg">Carregando o documento…</p></div>');
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
    }).catch(function () { box.innerHTML = '<p class="mk-pdf-msg">Não foi possível mostrar o documento aqui. Use o botão para baixar o PDF.</p>'; });
  }
  function pdfButtons(extra) {
    return '<a class="mk-btn is-main" href="' + PDF_URL + '" download="' + PDF_URL + '">Baixar PDF ↓</a>' +
      '<a class="mk-btn" href="' + PDF_URL + '" target="_blank" rel="noopener">Abrir em nova aba ↗</a>' + (extra || '');
  }

  /* ================= TELA CHEIA ================= */
  var root, body, lastFocus, aba = 'conta';
  var TABS = [['conta', 'A conta'], ['plano', 'O plano'], ['pessoas', 'Quem pagou'], ['clima', 'O clima'], ['documento', 'Documento']];
  function build() {
    root = node('<div id="gg" role="dialog" aria-modal="true" aria-labelledby="gg-title" hidden></div>');
    root.innerHTML =
      '<header class="mk-top"><div class="mk-top-row">' +
        '<div><div class="mk-eyebrow">Gente e Gestão · Órbita 4 · Entrega</div><h2 class="mk-title" id="gg-title">Quanto custou o Squad Aurora?</h2></div>' +
        '<div class="mk-top-actions"><a class="mk-btn" href="' + PDF_URL + '" download="' + PDF_URL + '">Baixar PDF ↓</a><button class="mk-btn" type="button" data-close>Voltar ao planeta ✕</button></div></div>' +
        '<div class="mk-tabs" role="tablist" aria-label="Partes da entrega">' + TABS.map(function (t) { return '<button class="mk-tab" type="button" role="tab" data-tab="' + t[0] + '">' + t[1] + '</button>'; }).join('') + '</div></header>' +
      '<div class="mk-body"><div class="mk-wrap" id="gg-content"></div></div>';
    body = root.querySelector('#gg-content');
    root.querySelector('[data-close]').addEventListener('click', fechar);
    root.querySelectorAll('[data-tab]').forEach(function (b) { b.addEventListener('click', function () { setAba(b.dataset.tab); }); });
    document.body.appendChild(root);
    window.addEventListener('keydown', function (e) {
      if (root.hidden) return;
      if (e.key === 'Escape') { fechar(); e.stopImmediatePropagation(); }
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') e.stopImmediatePropagation();
    }, true);
  }
  function hero() {
    var h = node('<div class="mk-hero"></div>');
    h.innerHTML =
      '<div class="mk-card mk-hero-main"><p class="mk-label">✓ Resumo para a diretoria</p>' +
        '<p class="mk-big"><mark>R$&nbsp;7.200</mark> de trabalho que o CITi não cobrou</p>' +
        '<p class="mk-lead">O Squad Aurora entregou com 180 h a mais e 4 semanas de atraso, por 5 mudanças de escopo nunca renegociadas. Dev A e Dev B fizeram 53% das horas extras, e reconhecimento e carga foram as notas que mais caíram. Prioridade: processo formal de mudança de escopo no contrato.</p></div>' +
      '<div class="mk-stats">' +
        '<div class="mk-stat"><b>480 h × 300 h</b><span>horas reais contra as planejadas</span></div>' +
        '<div class="mk-stat"><b>R$ 25/h</b><span>valor efetivo da hora (orçamento: R$ 40/h)</span></div>' +
        '<div class="mk-stat"><b>53%</b><span>das horas extras com Dev A e Dev B</span></div>' +
        '<div class="mk-stat"><b>−1,2</b><span>em “me sinto reconhecido(a)”, a maior queda</span></div></div>';
    return h;
  }
  function setAba(t) {
    aba = t;
    root.querySelectorAll('[data-tab]').forEach(function (b) { b.setAttribute('aria-selected', b.dataset.tab === t ? 'true' : 'false'); });
    contaViews = [];
    body.innerHTML = '';
    body.appendChild(window.CITI_RESUMO ? window.CITI_RESUMO(hero(), t === 'conta' ? 'medio' : 'fino') : hero());
    if (t === 'conta') { simulador(body); passos(body); contrato(body); }
    else if (t === 'plano') planoVivo(body);
    else if (t === 'pessoas') { grafPessoas(body, false); divisaoExtras(body); }
    else if (t === 'clima') {
      grafClima(body);
      body.appendChild(node('<div class="mk-card gg-link"><p class="mk-label">A ponte entre o clima e a conta</p><p>As duas maiores quedas, reconhecimento (−1,2) e carga (−1,1), batem com o pico de horas de Dev A e Dev B nas 3 últimas semanas, quando chegaram a ~15 h/semana. O comentário 2 descreve uma madrugada antes da entrega, o mesmo período. O problema está no processo, não nas pessoas.</p></div>'));
    } else {
      var d = node('<div class="mk-card" style="display:grid;gap:14px"><div class="mk-doc-bar"><p>Desafio de Gente e Gestão · 5 páginas · PDF</p><div class="mk-actions">' + pdfButtons() + '</div></div></div>');
      body.appendChild(d); pdfView(d, true);
    }
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
    contaViews = [];
    if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
  }

  /* ================= PAINEL LATERAL ================= */
  function painel(container) {
    function sec(title) { var s = document.createElement('section'); s.className = 'p-sec'; var h3 = document.createElement('h3'); h3.textContent = title; s.appendChild(h3); container.appendChild(s); return s; }
    var a = sec('Minha resposta');
    a.appendChild(node('<div class="gg-answer"><strong>R$ 7.200 não cobrados</strong><span>480 h de trabalho por R$ 12.000, por 5 mudanças de escopo nunca renegociadas. Prioridade: processo formal de mudança de escopo no contrato.</span></div>'));
    var q = sec('Quem pagou a conta');
    grafPessoas(q, true);
    var b = node('<div class="mk-actions"><button class="mk-btn" type="button">Simular a renegociação →</button></div>');
    b.querySelector('button').addEventListener('click', function () { abrir('conta'); });
    q.appendChild(b);
    var pl = sec('O plano de ação');
    planoMini(pl);
    var e = sec('O documento');
    var dr = node('<div class="mk-docrow"><span class="mk-docrow-ico" aria-hidden="true">PDF</span><span class="mk-docrow-t"><b>Desafio de Gente e Gestão</b><small>5 páginas · PDF original</small></span>' +
      '<div class="mk-actions"><a class="mk-btn" href="' + PDF_URL + '" download="' + PDF_URL + '">Baixar ↓</a><a class="mk-btn" href="' + PDF_URL + '" target="_blank" rel="noopener">Nova aba ↗</a><button class="mk-btn" type="button" data-full>Tela cheia ⤢</button></div></div>');
    dr.querySelector('[data-full]').addEventListener('click', function () { abrir('documento'); });
    e.appendChild(dr);
  }

  window.CITI_ENTREGAS = window.CITI_ENTREGAS || {};
  window.CITI_ENTREGAS.gente = { painel: painel, abrir: abrir };
})();