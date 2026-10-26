/* Entrega do planeta Dados.
   painel(): o resumo que aparece no painel lateral do planeta.
   abrir(etapa): a visão expandida, com a Etapa 1 (planilha + repositório) e a Etapa 2 (assistente).
   Os dados (tabelas, código e testes) ficam no objeto D, gerado a partir da entrega real. */
(function () {
  'use strict';

  // >>> Links da entrega: cole aqui os endereços reais (deixe '' para esconder o botão) <<<
  var LINKS = {
    planilha: 'https://docs.google.com/spreadsheets/d/192QDCdMgVCKMQpIE-rJ3ihYeE07HmJ8L/edit?gid=524573454#gid=524573454',
    testes: 'https://drive.google.com/drive/folders/1ZTCzGj6jovFXG8UEZp9Qgdxu3XlX0E_o?usp=sharing',
    repositorio: ''    // link do repositório no GitHub
  };

  var D = window.DADOS_DATA;   // os dados ficam em entregas/dados-data.js
  var PRINTS = 'entregas/prints/';
  var MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  var MES_CURTO = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function brl(x) { return 'R$ ' + x.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.'); }
  function mesExtenso(ym) { var p = ym.split('-'); return MESES[+p[1] - 1] + ' de ' + p[0]; }
  function mesCurto(ym) { var p = ym.split('-'); return MES_CURTO[+p[1] - 1] + '/' + p[0]; }
  function node(html) { var t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; }

  var best = D.ouro.best;
  var nPrata = D.prata.length, nBronze = D.bronze.length;
  var nOk = D.tests.filter(function (t) { return t.ok; }).length;

  /* ---------- markdown simples (títulos, listas, tabelas, código) ---------- */
  function inline(s) {
    return esc(s).replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, function (m, txt, url) {   // links [texto](url): externos viram link, internos ficam como texto
        return /^https?:/.test(url) ? '<a href="' + url + '" target="_blank" rel="noopener noreferrer">' + txt + '</a>' : txt;
      });
  }
  function mdTable(rows) {
    function cells(r) { return r.replace(/^\s*\||\|\s*$/g, '').split('|').map(function (c) { return c.trim(); }); }
    var head = cells(rows[0]), body = rows.slice(2).map(cells);
    return '<div class="dx-md-table"><table><thead><tr>' + head.map(function (c) { return '<th>' + inline(c) + '</th>'; }).join('') +
      '</tr></thead><tbody>' + body.map(function (r) { return '<tr>' + r.map(function (c) { return '<td>' + inline(c) + '</td>'; }).join('') + '</tr>'; }).join('') +
      '</tbody></table></div>';
  }
  function md(src) {
    var L = src.replace(/\r/g, '').split('\n'), out = [], i = 0, m, buf;
    var block = /^(#{1,4}\s|\||```|\s*[-*]\s|\d+\.\s)/;
    while (i < L.length) {
      var line = L[i];
      if (/^```/.test(line)) { buf = []; i++; while (i < L.length && !/^```/.test(L[i])) buf.push(L[i++]); i++; out.push('<pre><code>' + esc(buf.join('\n')) + '</code></pre>'); continue; }
      if ((m = line.match(/^(#{1,4})\s+(.*)$/))) { out.push('<h' + m[1].length + '>' + inline(m[2]) + '</h' + m[1].length + '>'); i++; continue; }
      if (/^\|/.test(line)) { buf = []; while (i < L.length && /^\|/.test(L[i])) buf.push(L[i++]); out.push(mdTable(buf)); continue; }
      if (/^\s*[-*]\s+/.test(line)) {
        buf = []; while (i < L.length && /^\s*[-*]\s+/.test(L[i])) buf.push(L[i++].replace(/^\s*[-*]\s+/, ''));
        out.push('<ul>' + buf.map(function (it) { return '<li>' + inline(it).replace(/^\[ \]\s*/, '<span class="dx-cb" aria-hidden="true"></span>').replace(/^\[x\]\s*/i, '<span class="dx-cb is-on" aria-hidden="true">✓</span>') + '</li>'; }).join('') + '</ul>'); continue;
      }
      if (/^\d+\.\s+/.test(line)) { buf = []; while (i < L.length && /^\d+\.\s+/.test(L[i])) buf.push(L[i++].replace(/^\d+\.\s+/, '')); out.push('<ol>' + buf.map(function (it) { return '<li>' + inline(it) + '</li>'; }).join('') + '</ol>'); continue; }
      if (!line.trim()) { i++; continue; }
      buf = []; while (i < L.length && L[i].trim() && !block.test(L[i])) buf.push(L[i++]);
      out.push('<p>' + inline(buf.join(' ')) + '</p>');
    }
    return out.join('');
  }

  /* ---------- destaque de sintaxe (Python) ---------- */
  var KW = /^(def|class|return|if|elif|else|for|in|import|from|as|with|not|and|or|is|None|True|False|raise|try|except|lambda|while|pass)$/;
  function hlPy(src) {
    var re = /(#[^\n]*)|([rfbuRFBU]{0,2}(?:"""[\s\S]*?"""|'''[\s\S]*?'''|"(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*'))|([A-Za-z_][A-Za-z0-9_]*)|(\d+(?:\.\d+)?)/g;
    var out = '', last = 0, m, afterDef = false;
    while ((m = re.exec(src))) {
      out += esc(src.slice(last, m.index)); last = re.lastIndex;
      if (m[1]) out += '<span class="c">' + esc(m[1]) + '</span>';
      else if (m[2]) out += '<span class="s">' + esc(m[2]) + '</span>';
      else if (m[3]) {
        if (KW.test(m[3])) { out += '<span class="k">' + m[3] + '</span>'; afterDef = m[3] === 'def' || m[3] === 'class'; continue; }
        out += afterDef ? '<span class="f">' + m[3] + '</span>' : m[3];
      } else if (m[4]) out += '<span class="n">' + m[4] + '</span>';
      afterDef = false;
    }
    return out + esc(src.slice(last));
  }
  function hlPlain(src) { return src.split('\n').map(function (l) { return /^\s*#/.test(l) ? '<span class="c">' + esc(l) + '</span>' : esc(l); }).join('\n'); }
  function codeBlock(src, lang) {
    var html = (lang === 'py' ? hlPy(src) : hlPlain(src)).replace(/\n$/, '').split('\n');
    return '<pre class="dx-code" tabindex="0">' + html.map(function (l, i) { return '<div class="ln"><i>' + (i + 1) + '</i><span>' + (l || ' ') + '</span></div>'; }).join('') + '</pre>';
  }

  /* ---------- problemas da Bronze, a partir das linhas registradas no Log ---------- */
  var CAT = {
    vazia: { label: 'Linhas vazias', color: 'var(--dx-p-vazia)', row: true },
    cidade: { label: 'Cidades', color: 'var(--dx-p-cidade)', col: 3 },
    valor: { label: 'Valores em texto', color: 'var(--dx-p-valor)', col: 5 },
    data: { label: 'Datas em texto', color: 'var(--dx-p-data)', col: 1 },
    dup: { label: 'Duplicadas', color: 'var(--dx-p-dup)', row: true }
  };
  var flags = {};   // flags[linha] = { vazia:1, cidade:1, ... }
  D.log.slice(1).forEach(function (r) {
    if (!r.cat) return;
    (r.c[2].match(/\d+/g) || []).forEach(function (n) { (flags[n] = flags[n] || {})[r.cat] = 1; });
  });
  function countCat(c) { return Object.keys(flags).filter(function (n) { return flags[n][c]; }).length; }

  /* ---------- estado da visão expandida ---------- */
  var S = { stage: 1, sub1: 'planilha', sub2: 'testes', sheet: 'Bronze', only: null, target: null, file: 'README.md', mdRaw: false };
  var root, body, lastFocus, lbFocus, lb, lbIndex = 0;
  var ALL_PRINTS = [];
  D.tests.forEach(function (t) { t.prints.forEach(function (p, k) { ALL_PRINTS.push({ src: p, cap: 'Pergunta ' + t.n + ' · Rodada ' + (k + 1), q: t.q }); }); });

  function build() {
    root = node('<div id="dx" role="dialog" aria-modal="true" aria-labelledby="dx-title" hidden></div>');
    var links = '';
    if (LINKS.planilha) links += '<a class="dx-btn" href="' + esc(LINKS.planilha) + '" target="_blank" rel="noopener noreferrer">Planilha no Sheets ↗</a>';
    if (LINKS.testes) links += '<a class="dx-btn" href="' + esc(LINKS.testes) + '" target="_blank" rel="noopener noreferrer">Prints no Drive ↗</a>';
    if (LINKS.repositorio) links += '<a class="dx-btn" href="' + esc(LINKS.repositorio) + '" target="_blank" rel="noopener noreferrer">Repositório ↗</a>';
    root.innerHTML =
      '<header class="dx-top">' +
        '<div class="dx-top-row">' +
          '<div><div class="dx-eyebrow">Dados · Órbita 1 · Entrega</div><h2 class="dx-title" id="dx-title">Do dado bagunçado ao primeiro assistente</h2></div>' +
          '<div class="dx-top-actions">' + links + '<button class="dx-btn" type="button" data-close>Voltar ao planeta ✕</button></div>' +
        '</div>' +
        '<div class="dx-stages" role="tablist" aria-label="Etapas do desafio">' +
          '<button class="dx-stage-tab" type="button" role="tab" data-stage="1"><span class="dx-n">Etapa 1</span><strong>Do dado bagunçado ao dado útil</strong><span class="dx-t">Google Sheets · pipeline em Python</span></button>' +
          '<button class="dx-stage-tab is-s2" type="button" role="tab" data-stage="2"><span class="dx-n">Etapa 2</span><strong>Primeiro assistente</strong><span class="dx-t">Gemini Gems · manual de manutenção</span></button>' +
        '</div>' +
      '</header>' +
      '<div class="dx-body"><div class="dx-wrap" id="dx-content"></div></div>';
    body = root.querySelector('#dx-content');
    // ao rolar para baixo, o cabeçalho encolhe (sem sumir); volta ao tamanho normal perto do topo
    var scroller = root.querySelector('.dx-body');
    scroller.addEventListener('scroll', function () {
      var y = scroller.scrollTop, compact = root.classList.contains('is-compact');
      if (!compact && y > 60) root.classList.add('is-compact');
      else if (compact && y < 20) root.classList.remove('is-compact');
    }, { passive: true });
    root.querySelector('[data-close]').addEventListener('click', fechar);
    root.querySelectorAll('[data-stage]').forEach(function (b) { b.addEventListener('click', function () { setStage(+b.dataset.stage); }); });
    document.body.appendChild(root);

    lb = node('<div id="dx-lb" role="dialog" aria-modal="true" aria-label="Print do teste" hidden>' +
      '<div class="dx-lb-top"><div><strong id="dx-lb-cap"></strong><br><span id="dx-lb-q"></span></div><button class="dx-btn" type="button" data-lbclose>Fechar ✕</button></div>' +
      '<div class="dx-lb-stage"><img id="dx-lb-img" alt=""></div>' +
      '<div class="dx-lb-nav"><button class="dx-btn" type="button" data-lbstep="-1">← Anterior</button><button class="dx-btn" type="button" data-lbstep="1">Próximo →</button></div></div>');
    lb.querySelector('[data-lbclose]').addEventListener('click', fecharPrint);
    lb.querySelectorAll('[data-lbstep]').forEach(function (b) { b.addEventListener('click', function () { abrirPrint(lbIndex + +b.dataset.lbstep); }); });
    lb.addEventListener('click', function (e) { if (e.target === lb || e.target.classList.contains('dx-lb-stage')) fecharPrint(); });
    document.body.appendChild(lb);

    // teclado: captura antes do site, para Esc e setas agirem só aqui enquanto a entrega estiver aberta
    window.addEventListener('keydown', function (e) {
      if (root.hidden) return;
      if (!lb.hidden) {
        if (e.key === 'Escape') fecharPrint();
        else if (e.key === 'ArrowRight') abrirPrint(lbIndex + 1);
        else if (e.key === 'ArrowLeft') abrirPrint(lbIndex - 1);
        else return;
      } else if (e.key === 'Escape') fechar();
      else if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      e.stopImmediatePropagation();
    }, true);
  }

  function setStage(n) {
    S.stage = n; root.dataset.stage = n;
    root.querySelectorAll('[data-stage]').forEach(function (b) { b.setAttribute('aria-selected', +b.dataset.stage === n ? 'true' : 'false'); });
    body.innerHTML = '';
    if (n === 1) etapa1(); else etapa2();
    root.querySelector('.dx-body').scrollTop = 0;
  }

  function subtabs(items, current, onPick) {
    var bar = node('<div class="dx-subtabs" role="tablist"></div>');
    items.forEach(function (it) {
      var b = node('<button class="dx-subtab" type="button" role="tab"></button>');
      b.textContent = it[1]; b.setAttribute('aria-selected', it[0] === current ? 'true' : 'false');
      b.addEventListener('click', function () { bar.querySelectorAll('.dx-subtab').forEach(function (x) { x.setAttribute('aria-selected', 'false'); }); b.setAttribute('aria-selected', 'true'); onPick(it[0]); });
      bar.appendChild(b);
    });
    return bar;
  }

  /* ================= ETAPA 1 ================= */
  function etapa1() {
    var hero = node('<div class="dx-hero"></div>');
    hero.innerHTML =
      '<div class="dx-card dx-hero-main is-answer"><p class="dx-label">✓ Resposta para a diretoria</p>' +
        '<p class="dx-big dx-answer-big"><mark>' + esc(best.city) + '</mark> em ' + mesExtenso(best.month) + '</p>' +
        '<p class="dx-lead">Foi a cidade que mais comprou da Metalúrgica Mezzalira, com ' + brl(best.value) + ' em pedidos no mês. ' +
        'O valor vem da aba Ouro e foi conferido de forma independente pelo pipeline em Python.</p></div>' +
      '<div class="dx-stats">' +
        '<div class="dx-stat"><b>' + nBronze + ' → ' + nPrata + '</b><span>linhas da Bronze até a Prata</span></div>' +
        '<div class="dx-stat"><b>5</b><span>tipos de problema corrigidos</span></div>' +
        '<div class="dx-stat"><b>' + (D.log.length - 1) + '</b><span>registros no Log, com justificativas</span></div>' +
        '<div class="dx-stat"><b>' + brl(D.ouro.grand) + '</b><span>faturamento total, igual na Ouro e no Log</span></div>' +
      '</div>';
    body.appendChild(hero);

    var flow = node('<div class="dx-flow"></div>');
    [['Bronze', '#c58a52', 'Cópia intocada', nBronze + ' linhas, exatamente como chegaram'],
     ['Prata', '#c9d1d6', 'Dados corrigidos', nPrata + ' linhas limpas, com cada decisão no Log'],
     ['Ouro', '#f2c14e', 'Faturamento por cidade e mês', 'Tabela dinâmica que responde à diretoria']].forEach(function (s) {
      var b = node('<button class="dx-step" type="button"><span class="dx-medal"></span><strong></strong><span></span></button>');
      b.style.setProperty('--m', s[1]); b.querySelector('.dx-medal').textContent = s[0];
      b.querySelector('strong').textContent = s[2]; b.querySelector('span:last-child').textContent = s[3];
      b.addEventListener('click', function () { S.sub1 = 'planilha'; S.sheet = s[0]; S.only = null; S.target = null; setStage(1); scrollToPane(); });
      flow.appendChild(b);
    });
    body.appendChild(flow);

    var pane = node('<div id="dx-pane1" style="display:grid;gap:14px"></div>');
    body.appendChild(subtabs([['planilha', 'Planilha'], ['repo', 'Repositório'], ['decisoes', 'Decisões']], S.sub1, function (k) { S.sub1 = k; render1(pane); }));
    body.appendChild(pane);
    render1(pane);
  }
  function scrollToPane() { var p = document.getElementById('dx-pane1'); if (p) p.scrollIntoView({ block: 'start' }); }
  function render1(pane) {
    pane.innerHTML = '';
    if (S.sub1 === 'planilha') pane.appendChild(sheet());
    else if (S.sub1 === 'repo') pane.appendChild(repo());
    else pane.appendChild(decisoes());
  }

  function sheet() {
    var wrap = node('<div class="dx-sheet"></div>');
    var tabs = node('<div class="dx-sheet-tabs" role="tablist" aria-label="Abas da planilha"></div>');
    [['Bronze', '#c58a52'], ['Prata', '#c9d1d6'], ['Log', '#8fa39a'], ['Ouro', '#f2c14e']].forEach(function (t) {
      var b = node('<button class="dx-sheet-tab" type="button" role="tab"><i></i><span></span></button>');
      b.style.setProperty('--sw', t[1]); b.querySelector('span').textContent = t[0];
      b.setAttribute('aria-selected', S.sheet === t[0] ? 'true' : 'false');
      b.addEventListener('click', function () { S.sheet = t[0]; S.only = null; S.target = null; repaint(); });
      tabs.appendChild(b);
    });
    wrap.appendChild(tabs);
    var inner = node('<div></div>');
    wrap.appendChild(inner);
    function repaint() {
      tabs.querySelectorAll('.dx-sheet-tab').forEach(function (b) { b.setAttribute('aria-selected', b.textContent === S.sheet ? 'true' : 'false'); });
      inner.innerHTML = '';
      if (S.sheet === 'Bronze') bronze(inner, repaint);
      else if (S.sheet === 'Prata') prata(inner);
      else if (S.sheet === 'Log') logTab(inner, repaint);
      else ouro(inner);
    }
    repaint();
    return wrap;
  }

  function bronze(inner, repaint) {
    var info = node('<div class="dx-sheet-info"><p>A planilha original, sem nenhuma alteração. Os destaques mostram os problemas encontrados; clique numa categoria para ver só ela.</p><div class="dx-legend"></div></div>');
    var leg = info.querySelector('.dx-legend');
    Object.keys(CAT).forEach(function (c) {
      var b = node('<button class="dx-chip" type="button"><i></i><span></span></button>');
      b.style.setProperty('--pc', CAT[c].color);
      b.querySelector('span').textContent = CAT[c].label + ' · ' + countCat(c);
      b.setAttribute('aria-pressed', S.only === c ? 'true' : 'false');
      b.addEventListener('click', function () { S.only = S.only === c ? null : c; S.target = null; repaint(); });
      leg.appendChild(b);
    });
    inner.appendChild(info);
    var heads = ['Pedido', 'Data', 'Cliente', 'Cidade', 'Produto', 'Valor (R$)'];
    var h = '<div class="dx-table-wrap"><table class="dx-t"><thead><tr><th class="rn">#</th>' + heads.map(function (x, i) { return '<th' + (i === 0 || i === 5 ? ' class="num"' : '') + '>' + x + '</th>'; }).join('') + '</tr></thead><tbody>';
    D.bronze.forEach(function (r) {
      var f = flags[r.n] || {}, on = function (c) { return f[c] && (!S.only || S.only === c); };
      var trc = (on('vazia') ? ' f-vazia' : '') + (on('dup') ? ' f-dup' : '') + (S.target && S.target.indexOf(r.n) >= 0 ? ' is-target' : '');
      h += '<tr id="dx-b' + r.n + '" class="' + trc.trim() + '"><td class="rn">' + r.n + '</td>';
      r.v.forEach(function (v, i) {
        var cls = [];
        if (i === 0 || i === 5) cls.push('num');
        ['cidade', 'valor', 'data'].forEach(function (c) { if (CAT[c].col === i && on(c)) cls.push('f-' + c); });
        var extra = (i === 0 && on('dup') && D.dupOf[r.n]) ? '<span class="dx-dupnote">cópia da linha ' + D.dupOf[r.n] + '</span>' : '';
        h += '<td class="' + cls.join(' ') + '">' + esc(v) + extra + '</td>';
      });
      h += '</tr>';
    });
    inner.insertAdjacentHTML('beforeend', h + '</tbody></table></div>');
    if (S.target) {
      var first = inner.querySelector('#dx-b' + S.target[0]);
      if (first) setTimeout(function () { first.scrollIntoView({ block: 'center' }); }, 30);
    }
  }

  function prata(inner) {
    inner.appendChild(node('<div class="dx-sheet-info"><p>Os mesmos pedidos depois das correções: cidades padronizadas, valores e datas convertidos, sem linhas vazias nem duplicadas.</p></div>'));
    var heads = ['Pedido', 'Data', 'Cliente', 'Cidade', 'Produto', 'Valor (R$)'];
    var h = '<div class="dx-table-wrap"><table class="dx-t"><thead><tr><th class="rn">#</th>' + heads.map(function (x, i) { return '<th' + (i === 0 || i === 5 ? ' class="num"' : '') + '>' + x + '</th>'; }).join('') + '</tr></thead><tbody>';
    D.prata.forEach(function (r) { h += '<tr><td class="rn">' + r.n + '</td>' + r.v.map(function (v, i) { return '<td' + (i === 0 || i === 5 ? ' class="num"' : '') + '>' + esc(v) + '</td>'; }).join('') + '</tr>'; });
    inner.insertAdjacentHTML('beforeend', h + '</tbody></table></div>');
  }

  function logTab(inner, repaint) {
    inner.appendChild(node('<div class="dx-sheet-info"><p>Cada correção feita na Prata, na ordem em que foi aplicada. Clique num número de linha para vê-la destacada na Bronze.</p></div>'));
    var head = D.log[0].c;
    var tw = node('<div class="dx-table-wrap"><table class="dx-t"><thead><tr></tr></thead><tbody></tbody></table></div>');
    head.forEach(function (x) { var th = document.createElement('th'); th.textContent = x; tw.querySelector('tr').appendChild(th); });
    var tb = tw.querySelector('tbody');
    D.log.slice(1).forEach(function (r) {
      var tr = document.createElement('tr');
      r.c.forEach(function (v, i) {
        var td = document.createElement('td');
        if (i === 2 && /\d/.test(v)) {
          var box = node('<div class="dx-rows"></div>'), nums = v.match(/\d+/g);
          nums.forEach(function (n) {
            var b = node('<button class="dx-rowchip" type="button"></button>'); b.textContent = n;
            b.setAttribute('aria-label', 'Ver linha ' + n + ' na Bronze');
            b.addEventListener('click', function () { S.sheet = 'Bronze'; S.only = r.cat; S.target = nums.map(Number); repaint(); });
            box.appendChild(b);
          });
          td.appendChild(box);
        } else {
          td.textContent = v;
          if (i !== 4) td.className = 'wrap';
          else td.className = 'num';
        }
        tr.appendChild(td);
      });
      tb.appendChild(tr);
    });
    inner.appendChild(tw);
  }

  function ouro(inner) {
    var O = D.ouro, max = O.best.value;
    inner.appendChild(node('<div class="dx-sheet-info"><p>Tabela dinâmica montada sobre a Prata: faturamento de cada cidade em cada mês. A célula destacada responde à pergunta da diretoria.</p></div>'));
    var h = '<div class="dx-table-wrap"><table class="dx-t dx-ouro"><thead><tr><th>Cidade</th>' + O.months.map(function (m) { return '<th class="num">' + mesCurto(m) + '</th>'; }).join('') + '<th class="num">Total</th></tr></thead><tbody>';
    O.rows.forEach(function (r) {
      h += '<tr><td>' + esc(r.city) + '</td>';
      r.vals.forEach(function (v, i) {
        var isBest = r.city === O.best.city && O.months[i] === O.best.month;
        var a = (v / max * 0.32).toFixed(3);
        h += '<td class="num heat' + (isBest ? ' is-best' : '') + '" style="background:rgba(82,214,224,' + a + ')">' + brl(v) + '</td>';
      });
      h += '<td class="num total">' + brl(r.total) + '</td></tr>';
    });
    h += '<tr class="total"><td>Total</td>' + O.totals.map(function (v) { return '<td class="num">' + brl(v) + '</td>'; }).join('') + '<td class="num">' + brl(O.grand) + '</td></tr>';
    inner.insertAdjacentHTML('beforeend', h + '</tbody></table></div>');
    inner.appendChild(node('<div class="dx-check"><span><b>✓</b> Total geral igual à reconciliação do Log: ' + brl(O.grand) + '</span><span><b>✓</b> Mesmo resultado calculado em Python (src/ouro.py)</span></div>'));
  }

  /* repositório */
  function treeOf(files) {
    var rootDir = { dirs: {}, files: [] };
    files.forEach(function (f) {
      var parts = f.path.split('/'), d = rootDir;
      for (var i = 0; i < parts.length - 1; i++) d = d.dirs[parts[i]] = d.dirs[parts[i]] || { dirs: {}, files: [] };
      d.files.push(f);
    });
    return rootDir;
  }
  var ICON_DIR = '<svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true"><path d="M1.5 3.5h4l1.5 1.5h7.5v8h-13z" fill="none" stroke="currentColor" stroke-width="1.2"/></svg>';
  var ICON_FILE = '<svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true"><path d="M3.5 1.5h6l3 3v10h-9z M9.5 1.5v3h3" fill="none" stroke="currentColor" stroke-width="1.2"/></svg>';
  function repo() {
    var box = node('<div class="dx-repo"></div>');
    var nFiles = D.repo.length;
    box.innerHTML = '<div class="dx-repo-head"><span class="dx-repo-name">' + esc(D.repoName) + '</span><span class="dx-badge">main</span><span class="dx-badge">' + nFiles + ' arquivos</span><span class="dx-spacer"></span>' +
      (LINKS.repositorio ? '<a class="dx-btn" href="' + esc(LINKS.repositorio) + '" target="_blank" rel="noopener noreferrer">Abrir no GitHub ↗</a>' : '<span class="dx-badge">prévia do repositório</span>') + '</div>' +
      '<nav class="dx-tree" aria-label="Arquivos do repositório"></nav><div class="dx-view"></div>';
    var nav = box.querySelector('.dx-tree'), view = box.querySelector('.dx-view');
    function walk(d, depth, prefix) {
      Object.keys(d.dirs).sort().forEach(function (name) {
        var b = node('<button type="button" class="is-dir"></button>');
        b.style.setProperty('--d', depth); b.innerHTML = ICON_DIR + '<span></span>'; b.querySelector('span').textContent = name;
        nav.appendChild(b);
        var holder = node('<div></div>'); nav.appendChild(holder);
        b.setAttribute('aria-expanded', 'true');
        b.addEventListener('click', function () { var open = b.getAttribute('aria-expanded') === 'true'; b.setAttribute('aria-expanded', open ? 'false' : 'true'); holder.hidden = open; });
        var save = nav; nav = holder; walk(d.dirs[name], depth + 1, prefix + name + '/'); nav = save;
      });
      d.files.slice().sort(function (a, b) { return a.path.localeCompare(b.path); }).forEach(function (f) {
        var b = node('<button type="button"></button>');
        b.style.setProperty('--d', depth); b.innerHTML = ICON_FILE + '<span></span>'; b.querySelector('span').textContent = f.path.split('/').pop();
        b.dataset.path = f.path;
        b.addEventListener('click', function () { S.file = f.path; S.mdRaw = false; show(); });
        nav.appendChild(b);
      });
    }
    walk(treeOf(D.repo), 0, '');
    function show() {
      box.querySelectorAll('.dx-tree [data-path]').forEach(function (b) { b.setAttribute('aria-current', b.dataset.path === S.file ? 'true' : 'false'); });
      var f = D.repo.filter(function (x) { return x.path === S.file; })[0] || D.repo[0];
      view.innerHTML = '';
      var head = node('<div class="dx-view-head"><b></b><span class="dx-meta"></span></div>');
      head.querySelector('b').textContent = f.path;
      view.appendChild(head);
      if (f.kind === 'code') {
        var lines = f.content.replace(/\n$/, '').split('\n').length;
        head.querySelector('.dx-meta').textContent = (f.lang === 'py' ? 'Python' : f.lang === 'md' ? 'Markdown' : 'Texto') + ' · ' + lines + (lines === 1 ? ' linha' : ' linhas');
        if (f.lang === 'md') {
          var tg = node('<div class="dx-toggle"><button type="button" data-raw="0">Visualizar</button><button type="button" data-raw="1">Código</button></div>');
          tg.querySelectorAll('button').forEach(function (b) {
            b.setAttribute('aria-pressed', (+b.dataset.raw === 1) === S.mdRaw ? 'true' : 'false');
            b.addEventListener('click', function () { S.mdRaw = b.dataset.raw === '1'; show(); });
          });
          head.appendChild(tg);
          view.insertAdjacentHTML('beforeend', S.mdRaw ? codeBlock(f.content, 'md') : '<div class="dx-md">' + md(f.content) + '</div>');
        } else if (!f.content.trim()) {
          view.appendChild(node('<div class="dx-bin"><p>Arquivo vazio: marca a pasta <code>src</code> como um pacote Python.</p></div>'));
        } else view.insertAdjacentHTML('beforeend', codeBlock(f.content, f.lang));
      } else if (f.kind === 'image') {
        head.querySelector('.dx-meta').textContent = 'Imagem';
        var iv = node('<div class="dx-imgview"><img alt="" loading="lazy"></div>');
        iv.querySelector('img').src = PRINTS + f.src; iv.querySelector('img').alt = 'Print do teste ' + f.src.replace('.png', '');
        view.appendChild(iv);
      } else if (f.kind === 'sheet') {
        head.querySelector('.dx-meta').textContent = 'Planilha do Excel';
        var bs = node('<div class="dx-bin"><p>A planilha original de pedidos, que vira a aba Bronze. Ela está aberta para navegação na aba Planilha.</p><button class="dx-btn" type="button">Ver a aba Bronze</button></div>');
        bs.querySelector('button').addEventListener('click', function () { S.sub1 = 'planilha'; S.sheet = 'Bronze'; S.only = null; S.target = null; setStage(1); scrollToPane(); });
        view.appendChild(bs);
      } else {
        head.querySelector('.dx-meta').textContent = 'PDF';
        view.appendChild(node('<div class="dx-bin"><p>Material fornecido pelo CITi para a Etapa 2. Ele não é reproduzido aqui.</p></div>'));
      }
    }
    show();
    return box;
  }

  function decisoes() {
    var g = node('<div class="dx-decisions"></div>');
    D.decisoes.forEach(function (d) {
      var c = node('<div class="dx-card dx-decision"><strong></strong><span></span></div>');
      c.querySelector('strong').textContent = d[0].replace(/[“”"]/g, '"');
      c.querySelector('span').textContent = d[1];
      g.appendChild(c);
    });
    var wrap = node('<div style="display:grid;gap:12px"></div>');
    wrap.appendChild(node('<p class="dx-mini">As escolhas que guiaram o pipeline, do README do repositório.</p>'));
    wrap.appendChild(g);
    return wrap;
  }

  /* ================= ETAPA 2 ================= */
  function etapa2() {
    var counts = { manual: 0, fora: 0, papel: 0 };
    D.tests.forEach(function (t) { counts[t.type]++; });
    var hero = node('<div class="dx-hero"></div>');
    hero.innerHTML =
      '<div class="dx-card dx-hero-main"><p class="dx-label">Resultado dos testes</p>' +
        '<p class="dx-big dx-big-sm"><em>' + nOk + ' de ' + D.tests.length + '</em> perguntas aprovadas</p>' +
        '<p class="dx-lead">Um Gem no Gemini que responde aos operadores só com base no Manual de Procedimentos de Manutenção. Cada pergunta foi feita duas vezes, sempre em conversa nova.</p>' +
        '<div class="dx-types"><span class="dx-type">' + counts.manual + ' com resposta no manual</span><span class="dx-type t-fora">' + counts.fora + ' fora do manual</span><span class="dx-type t-papel">' + counts.papel + ' tentativa de tirar do papel</span></div></div>' +
      '<div style="display:grid;gap:10px;align-content:start">' +
        '<div class="dx-stats"><div class="dx-stat"><b>' + (D.tests.length * 2) + '</b><span>respostas conferidas (2 rodadas)</span></div><div class="dx-stat"><b>Gemini Flash</b><span>modelo usado nos testes</span></div></div>' +
        '<div class="dx-callout"><strong>A ponte entre as etapas.</strong> A pergunta 2 pede justamente a resposta da Etapa 1 (' + esc(best.city) + ', em ' + mesExtenso(best.month) + '). ' +
        'Como isso não está no manual, o assistente precisava dizer que não sabe, e disse, nas duas rodadas.</div>' +
      '</div>';
    body.appendChild(hero);
    var pane = node('<div style="display:grid;gap:14px"></div>');
    body.appendChild(subtabs([['testes', 'Testes'], ['instrucoes', 'Instruções do Gem'], ['historico', 'Histórico e observações']], S.sub2, function (k) { S.sub2 = k; render2(pane); }));
    body.appendChild(pane);
    render2(pane);
  }
  function render2(pane) {
    pane.innerHTML = '';
    if (S.sub2 === 'testes') {
      var g = node('<div class="dx-tests"></div>');
      D.tests.forEach(function (t) {
        var c = node('<article class="dx-card dx-test"></article>');
        c.innerHTML = '<div class="dx-test-top"><span class="dx-qn">' + t.n + '</span><span class="dx-type t-' + t.type + '">' + esc(t.typeLabel) + '</span>' +
          '<span class="dx-pass">' + (t.r1 ? '✓' : '✗') + ' rodada 1 · ' + (t.r2 ? '✓' : '✗') + ' rodada 2</span></div>' +
          '<p class="dx-q">“' + esc(t.q) + '”</p><p class="dx-exp"><b>Esperado:</b> ' + esc(t.exp) + '</p><div class="dx-shots"></div>' +
          (t.note ? '<p class="dx-test-note">Observação: ' + esc(t.note) + '</p>' : '');
        var shots = c.querySelector('.dx-shots');
        t.prints.forEach(function (p, k) {
          var b = node('<button class="dx-shot" type="button"><img alt="" loading="lazy"><span></span></button>');
          b.querySelector('img').src = PRINTS + p;
          b.querySelector('img').alt = 'Resposta do assistente à pergunta ' + t.n + ', rodada ' + (k + 1);
          b.querySelector('span').textContent = 'Rodada ' + (k + 1) + ' · ampliar';
          b.addEventListener('click', function () { abrirPrint(ALL_PRINTS.map(function (x) { return x.src; }).indexOf(p)); });
          shots.appendChild(b);
        });
        g.appendChild(c);
      });
      pane.appendChild(g);
    } else if (S.sub2 === 'instrucoes') {
      var card = node('<div class="dx-card"><div class="dx-doc-actions"><p class="dx-label" style="margin:0">Versão final das instruções</p><button class="dx-btn" type="button">Copiar instruções</button></div><div class="dx-md is-doc"></div></div>');
      card.querySelector('.dx-md').innerHTML = md(D.instrucoes);
      var cp = card.querySelector('button');
      cp.addEventListener('click', function () {
        var done = function () { cp.textContent = 'Copiado'; setTimeout(function () { cp.textContent = 'Copiar instruções'; }, 1800); };
        try { navigator.clipboard.writeText(D.instrucoes).then(done, function () { selectDoc(); }); } catch (e) { selectDoc(); }
      });
      function selectDoc() { var r = document.createRange(); r.selectNodeContents(card.querySelector('.dx-md')); var s = window.getSelection(); s.removeAllRanges(); s.addRange(r); cp.textContent = 'Texto selecionado'; }
      pane.appendChild(card);
    } else {
      var h = node('<div class="dx-card"><div class="dx-md is-doc"></div></div>');
      h.querySelector('.dx-md').innerHTML = md(D.historico);
      pane.appendChild(h);
    }
  }

  /* visualizador de prints */
  function abrirPrint(i) {
    lbIndex = (i + ALL_PRINTS.length) % ALL_PRINTS.length;
    var p = ALL_PRINTS[lbIndex];
    var img = lb.querySelector('#dx-lb-img');
    img.src = PRINTS + p.src; img.alt = p.cap;
    lb.querySelector('#dx-lb-cap').textContent = p.cap + ' (' + (lbIndex + 1) + ' de ' + ALL_PRINTS.length + ')';
    lb.querySelector('#dx-lb-q').textContent = '“' + p.q + '”';
    if (lb.hidden) { lbFocus = document.activeElement; lb.hidden = false; lb.querySelector('[data-lbclose]').focus(); }
  }
  function fecharPrint() { if (lb.hidden) return; lb.hidden = true; if (lbFocus && lbFocus.focus) lbFocus.focus({ preventScroll: true }); }

  function abrir(etapa) {
    if (!root) build();
    lastFocus = document.activeElement;
    root.hidden = false;
    setStage(etapa || S.stage || 1);
    requestAnimationFrame(function () { root.classList.add('is-open'); });
    root.querySelector('[data-close]').focus({ preventScroll: true });
  }
  function fechar() {
    if (!root || root.hidden) return;
    fecharPrint();
    root.classList.remove('is-open');
    setTimeout(function () { root.hidden = true; }, 280);
    if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
  }

  /* ---------- resumo no painel lateral do planeta ---------- */
  function painel(container) {
    function sec(title) { var s = document.createElement('section'); s.className = 'p-sec'; var h3 = document.createElement('h3'); h3.textContent = title; s.appendChild(h3); container.appendChild(s); return s; }
    var a = sec('Resposta para a diretoria');
    a.appendChild(node('<div class="dx-answer"><span class="dx-city">' + esc(best.city) + '</span><span class="dx-when">em ' + mesExtenso(best.month) + '</span><span class="dx-value">' + brl(best.value) + ' em pedidos no mês</span></div>'));
    a.appendChild(node('<p class="dx-mini">A cidade que mais comprou da Metalúrgica Mezzalira, e em qual mês.</p>'));
    var e = sec('As duas etapas');
    var s1 = node('<button class="dx-stage-card" type="button"><span class="dx-n">Etapa 1 · Google Sheets e Python</span><strong>Do dado bagunçado ao dado útil</strong><span class="dx-d">' + nBronze + ' → ' + nPrata + ' linhas, 5 problemas corrigidos, abas Bronze, Prata, Log e Ouro</span></button>');
    var s2 = node('<button class="dx-stage-card is-s2" type="button"><span class="dx-n">Etapa 2 · Gemini Gems</span><strong>Primeiro assistente</strong><span class="dx-d">' + nOk + ' de ' + D.tests.length + ' perguntas aprovadas, nas duas rodadas de teste</span></button>');
    s1.addEventListener('click', function () { abrir(1); });
    s2.addEventListener('click', function () { abrir(2); });
    e.appendChild(s1); e.appendChild(s2);
    var x = node('<button class="dx-expand" type="button"><svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M9.5 2.5h4v4M6.5 13.5h-4v-4M13.5 2.5l-5 5M2.5 13.5l5-5" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>Abrir entrega completa</button>');
    x.addEventListener('click', function () { abrir(1); });
    container.appendChild(x);
  }

  window.CITI_ENTREGAS = window.CITI_ENTREGAS || {};
  window.CITI_ENTREGAS.dados = { painel: painel, abrir: abrir };
})();
