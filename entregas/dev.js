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
  var TABS = [['loja', 'Loja ao vivo'], ['api', 'Testar a API'], ['repo', 'Repositório'], ['relatorio', 'Relatório']];

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
    window.addEventListener('keydown', function (e) {
      if (root.hidden) return;
      if (e.key === 'Escape') { fechar(); e.stopImmediatePropagation(); }
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
    body.appendChild(hero());
    if (t === 'loja') abaLoja(); else if (t === 'api') abaApi(); else if (t === 'repo') abaRepo(); else abaRelatorio();
    var sc = root.querySelector('.mk-body');
    sc.scrollTop = 0;
    if (alvo) setTimeout(function () { var el = body.querySelector(alvo); if (el) el.scrollIntoView({ block: 'start', behavior: 'smooth' }); }, 60);
  }

  /* ---------- aba: loja ao vivo ---------- */
  function abaLoja() {
    var c = node('<div class="mk-card dv-loja"></div>');
    c.innerHTML =
      '<div class="dv-bar"><div><p class="mk-label" style="margin:0 0 4px">O painel web do repositório, rodando</p>' +
        '<p class="dv-note">É o <code>public/index.html</code> sem nenhuma alteração. A única diferença: em vez do servidor Express com PostgreSQL, quem responde às chamadas é uma API simulada no navegador, com as mesmas regras do <code>PlantaController.ts</code>. Pode mexer à vontade.</p></div>' +
        '<div class="mk-actions"><button class="mk-btn" type="button" data-reset>Restaurar as 10 plantas do seed</button><a class="mk-btn" href="' + LOJA_URL + '" target="_blank" rel="noopener">Abrir em nova aba ↗</a></div></div>' +
      '<div class="dv-frame-wrap"><iframe class="dv-frame" src="' + LOJA_URL + '" title="Painel web da Folhagem & Cia, rodando com a API simulada" loading="lazy" allow="fullscreen" allowfullscreen></iframe></div>' +
      '<div class="dv-try"><p class="mk-label" style="margin:0">Experimente</p><ul>' +
        '<li><b>Venda mais vasos do que existem.</b> A API responde 400, o estoque não muda e a planta balança no jardim.</li>' +
        '<li><b>Cadastre uma planta com estoque 0.</b> Ela é aceita (o erro clássico do <code>!campo</code> recusaria) e nasce murcha.</li>' +
        '<li><b>Filtre por pet-friendly “Não”.</b> O filtro <code>false</code> não se confunde com filtro ausente.</li>' +
        '<li><b>No jardim,</b> cada planta fica na faixa de luz de que precisa, e mais vasos viram mais folhas.</li></ul></div>';
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
  function abaApi() {
    var grid = node('<div class="dv-api"></div>');
    // lista de requisições prontas
    var lista = node('<div class="mk-card dv-reqs"><p class="mk-label">A tabela de testes do enunciado</p><p class="dv-note" style="margin:0 0 12px">Clique para enviar. As requisições vão para a mesma API da loja, então uma venda aqui aparece lá.</p><div class="dv-req-list" role="list"></div></div>');
    var ul = lista.querySelector('.dv-req-list'), grupo = '';
    PRESETS.forEach(function (p, k) {
      if (p[0] !== grupo) { grupo = p[0]; ul.appendChild(node('<p class="dv-req-group">' + esc(grupo) + '</p>')); }
      var b = node('<button class="dv-req" type="button" role="listitem"><span class="dv-m m-' + MET[p[1]] + '">' + p[1] + '</span><span class="dv-req-main"><code></code><span></span></span><span class="dv-exp">' + p[4] + '</span></button>');
      b.querySelector('code').textContent = p[2]; b.querySelector('.dv-req-main span').textContent = p[5];
      b.addEventListener('click', function () { carregar(p); enviar(); });
      ul.appendChild(b);
    });
    // construtor + resposta
    var cons = node('<div class="mk-card dv-console"><p class="mk-label">Monte a sua requisição</p>' +
      '<div class="dv-line"><label class="sr-only" for="dv-met">Método</label><select id="dv-met"><option>GET</option><option>POST</option><option>PATCH</option><option>DELETE</option></select>' +
      '<label class="sr-only" for="dv-path">Caminho</label><input id="dv-path" spellcheck="false" autocomplete="off" value="/plantas"><button class="mk-btn is-main" type="button" data-send>Enviar</button></div>' +
      '<label class="dv-mini" for="dv-body">Corpo (JSON)</label><textarea id="dv-body" spellcheck="false" rows="6" placeholder="{ }"></textarea>' +
      '<div class="dv-res" aria-live="polite"><p class="dv-res-empty">A resposta aparece aqui.</p></div></div>');
    var met = cons.querySelector('#dv-met'), path = cons.querySelector('#dv-path'), txt = cons.querySelector('#dv-body'), res = cons.querySelector('.dv-res'), esperado = null;
    function carregar(p) { met.value = p[1]; path.value = p[2]; txt.value = p[3] ? JSON.stringify(p[3], null, 2) : ''; esperado = p[4]; }
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
    grid.appendChild(lista); grid.appendChild(cons);
    body.appendChild(grid);
    body.appendChild(corrida());
    body.appendChild(bateria());
  }

  /* corrida: duas compras do último vaso ao mesmo tempo */
  function corrida() {
    var c = node('<div class="mk-card dv-race" id="dv-race"></div>');
    c.innerHTML =
      '<p class="mk-label">A decisão de que mais me orgulho</p>' +
      '<h3 class="dv-h3">Duas pessoas compram o último vaso ao mesmo tempo</h3>' +
      '<p class="dv-note">O enunciado pergunta: e se duas pessoas comprarem o último vaso juntas? Se a API busca a planta, confere o estoque e só depois diminui, as duas compras passam pela conferência antes de qualquer uma diminuir. Escolha o jeito de vender e dispare as duas compras. É o código rodando de verdade, com as duas requisições em paralelo.</p>' +
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
      '<p class="dv-note">Os mesmos casos e as mesmas verificações do arquivo de testes, traduzidos para rodar contra a API simulada. Cada teste começa com o banco vazio, como o <code>TRUNCATE</code> do <code>beforeEach</code>. No repositório, eles rodam com <code>yarn test</code> contra o PostgreSQL.</p></div>' +
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
  function painel(container) {
    function sec(title) { var s = document.createElement('section'); s.className = 'p-sec'; var h3 = document.createElement('h3'); h3.textContent = title; s.appendChild(h3); container.appendChild(s); return s; }
    var a = sec('O que entreguei');
    a.appendChild(node('<div class="dv-answer"><strong>A API da Folhagem &amp; Cia</strong><span class="dv-kpis"><b>7</b> rotas · <b>4</b> bônus · <b>51</b> testes</span><span>Node.js, Express, TypeScript, Prisma, PostgreSQL e Docker</span></div>'));
    var e = sec('Explore a entrega');
    [['loja', 'Loja ao vivo', 'O painel web do repositório funcionando: cadastre, filtre e venda.', null],
     ['api', 'Testar a API', 'A tabela de testes do enunciado, a venda simultânea e os 51 testes, rodando aqui.', null],
     ['repo', 'Repositório', D.files.length + ' arquivos para navegar, do schema aos testes.', null],
     ['relatorio', 'Relatório', 'O que fiz, como, as dificuldades e o uso de IA.', null]].forEach(function (x) {
      var b = node('<button class="dx-stage-card dv-card" type="button"><span class="dx-n"></span><strong></strong><span class="dx-d"></span></button>');
      b.querySelector('.dx-n').textContent = x[0] === 'relatorio' ? 'PDF · 2 páginas' : 'Interativo';
      b.querySelector('strong').textContent = x[1]; b.querySelector('.dx-d').textContent = x[2];
      b.addEventListener('click', function () { abrir(x[0], x[3]); });
      e.appendChild(b);
    });
    var r = sec('A decisão principal');
    var p = node('<div class="dv-decision"><p>Na venda, o banco confere o estoque e diminui numa única operação. Assim duas compras do último vaso ao mesmo tempo nunca deixam o estoque negativo.</p><button class="mk-btn" type="button">Ver as duas compras ao vivo →</button></div>');
    p.querySelector('button').addEventListener('click', function () { abrir('api', '#dv-race'); });
    r.appendChild(p);
    var l = sec('Links');
    l.appendChild(node('<div class="mk-actions"><a class="mk-btn" href="' + LINKS.repositorio + '" target="_blank" rel="noopener noreferrer">GitHub ↗</a><a class="mk-btn" href="' + PDF_URL + '" download="' + PDF_URL + '">Relatório PDF ↓</a></div>'));
  }

  window.CITI_ENTREGAS = window.CITI_ENTREGAS || {};
  window.CITI_ENTREGAS.dev = { painel: painel, abrir: abrir };
})();
