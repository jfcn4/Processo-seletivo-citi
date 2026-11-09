/* Entrega do planeta Dev: a API da Folhagem & Cia.
   painel(): resumo no painel lateral.
   abrir(aba): tela cheia com a loja rodando, o console da API, o repositório e o relatório.
   A loja e o console usam a mesma API simulada (entregas/dev/api-simulada.js), então uma venda feita
   no console aparece na loja. */
(function () {
  'use strict';

  var LINKS = { repositorio: 'https://github.com/jfcn4/desafio-citi-dev/tree/desafio/joao-felipe' };
  var PDF_URL = 'Relatorio_Dev_Joao_Felipe.pdf';   // na mesma pasta do index.html
  var LOJA_URL = 'entregas/dev/loja.html';
  var PDFJS = window.MK_PDFJS_BASE || 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/';
  var D = window.DEV_DATA;
  if (!window.FolhagemApi || !D) return;
  var API = window.FOLHAGEM_API = window.FolhagemApi.criar({ chave: 'folhagem-simulada' });

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function node(html) { var t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; }
  function brl(c) { return 'R$ ' + (c / 100).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.'); }
  var ICON_EXPAND = '<svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M9.5 2.5h4v4M6.5 13.5h-4v-4M13.5 2.5l-5 5M2.5 13.5l5-5" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>';

  /* ================= markdown e destaque de código ================= */
  function inline(s) {
    return esc(s).replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, function (m, txt, url) { return /^https?:/.test(url) ? '<a href="' + url + '" target="_blank" rel="noopener noreferrer">' + txt + '</a>' : txt; })
      .replace(/(^|\s)(https?:\/\/[^\s<]+)/g, '$1<a href="$2" target="_blank" rel="noopener noreferrer">$2</a>');
  }
  function mdTable(rows) {
    function cells(r) { return r.replace(/^\s*\||\|\s*$/g, '').split('|').map(function (c) { return c.trim(); }); }
    var head = cells(rows[0]), body = rows.slice(2).map(cells);
    return '<div class="dx-md-table"><table><thead><tr>' + head.map(function (c) { return '<th>' + inline(c) + '</th>'; }).join('') +
      '</tr></thead><tbody>' + body.map(function (r) { return '<tr>' + r.map(function (c) { return '<td>' + inline(c) + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table></div>';
  }
  function md(src) {
    var L = src.replace(/\r/g, '').split('\n'), out = [], i = 0, m, buf;
    var block = /^(#{1,4}\s|\||```|\s*[-*]\s|\d+\.\s|---\s*$)/;
    while (i < L.length) {
      var line = L[i];
      if (/^```/.test(line)) { buf = []; i++; while (i < L.length && !/^```/.test(L[i])) buf.push(L[i++]); i++; out.push('<pre><code>' + esc(buf.join('\n')) + '</code></pre>'); continue; }
      if ((m = line.match(/^(#{1,4})\s+(.*)$/))) { out.push('<h' + m[1].length + '>' + inline(m[2]) + '</h' + m[1].length + '>'); i++; continue; }
      if (/^---\s*$/.test(line)) { out.push('<hr>'); i++; continue; }
      if (/^\|/.test(line)) { buf = []; while (i < L.length && /^\|/.test(L[i])) buf.push(L[i++]); out.push(mdTable(buf)); continue; }
      if (/^\s*[-*]\s+/.test(line)) { buf = []; while (i < L.length && /^\s*[-*]\s+/.test(L[i])) buf.push(L[i++].replace(/^\s*[-*]\s+/, '')); out.push('<ul>' + buf.map(function (it) { return '<li>' + inline(it) + '</li>'; }).join('') + '</ul>'); continue; }
      if (/^\d+\.\s+/.test(line)) { buf = []; while (i < L.length && /^\d+\.\s+/.test(L[i])) buf.push(L[i++].replace(/^\d+\.\s+/, '')); out.push('<ol>' + buf.map(function (it) { return '<li>' + inline(it) + '</li>'; }).join('') + '</ol>'); continue; }
      if (!line.trim()) { i++; continue; }
      buf = []; while (i < L.length && L[i].trim() && !block.test(L[i])) buf.push(L[i++]);
      out.push('<p>' + inline(buf.join(' ')) + '</p>');
    }
    return out.join('');
  }
  // envolve o token numa classe, linha por linha (comentários e textos podem ocupar várias linhas)
  function wrap(cls, tok) { return tok.split('\n').map(function (x) { return '<span class="' + cls + '">' + esc(x) + '</span>'; }).join('\n'); }
  var KW_TS = /^(const|let|var|function|return|if|else|for|of|in|import|from|export|as|async|await|new|typeof|type|try|catch|throw|switch|case|default|break|continue|null|undefined|true|false|class|extends|interface|this|while|do|void|enum|model)$/;
  function hl(src, lang) {
    var com = { ts: '//[^\\n]*|/\\*[\\s\\S]*?\\*/', prisma: '//[^\\n]*', sql: '--[^\\n]*', html: '<!--[\\s\\S]*?-->', json: '' }[lang];
    if (com === undefined) com = '#[^\\n]*';
    var str = lang === 'ts' ? '`(?:\\\\[\\s\\S]|[^`\\\\])*`|"(?:\\\\.|[^"\\\\\\n])*"|\'(?:\\\\.|[^\'\\\\\\n])*\'' : '"(?:\\\\.|[^"\\\\\\n])*"|\'(?:\\\\.|[^\'\\\\\\n])*\'';
    var re = new RegExp((com ? '(' + com + ')' : '($^)') + '|(' + str + ')|([A-Za-z_$][A-Za-z0-9_$]*)|(\\b\\d+(?:\\.\\d+)?\\b)', 'g');
    var out = '', last = 0, m, afterDef = false;
    while ((m = re.exec(src))) {
      if (m[0] === '') { re.lastIndex++; continue; }
      out += esc(src.slice(last, m.index)); last = re.lastIndex;
      if (m[1]) out += wrap('c', m[1]);
      else if (m[2]) out += wrap('s', m[2]);
      else if (m[3]) {
        var kw = (lang === 'ts' || lang === 'prisma') && KW_TS.test(m[3]);
        if (kw) { out += '<span class="k">' + m[3] + '</span>'; afterDef = /^(function|const|model|enum|type)$/.test(m[3]); continue; }
        out += afterDef ? '<span class="f">' + m[3] + '</span>' : esc(m[3]);
      } else if (m[4]) out += '<span class="n">' + m[4] + '</span>';
      afterDef = false;
    }
    return out + esc(src.slice(last));
  }
  function codeBlock(src, lang) {
    var lines = hl(src, lang).replace(/\n$/, '').split('\n');
    return '<pre class="dx-code" tabindex="0">' + lines.map(function (l, i) { return '<div class="ln"><i>' + (i + 1) + '</i><span>' + (l || ' ') + '</span></div>'; }).join('') + '</pre>';
  }

  /* ================= PDF (pdf.js, carregado só quando precisa) ================= */
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
    var box = node('<div class="mk-pdf ' + (full ? 'is-full' : 'is-compact') + '" tabindex="0" aria-label="Relatório da entrega de Dev"><p class="mk-pdf-msg">Carregando o relatório…</p></div>');
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
    }).catch(function () { box.innerHTML = '<p class="mk-pdf-msg">Não foi possível mostrar o relatório aqui. Use o botão para baixar o PDF.</p>'; });
  }
  function pdfButtons() {
    return '<a class="mk-btn is-main" href="' + PDF_URL + '" download="' + PDF_URL + '">Baixar PDF ↓</a>' +
      '<a class="mk-btn" href="' + PDF_URL + '" target="_blank" rel="noopener">Abrir só o PDF ↗</a>';
  }

  /* ================= requisições e respostas ================= */
  var MET = { GET: 'get', POST: 'post', PATCH: 'patch', DELETE: 'delete' };
  function jsonHtml(v) {
    if (v === null || v === undefined) return '<span class="dv-j-null">(sem corpo)</span>';
    var s = JSON.stringify(v, null, 2);
    return esc(s).replace(/(&quot;(?:[^&]|&(?!quot;))*?&quot;)(\s*:)?|\b(true|false|null)\b|(-?\b\d+(?:\.\d+)?\b)/g, function (m, str, colon, lit, num) {
      if (str) return colon ? '<span class="dv-j-key">' + str + '</span>' + colon : '<span class="dv-j-str">' + str + '</span>';
      if (lit) return '<span class="dv-j-lit">' + lit + '</span>';
      return '<span class="dv-j-num">' + num + '</span>';
    });
  }
  function statusPill(s) { return '<span class="dv-status s' + String(s)[0] + '">' + s + '</span>'; }
  function refreshLoja() {
    var fr = document.querySelector('.dv-frame');
    try { if (fr && fr.contentWindow && fr.contentWindow.carregarPlantas) { fr.contentWindow.carregarPlantas(); fr.contentWindow.carregarTotais(); } } catch (e) { /* loja ainda carregando */ }
  }

  /* ================= bateria de testes (porta de tests/plantas.test.ts) ================= */
  var VALIDA = { nome: 'Costela-de-adão', especie: 'Monstera deliciosa', preco: 8990, estoque: 12, luminosidade: 'MEIA_SOMBRA', petFriendly: false, regaACadaDias: 3 };
  function mix(a, b) { var o = {}, k; for (k in a) o[k] = a[k]; for (k in b) o[k] = b[k]; return o; }
  function req(api, met, path, body) { return api.requisitar(met, path, body === undefined ? null : (typeof body === 'string' ? body : JSON.stringify(body))); }
  function criarPlanta(api, d) { return req(api, 'POST', '/plantas', mix(VALIDA, d || {})).then(function (r) { return r.body; }); }
  function eq(a, b, msg) { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error((msg || 'esperado') + ' ' + JSON.stringify(b) + ', veio ' + JSON.stringify(a)); }
  function st(r, s) { eq(r.status, s, 'status'); return r; }
  function nomes(r) { return r.body.map(function (p) { return p.nome; }); }
  var TESTES = [];
  function T(grupo, nome, fn) { TESTES.push({ grupo: grupo, nome: nome, fn: fn }); }
  var G1 = 'POST /plantas';
  T(G1, 'cadastra uma planta válida (201)', function (a) { return req(a, 'POST', '/plantas', VALIDA).then(function (r) { st(r, 201); eq(r.body.nome, VALIDA.nome); }); });
  T(G1, 'aceita estoque 0 e petFriendly false (201)', function (a) { return req(a, 'POST', '/plantas', mix(VALIDA, { estoque: 0, petFriendly: false })).then(function (r) { st(r, 201); eq(r.body.estoque, 0); eq(r.body.petFriendly, false); }); });
  [['sem um campo', { nome: undefined }], ['preco 0', { preco: 0 }], ['estoque -1', { estoque: -1 }], ['preco como texto', { preco: '8990' }], ['preco decimal', { preco: 89.9 }],
   ['luminosidade fora do enum', { luminosidade: 'LUA' }], ['regaACadaDias 0', { regaACadaDias: 0 }], ['nome vazio', { nome: '   ' }], ['petFriendly como texto', { petFriendly: 'true' }]].forEach(function (c) {
    T(G1, 'recusa cadastro ' + c[0] + ' (400)', function (a) { return req(a, 'POST', '/plantas', mix(VALIDA, c[1])).then(function (r) { st(r, 400); eq(typeof r.body.message, 'string'); }); });
  });
  T(G1, 'ignora campos desconhecidos no body', function (a) { return req(a, 'POST', '/plantas', mix(VALIDA, { id: 999, hackeado: true })).then(function (r) { st(r, 201); if (r.body.id === 999) throw new Error('usou o id do body'); eq(r.body.hackeado, undefined); }); });
  var G2 = 'GET /plantas/:id';
  T(G2, 'busca uma planta existente (200)', function (a) { return criarPlanta(a).then(function (p) { return req(a, 'GET', '/plantas/' + p.id); }).then(function (r) { st(r, 200); eq(r.body.nome, VALIDA.nome); }); });
  T(G2, 'retorna 404 para id inexistente', function (a) { return req(a, 'GET', '/plantas/9999').then(function (r) { st(r, 404); }); });
  ['abc', '0', '-1', '1.5'].forEach(function (id) { T(G2, 'retorna 400 para id ' + id, function (a) { return req(a, 'GET', '/plantas/' + id).then(function (r) { st(r, 400); }); }); });
  var G3 = 'PATCH /plantas/:id';
  T(G3, 'edita só o preço, sem mudar o resto (200)', function (a) { var p; return criarPlanta(a).then(function (x) { p = x; return req(a, 'PATCH', '/plantas/' + p.id, { preco: 9990 }); }).then(function (r) { st(r, 200); eq(r.body.preco, 9990); eq(r.body.nome, p.nome); eq(r.body.estoque, p.estoque); }); });
  T(G3, 'recusa valor inválido (400)', function (a) { return criarPlanta(a).then(function (p) { return req(a, 'PATCH', '/plantas/' + p.id, { preco: -5 }); }).then(function (r) { st(r, 400); }); });
  T(G3, 'recusa body sem nenhum campo válido (400)', function (a) { return criarPlanta(a).then(function (p) { return req(a, 'PATCH', '/plantas/' + p.id, {}); }).then(function (r) { st(r, 400); }); });
  T(G3, 'retorna 404 para id inexistente', function (a) { return req(a, 'PATCH', '/plantas/9999', { preco: 100 }).then(function (r) { st(r, 404); }); });
  var G4 = 'GET /plantas (filtros)';
  function tres(a) {
    return criarPlanta(a, { nome: 'Jiboia', luminosidade: 'SOMBRA', petFriendly: false, preco: 3000 })
      .then(function () { return criarPlanta(a, { nome: 'Maranta', luminosidade: 'MEIA_SOMBRA', petFriendly: true, preco: 5000 }); })
      .then(function () { return criarPlanta(a, { nome: 'Alecrim', luminosidade: 'SOL_PLENO', petFriendly: true, preco: 1500 }); });
  }
  function T4(nome, fn) { T(G4, nome, function (a) { return tres(a).then(function () { return fn(a); }); }); }
  T4('lista todas sem filtro (200)', function (a) { return req(a, 'GET', '/plantas').then(function (r) { st(r, 200); eq(r.body.length, 3); }); });
  T4('filtra por luminosidade', function (a) { return req(a, 'GET', '/plantas?luminosidade=SOMBRA').then(function (r) { st(r, 200); eq(nomes(r), ['Jiboia']); }); });
  T4('filtra por petFriendly=false sem confundir com filtro ausente', function (a) { return req(a, 'GET', '/plantas?petFriendly=false').then(function (r) { st(r, 200); eq(r.body.length, 1); }); });
  T4('filtra pelos dois juntos', function (a) { return req(a, 'GET', '/plantas?luminosidade=SOL_PLENO&petFriendly=true').then(function (r) { st(r, 200); eq(nomes(r), ['Alecrim']); }); });
  T4('filtro válido sem resultado retorna 200 com []', function (a) { return req(a, 'GET', '/plantas?luminosidade=SOMBRA&petFriendly=true').then(function (r) { st(r, 200); eq(r.body, []); }); });
  ['luminosidade=LUA', 'petFriendly=sim', 'ordem=estoque'].forEach(function (q) { T4('filtro inválido ' + q + ' retorna 400', function (a) { return req(a, 'GET', '/plantas?' + q).then(function (r) { st(r, 400); }); }); });
  T4('busca por nome sem diferenciar maiúsculas (bônus)', function (a) { return req(a, 'GET', '/plantas?nome=MARAN').then(function (r) { st(r, 200); eq(nomes(r), ['Maranta']); }); });
  T4('ordena por preço e por nome (bônus)', function (a) {
    return req(a, 'GET', '/plantas?ordem=preco').then(function (r) { eq(r.body.map(function (p) { return p.preco; }), [1500, 3000, 5000]); return req(a, 'GET', '/plantas?ordem=nome'); })
      .then(function (r) { eq(nomes(r), ['Alecrim', 'Jiboia', 'Maranta']); });
  });
  var G5 = 'POST /plantas/:id/venda';
  T(G5, 'vende o que tem (200) e diminui o estoque', function (a) { return criarPlanta(a, { estoque: 5 }).then(function (p) { return req(a, 'POST', '/plantas/' + p.id + '/venda', { quantidade: 2 }); }).then(function (r) { st(r, 200); eq(r.body.estoque, 3); }); });
  T(G5, 'recusa vender mais do que tem (400) sem alterar o estoque', function (a) {
    var p; return criarPlanta(a, { estoque: 2 }).then(function (x) { p = x; return req(a, 'POST', '/plantas/' + p.id + '/venda', { quantidade: 3 }); })
      .then(function (r) { st(r, 400); return req(a, 'GET', '/plantas/' + p.id); }).then(function (r) { eq(r.body.estoque, 2); });
  });
  [0, -1, 1.5, '2'].forEach(function (q) { T(G5, 'recusa quantidade ' + JSON.stringify(q) + ' (400)', function (a) { return criarPlanta(a).then(function (p) { return req(a, 'POST', '/plantas/' + p.id + '/venda', { quantidade: q }); }).then(function (r) { st(r, 400); }); }); });
  T(G5, 'retorna 404 para planta inexistente', function (a) { return req(a, 'POST', '/plantas/9999/venda', { quantidade: 1 }).then(function (r) { st(r, 404); }); });
  T(G5, 'duas vendas simultâneas do último vaso: só uma passa', function (a) {
    var p; return criarPlanta(a, { estoque: 1 }).then(function (x) { p = x; return Promise.all([req(a, 'POST', '/plantas/' + p.id + '/venda', { quantidade: 1 }), req(a, 'POST', '/plantas/' + p.id + '/venda', { quantidade: 1 })]); })
      .then(function (rs) { eq([rs[0].status, rs[1].status].sort(), [200, 400]); return req(a, 'GET', '/plantas/' + p.id); }).then(function (r) { eq(r.body.estoque, 0); });
  });
  var G6 = 'GET /plantas/estoque/valor-total';
  T(G6, 'retorna zeros com a loja vazia (200)', function (a) { return req(a, 'GET', '/plantas/estoque/valor-total').then(function (r) { st(r, 200); eq(r.body, { valorTotalEmCentavos: 0, totalDeVasos: 0 }); }); });
  T(G6, 'soma preco × estoque e o total de vasos', function (a) {
    return criarPlanta(a, { preco: 8990, estoque: 12 }).then(function () { return criarPlanta(a, { preco: 2500, estoque: 4 }); }).then(function () { return criarPlanta(a, { preco: 4000, estoque: 0 }); })
      .then(function () { return req(a, 'GET', '/plantas/estoque/valor-total'); }).then(function (r) { st(r, 200); eq(r.body, { valorTotalEmCentavos: 8990 * 12 + 2500 * 4, totalDeVasos: 16 }); });
  });
  T('GET /plantas/esgotadas (bônus)', 'lista só as plantas com estoque zero', function (a) {
    return criarPlanta(a, { nome: 'Com estoque', estoque: 3 }).then(function () { return criarPlanta(a, { nome: 'Esgotada', estoque: 0 }); })
      .then(function () { return req(a, 'GET', '/plantas/esgotadas'); }).then(function (r) { st(r, 200); eq(nomes(r), ['Esgotada']); });
  });
  var G8 = 'casos de borda';
  T(G8, 'JSON malformado retorna 400 com mensagem em JSON', function (a) { return req(a, 'POST', '/plantas', '{"nome": "x",').then(function (r) { st(r, 400); eq(typeof r.body.message, 'string'); }); });
  ['preco', 'estoque', 'regaACadaDias'].forEach(function (c) { T(G8, c + ' acima do limite do banco retorna 400, não 500', function (a) { var o = {}; o[c] = 99999999999; return req(a, 'POST', '/plantas', mix(VALIDA, o)).then(function (r) { st(r, 400); eq(r.body.campo, c); }); }); });
  T(G8, 'id acima do limite do banco retorna 400, não 500', function (a) { return req(a, 'GET', '/plantas/99999999999').then(function (r) { st(r, 400); }); });
  T(G8, 'quantidade acima do limite do banco retorna 400, não 500', function (a) { return criarPlanta(a).then(function (p) { return req(a, 'POST', '/plantas/' + p.id + '/venda', { quantidade: 99999999999 }); }).then(function (r) { st(r, 400); }); });
  T(G8, 'rota inexistente retorna 404 em JSON', function (a) { return req(a, 'GET', '/plantinhas').then(function (r) { st(r, 404); eq(typeof r.body.message, 'string'); }); });
  T('DELETE /plantas/:id', 'deleta (204), depois busca (404) e deleta de novo (404)', function (a) {
    var p; return criarPlanta(a).then(function (x) { p = x; return req(a, 'DELETE', '/plantas/' + p.id); }).then(function (r) { st(r, 204); return req(a, 'GET', '/plantas/' + p.id); })
      .then(function (r) { st(r, 404); return req(a, 'DELETE', '/plantas/' + p.id); }).then(function (r) { st(r, 404); });
  });

  /* ================= estado da tela cheia ================= */
  var root, body, lastFocus, aba = 'loja', arquivo = 'README.md', mdRaw = false;
  var TABS = [['loja', 'Loja ao vivo'], ['api', 'Testar a API'], ['raiox', 'Raio-x da venda'], ['repo', 'Repositório'], ['relatorio', 'Relatório']];

  function build() {
    root = node('<div id="dv" role="dialog" aria-modal="true" aria-labelledby="dv-title" hidden></div>');
    root.innerHTML =
      '<header class="mk-top"><div class="mk-top-row">' +
        '<div><div class="mk-eyebrow">Dev · Órbita 3 · Entrega</div><h2 class="mk-title" id="dv-title">A API da Folhagem &amp; Cia</h2></div>' +
        '<div class="mk-top-actions"><a class="mk-btn" href="' + LINKS.repositorio + '" target="_blank" rel="noopener noreferrer">GitHub ↗</a><button class="mk-btn" type="button" data-close>Voltar ao planeta ✕</button></div></div>' +
        '<div class="mk-tabs" role="tablist" aria-label="Partes da entrega">' + TABS.map(function (t) { return '<button class="mk-tab" type="button" role="tab" data-tab="' + t[0] + '">' + t[1] + '</button>'; }).join('') + '</div></header>' +
      '<div class="mk-body"><div class="mk-wrap" id="dv-content"></div></div>';
    body = root.querySelector('#dv-content');
    root.querySelector('[data-close]').addEventListener('click', fechar);
    root.querySelectorAll('[data-tab]').forEach(function (b) { b.addEventListener('click', function () { setAba(b.dataset.tab); }); });
    document.body.appendChild(root);
    // cabeçalho fixo, sem encolher ao rolar; só mede a altura para reservar o espaço no topo do conteúdo
    var scroller = root.querySelector('.mk-body'), topEl = root.querySelector('.mk-top');
    root.measureHead = function () {
      if (root.hidden) return;
      root.style.setProperty('--dv-head', topEl.offsetHeight + 'px');
      topEl.style.right = (scroller.offsetWidth - scroller.clientWidth) + 'px';   // não cobre a barra de rolagem
    };
    window.addEventListener('resize', root.measureHead);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(root.measureHead);
    window.addEventListener('keydown', function (e) {
      if (root.hidden) return;
      if (e.key === 'Escape') {
        // com algo em tela cheia, o Esc só sai da tela cheia (tratado em telaCheia), sem fechar a entrega
        if (document.fullscreenElement || document.webkitFullscreenElement || root.querySelector('.is-full')) return;
        fechar(); e.stopImmediatePropagation();
      }
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') e.stopImmediatePropagation();   // não troca de planeta
    }, true);
  }
  function hero() {
    var h = node('<div class="mk-hero dv-hero"></div>');
    h.innerHTML =
      '<div class="mk-card mk-hero-main"><p class="mk-label">✓ O que entreguei</p>' +
        '<p class="mk-big">A API da <mark>Folhagem&nbsp;&amp;&nbsp;Cia</mark>, completa e testada</p>' +
        '<p class="mk-lead">As 7 rotas obrigatórias, os 4 bônus, 51 testes automatizados e um painel web que consome a própria API. A venda nunca deixa o estoque negativo, nem quando duas pessoas compram o último vaso ao mesmo tempo.</p></div>' +
      '<div class="mk-stats">' +
        '<div class="mk-stat"><b>7 de 7</b><span>rotas obrigatórias, com todas as regras</span></div>' +
        '<div class="mk-stat"><b>4 de 4</b><span>bônus: busca, ordem, esgotadas e seed</span></div>' +
        '<div class="mk-stat"><b>51</b><span>testes automatizados (Vitest + Supertest)</span></div>' +
        '<div class="mk-stat"><b>1 operação</b><span>para conferir e diminuir o estoque na venda</span></div></div>';
    return h;
  }
  function setAba(t, alvo) {
    aba = t;
    root.querySelectorAll('[data-tab]').forEach(function (b) { b.setAttribute('aria-selected', b.dataset.tab === t ? 'true' : 'false'); });
    body.innerHTML = '';
    body.appendChild(window.CITI_RESUMO ? window.CITI_RESUMO(hero(), t === 'loja' ? 'medio' : 'fino') : hero());
    if (t === 'loja') abaLoja(); else if (t === 'api') abaApi(alvo); else if (t === 'raiox') raioX(body); else if (t === 'repo') abaRepo(); else abaRelatorio();
    var sc = root.querySelector('.mk-body');
    sc.scrollTop = 0;
    root.classList.remove('is-compact');
    if (alvo && t !== 'api') setTimeout(function () { var el = body.querySelector(alvo); if (el) el.scrollIntoView({ block: 'start', behavior: 'smooth' }); }, 60);
  }

  /* ---------- tela cheia: usa a API do navegador; se não houver, cobre a janela com CSS ---------- */
  function telaCheia(alvo, btn) {
    function atual() { return document.fullscreenElement || document.webkitFullscreenElement; }
    function marca() { var on = atual() === alvo || alvo.classList.contains('is-full'); btn.textContent = on ? 'Sair da tela cheia ✕' : 'Tela cheia ⤢'; alvo.classList.toggle('is-fs', atual() === alvo); }
    btn.addEventListener('click', function () {
      if (atual() === alvo) { (document.exitFullscreen || document.webkitExitFullscreen).call(document); return; }
      if (alvo.classList.contains('is-full')) { alvo.classList.remove('is-full'); marca(); return; }
      var req = alvo.requestFullscreen || alvo.webkitRequestFullscreen;
      if (req) { try { var pr = req.call(alvo); if (pr && pr.catch) pr.catch(function () { alvo.classList.add('is-full'); marca(); }); } catch (e) { alvo.classList.add('is-full'); marca(); } }
      else { alvo.classList.add('is-full'); marca(); }
    });
    document.addEventListener('fullscreenchange', marca); document.addEventListener('webkitfullscreenchange', marca);
    // Esc sai primeiro da tela cheia de CSS, sem fechar a entrega
    window.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      if (alvo.classList.contains('is-full')) { alvo.classList.remove('is-full'); marca(); e.stopImmediatePropagation(); }
      else if (atual() === alvo) { (document.exitFullscreen || document.webkitExitFullscreen).call(document); e.stopImmediatePropagation(); }
    }, true);
  }

  /* ---------- aba: loja ao vivo ---------- */
  function abaLoja() {
    var c = node('<div class="mk-card dv-loja"></div>');
    c.innerHTML =
      '<div class="dv-bar"><div><p class="mk-label" style="margin:0 0 4px">O painel web do repositório, rodando</p>' +
        '<p class="dv-note">É o <code>public/index.html</code> sem nenhuma alteração. A única diferença: em vez do servidor Express com PostgreSQL, quem responde às chamadas é uma API simulada no navegador, com as mesmas regras do <code>PlantaController.ts</code>. Pode mexer à vontade.</p></div>' +
        '<div class="mk-actions"><button class="mk-btn" type="button" data-reset>Restaurar as 10 plantas do seed</button><button class="mk-btn is-main" type="button" data-full>Tela cheia ⤢</button><a class="mk-btn" href="' + LOJA_URL + '" target="_blank" rel="noopener">Abrir em nova aba ↗</a></div></div>' +
      '<div class="dv-frame-wrap"><iframe class="dv-frame" src="' + LOJA_URL + '" title="Painel web da Folhagem & Cia, rodando com a API simulada" loading="lazy" allow="fullscreen" allowfullscreen></iframe></div>' +
      '<div class="dv-try"><p class="mk-label" style="margin:0">Experimente</p><ul>' +
        '<li><b>Venda mais vasos do que existem.</b> A API responde 400, o estoque não muda e a planta balança no jardim.</li>' +
        '<li><b>Cadastre uma planta com estoque 0.</b> Ela é aceita (o erro clássico do <code>!campo</code> recusaria) e nasce murcha.</li>' +
        '<li><b>Filtre por pet-friendly “Não”.</b> O filtro <code>false</code> não se confunde com filtro ausente.</li>' +
        '<li><b>No jardim,</b> cada planta fica na faixa de luz de que precisa, e mais vasos viram mais folhas.</li></ul></div>';
    telaCheia(c.querySelector('.dv-frame-wrap'), c.querySelector('[data-full]'));
    c.querySelector('[data-reset]').addEventListener('click', function () {
      API.restaurar();
      var fr = c.querySelector('iframe'); try { fr.contentWindow.location.reload(); } catch (e) { fr.src = LOJA_URL; }
    });
    body.appendChild(c);
  }

  /* ---------- aba: testar a API ---------- */
  var PRESETS = [
    ['Cadastro', 'POST', '/plantas', { nome: 'Begônia', especie: 'Begonia maculata', preco: 5990, estoque: 0, luminosidade: 'MEIA_SOMBRA', petFriendly: false, regaACadaDias: 3 }, 201, 'planta válida, com estoque 0 e petFriendly false'],
    ['Cadastro', 'POST', '/plantas', { nome: 'Sem preço', especie: 'X', estoque: 2, luminosidade: 'SOMBRA', petFriendly: true, regaACadaDias: 2 }, 400, 'sem um campo obrigatório'],
    ['Cadastro', 'POST', '/plantas', { nome: 'Fícus', especie: 'Ficus lyrata', preco: '8990', estoque: 3, luminosidade: 'SOL_PLENO', petFriendly: false, regaACadaDias: 5 }, 400, 'preco como texto ("8990")'],
    ['Cadastro', 'POST', '/plantas', { nome: 'Fícus', especie: 'Ficus lyrata', preco: 8990, estoque: 3, luminosidade: 'LUA', petFriendly: false, regaACadaDias: 5 }, 400, 'luminosidade fora do enum'],
    ['Busca', 'GET', '/plantas/1', null, 200, 'um id que existe'],
    ['Busca', 'GET', '/plantas/9999', null, 404, 'um id que não existe'],
    ['Busca', 'GET', '/plantas/abc', null, 400, 'um id que não é número'],
    ['Edição', 'PATCH', '/plantas/1', { preco: 9490 }, 200, 'só o preço; o resto não muda'],
    ['Edição', 'PATCH', '/plantas/1', { estoque: -1 }, 400, 'valor inválido'],
    ['Filtros', 'GET', '/plantas?luminosidade=MEIA_SOMBRA&petFriendly=true', null, 200, 'os dois filtros juntos'],
    ['Filtros', 'GET', '/plantas?luminosidade=LUA', null, 400, 'filtro inválido'],
    ['Filtros', 'GET', '/plantas?nome=MARAN&ordem=preco', null, 200, 'bônus: nome sem maiúsculas e ordem'],
    ['Venda', 'POST', '/plantas/2/venda', { quantidade: 2 }, 200, 'vender o que tem'],
    ['Venda', 'POST', '/plantas/2/venda', { quantidade: 999 }, 400, 'vender mais do que tem (o estoque não muda)'],
    ['Venda', 'POST', '/plantas/2/venda', { quantidade: 0 }, 400, 'quantidade 0'],
    ['Estoque', 'GET', '/plantas/estoque/valor-total', null, 200, 'soma preco × estoque e os vasos'],
    ['Estoque', 'GET', '/plantas/esgotadas', null, 200, 'bônus: só as plantas com estoque 0'],
    ['Remoção', 'DELETE', '/plantas/9999', null, 404, 'deletar um id que não existe']
  ];
  var PASSOS_API = [['req', 'Uma requisição de cada vez'], ['race', 'Duas compras ao mesmo tempo'], ['suite', 'Os ' + TESTES.length + ' testes']];
  var GRUPOS_API = ['Cadastro', 'Busca', 'Edição', 'Filtros', 'Venda', 'Estoque', 'Remoção'];
  var apiPasso = 'req', apiGrupo = 'Cadastro';
  function abaApi(alvo) {
    if (alvo === '#dv-race') apiPasso = 'race'; else if (alvo === '#dv-suite') apiPasso = 'suite';
    var nav = node('<div class="dv-steps" role="tablist" aria-label="Partes do teste da API"></div>');
    PASSOS_API.forEach(function (x, k) {
      var b = node('<button type="button" role="tab" class="dv-step"><i>' + (k + 1) + '</i><span></span></button>');
      b.querySelector('span').textContent = x[1]; b.dataset.p = x[0];
      b.addEventListener('click', function () { apiPasso = x[0]; mostra(true); });
      nav.appendChild(b);
    });
    body.appendChild(nav);
    var palco = node('<div class="dv-step-body"></div>'); body.appendChild(palco);
    var feitos = {};
    function mostra(rolar) {
      nav.querySelectorAll('.dv-step').forEach(function (b) { b.setAttribute('aria-selected', b.dataset.p === apiPasso ? 'true' : 'false'); });
      palco.querySelectorAll('[data-passo]').forEach(function (el) { el.hidden = el.dataset.passo !== apiPasso; });
      if (!feitos[apiPasso]) {
        var el = apiPasso === 'req' ? requisicoes() : apiPasso === 'race' ? corrida() : bateria();
        el.dataset.passo = apiPasso; feitos[apiPasso] = el;
        var k = PASSOS_API.map(function (x) { return x[0]; }).indexOf(apiPasso), prox = PASSOS_API[k + 1];
        if (prox) {
          var nx = node('<div class="dv-next"><button class="mk-btn" type="button">Próximo: ' + esc(prox[1].toLowerCase()) + ' →</button></div>');
          nx.querySelector('button').addEventListener('click', function () { apiPasso = prox[0]; mostra(true); });
          el.appendChild(nx);
        }
        palco.appendChild(el);
      }
      if (rolar) { var sc = root.querySelector('.mk-body'); var y = nav.getBoundingClientRect().top - sc.getBoundingClientRect().top + sc.scrollTop - 12; if (sc.scrollTop > y) sc.scrollTo({ top: y }); }
    }
    mostra(false);
  }
  // passo 1: escolha uma rota, clique numa requisição pronta ou monte a sua
  function requisicoes() {
    var w = node('<div class="dv-apiw"></div>');
    w.innerHTML = '<div class="dv-apiw-top"><p class="dv-note">A tabela de testes do enunciado, pronta para enviar. Escolha uma rota, clique numa requisição e veja a resposta na hora. É a mesma API da loja: uma venda aqui aparece lá.</p>' +
      '<button class="mk-btn" type="button" data-full>Tela cheia ⤢</button></div>';
    var grid = node('<div class="dv-api"></div>');
    var lista = node('<div class="mk-card dv-reqs"><div class="dv-grupos" role="tablist" aria-label="Rotas"></div><div class="dv-req-list" role="list"></div></div>');
    var tabs = lista.querySelector('.dv-grupos'), ul = lista.querySelector('.dv-req-list');
    GRUPOS_API.forEach(function (g) {
      var n = PRESETS.filter(function (p) { return p[0] === g; }).length;
      var b = node('<button type="button" role="tab"></button>'); b.innerHTML = esc(g) + ' <small>' + n + '</small>'; b.dataset.g = g;
      b.addEventListener('click', function () { apiGrupo = g; listar(); });
      tabs.appendChild(b);
    });
    function listar() {
      tabs.querySelectorAll('button').forEach(function (b) { b.setAttribute('aria-selected', b.dataset.g === apiGrupo ? 'true' : 'false'); });
      ul.innerHTML = '';
      PRESETS.forEach(function (p) {
        if (p[0] !== apiGrupo) return;
        var b = node('<button class="dv-req" type="button" role="listitem"><span class="dv-m m-' + MET[p[1]] + '">' + p[1] + '</span><span class="dv-req-main"><code></code><span></span></span><span class="dv-exp">espera ' + p[4] + '</span></button>');
        b.querySelector('code').textContent = p[2]; b.querySelector('.dv-req-main span').textContent = p[5];
        b.addEventListener('click', function () { ul.querySelectorAll('.dv-req').forEach(function (x) { x.classList.toggle('is-on', x === b); }); carregar(p); enviar(); });
        ul.appendChild(b);
      });
    }
    var cons = node('<div class="mk-card dv-console"><p class="mk-label">A requisição</p>' +
      '<div class="dv-line"><label class="sr-only" for="dv-met">Método</label><select id="dv-met"><option>GET</option><option>POST</option><option>PATCH</option><option>DELETE</option></select>' +
      '<label class="sr-only" for="dv-path">Caminho</label><input id="dv-path" spellcheck="false" autocomplete="off" value="/plantas"><button class="mk-btn is-main" type="button" data-send>Enviar</button></div>' +
      '<details class="dv-corpo"><summary>Corpo (JSON)</summary><textarea id="dv-body" spellcheck="false" rows="6" placeholder="{ }"></textarea></details>' +
      '<p class="mk-label" style="margin:6px 0 0">A resposta</p>' +
      '<div class="dv-res" aria-live="polite"><p class="dv-res-empty">Clique numa requisição à esquerda, ou edite e envie a sua.</p></div></div>');
    var met = cons.querySelector('#dv-met'), path = cons.querySelector('#dv-path'), txt = cons.querySelector('#dv-body'), corpo = cons.querySelector('.dv-corpo'), res = cons.querySelector('.dv-res'), esperado = null;
    function carregar(p) { met.value = p[1]; path.value = p[2]; txt.value = p[3] ? JSON.stringify(p[3], null, 2) : ''; corpo.open = !!p[3]; esperado = p[4]; }
    function enviar() {
      var t0 = performance.now(), m = met.value, pth = path.value.trim() || '/', exp = esperado;
      esperado = null;
      API.requisitar(m, pth, m === 'GET' || m === 'DELETE' ? null : txt.value).then(function (r) {
        var ms = Math.max(1, Math.round(performance.now() - t0));
        var cmp = exp == null ? '' : (r.status === exp ? '<span class="dv-ok">✓ esperado ' + exp + '</span>' : '<span class="dv-bad">esperado ' + exp + (exp === 200 && r.status === 404 ? ' · a planta pode ter sido apagada; restaure na aba Loja' : '') + '</span>');
        res.innerHTML = '<div class="dv-res-head">' + statusPill(r.status) + '<code>' + esc(m + ' ' + pth) + '</code><span class="dv-ms">' + ms + ' ms</span>' + cmp + '</div><pre class="dv-json" tabindex="0">' + jsonHtml(r.body) + '</pre>';
        refreshLoja();
      });
    }
    cons.querySelector('[data-send]').addEventListener('click', function () { esperado = null; enviar(); });
    path.addEventListener('keydown', function (e) { if (e.key === 'Enter') { esperado = null; enviar(); } });
    met.addEventListener('change', function () { if (met.value === 'POST' || met.value === 'PATCH') corpo.open = true; });
    grid.appendChild(lista); grid.appendChild(cons); w.appendChild(grid);
    listar();
    telaCheia(w, w.querySelector('[data-full]'));
    return w;
  }

  /* corrida: duas compras do último vaso ao mesmo tempo */
  function corrida() {
    var c = node('<div class="mk-card dv-race" id="dv-race"></div>');
    c.innerHTML =
      '<p class="mk-label">A decisão de que mais me orgulho</p>' +
      '<h3 class="dv-h3">Duas pessoas compram o último vaso ao mesmo tempo</h3>' +
      '<p class="dv-note">Escolha o jeito de vender e dispare as duas compras, em paralelo, no código de verdade.</p>' +
      '<details class="dv-why"><summary>Por que isso quebra?</summary><p class="dv-note">O enunciado pergunta: e se duas pessoas comprarem o último vaso juntas? Se a API busca a planta, confere o estoque e só depois diminui, as duas compras passam pela conferência antes de qualquer uma diminuir.</p></details>' +
      '<div class="dv-race-pick" role="radiogroup" aria-label="Jeito de vender">' +
        '<button type="button" role="radio" data-modo="ingenua" aria-checked="false"><strong>Buscar, conferir, diminuir</strong><span>três passos separados</span></button>' +
        '<button type="button" role="radio" data-modo="atomica" aria-checked="true"><strong>updateMany com a condição</strong><span>como está no repositório</span></button></div>' +
      '<div class="dv-race-code"></div>' +
      '<div class="dv-race-run"><button class="mk-btn is-main" type="button" data-go>Disparar as duas compras</button><span class="dv-mini">Começa com 1 vaso de Samambaia em estoque.</span></div>' +
      '<div class="dv-lanes" aria-live="polite"></div>';
    var modo = 'atomica', code = c.querySelector('.dv-race-code'), lanes = c.querySelector('.dv-lanes');
    var COD = {
      ingenua: '// três idas ao banco: entre a conferência e a baixa, a outra compra também confere\nconst planta = await prisma.planta.findUnique({ where: { id } });\nif (planta.estoque < quantidade) return res.status(400).json(...);\nawait prisma.planta.update({ where: { id }, data: { estoque: { decrement: quantidade } } });',
      atomica: '// PlantaRepository.ts: o banco confere e diminui numa única operação\nconst resultado = await prisma.planta.updateMany({\n  where: { id: id, estoque: { gte: quantidade } },\n  data: { estoque: { decrement: quantidade } },\n});\nreturn resultado.count > 0;   // 0 linhas alteradas = estoque insuficiente (400)'
    };
    function pinta() {
      c.querySelectorAll('[data-modo]').forEach(function (b) { b.setAttribute('aria-checked', b.dataset.modo === modo ? 'true' : 'false'); });
      code.innerHTML = codeBlock(COD[modo], 'ts'); lanes.innerHTML = '';
    }
    c.querySelectorAll('[data-modo]').forEach(function (b) { b.addEventListener('click', function () { modo = b.dataset.modo; pinta(); }); });
    pinta();
    c.querySelector('[data-go]').addEventListener('click', function () {
      var a = window.FolhagemApi.criar({ semear: false }), id;
      lanes.innerHTML = '<p class="dv-mini">Enviando…</p>';
      a.requisitar('POST', '/plantas', JSON.stringify(mix(VALIDA, { nome: 'Samambaia', especie: 'Nephrolepis exaltata', estoque: 1 }))).then(function (r) {
        id = r.body.id;
        var op = { ingenua: modo === 'ingenua' };
        return Promise.all([a.requisitar('POST', '/plantas/' + id + '/venda', '{"quantidade":1}', op), a.requisitar('POST', '/plantas/' + id + '/venda', '{"quantidade":1}', op)]);
      }).then(function (rs) {
        return a.requisitar('GET', '/plantas/' + id).then(function (f) {
          var fim = f.body.estoque, ruim = fim < 0;
          lanes.innerHTML = ['Cliente A', 'Cliente B'].map(function (n, k) {
            var r = rs[k];
            return '<div class="dv-lane"><span class="dv-who">' + n + '</span>' + statusPill(r.status) + '<span>' + (r.status === 200 ? 'compra aprovada' : esc(r.body.message)) + '</span></div>';
          }).join('') +
          '<div class="dv-verdict ' + (ruim ? 'is-bad' : 'is-good') + '"><b>Estoque final: ' + fim + '</b>' +
          (ruim ? 'As duas compras passaram e a loja vendeu um vaso que não existia. É o problema da samambaia que abre o enunciado.' : 'Só uma compra passou; a outra recebeu 400 e o estoque parou em zero. O teste “duas vendas simultâneas do último vaso” confere exatamente isso.') + '</div>';
        });
      });
    });
    return c;
  }

  /* bateria: os 51 testes do repositório, rodando contra a API simulada */
  function bateria() {
    var c = node('<div class="mk-card dv-suite" id="dv-suite"></div>');
    c.innerHTML = '<div class="dv-bar"><div><p class="mk-label" style="margin:0 0 4px">tests/plantas.test.ts</p><h3 class="dv-h3" style="margin:0">Os ' + TESTES.length + ' testes do repositório, rodando aqui</h3>' +
      '<p class="dv-note">Os mesmos casos do arquivo de testes, rodando contra a API simulada.</p>' +
      '<details class="dv-why"><summary>Como funciona</summary><p class="dv-note">Os mesmos casos e as mesmas verificações do arquivo de testes, traduzidos para rodar contra a API simulada. Cada teste começa com o banco vazio, como o <code>TRUNCATE</code> do <code>beforeEach</code>. No repositório, eles rodam com <code>yarn test</code> contra o PostgreSQL.</p></details></div>' +
      '<div class="mk-actions"><button class="mk-btn is-main" type="button" data-run>Rodar os ' + TESTES.length + ' testes</button></div></div>' +
      '<div class="dv-sum" aria-live="polite"></div><div class="dv-tests"></div>';
    var box = c.querySelector('.dv-tests'), sum = c.querySelector('.dv-sum'), btn = c.querySelector('[data-run]'), rows = [];
    var grupos = {};
    TESTES.forEach(function (t) { (grupos[t.grupo] = grupos[t.grupo] || []).push(t); });
    Object.keys(grupos).forEach(function (g) {
      var sec = node('<div class="dv-tgroup"><p class="dv-tg-name"></p></div>'); sec.querySelector('p').textContent = g;
      grupos[g].forEach(function (t) {
        var r = node('<div class="dv-t"><i aria-hidden="true">○</i><span></span><em></em></div>'); r.querySelector('span').textContent = t.nome;
        t.row = r; rows.push(r); sec.appendChild(r);
      });
      box.appendChild(sec);
    });
    btn.addEventListener('click', function () {
      btn.disabled = true; var ok = 0, falhas = 0, t0 = performance.now();
      TESTES.forEach(function (t) { t.row.className = 'dv-t'; t.row.querySelector('i').textContent = '○'; t.row.querySelector('em').textContent = ''; });
      sum.innerHTML = '';
      var chain = Promise.resolve();
      TESTES.forEach(function (t) {
        chain = chain.then(function () { return new Promise(function (r) { setTimeout(r, 18); }); }).then(function () {
          t.row.classList.add('is-run'); t.row.querySelector('i').textContent = '◌';
          var api = window.FolhagemApi.criar({ semear: false }), s = performance.now();
          return Promise.resolve().then(function () { return t.fn(api); }).then(function () {
            ok++; t.row.className = 'dv-t is-ok'; t.row.querySelector('i').textContent = '✓'; t.row.querySelector('em').textContent = Math.max(1, Math.round(performance.now() - s)) + ' ms';
          }, function (e) {
            falhas++; t.row.className = 'dv-t is-fail'; t.row.querySelector('i').textContent = '✗'; t.row.querySelector('em').textContent = e.message;
          }).then(function () { sum.innerHTML = '<b>' + ok + '</b> passaram' + (falhas ? ' · <b class="dv-bad">' + falhas + '</b> falharam' : '') + ' · ' + (ok + falhas) + ' de ' + TESTES.length; });
        });
      });
      chain.then(function () {
        btn.disabled = false; btn.textContent = 'Rodar de novo';
        sum.innerHTML = (falhas ? '<b class="dv-bad">' + falhas + ' falharam</b> · ' : '<b class="dv-ok">✓ ' + ok + ' de ' + TESTES.length + ' passaram</b> · ') + 'em ' + (Math.round(performance.now() - t0) / 1000).toFixed(1).replace('.', ',') + ' s';
      });
    });
    return c;
  }

  /* ---------- aba: repositório ---------- */
  var ICON_DIR = '<svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true"><path d="M1.5 3.5h4l1.5 1.5h7.5v8h-13z" fill="none" stroke="currentColor" stroke-width="1.2"/></svg>';
  var ICON_FILE = '<svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true"><path d="M3.5 1.5h6l3 3v10h-9z M9.5 1.5v3h3" fill="none" stroke="currentColor" stroke-width="1.2"/></svg>';
  var ATALHOS = [['README.md', 'README'], ['src/controllers/PlantaController.ts', 'Controller'], ['src/repositories/PlantaRepository.ts', 'Repository'], ['src/routes.ts', 'Rotas'], ['prisma/schema.prisma', 'Schema'], ['tests/plantas.test.ts', 'Testes'], ['RELATORIO.md', 'Relatório']];
  var LANG_NOME = { ts: 'TypeScript', md: 'Markdown', sql: 'SQL', json: 'JSON', yml: 'YAML', prisma: 'Prisma', http: 'HTTP', html: 'HTML', toml: 'TOML', docker: 'Dockerfile', sh: 'Configuração', plain: 'Texto' };
  /* ================= RAIO-X DE UMA VENDA =================
     Uma requisição POST /plantas/:id/venda roda de verdade contra a API simulada (as mesmas regras do
     PlantaController), e o raio-x mostra por qual camada do código ela passou e em qual parou.
     Os trechos de código são os do repositório. */
  var CAMADAS = [
    { k: 'rota', nome: 'A rota', onde: 'src/routes.ts', code: 'routes.post("/plantas/:id/venda", PlantaController.venderPlanta);', ok: 'O Express encontra a rota e chama o controller.' },
    { k: 'id', nome: 'O id da URL', onde: 'PlantaController.ts · parseId', code: 'const id = parseId(req.params.id);\nif (id === null) return res.status(400).json(ID_INVALIDO);', ok: 'O id é um inteiro positivo.', erro: 'O id chega da URL como texto; "abc", "0" e "1.5" viram null e param aqui, com 400.' },
    { k: 'qtd', nome: 'A quantidade', onde: 'PlantaController.ts · venderPlanta', code: 'if (!ehInteiro(quantidade) || quantidade <= 0 || quantidade > MAIOR_INT_DO_BANCO)\n  return res.status(400).json({ campo: "quantidade", ... });', ok: 'A quantidade é um inteiro maior que zero.', erro: 'Number.isInteger recusa texto ("3"), decimal (1.5) e NaN; zero e negativos também param aqui.' },
    { k: 'existe', nome: 'A planta existe?', onde: 'PlantaRepository.findPlantaById', code: 'const planta = await PlantaRepository.findPlantaById(id);\nif (!planta) return res.status(404).json(plantaNaoEncontrada(id));', ok: 'A planta foi encontrada no banco.', erro: 'Não há planta com esse id: 404, e não 500.' },
    { k: 'estoque', nome: 'Confere e baixa o estoque, numa operação só', onde: 'PlantaRepository.ts · venderPlanta', code: 'prisma.planta.updateMany({\n  where: { id, estoque: { gte: quantidade } },\n  data: { estoque: { decrement: quantidade } },\n});   // count 0 = não havia estoque', ok: 'O banco só decrementa se ainda houver vasos suficientes, e diz quantas linhas mudou.', erro: 'O where não encontrou estoque suficiente: count 0. O controller busca o estoque de novo e responde 400 dizendo quantos vasos há.' },
    { k: 'fim', nome: 'A resposta', onde: 'PlantaController.ts · venderPlanta', code: 'const plantaAtualizada = await PlantaRepository.findPlantaById(id);\nreturn res.status(200).json(plantaAtualizada);', ok: 'Devolve a planta com o estoque já atualizado.' }
  ];
  var CASOS = [
    { k: 'ok', nome: 'Venda normal', id: '2', q: 3 },
    { k: 'idtxt', nome: 'Id “abc”', id: 'abc', q: 1 },
    { k: 'txt', nome: 'Quantidade "3" em texto', id: '2', q: '3' },
    { k: 'dec', nome: 'Quantidade 1,5', id: '2', q: 1.5 },
    { k: 'zero', nome: 'Quantidade 0', id: '2', q: 0 },
    { k: 'nao', nome: 'Planta que não existe', id: '999', q: 1 },
    { k: 'mais', nome: 'Mais do que o estoque', id: '10', q: 10 },
    { k: 'esg', nome: 'Planta esgotada', id: '4', q: 1 },
    { k: 'corrida', nome: 'Duas compras do último vaso', id: '10', q: 1, corrida: true }
  ];
  // o mesmo caminho do controller, para saber em que camada a requisição para
  function paradaDe(rawId, q, plantas) {
    var n = Number(rawId);
    if (!(typeof rawId === 'string' && Number.isInteger(n) && n > 0 && n <= 2147483647)) return 1;
    if (!Number.isInteger(q) || q <= 0 || q > 2147483647) return 2;
    var p = plantas.filter(function (x) { return x.id === n; })[0];
    if (!p) return 3;
    if (p.estoque < q) return 4;
    return 6;   // passou por todas
  }
  var casoAtual = 'ok';
  function raioX(container) {
    var c = node('<div class="mk-card dv-rx" id="dv-raiox"></div>');
    c.innerHTML = '<p class="mk-label">Raio-x de uma venda · POST /plantas/:id/venda</p>' +
      '<p class="dv-note">Escolha uma requisição. Ela roda de verdade na API simulada (as mesmas regras do <code>PlantaController</code>), e o raio-x acende cada camada do código por onde ela passou, até onde parou.</p>';
    var chips = node('<div class="dv-rx-casos" role="group" aria-label="Requisições prontas"></div>');
    CASOS.forEach(function (x) { var b = node('<button type="button"></button>'); b.textContent = x.nome; b.dataset.k = x.k; chips.appendChild(b); });
    c.appendChild(chips);
    var livre = node('<details class="dv-rx-livre"><summary>Ou monte a sua requisição</summary><div class="dv-rx-form">' +
      '<label>Id na URL<input type="text" value="2" data-f="id" autocomplete="off"></label>' +
      '<label>Corpo (JSON)<input type="text" value=\'{ "quantidade": 2 }\' data-f="body" autocomplete="off" spellcheck="false"></label>' +
      '<button type="button" class="mk-btn is-main" data-livre>Enviar ▶</button></div></details>');
    c.appendChild(livre);
    var grid = node('<div class="dv-rx-grid"></div>');
    var pipe = node('<ol class="dv-rx-pipe" aria-live="polite"></ol>');
    var lado = node('<div class="dv-rx-lado"></div>');
    grid.appendChild(pipe); grid.appendChild(lado); c.appendChild(grid);
    container.appendChild(c);
    var corrente = 0;   // invalida animações antigas quando outra requisição começa

    function desenhar(parada, extra) {
      pipe.innerHTML = CAMADAS.map(function (cam, i) {
        var st = i < parada ? 'is-ok' : i === parada && parada < 5 ? 'is-stop' : 'is-skip';
        if (parada === 6 && i === 5) st = 'is-ok';
        var txt = st === 'is-stop' ? (cam.erro || '') : st === 'is-ok' ? cam.ok : 'A requisição não chegou aqui.';
        var nota = extra && extra[i] ? '<p class="dv-rx-extra">' + extra[i] + '</p>' : '';
        return '<li class="' + st + '" style="--i:' + i + '"><span class="dv-rx-dot" aria-hidden="true">' + (st === 'is-ok' ? '✓' : st === 'is-stop' ? '✕' : '') + '</span>' +
          '<div><b>' + esc(cam.nome) + '</b><small>' + esc(cam.onde) + '</small><pre><code>' + esc(cam.code) + '</code></pre><p>' + esc(txt) + '</p>' + nota + '</div></li>';
      }).join('');
    }
    function cartao(rotulo, metodo, url, corpo, r) {
      var cls = r.status < 300 ? 'is-2xx' : r.status === 404 ? 'is-404' : 'is-4xx';
      return '<div class="dv-rx-req"><span class="dv-rx-tag">' + esc(rotulo) + '</span><code>' + metodo + ' ' + esc(url) + '</code><pre>' + esc(corpo) + '</pre></div>' +
        '<div class="dv-rx-res ' + cls + '"><span class="dv-rx-st">' + r.status + '</span><pre>' + esc(r.status === 204 ? '' : JSON.stringify(r.body, null, 2)) + '</pre></div>';
    }
    function rodar(rawId, corpoTxt, caso) {
      var meu = ++corrente;
      var api = window.FolhagemApi.criar({});   // banco novo, com as 10 plantas do seed
      var antes = api.plantas();
      var q; try { q = JSON.parse(corpoTxt).quantidade; } catch (e) { q = undefined; }
      var url = '/plantas/' + rawId + '/venda';
      if (caso && caso.corrida) api.definir(10, { estoque: 1 });
      var plantas = api.plantas();
      var pv = plantas.filter(function (x) { return String(x.id) === String(rawId); })[0];
      var parada = paradaDe(String(rawId), q, plantas);
      var reqs = caso && caso.corrida
        ? Promise.all([req(api, 'POST', url, corpoTxt), req(api, 'POST', url, corpoTxt)])
        : req(api, 'POST', url, corpoTxt).then(function (r) { return [r]; });
      lado.innerHTML = '<p class="dv-note">Enviando…</p>';
      pipe.innerHTML = '';
      reqs.then(function (rs) {
        if (meu !== corrente) return;
        var extra = null, html;
        if (caso && caso.corrida) {
          parada = 6;
          var perdeu = rs[1].status === 200 ? 0 : 1;
          extra = { 4: 'As duas compras passaram pelas camadas de cima ao mesmo tempo. Aqui, o updateMany da <b>compra ' + (perdeu ? 'A' : 'B') + '</b> mudou 1 linha; o da <b>compra ' + (perdeu ? 'B' : 'A') + '</b> mudou 0, porque o estoque já era 0. O estoque nunca fica negativo.' };
          html = '<p class="dv-rx-sub">Cacto-mandacaru com 1 vaso, duas compras ao mesmo tempo</p>' +
            cartao('Compra A', 'POST', url, corpoTxt, rs[0]) + cartao('Compra B', 'POST', url, corpoTxt, rs[1]) +
            '<p class="dv-rx-fim is-ok">Estoque final: ' + api.plantas().filter(function (x) { return x.id === 10; })[0].estoque + ' vasos. <a href="#" data-corrida>Ver a corrida passo a passo →</a></p>';
        } else {
          var r = rs[0];
          html = cartao('Requisição', 'POST', url, corpoTxt, r);
          if (r.status === 200 && pv) html += '<p class="dv-rx-fim is-ok">' + esc(pv.nome) + ': ' + pv.estoque + ' → ' + r.body.estoque + ' vasos no estoque.</p>';
          else if (parada === 4 && pv) html += '<p class="dv-rx-fim">' + esc(pv.nome) + ' tinha ' + pv.estoque + ' ' + (pv.estoque === 1 ? 'vaso' : 'vasos') + '. Nada mudou no banco.</p>';
          else html += '<p class="dv-rx-fim">Nada mudou no banco.</p>';
        }
        lado.innerHTML = html;
        var a = lado.querySelector('[data-corrida]');
        if (a) a.addEventListener('click', function (e) { e.preventDefault(); setAba('api', '#dv-race'); });
        desenhar(parada, extra);
        if (!REDUCED_DV) pipe.classList.remove('is-anim'), void pipe.offsetWidth, pipe.classList.add('is-anim');
      });
    }
    function escolher(k) {
      casoAtual = k;
      chips.querySelectorAll('button').forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.k === k ? 'true' : 'false'); });
      var x = CASOS.filter(function (y) { return y.k === k; })[0];
      rodar(x.id, JSON.stringify({ quantidade: x.q }), x);
    }
    chips.querySelectorAll('button').forEach(function (b) { b.addEventListener('click', function () { escolher(b.dataset.k); }); });
    livre.querySelector('[data-livre]').addEventListener('click', function () {
      chips.querySelectorAll('button').forEach(function (b) { b.setAttribute('aria-pressed', 'false'); });
      rodar(livre.querySelector('[data-f="id"]').value.trim(), livre.querySelector('[data-f="body"]').value, null);
    });
    escolher(casoAtual);
  }
  var REDUCED_DV = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function abaRepo() {
    var chips = node('<div class="dv-chips" role="group" aria-label="Arquivos principais"></div>');
    var box = node('<div class="dx-repo"></div>');
    box.innerHTML = '<div class="dx-repo-head"><span class="dx-repo-name">' + esc(D.repoName) + '</span><span class="dx-badge">' + esc(D.branch) + '</span><span class="dx-badge">' + D.files.length + ' arquivos</span><span class="dx-spacer"></span>' +
      '<a class="dx-btn" href="' + LINKS.repositorio + '" target="_blank" rel="noopener noreferrer">Abrir no GitHub ↗</a></div><nav class="dx-tree" aria-label="Arquivos do repositório"></nav><div class="dx-view"></div>';
    var nav = box.querySelector('.dx-tree'), view = box.querySelector('.dx-view');
    var raiz = { dirs: {}, files: [] };
    D.files.forEach(function (f) { var parts = f.path.split('/'), d = raiz; for (var i = 0; i < parts.length - 1; i++) d = d.dirs[parts[i]] = d.dirs[parts[i]] || { dirs: {}, files: [] }; d.files.push(f); });
    (function walk(d, depth, alvo) {
      Object.keys(d.dirs).sort().forEach(function (name) {
        var b = node('<button type="button" class="is-dir" aria-expanded="true"></button>');
        b.style.setProperty('--d', depth); b.innerHTML = ICON_DIR + '<span></span>'; b.querySelector('span').textContent = name;
        alvo.appendChild(b);
        var holder = node('<div></div>'); alvo.appendChild(holder);
        b.addEventListener('click', function () { var open = b.getAttribute('aria-expanded') === 'true'; b.setAttribute('aria-expanded', open ? 'false' : 'true'); holder.hidden = open; });
        walk(d.dirs[name], depth + 1, holder);
      });
      d.files.slice().sort(function (a, b) { return a.path.localeCompare(b.path); }).forEach(function (f) {
        var b = node('<button type="button"></button>');
        b.style.setProperty('--d', depth); b.innerHTML = ICON_FILE + '<span></span>'; b.querySelector('span').textContent = f.path.split('/').pop();
        b.dataset.path = f.path;
        b.addEventListener('click', function () { arquivo = f.path; mdRaw = false; show(); });
        alvo.appendChild(b);
      });
    })(raiz, 0, nav);
    ATALHOS.forEach(function (a) {
      var b = node('<button class="mk-preset" type="button"></button>'); b.textContent = a[1]; b.dataset.path = a[0];
      b.addEventListener('click', function () { arquivo = a[0]; mdRaw = false; show(); });
      chips.appendChild(b);
    });
    function show() {
      box.querySelectorAll('.dx-tree [data-path]').forEach(function (b) { b.setAttribute('aria-current', b.dataset.path === arquivo ? 'true' : 'false'); });
      chips.querySelectorAll('[data-path]').forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.path === arquivo ? 'true' : 'false'); });
      var f = D.files.filter(function (x) { return x.path === arquivo; })[0] || D.files[0];
      view.innerHTML = '';
      var head = node('<div class="dx-view-head"><b></b><span class="dx-meta"></span></div>');
      head.querySelector('b').textContent = f.path;
      var n = f.content.replace(/\n$/, '').split('\n').length;
      head.querySelector('.dx-meta').textContent = (LANG_NOME[f.lang] || 'Texto') + ' · ' + n + (n === 1 ? ' linha' : ' linhas');
      view.appendChild(head);
      if (/^public\//.test(f.path)) {
        var go = node('<button class="dx-btn" type="button">Ver rodando ↗</button>');
        go.addEventListener('click', function () { setAba('loja'); });
        head.appendChild(go);
      }
      if (f.lang === 'md') {
        var tg = node('<div class="dx-toggle"><button type="button" data-raw="0">Visualizar</button><button type="button" data-raw="1">Código</button></div>');
        tg.querySelectorAll('button').forEach(function (b) {
          b.setAttribute('aria-pressed', (b.dataset.raw === '1') === mdRaw ? 'true' : 'false');
          b.addEventListener('click', function () { mdRaw = b.dataset.raw === '1'; show(); });
        });
        head.appendChild(tg);
        view.insertAdjacentHTML('beforeend', mdRaw ? codeBlock(f.content, 'plain') : '<div class="dx-md">' + md(f.content) + '</div>');
      } else view.insertAdjacentHTML('beforeend', codeBlock(f.content, f.lang));
    }
    show();
    body.appendChild(chips);
    body.appendChild(box);
  }

  /* ---------- aba: relatório ---------- */
  function abaRelatorio() {
    var d = node('<div class="mk-card" style="display:grid;gap:14px"><div class="mk-doc-bar"><p>Relatório do desafio de Dev · 2 páginas · PDF</p><div class="mk-actions">' + pdfButtons() +
      '<a class="mk-btn" href="' + LINKS.repositorio + '" target="_blank" rel="noopener noreferrer">Repositório ↗</a></div></div></div>');
    body.appendChild(d); pdfView(d, true);
  }

  function abrir(t, alvo) {
    if (!root) build();
    lastFocus = document.activeElement;
    root.hidden = false;
    setAba(t || aba, alvo);
    root.measureHead();
    requestAnimationFrame(function () { root.classList.add('is-open'); });
    root.querySelector('[data-close]').focus({ preventScroll: true });
  }
  function fechar() {
    if (!root || root.hidden) return;
    root.classList.remove('is-open');
    setTimeout(function () { root.hidden = true; body.innerHTML = ''; }, 280);   // descarta a loja (e o som dela)
    if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
  }

  /* ================= painel lateral ================= */
  /* figura do painel: duas compras do último vaso, nos dois jeitos de vender (linha do tempo animada) */
  function decisaoFig(container) {
    var f = node('<figure class="dv-fig"><div class="dv-fig-modos" role="group" aria-label="Jeito de vender">' +
      '<button type="button" data-m="ingenua">Conferir, depois baixar</button><button type="button" data-m="atomica">Conferir e baixar juntos</button></div>' +
      '<div class="dv-fig-svg"></div><figcaption aria-live="polite"></figcaption></figure>');
    var modo = 'atomica', timers = [];
    var CENA = {
      // [cliente (0 = A, 1 = B), início, fim, rótulo, tipo]  · tempo em unidades de 0 a 10
      ingenua: { blocos: [[0, 0.3, 3.3, 'confere', 'le'], [1, 1.3, 4.3, 'confere', 'le'], [0, 4.8, 7.3, 'baixa', 'esc'], [1, 6.2, 8.9, 'baixa', 'esc']],
                 estoque: [[0, 1], [7.2, 0], [8.6, -1]], fim: ['200', '200'], txt: 'As duas conferem antes de qualquer uma baixar: estoque −1, a loja vendeu um vaso que não existia.' },
      atomica: { blocos: [[0, 0.3, 4.6, 'confere+baixa', 'at'], [1, 1.2, 1.6, '', 'esp'], [1, 4.8, 9.1, 'confere+baixa', 'at']],
                 estoque: [[0, 1], [4.6, 0]], fim: ['200', '400'], txt: 'O banco faz as duas coisas numa operação só: a segunda compra encontra 0 vasos e recebe 400.' }
    };
    function desenha() {
      timers.forEach(clearTimeout); timers = [];
      f.querySelectorAll('[data-m]').forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.m === modo ? 'true' : 'false'); });
      var c = CENA[modo], X = function (t) { return 62 + t * 19; }, Y = [26, 70];
      var svg = '<svg viewBox="0 0 360 128" role="img" aria-label="' + esc(c.txt) + '">' +
        '<text x="0" y="' + (Y[0] + 4) + '" class="dv-fig-who">Cliente A</text><text x="0" y="' + (Y[1] + 4) + '" class="dv-fig-who">Cliente B</text>' +
        '<line x1="62" x2="252" y1="104" y2="104" class="dv-fig-ax"/><text x="62" y="120" class="dv-fig-t">tempo →</text>';
      c.blocos.forEach(function (b, k) {
        var x = X(b[1]), w = Math.max(6, X(b[2]) - x), y = Y[b[0]];
        if (b[4] === 'esp') { svg += '<line x1="' + X(1.2) + '" x2="' + X(4.8) + '" y1="' + y + '" y2="' + y + '" class="dv-fig-wait" style="--d:' + (b[1] * 0.18) + 's"/><text x="' + X(3) + '" y="' + (y - 9) + '" text-anchor="middle" class="dv-fig-t dv-fig-in" style="--d:' + (b[1] * 0.18) + 's">espera a 1ª</text>'; return; }
        svg += '<g class="dv-fig-in" style="--d:' + (b[1] * 0.18) + 's"><rect x="' + x + '" y="' + (y - 11) + '" width="' + w + '" height="22" rx="6" class="dv-fig-b is-' + b[4] + '"/>' +
          '<text x="' + (x + w / 2) + '" y="' + (y + 4) + '" text-anchor="middle" class="dv-fig-bt">' + b[3] + '</text></g>';
      });
      c.fim.forEach(function (st, k) {
        svg += '<g class="dv-fig-in" style="--d:' + (1.75) + 's"><rect x="258" y="' + (Y[k] - 11) + '" width="34" height="22" rx="11" class="dv-fig-st s' + st[0] + '"/><text x="275" y="' + (Y[k] + 4) + '" text-anchor="middle" class="dv-fig-stt">' + st + '</text></g>';
      });
      svg += '<rect x="302" y="22" width="56" height="58" rx="10" class="dv-fig-box"/><text x="330" y="38" text-anchor="middle" class="dv-fig-t">estoque</text><text x="330" y="68" text-anchor="middle" class="dv-fig-n">1</text></svg>';
      f.querySelector('.dv-fig-svg').innerHTML = svg;
      var n = f.querySelector('.dv-fig-n'), cap = f.querySelector('figcaption');
      cap.textContent = '';
      var red = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      c.estoque.forEach(function (e) {
        timers.push(setTimeout(function () { n.textContent = e[1] < 0 ? '−' + Math.abs(e[1]) : e[1]; n.classList.toggle('is-neg', e[1] < 0); n.classList.remove('is-pop'); void n.offsetWidth; n.classList.add('is-pop'); }, red ? 0 : e[0] * 180));
      });
      timers.push(setTimeout(function () { cap.textContent = c.txt; cap.className = modo === 'atomica' ? 'is-ok' : 'is-bad'; }, red ? 0 : 1900));
    }
    f.querySelectorAll('[data-m]').forEach(function (b) { b.addEventListener('click', function () { modo = b.dataset.m; desenha(); }); });
    container.appendChild(f);
    desenha();
  }

  function painel(container) {
    function sec(title) { var s = document.createElement('section'); s.className = 'p-sec'; var h3 = document.createElement('h3'); h3.textContent = title; s.appendChild(h3); container.appendChild(s); return s; }
    var a = sec('O que entreguei');
    a.appendChild(node('<div class="dv-answer"><strong>A API da Folhagem &amp; Cia</strong><span class="dv-kpis"><b>7</b> rotas · <b>4</b> bônus · <b>51</b> testes</span><span>Node.js, Express, TypeScript, Prisma, PostgreSQL e Docker</span></div>'));
    var e = sec('Explore a entrega');
    [['loja', 'Loja ao vivo', 'O painel web do repositório funcionando: cadastre, filtre e venda.', null],
     ['api', 'Testar a API', 'A tabela de testes do enunciado, a venda simultânea e os 51 testes, rodando aqui.', null],
     ['raiox', 'Raio-x da venda', 'Uma venda passando pelo código, camada por camada. Escolha uma entrada ruim e veja quem barra.', null],
     ['repo', 'Repositório', D.files.length + ' arquivos para navegar, do schema aos testes.', null],
     ['relatorio', 'Relatório', 'O que fiz, como, as dificuldades e o uso de IA.', null]].forEach(function (x) {
      var b = node('<button class="dx-stage-card dv-card" type="button"><span class="dx-n"></span><strong></strong><span class="dx-d"></span></button>');
      b.querySelector('.dx-n').textContent = x[0] === 'relatorio' ? 'PDF · 2 páginas' : 'Interativo';
      b.querySelector('strong').textContent = x[1]; b.querySelector('.dx-d').textContent = x[2];
      b.addEventListener('click', function () { abrir(x[0], x[3]); });
      e.appendChild(b);
    });
    var r = sec('A decisão principal');
    var p = node('<div class="dv-decision"><p>Na venda, o banco confere o estoque e diminui numa única operação. Assim duas compras do último vaso ao mesmo tempo nunca deixam o estoque negativo.</p></div>');
    decisaoFig(p);
    p.appendChild(node('<button class="mk-btn" type="button">Disparar as duas compras de verdade →</button>'));
    p.querySelector('.mk-btn').addEventListener('click', function () { abrir('api', '#dv-race'); });
    r.appendChild(p);
    var l = sec('Links');
    l.appendChild(node('<div class="mk-actions"><a class="mk-btn" href="' + LINKS.repositorio + '" target="_blank" rel="noopener noreferrer">GitHub ↗</a><a class="mk-btn" href="' + PDF_URL + '" download="' + PDF_URL + '">Relatório PDF ↓</a></div>'));
  }

  window.CITI_ENTREGAS = window.CITI_ENTREGAS || {};
  window.CITI_ENTREGAS.dev = { painel: painel, abrir: abrir };
})();