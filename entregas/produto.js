/* Entrega do planeta Produto: desafio em grupo (Grupo 5, PTC 26.2), Clínica Movimento.
   painel(): resumo no painel lateral (resposta, documento, protótipo, o salto da 6ª sessão e o grupo).
   abrir(aba): tela cheia com o quiz das causas, os gráficos, o simulador de metas, a jornada
   antes/depois, o protótipo Trilha 10 embutido e o documento.
   Todos os números vêm do documento do grupo; as contas são refeitas aqui, na hora. */
(function () {
  'use strict';

  var DOC = { url: 'Grupo_5_-_Desafio_Produto_PTC.pdf', nome: 'Grupo 5 · Desafio Produto PTC 26.2', pags: 13 };
  var PROTO = 'entregas/produto/trilha10.html';
  var PDFJS = window.MK_PDFJS_BASE || 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/';
  var COR = { conv: '#7fb8ff', part: '#f2c14e', bad: '#ff6b7d', ok: '#4fe577' };

  /* ---------- dados do documento ---------- */
  var GRUPO = [
    ['Ana Beatriz', 'Problema e Pessoas', 'Mapeou e desenhou a jornada do usuário e identificou quem é afetado, stakeholders e o que cada pessoa precisa'],
    ['Bruno Rodrigues', 'Dados e Impacto', 'Calculou o impacto financeiro mensal e anual das faltas por unidade, mapeou as limitações dos dados e as divergências entre dados e entrevistas'],
    ['Gabriel Stamford Arnaud', 'Problema e Pessoas', 'Mapeou e desenhou o fluxograma as-is, identificou as dores e quem é afetado; fez o apêndice'],
    ['Giovanna Reis', 'Dados e Impacto', 'Estruturou as causas principais das faltas e as divergências de registro entre unidades, e organizou o documento oficial'],
    ['João Felipe', 'Solução e Protótipo', 'Desenhou o protótipo da solução principal e definiu o escopo da ferramenta', true],
    ['Tom Nogueira', 'Solução e Protótipo', 'Mapeou e desenhou o fluxograma to-be de agendamento, confirmação e renovação antecipada do convênio']
  ];
  // faltas por sessão (%): convênio completo; do particular o documento cita 4 pontos
  var CONV = [7, 9, 12, 15, 18, 44, 38, 35, 36, 38];
  var PART = { 1: 6, 5: 13, 6: 16, 10: 27 };
  var MOTIVOS = [
    { k: 'melhor', g: 'melhora', nome: 'Já estava melhor', n: 7 },
    { k: 'conv', g: 'conv', nome: 'Demora do convênio para renovar', n: 5 },
    { k: 'hora', g: 'hora', nome: 'Horário ou trânsito', n: 5 },
    { k: 'esq', g: 'esq', nome: 'Esqueci', n: 3 },
    { k: 'nadianta', g: 'melhora', nome: 'Achou que não estava adiantando', n: 2 }
  ];
  var RESP = 23;
  var PALPITES = [
    { g: 'esq', nome: 'Esquecem a sessão', txt: 'Esse foi o palpite do Ricardo, o dono da clínica, e a agência propôs lembretes por causa dele. Na pesquisa com quem interrompeu o tratamento, só 3 de 23 (13%) disseram que esqueceram. E nas 2 semanas sem lembrete em Boa Viagem, a falta subiu só 3 pontos (24% → 27%).' },
    { g: 'melhora', nome: 'Melhoram e param', txt: 'É o maior grupo da pesquisa: 9 de 23 (39%) pararam porque já estavam melhor ou acharam que não estava adiantando. Quando a dor passa, o paciente sente que acabou, e ninguém explica por que as últimas sessões importam.' },
    { g: 'conv', nome: 'O convênio demora', txt: '5 de 23 citam a demora, mas é nos dados por sessão que ela aparece com força: no convênio, a falta salta de 18% na 5ª sessão para 44% na 6ª, exatamente quando acabam as 5 sessões liberadas. No particular, vai só de 13% para 16%.' },
    { g: 'hora', nome: 'Horário e trânsito', txt: '5 de 23 citam horário ou trânsito. E essa causa se mistura com a do convênio: quem perde o horário na renovação só encontra vaga às 7h ou às 18h, as faixas com mais falta.' }
  ];
  var HORAS = {
    bv: [['7h–9h', 33], ['9h–12h', 18], ['13h–17h', 17], ['17h–20h', 32]],
    cf: [['7h–9h', 22], ['9h–12h', 12.5, '12–13%'], ['13h–17h', 12.5, '12–13%'], ['17h–20h', 20]]
  };
  var UN = {
    bv: { nome: 'Boa Viagem', sess: 600, falta: 25, conv: 60, meta: 12 },
    cf: { nome: 'Casa Forte', sess: 420, falta: 17, conv: 30, meta: 10 }
  };
  // falas das transcrições das entrevistas (desafio de Produto): J = Joana, recepcionista de Boa Viagem; C = Dona Célia, 67 anos, paciente de convênio
  var QUEM = {
    J: { nome: 'Joana', papel: 'recepcionista de Boa Viagem · entrevista na recepção, 24 min' },
    C: { nome: 'Dona Célia', papel: '67 anos, paciente de convênio · por telefone, com a filha, 18 min' }
  };
  var FALAS = [
    { q: 'J', t: 'Quase sempre o convênio libera 5 sessões. Aí eu marco as cinco de uma vez, duas por semana, no mesmo horário.', c: ['conv'] },
    { q: 'J', t: 'Leva de 3 a 10 dias úteis, depende do convênio. Os dois maiores que a gente atende demoram mais de uma semana. Enquanto não libera, eu não posso marcar.', c: ['conv'] },
    { q: 'J', t: 'Se eu seguro o horário, a cadeira fica vazia. Então eu passo para outra pessoa. Quando a renovação chega, eu ligo para o paciente, mas aí só sobra horário cedinho ou depois das 17h. Tem gente que diz que vai pensar e não volta.', c: ['conv', 'hora'] },
    { q: 'C', t: 'Quando liberou, uns dez dias depois, ela me ligou, mas o horário das 10h já era de outra pessoa. Só tinha às 7h ou às 18h.', c: ['conv', 'hora'] },
    { q: 'C', t: 'Às 7h não tenho como, dependo da minha filha para me levar e ela entra no trabalho às 7h30. Às 18h é a hora do trânsito, ia ficar mais de uma hora no carro. Aí eu fui deixando.', c: ['hora'] },
    { q: 'J', t: 'É que a pessoa melhora um pouco, a dor passa, e ela acha que não precisa mais vir.', c: ['melhora'] },
    { q: 'C', t: 'Como o ombro já estava bem melhor, pensei que talvez não precisasse mais. Mas agora, de vez em quando, ele volta a doer quando faço força.', c: ['melhora'] },
    { q: 'C', t: 'Se tivessem guardado o meu horário, eu teria continuado. E se alguém tivesse me dito que parar no meio podia fazer a dor voltar.', c: ['conv', 'melhora'] },
    { q: 'J', t: 'Em julho, quando eu tirei férias, ninguém mandou. O Ricardo achou que ia ser um caos, mas sinceramente não mudou tanto.', c: ['esq'] },
    { q: 'C', t: 'Recebia, sempre no dia anterior. Nunca esqueci nenhuma. Esquecer não era o problema.', c: ['esq'] },
    { q: 'J', t: 'Se desmarca com menos de 24 horas, aqui também conta como falta, porque não dá tempo de encaixar ninguém. Na Casa Forte eu sei que não é assim.', c: ['oper'] },
    { q: 'J', t: 'Fico mandando mensagem para umas cinco pessoas para ver quem consegue vir. Não tem lista de espera, é tudo de cabeça.', c: ['oper'] }
  ];
  var CAUSAS = [['todas', 'Todas'], ['conv', 'Convênio'], ['melhora', 'Melhora'], ['hora', 'Horário e trânsito'], ['esq', 'Esquecimento'], ['oper', 'Operação da recepção']];
  // cada funcionalidade da Trilha 10 e a fala que a pediu; ir = cliques no protótipo para mostrar a tela
  var RASTRO = [
    { q: 'J', t: 'Ter alguém, ou alguma coisa, que pedisse a renovação do convênio antes de acabar a quinta sessão.', f: 'Alerta de renovação antecipada', d: 'Na 2ª ou 3ª sessão a recepção é avisada para pedir o laudo ao fisioterapeuta e solicitar a renovação.', ir: [['role', 'joana'], ['jtab', 'fila']] },
    { q: 'J', t: 'Os dois maiores que a gente atende demoram mais de uma semana.', f: 'Regra por convênio', d: 'Nos convênios mais lentos, o pedido sai depois da 2ª sessão; nos demais, depois da 3ª.', ir: [['role', 'joana'], ['jtab', 'msgs']] },
    { q: 'C', t: 'Se tivessem guardado o meu horário, eu teria continuado.', f: 'Horário guardado até a 10ª', d: 'A paciente vê no WhatsApp que o pedido foi feito e que terça e quinta, às 10h, continuam dela.', ir: [['role', 'paciente'], ['who', 'celia']] },
    { q: 'C', t: 'E se alguém tivesse me dito que parar no meio podia fazer a dor voltar.', f: 'Mensagem “Por que ir até a 10ª”', d: 'Enviada depois da 4ª sessão, quando a dor começa a passar e a vontade de continuar cai.', ir: [['role', 'joana'], ['jtab', 'msgs']] },
    { q: 'J', t: 'E uma lista de espera de verdade.', f: 'Lista de espera ativa', d: 'Vaga liberada com menos de 24h é oferecida na hora, pelo WhatsApp, ao primeiro da fila daquele horário.', ir: [['role', 'joana'], ['jtab', 'espera']] },
    { q: 'J', t: 'Copio a mesma mensagem e troco o nome e o horário. São umas 30 por dia.', f: 'Mensagens com um clique', d: 'A recepção revisa quem recebe e envia de uma vez; da semana 8 em diante, os disparos são automáticos.', ir: [['role', 'joana'], ['jtab', 'msgs']] },
    { q: 'C', t: 'WhatsApp eu uso, mas baixar programa eu não baixo.', f: 'Sem aplicativo: tudo pelo WhatsApp', d: 'Por isso o app mobile ficou fora do escopo do piloto.', ir: [['role', 'paciente'], ['who', 'celia']] },
    { q: 'C', t: 'Meu celular é simples, quem mexe nessas coisas é minha filha.', f: 'Acompanhamento por um responsável', d: 'Um familiar recebe as mesmas notificações por um link próprio, sem ver dados clínicos.', ir: [['role', 'paciente'], ['who', 'filho']] }
  ];
  var V_CONV = 55, V_PART = 110, CUSTO = 18000;
  function receita(u) { return (u.conv * V_CONV + (100 - u.conv) * V_PART) / 100; }   // R$ 77,00 e R$ 93,50

  /* ---------- utilidades ---------- */
  function node(html) { var t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function num(v, d) { return v.toFixed(d == null ? 1 : d).replace('.', ','); }
  function brl(v, cent) {
    var neg = v < 0; v = Math.abs(v);
    var s = cent ? v.toFixed(2) : String(Math.round(v)), p = s.split('.');
    return (neg ? '−' : '') + 'R$ ' + p[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.') + (p[1] ? ',' + p[1] : '');
  }
  function pct(v, d) { return num(v, d == null ? 1 : d).replace(/,0$/, '') + '%'; }
  function seg(items, aria, cls) {
    var g = node('<div class="pd-seg' + (cls ? ' ' + cls : '') + '" role="group" aria-label="' + aria + '"></div>');
    items.forEach(function (it) { var b = node('<button type="button"></button>'); b.textContent = it[1]; b.dataset.v = it[0]; g.appendChild(b); });
    return g;
  }
  function marcar(g, v) { g.querySelectorAll('button').forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.v === String(v) ? 'true' : 'false'); }); }
  function fixFill(svg) { return svg.replace(/(<text[^>]*?) fill="([^"]+)"/g, '$1 style="fill:$2"'); }
  var REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

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

  /* ================= O PROBLEMA ================= */
  var palpite = 'esq';   // abre já mostrando o palpite do Ricardo (esquecimento) contra a pesquisa
  function quiz(container) {
    var c = node('<div class="mk-card pd-quiz"></div>');
    c.innerHTML = '<p class="mk-label">Por que os pacientes faltam? · escolha um palpite e compare com a pesquisa</p>';
    var opts = node('<div class="pd-opts" role="group" aria-label="Seu palpite"></div>');
    PALPITES.forEach(function (p) {
      var b = node('<button type="button"></button>'); b.textContent = p.nome; b.dataset.g = p.g;
      b.addEventListener('click', function () { palpite = p.g; draw(true); if (vozesDraw) { causaSel = p.g; vozesDraw(); } });
      opts.appendChild(b);
    });
    c.appendChild(opts);
    var bars = node('<div class="pd-mot" aria-live="polite"></div>'); c.appendChild(bars);
    var out = node('<div class="pd-quiz-out" aria-live="polite"></div>'); c.appendChild(out);
    container.appendChild(c);
    function draw(anim) {
      opts.querySelectorAll('button').forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.g === palpite ? 'true' : 'false'); });
      var rev = !!palpite;
      bars.innerHTML = '<p class="pd-mot-h">' + (rev ? 'O que disseram ' + RESP + ' pacientes que interromperam o tratamento' : 'Escolha um palpite para revelar a pesquisa') + '</p>' +
        MOTIVOS.map(function (m) {
          var w = rev ? m.n / 9 * 100 : 0, sel = rev && m.g === palpite;
          return '<div class="pd-mot-r' + (sel ? ' is-sel' : '') + (m.g === 'esq' ? ' is-esq' : '') + '"><span class="pd-mot-n">' + esc(m.nome) + '</span>' +
            '<span class="pd-mot-b"><i style="width:' + (anim ? 0 : w) + '%" data-w="' + w + '"></i></span><b>' + (rev ? m.n + ' · ' + pct(m.n / RESP * 100) : '?') + '</b></div>';
        }).join('');
      if (anim && !REDUCED) requestAnimationFrame(function () { requestAnimationFrame(function () { bars.querySelectorAll('i').forEach(function (i) { i.style.width = i.dataset.w + '%'; }); }); });
      if (!rev) { out.innerHTML = ''; return; }
      var p = PALPITES.filter(function (x) { return x.g === palpite; })[0];
      out.innerHTML = '<p>' + esc(p.txt) + '</p><p class="pd-concl"><b>A conclusão do grupo:</b> a causa primária é a ruptura na renovação do convênio na 5ª sessão, somada à percepção de cura precoce. O esquecimento é secundário, então lembretes atacam a causa errada.</p>';
    }
    draw(false);
  }

  var verRenov = true;
  function grafSessoes(container, compacto) {
    var box = node('<figure class="mk-chart pd-chart' + (compacto ? '' : ' mk-card') + '" style="margin:0"></figure>');
    if (!compacto) box.innerHTML = '<h4>A falta do convênio salta de 18% para 44% na 6ª sessão</h4>';
    box.appendChild(node('<div class="mk-legend"><span style="--dot:' + COR.conv + '">Convênio</span><span style="--dot:' + COR.part + '">Particular (pontos citados no documento)</span></div>'));
    var ctr = compacto ? null : node('<label class="gg-check-l"><input type="checkbox"' + (verRenov ? ' checked' : '') + '> Mostrar o momento da renovação do convênio</label>');
    var svgWrap = node('<div></div>'); box.appendChild(svgWrap);
    if (ctr) box.appendChild(ctr);
    box.appendChild(node('<p class="mk-src">' + (compacto
      ? 'O convênio libera 5 sessões por vez, e a renovação leva de 3 a 10 dias úteis sem o horário reservado.'
      : 'O convênio libera 5 sessões por vez e a renovação leva de 3 a 10 dias úteis; nesse intervalo o horário do paciente não fica reservado. Da 7ª à 10ª, a diferença para o particular continua entre 11 e 19 pontos. Passe o mouse nos pontos.') + '</p>'));
    container.appendChild(box);
    var tip = tooltip(box);
    if (ctr) ctr.querySelector('input').addEventListener('change', function (e) { verRenov = e.target.checked; draw(); });
    function draw() {
      var nar = compacto || (svgWrap.clientWidth > 0 && svgWrap.clientWidth < 560);
      var VW = compacto ? 400 : Math.max(400, Math.min(900, Math.round(svgWrap.clientWidth) || 900)), VH = nar ? 220 : 280, l = nar ? 30 : 44, r = VW - (nar ? 16 : 24), t = 18, b = VH - 30;
      var x = function (s) { return l + (r - l) * (s - 1) / 9; }, y = function (v) { return b - (b - t) * v / 50; };
      var s = '<svg viewBox="0 0 ' + VW + ' ' + VH + '" role="img" aria-label="Faltas por sessão: no convênio, 7% na 1ª, 18% na 5ª, 44% na 6ª e 38% na 10ª; no particular, 6% na 1ª, 13% na 5ª, 16% na 6ª e 27% na 10ª">';
      [0, 10, 20, 30, 40, 50].forEach(function (v) { s += '<line class="grid" x1="' + l + '" x2="' + r + '" y1="' + y(v) + '" y2="' + y(v) + '"/><text class="tick" x="' + (l - 8) + '" y="' + (y(v) + 4) + '" text-anchor="end">' + v + '%</text>'; });
      for (var i = 1; i <= 10; i++) s += '<text class="tick" x="' + x(i) + '" y="' + (VH - 8) + '" text-anchor="middle">' + i + 'ª</text>';
      if (verRenov || compacto) s += '<rect x="' + x(5.1) + '" y="' + t + '" width="' + (x(5.9) - x(5.1)) + '" height="' + (b - t) + '" rx="6" fill="rgba(255,107,125,.12)" stroke="rgba(255,107,125,.4)" stroke-dasharray="4 4"/>' +
        (nar ? '' : '<text x="' + x(5.5) + '" y="' + (t + 14) + '" text-anchor="middle" font-size="11" fill="#ff9aa6">renovação</text>');
      var pc = CONV.map(function (v, k) { return x(k + 1) + ',' + y(v); }).join(' ');
      s += '<polyline points="' + pc + '" fill="none" stroke="' + COR.conv + '" stroke-width="2.5" stroke-linejoin="round"/>';
      var kp = Object.keys(PART).map(Number);
      s += '<polyline points="' + kp.map(function (k) { return x(k) + ',' + y(PART[k]); }).join(' ') + '" fill="none" stroke="' + COR.part + '" stroke-width="1.5" stroke-dasharray="3 5" opacity=".7"/>';
      CONV.forEach(function (v, k) {
        var ss = k + 1, salto = ss === 6, tipT = '<b>' + ss + 'ª sessão</b><br>Convênio: ' + v + '% de faltas' + (PART[ss] != null ? '<br>Particular: ' + PART[ss] + '%' : '');
        s += '<g><rect class="hit" tabindex="0" x="' + (x(ss) - (r - l) / 18) + '" y="' + t + '" width="' + ((r - l) / 9) + '" height="' + (b - t) + '" data-x="' + x(ss) + '" data-y="' + (y(v) - 6) + '" data-tip="' + esc(tipT) + '" aria-label="' + esc(tipT.replace(/<br>/g, '. ').replace(/<[^>]+>/g, '')) + '"/>' +
          '<circle class="mark" cx="' + x(ss) + '" cy="' + y(v) + '" r="' + (salto ? 7 : 4.5) + '" fill="' + (salto ? COR.bad : COR.conv) + '" stroke="#0b1a14" stroke-width="2"/>' +
          (PART[ss] != null ? '<circle class="mark" cx="' + x(ss) + '" cy="' + y(PART[ss]) + '" r="4.5" fill="' + COR.part + '" stroke="#0b1a14" stroke-width="2"/>' : '') +
          ((ss === 5 || ss === 6) ? '<text class="val" x="' + (x(ss) + (ss === 5 ? -10 : 12)) + '" y="' + (y(v) + (ss === 5 ? -10 : 4)) + '" text-anchor="' + (ss === 5 ? 'end' : 'start') + '"' + (salto ? ' style="fill:#ff9aa6;font-weight:700"' : '') + '>' + v + '%</text>' : '') + '</g>';
      });
      svgWrap.innerHTML = fixFill(s + '</svg>');
      bindHits(svgWrap.querySelector('svg'), tip, VW);
    }
    draw();
  }

  var unHora = 'bv';
  function grafHoras(container) {
    var c = node('<figure class="mk-card mk-chart pd-horas" style="margin:0"><h4>As pontas do dia faltam quase o dobro</h4></figure>');
    var g = seg([['bv', 'Boa Viagem'], ['cf', 'Casa Forte']], 'Unidade', 'is-sm');
    c.appendChild(g);
    var list = node('<div class="pd-hrs"></div>'); c.appendChild(list);
    c.appendChild(node('<p class="mk-src">Quem perde o horário habitual na renovação do convênio costuma sobrar justamente para as pontas do dia. Boa Viagem concentra 45% da agenda nessas faixas; Casa Forte, 35%.</p>'));
    container.appendChild(c);
    function draw() {
      marcar(g, unHora);
      list.innerHTML = HORAS[unHora].map(function (h) {
        var ponta = h[0] === '7h–9h' || h[0] === '17h–20h';
        return '<div class="pd-hr' + (ponta ? ' is-ponta' : '') + '"><span>' + h[0] + '</span><span class="pd-hr-b"><i style="width:' + (h[1] / 35 * 100) + '%"></i></span><b>' + (h[2] || h[1] + '%') + '</b></div>';
      }).join('');
    }
    g.querySelectorAll('button').forEach(function (b) { b.addEventListener('click', function () { unHora = b.dataset.v; draw(); }); });
    draw();
  }

  function divergencias(container) {
    container.appendChild(node('<div class="pd-div">' +
      '<div class="mk-card"><p class="mk-label">Divergência 1 · a causa das faltas</p><div class="pd-vs"><div><span>Ricardo acredita</span><b>O motivo principal é o esquecimento.</b></div><div class="is-data"><span>Dados e entrevistas</span><b>13% esqueceram; 39% melhoraram ou acharam que não adiantava; 22% citam a demora do convênio.</b></div></div></div>' +
      '<div class="mk-card"><p class="mk-label">Divergência 2 · a agilidade do convênio</p><div class="pd-vs"><div><span>Ricardo afirma</span><b>O convênio libera as sessões rapidamente.</b></div><div class="is-data"><span>Dados e entrevistas</span><b>Joana e Dona Célia relatam de 3 a 10 dias úteis, e as faltas saltam de 18% para 44% na 6ª sessão.</b></div></div></div></div>'));
  }

  var causaSel = 'todas', vozesDraw = null, vozesTodas = false, VOZES_MIN = 6;
  function vozes(container) {
    var c = node('<div class="mk-card pd-vozes"><p class="mk-label">O que disseram nas entrevistas · filtre pela causa</p></div>');
    var g = seg(CAUSAS, 'Causa', 'is-sm');
    c.appendChild(g);
    var list = node('<div class="pd-falas" aria-live="polite"></div>'); c.appendChild(list);
    c.appendChild(node('<p class="mk-src">Trechos das transcrições: Joana, recepcionista de Boa Viagem (24 min, na recepção), e Dona Célia, 67 anos, paciente de convênio (18 min, por telefone, com a filha).</p>'));
    container.appendChild(c);
    function draw() {
      marcar(g, causaSel);
      var sel = FALAS.filter(function (f) { return causaSel === 'todas' || f.c.indexOf(causaSel) >= 0; });
      var resto = vozesTodas ? 0 : Math.max(0, sel.length - VOZES_MIN);
      if (resto) sel = sel.slice(0, VOZES_MIN);
      list.innerHTML = sel.map(function (f) {
        return '<figure class="pd-fala is-' + f.q + '"><span class="pd-av" aria-hidden="true">' + f.q + '</span><div><blockquote>“' + esc(f.t) + '”</blockquote>' +
          '<figcaption><b>' + QUEM[f.q].nome + '</b> · ' + f.c.map(function (k) { return CAUSAS.filter(function (x) { return x[0] === k; })[0][1].toLowerCase(); }).join(', ') + '</figcaption></div></figure>';
      }).join('') + (resto ? '<button type="button" class="mk-btn pd-mais">Ver as outras ' + resto + ' falas ↓</button>' : '');
      var mais = list.querySelector('.pd-mais');
      if (mais) mais.addEventListener('click', function () { vozesTodas = true; draw(); });
    }
    g.querySelectorAll('button').forEach(function (b) { b.addEventListener('click', function () { causaSel = b.dataset.v; draw(); }); });
    vozesDraw = draw; draw();
  }

  /* ================= DA ENTREVISTA À TELA ================= */
  /* ---------- controle do protótipo embutido ----------
     O protótipo (mesma origem) trata todo clique em [data-a] por delegação. Para acionar uma ação,
     mesmo de uma tela que não está à vista, basta clicar num botão invisível com o data-a certo.
     Passos: [ação, valor] aciona direto; ['btn', ação] só clica se o botão existir na tela; ['wait', ms] espera. */
  function protoPronto(ifr, fn) {
    var ok = false;
    try { ok = ifr.contentDocument.readyState === 'complete' && !!ifr.contentDocument.querySelector('#app [data-a]'); } catch (e) {}
    if (ok) { fn(); return; }
    ifr.loading = 'eager';
    ifr.addEventListener('load', function on() { ifr.removeEventListener('load', on); setTimeout(fn, 80); });
  }
  function protoRun(seq, depois) {
    var ifr = root && root.querySelector('.pd-frame iframe');
    if (!ifr) return;
    protoPronto(ifr, function () {
      var d; try { d = ifr.contentDocument; } catch (e) { return; }
      var k = 0;
      (function next() {
        if (k >= seq.length) { try { ifr.contentWindow.scrollTo(0, 0); } catch (e) {} if (depois) depois(); return; }
        var p = seq[k++];
        try {
          if (p[0] === 'wait') { setTimeout(next, p[1]); return; }
          if (p[0] === 'btn') { var el = d.querySelector('[data-a="' + p[1] + '"]' + (p[2] ? '[data-v="' + p[2] + '"]' : '')); if (el && !el.disabled) el.click(); }
          else { var b = d.createElement('button'); b.type = 'button'; b.hidden = true; b.dataset.a = p[0]; if (p[1] != null) b.dataset.v = p[1]; d.body.appendChild(b); b.click(); b.remove(); }
        } catch (e) {}
        setTimeout(next, 60);
      })();
    });
  }
  // a partir de outra aba: abre a aba do protótipo e mostra a tela pedida
  function irProto(seq) { setAba('prototipo'); protoRun(seq); }
  var rastroQuem = 'todas', rastroSel = 0;
  function rastro(container) {
    var c = node('<div class="mk-card pd-rastro"><p class="mk-label">Da entrevista à tela · cada funcionalidade nasceu de uma fala</p>' +
      '<p class="cm-note">Antes de desenhar o protótipo, liguei o que a Joana e a Dona Célia pediram, quase com essas palavras, a uma tela da Trilha 10. Escolha uma fala para ver a tela que ela virou.</p></div>');
    var g = seg([['todas', 'Todas'], ['J', 'Joana'], ['C', 'Dona Célia']], 'Quem falou', 'is-sm');
    c.appendChild(g);
    var grid = node('<div class="pd-rx"><ol class="pd-rx-l" role="list"></ol><div class="pd-rx-d" aria-live="polite"></div></div>');
    var list = grid.querySelector('ol'), det = grid.querySelector('.pd-rx-d');
    c.appendChild(grid);
    container.appendChild(c);
    var estreito = window.matchMedia('(max-width: 760px)');
    function draw() {
      marcar(g, rastroQuem);
      var vis = RASTRO.map(function (r, i) { return i; }).filter(function (i) { return rastroQuem === 'todas' || RASTRO[i].q === rastroQuem; });
      if (vis.indexOf(rastroSel) < 0) rastroSel = vis[0];
      list.innerHTML = vis.map(function (i) {
        var r = RASTRO[i];
        return '<li class="is-' + r.q + (i === rastroSel ? ' is-on' : '') + '"><button type="button" data-i="' + i + '" aria-pressed="' + (i === rastroSel) + '"><span class="pd-av" aria-hidden="true">' + r.q + '</span><q>' + esc(r.t) + '</q><span class="pd-rx-arrow" aria-hidden="true">→</span></button></li>';
      }).join('');
      var r = RASTRO[rastroSel];
      det.innerHTML = '<p class="pd-rx-de"><span class="pd-av" aria-hidden="true">' + r.q + '</span>' + QUEM[r.q].nome + ' pediu</p>' +
        '<blockquote>“' + esc(r.t) + '”</blockquote><p class="pd-rx-vira">virou a tela</p><b class="pd-rx-f">' + esc(r.f) + '</b><p class="pd-rx-desc">' + esc(r.d) + '</p>' +
        '<button type="button" class="mk-btn is-main" data-ir>Ver no protótipo →</button>';
      det.querySelector('[data-ir]').addEventListener('click', function () { irProto(r.ir); });
      // no celular, o detalhe aparece logo abaixo da fala escolhida
      var on = list.querySelector('li.is-on');
      if (estreito.matches && on) on.appendChild(det); else if (det.parentNode !== grid) grid.appendChild(det);
      list.querySelectorAll('[data-i]').forEach(function (b) { b.addEventListener('click', function () { rastroSel = +b.dataset.i; draw(); }); });
    }
    g.querySelectorAll('button').forEach(function (b) { b.addEventListener('click', function () { rastroQuem = b.dataset.v; draw(); }); });
    if (estreito.addEventListener) estreito.addEventListener('change', draw);
    draw();
  }

  /* ================= OS NÚMEROS ================= */
  var metas = { bv: UN.bv.meta, cf: UN.cf.meta };
  function custo(container) {
    var c = node('<div class="mk-card pd-custo"><p class="mk-label">Quanto as faltas custam por mês</p></div>');
    var rows = ['bv', 'cf'].map(function (k) {
      var u = UN[k], f = u.sess * u.falta / 100, rv = receita(u);
      return { k: k, u: u, f: f, rv: rv, perda: f * rv };
    });
    var total = rows[0].perda + rows[1].perda;
    c.insertAdjacentHTML('beforeend', '<div class="pd-units">' + rows.map(function (r) {
      return '<div class="pd-unit"><h4>' + r.u.nome + '</h4><ol>' +
        '<li><span>' + r.u.sess + ' sessões/mês × ' + r.u.falta + '% de faltas</span><b>' + num(r.f, r.f % 1 ? 1 : 0) + ' faltas</b></li>' +
        '<li><span>Receita média: ' + r.u.conv + '% convênio (R$ 55) + ' + (100 - r.u.conv) + '% particular (R$ 110)</span><b>' + brl(r.rv, true) + '</b></li>' +
        '<li class="is-loss"><span>Faturamento perdido</span><b>' + brl(r.perda, true) + '</b></li></ol></div>';
    }).join('') + '</div>' +
      '<div class="pd-share" role="img" aria-label="Boa Viagem responde por ' + pct(rows[0].perda / total * 100) + ' do prejuízo"><span style="width:' + (rows[0].perda / total * 100) + '%">Boa Viagem · ' + pct(rows[0].perda / total * 100) + '</span><span style="width:' + (rows[1].perda / total * 100) + '%">Casa Forte</span></div>' +
      '<div class="pd-total"><div><b>' + brl(total, true) + '</b><span>por mês na rede</span></div><div><b>' + brl(total * 12, true) + '</b><span>projeção anual</span></div>' +
      '<p class="cm-note">Os fisioterapeutas recebem salário fixo: cada falta é faturamento perdido sem nenhuma redução de custo. Por isso Boa Viagem é o foco do piloto.</p></div>');
    container.appendChild(c);
  }

  function simulador(container) {
    var c = node('<div class="mk-card pd-sim"></div>');
    c.innerHTML = '<p class="mk-label">Simulador de metas · e se a solução reduzir as faltas?</p>' +
      '<p class="cm-note">As metas do documento para 3 meses após o lançamento são 25% → 12% em Boa Viagem e 17% → 10% em Casa Forte. Mexa nelas e veja o retorno do investimento de R$ 18 mil mudar.</p>';
    var grid = node('<div class="pd-sim-grid"></div>'), sls = node('<div class="mk-sliders"></div>'), out = node('<div class="pd-sim-out" aria-live="polite"></div>');
    var pres = seg([['doc', 'Metas do documento'], ['metade', 'Só metade da meta'], ['zero', 'Sem melhora']], 'Cenários', 'is-sm');
    ['bv', 'cf'].forEach(function (k) {
      var u = UN[k], id = 'pd-meta-' + k;
      var s = node('<div class="mk-sl"><div class="mk-sl-top"><label for="' + id + '">Faltas em ' + u.nome + '</label><output></output></div>' +
        '<input id="' + id + '" type="range" min="5" max="' + u.falta + '" step="1" value="' + metas[k] + '">' +
        '<p class="mk-sl-notes"><span style="--dot:' + COR.bad + '">hoje: ' + u.falta + '%</span><span style="--dot:' + COR.ok + '">meta do documento: ' + u.meta + '%</span></p></div>');
      var inp = s.querySelector('input'), o = s.querySelector('output');
      o.textContent = metas[k] + '%';
      inp.addEventListener('input', function () { metas[k] = +inp.value; o.textContent = inp.value + '%'; draw(); });
      sls.appendChild(s);
    });
    var left = node('<div class="pd-sim-left"></div>'); left.appendChild(pres); left.appendChild(sls);
    grid.appendChild(left); grid.appendChild(out); c.appendChild(grid);
    c.appendChild(node('<p class="mk-src">As projeções são potencial de faturamento bruto, não lucro líquido, e pressupõem que as sessões recuperadas sejam de fato realizadas. ROI do 1º ano: 9 meses de operação depois do piloto de 10 semanas.</p>'));
    container.appendChild(c);
    pres.querySelectorAll('button').forEach(function (b) {
      b.addEventListener('click', function () {
        ['bv', 'cf'].forEach(function (k) {
          var u = UN[k];
          metas[k] = b.dataset.v === 'doc' ? u.meta : b.dataset.v === 'zero' ? u.falta : Math.round(u.falta - (u.falta - u.meta) / 2);
          var inp = sls.querySelector('#pd-meta-' + k); inp.value = metas[k]; inp.closest('.mk-sl').querySelector('output').textContent = metas[k] + '%';
        });
        draw();
      });
    });
    function draw() {
      var d = ['bv', 'cf'].map(function (k) { var u = UN[k], rec = u.sess * (u.falta - metas[k]) / 100; return { u: u, rec: rec, val: rec * receita(u) }; });
      var mes = d[0].val + d[1].val, pay = mes > 0 ? CUSTO / mes : null, roi = (9 * mes - CUSTO) / CUSTO * 100;
      var doc = metas.bv === UN.bv.meta && metas.cf === UN.cf.meta, zero = metas.bv === UN.bv.falta && metas.cf === UN.cf.falta;
      marcar(pres, doc ? 'doc' : zero ? 'zero' : (metas.bv === Math.round(UN.bv.falta - (UN.bv.falta - UN.bv.meta) / 2) && metas.cf === Math.round(UN.cf.falta - (UN.cf.falta - UN.cf.meta) / 2)) ? 'metade' : '');
      var ganho9 = Math.max(0, 9 * mes), maxBar = Math.max(ganho9, CUSTO) || 1;
      out.innerHTML =
        '<div class="gg-kpis pd-kpis">' +
          '<div class="gg-kpi"><b>' + num(d[0].rec + d[1].rec, (d[0].rec + d[1].rec) % 1 ? 1 : 0) + '</b><span>sessões recuperadas por mês</span></div>' +
          '<div class="gg-kpi' + (mes > 0 ? ' is-good' : '') + '"><b>' + brl(mes, true) + '</b><span>receita recuperada por mês</span></div>' +
          '<div class="gg-kpi' + (pay && pay <= 3 ? ' is-good' : pay ? '' : ' is-bad') + '"><b>' + (pay ? num(pay, pay < 10 ? 1 : 0) + ' meses' : 'não se paga') + '</b><span>payback dos R$ 18 mil</span></div>' +
          '<div class="gg-kpi' + (roi > 0 ? ' is-good' : ' is-bad') + '"><b>' + pct(roi) + '</b><span>ROI no 1º ano (9 meses)</span></div></div>' +
        '<div class="pd-roi" aria-hidden="true"><div><span>Investimento</span><i style="width:' + (CUSTO / maxBar * 100) + '%;background:rgba(233,245,238,.35)"></i><b>' + brl(CUSTO) + '</b></div>' +
          '<div><span>Recuperado em 9 meses</span><i style="width:' + (ganho9 / maxBar * 100) + '%;background:' + COR.ok + '"></i><b>' + brl(ganho9) + '</b></div></div>' +
        (doc ? '<p class="pd-check">✓ Exatamente a conta do documento: R$ 8.754,90/mês, payback de ~2,05 meses e ROI de 337,7%.</p>' : '');
    }
    draw();
  }

  function agencia(container) {
    var c = node('<div class="mk-card pd-ag"><p class="mk-label">A proposta da agência × a solução do squad</p></div>');
    var L = [
      ['Foco', 'Agendamento genérico e lembretes', 'Renovação antecipada do convênio, orientação clínica e lista de espera ativa'],
      ['Causa atacada', 'Esquecimento: 13% das faltas', 'Ruptura do convênio na 5ª sessão (44% na 6ª) e abandono por melhora (39%)'],
      ['Investimento no 1º ano', 'R$ 15.000 + R$ 400/mês = R$ 19.800', 'R$ 18.000 (squad de 10 semanas + infraestrutura)'],
      ['Prazo', '4 meses (16 semanas)', '10 semanas, piloto em operação em 2,5 meses'],
      ['Retorno', 'Indeterminado: não reduz o gargalo do convênio', '~2,1 meses depois da implantação']
    ];
    c.insertAdjacentHTML('beforeend', '<div class="pd-ag-t" role="table"><div role="row" class="is-h"><span role="columnheader"></span><span role="columnheader">Agência terceira</span><span role="columnheader" class="is-us">Squad CITi</span></div>' +
      L.map(function (r) { return '<div role="row"><span role="rowheader">' + r[0] + '</span><span role="cell">' + r[1] + '</span><span role="cell" class="is-us">' + r[2] + '</span></div>'; }).join('') + '</div>' +
      '<div class="pd-prazo" aria-label="Prazo de entrega: agência 16 semanas, squad 10 semanas"><div><span>Agência</span><i style="width:100%"></i><b>16 sem.</b></div><div class="is-us"><span>Squad</span><i style="width:' + (10 / 16 * 100) + '%"></i><b>10 sem.</b></div></div>');
    container.appendChild(c);
  }

  function porQueBV(container) {
    container.appendChild(node('<div class="mk-card pd-bv"><p class="mk-label">Por que Boa Viagem falta 8 pontos a mais que Casa Forte</p>' +
      '<div class="pd-bv-g">' +
        '<div><b>Critério de registro</b><p>Em BV, cancelamento com menos de 24h conta como falta; em CF, só a ausência sem aviso. Parte das faltas de BV é desmarcação tardia, que pede lista de espera.</p></div>' +
        '<div><b>~3 pontos · perfil</b><p>Convênio falta 25,2% e particular 15,5%. Pela carteira, o esperado seria 21,3% em BV e 18,4% em CF.</p></div>' +
        '<div><b>~1,5 ponto · horários</b><p>BV tem 45% da agenda nas pontas do dia; CF, 35%.</p></div>' +
        '<div><b>Acompanhamento</b><p>Em CF, a fisioterapeuta confirma e manda vídeos de exercícios; em BV, a confirmação é manual pela recepção.</p></div>' +
      '</div><p class="cm-note">Os fatores se sobrepõem, então os efeitos não podem ser simplesmente somados. O que sobra vem do acompanhamento, do trânsito ou de variáveis que os relatórios não isolam.</p></div>'));
  }

  /* ================= A SOLUÇÃO ================= */
  var fluxo = 'tobe';
  function jornada(container) {
    var c = node('<div class="mk-card pd-jor"></div>');
    c.innerHTML = '<p class="mk-label">A jornada de um paciente de convênio, sessão por sessão</p>';
    var g = seg([['asis', 'Hoje (as-is)'], ['tobe', 'Com a Trilha 10 (to-be)']], 'Fluxo');
    c.appendChild(g);
    var trilha = node('<div class="pd-trilha" aria-live="polite"></div>'); c.appendChild(trilha);
    var notas = node('<div class="pd-notas"></div>'); c.appendChild(notas);
    container.appendChild(c);
    function draw() {
      marcar(g, fluxo);
      var asis = fluxo === 'asis', h = '';
      for (var s = 1; s <= 10; s++) {
        var cls = s <= 5 ? 'is-lib' : asis ? (s === 6 ? 'is-falha' : 'is-risco') : 'is-lib2';
        var ev = !asis && s === 3 ? '<em class="pd-ev is-alert">alerta: pedir laudo e renovação</em>' : !asis && s === 4 ? '<em class="pd-ev is-msg">WhatsApp: por que ir até a 10ª</em>' : asis && s === 6 ? '<em class="pd-ev is-bad">44% faltam</em>' : '';
        h += '<div class="pd-s ' + cls + '"><span>' + s + 'ª</span>' + ev + '</div>';
        if (s === 5) h += asis
          ? '<div class="pd-gap is-bad"><b>3 a 10 dias úteis</b><span>esperando o convênio, sem horário reservado</span></div>'
          : '<div class="pd-gap is-ok"><b>sem pausa</b><span>renovação pedida na 3ª, horário guardado</span></div>';
      }
      trilha.innerHTML = h;
      trilha.className = 'pd-trilha is-' + fluxo;
      notas.innerHTML = asis
        ? '<p class="pd-nt-h">O que acontece hoje</p><ul class="pd-nt is-asis">' +
            '<li><b>Renovação tardia.</b> O convênio libera 5 sessões por vez; a renovação só é pedida quando elas acabam e leva de 3 a 10 dias úteis.</li>' +
            '<li><b>Horário perdido.</b> O horário não fica reservado: Dona Célia esperou cerca de 10 dias, perdeu as 10h e só sobraram 7h ou 18h.</li>' +
            '<li><b>A dor já passou.</b> No mesmo momento, ninguém explicou por que as últimas sessões importam.</li></ul>'
        : '<p class="pd-nt-h">O que muda</p><ul class="pd-nt is-tobe">' +
            '<li><b>Renovação na 2ª ou 3ª sessão.</b> O sistema avisa a recepção para pedir o laudo de evolução ao fisioterapeuta e solicitar a renovação: quando a 5ª termina, a 6ª já está autorizada, no mesmo horário.</li>' +
            '<li><b>Por que ir até a 10ª.</b> Entre as semanas 2 e 7, uma trilha de mensagens explica.</li>' +
            '<li><b>Lista de espera ativa.</b> Se alguém cancela com menos de 24h, a vaga é oferecida na hora.</li></ul>';
    }
    g.querySelectorAll('button').forEach(function (b) { b.addEventListener('click', function () { fluxo = b.dataset.v; draw(); }); });
    draw();
  }

  /* ================= O PROTÓTIPO ================= */
  var HIST = [
    { t: 'A Dona Célia sabe que o horário é dela', quem: 'Paciente · WhatsApp', d: 'Na véspera da 5ª sessão ela recebe o lembrete e, antes disso, o aviso de que a renovação já foi pedida: terça e quinta, às 10h, continuam dela até a 10ª.', resolve: 'O horário repassado durante a espera do convênio', ir: [['role', 'paciente'], ['who', 'celia'], ['whats']] },
    { t: 'Ela acompanha a renovação sem precisar ligar', quem: 'Paciente · página pelo link', d: 'Pelo link da mensagem, ela vê a trilha das 10 sessões e em que pé está o pedido ao plano.', resolve: 'A falta de notícia nos 3 a 10 dias úteis de espera', ir: [['role', 'paciente'], ['who', 'celia'], ['whats'], ['open']] },
    { t: 'O convênio libera, sem pausa no tratamento', quem: 'Paciente · página pelo link', d: 'Como o pedido saiu na 3ª sessão, a resposta chega antes de a 5ª acabar: a 6ª já está confirmada, no mesmo horário.', resolve: 'O salto de 18% para 44% de faltas na 6ª sessão', ir: [['role', 'paciente'], ['who', 'celia'], ['whats'], ['open'], ['btn', 'simulate'], ['wait', 950]] },
    { t: 'Um cancelamento vira vaga oferecida', quem: 'Joana · fila do dia', d: 'A Carla cancelou com menos de 24h. A Joana vê a vaga aberta e, com um clique, oferece ao primeiro da lista de espera que pode naquele horário.', resolve: 'As desmarcações tardias, hoje preenchidas “de cabeça”', ir: [['role', 'joana'], ['jtab', 'fila'], ['panel', '9|11h'], ['wait', 250], ['btn', 'offer']] },
    { t: 'A mensagem que segura o paciente até a 10ª', quem: 'Joana · mensagens', d: 'A trilha de mensagens: depois da 4ª sessão, o paciente recebe por que as sessões 6 a 10 importam, mesmo com a dor passando.', resolve: 'A sensação de cura precoce, o maior grupo da pesquisa (39%)', ir: [['role', 'joana'], ['jtab', 'msgs']] },
    { t: 'O Ricardo vê o dinheiro voltar', quem: 'Ricardo · painel do dono', d: 'Em “Com a Trilha 10”, o painel mostra quanto das cadeiras vazias volta a faturar, com as premissas na mão para ele testar.', resolve: 'Decidir com dado, e não pelo palpite do esquecimento', ir: [['role', 'ricardo'], ['mode', 'trilha']] }
  ];
  var passo = -1;
  function prototipo(container) {
    var c = node('<div class="pd-proto"></div>');
    c.innerHTML = '<div class="pd-proto-top"><div><p class="mk-label">Minha parte · protótipo navegável</p><h3>Trilha 10</h3>' +
      '<p class="cm-note">Plataforma web com acesso por perfil e WhatsApp automatizado. Siga a história da Dona Célia passo a passo, ou explore livremente usando “Ver como” no topo do protótipo.</p></div>' +
      '<div class="mk-actions"><button class="mk-btn is-main" type="button" data-full>Tela cheia ⤢</button><a class="mk-btn" href="' + PROTO + '" target="_blank" rel="noopener">Abrir em nova aba ↗</a></div></div>';
    var stage = node('<div class="pd-stage"></div>');
    var story = node('<aside class="pd-story" aria-label="A história da Dona Célia em 6 passos"></aside>');
    story.innerHTML = '<div class="pd-story-head"><p class="mk-label">A história da Dona Célia em 6 passos</p><span class="pd-prog" aria-live="polite"></span></div>' +
      '<div class="pd-progbar" aria-hidden="true"><i></i></div><ol class="pd-steps"></ol><div class="pd-story-cur" aria-live="polite"></div>' +
      '<div class="pd-story-nav"><button type="button" class="mk-btn" data-nav="-1">← Anterior</button><button type="button" class="mk-btn is-main" data-nav="1"></button></div>' +
      '<button type="button" class="pd-restart" hidden>Recomeçar a história</button>';
    var frame = node('<div class="pd-frame"><div class="pd-frame-bar"><i></i><i></i><i></i><span>trilha10 · protótipo navegável</span><button type="button" class="pd-exit" data-exit hidden>Sair da tela cheia ✕</button></div></div>');
    var ifr = document.createElement('iframe');
    ifr.title = 'Protótipo Trilha 10'; ifr.src = PROTO;
    frame.appendChild(ifr);
    stage.appendChild(story); stage.appendChild(frame);
    c.appendChild(stage);
    container.appendChild(c);

    var list = story.querySelector('.pd-steps'), prog = story.querySelector('.pd-prog'), bar = story.querySelector('.pd-progbar i');
    var prev = story.querySelector('[data-nav="-1"]'), next = story.querySelector('[data-nav="1"]'), restart = story.querySelector('.pd-restart');
    list.innerHTML = HIST.map(function (h, i) {
      return '<li><button type="button" data-p="' + i + '"><span class="pd-step-n">' + (i + 1) + '</span><span class="pd-step-t"><b>' + esc(h.t) + '</b><small>' + esc(h.quem) + '</small></span></button>' +
        '<div class="pd-step-d"><p>' + esc(h.d) + '</p><p class="pd-resolve"><span>Resolve</span>' + esc(h.resolve) + '</p></div></li>';
    }).join('');
    function draw() {
      list.querySelectorAll('li').forEach(function (li, i) { li.className = i === passo ? 'is-on' : i < passo ? 'is-done' : ''; li.querySelector('button').setAttribute('aria-current', i === passo ? 'step' : 'false'); });
      prog.textContent = passo < 0 ? '6 passos · 1 minuto' : 'Passo ' + (passo + 1) + ' de ' + HIST.length;
      bar.style.width = ((passo + 1) / HIST.length * 100) + '%';
      prev.disabled = passo <= 0;
      next.textContent = passo < 0 ? 'Começar a história ▶' : passo >= HIST.length - 1 ? 'Fim da história ✓' : 'Próximo passo →';
      next.disabled = passo >= HIST.length - 1;
      restart.hidden = passo < HIST.length - 1;
      var h = HIST[passo];
      story.querySelector('.pd-story-cur').innerHTML = h
        ? '<small>Passo ' + (passo + 1) + ' · ' + esc(h.quem) + '</small><b>' + esc(h.t) + '</b><p>' + esc(h.d) + '</p><p class="pd-resolve"><span>Resolve</span>' + esc(h.resolve) + '</p>'
        : '<b>Siga a história ou explore à vontade</b><p>Em 6 passos, o protótipo mostra cada problema encontrado sendo resolvido, da Dona Célia ao Ricardo.</p>';
    }
    function ir(i) {
      passo = Math.max(0, Math.min(HIST.length - 1, i)); draw();
      protoRun(HIST[passo].ir);
      var on = list.querySelector('li.is-on');
      if (on && stage.classList.contains('is-full')) on.scrollIntoView({ block: 'nearest' });
    }
    list.querySelectorAll('[data-p]').forEach(function (b) { b.addEventListener('click', function () { ir(+b.dataset.p); }); });
    prev.addEventListener('click', function () { ir(passo - 1); });
    next.addEventListener('click', function () { ir(passo + 1); });
    restart.addEventListener('click', function () { protoRun([['reset']], function () { ir(0); }); });

    // tela cheia: a API do navegador quando existe (computador e Android); no iPhone, o quadro cobre a tela por CSS
    var exitBtn = frame.querySelector('[data-exit]'), fullBtn = c.querySelector('[data-full]');
    function setFull(on) {
      stage.classList.toggle('is-full', on); exitBtn.hidden = !on;
      fullBtn.textContent = on ? 'Sair da tela cheia' : 'Tela cheia ⤢';
      root.classList.toggle('pd-has-full', on);
    }
    function entrar() {
      setFull(true);
      if (stage.requestFullscreen) stage.requestFullscreen().catch(function () {});
      else if (stage.webkitRequestFullscreen) try { stage.webkitRequestFullscreen(); } catch (e) {}
    }
    function sair() {
      var fe = document.fullscreenElement || document.webkitFullscreenElement;
      if (fe) { (document.exitFullscreen || document.webkitExitFullscreen).call(document); }
      setFull(false);
    }
    fullBtn.addEventListener('click', function () { if (stage.classList.contains('is-full')) sair(); else entrar(); });
    exitBtn.addEventListener('click', sair);
    function onFs() { if (!(document.fullscreenElement || document.webkitFullscreenElement) && stage.classList.contains('is-full')) setFull(false); }
    document.addEventListener('fullscreenchange', onFs); document.addEventListener('webkitfullscreenchange', onFs);
    prototipo.sair = function () { if (stage.classList.contains('is-full')) { sair(); return true; } return false; };
    passo = -1; draw();
  }

  function telas(container) {
    var T = [
      ['WhatsApp do paciente', 'Confirmação, remarcação e acompanhamento transparente da renovação, inclusive para o responsável.'],
      ['Cadastro de novos clientes', 'Formulário de autoatendimento: unidade, particular ou convênio e documentos em menos de um minuto.'],
      ['Aba da recepção', 'Alertas de vagas abertas por cancelamento tardio, de laudo na 2ª/3ª sessão e o status das guias.'],
      ['Mensagens automáticas', 'Trilha de engajamento: com um clique da recepção nas semanas 2 a 7, automática a partir da 8ª.'],
      ['Lista de espera', 'Fila por horário e preferência; vaga liberada com menos de 24h é oferecida na hora pelo WhatsApp.'],
      ['Aba do fisioterapeuta', 'Só os próprios pacientes: relatório de evolução para o convênio em poucos cliques e vídeos de exercícios.'],
      ['Painel do Ricardo', 'Faturamento perdido em cadeiras vazias e um simulador de premissas.']
    ];
    container.appendChild(node('<div class="mk-card pd-telas"><p class="mk-label">O que o protótipo cobre</p><ol>' + T.map(function (t, i) { return '<li><span>' + (i + 1) + '</span><div><b>' + t[0] + '</b><p>' + t[1] + '</p></div></li>'; }).join('') + '</ol></div>'));
  }

  function escopo(container) {
    container.appendChild(node('<div class="pd-esc">' +
      '<div class="mk-card"><p class="mk-label">Escopo do piloto · entra</p><ul class="pd-in"><li>Plataforma web com acesso por perfil: recepção, fisioterapeuta, cadastro e painel do Ricardo</li><li>WhatsApp Business API: lista de espera e régua educacional</li><li>Alerta de renovação antecipada do convênio na 3ª sessão</li></ul></div>' +
      '<div class="mk-card"><p class="mk-label">Não entra, e por quê</p><ul class="pd-out"><li><b>App mobile:</b> pacientes idosos resistem a baixar aplicativos; o WhatsApp não tem fricção.</li><li><b>Integração com os portais dos convênios:</b> custo e licenças estourariam os R$ 20 mil e as 10 semanas. A recepção segue pedindo no portal, guiada pelo alerta da 3ª sessão.</li></ul></div>' +
      '<div class="mk-card pd-plano"><p class="mk-label">Plano de 10 semanas</p><div class="pd-gantt">' +
        [[1, 2, 'Discovery e validação das telas com Joana e os fisioterapeutas'], [3, 6, 'Plataforma web: front, back, acesso por perfil e alertas da 3ª sessão'], [7, 8, 'API do WhatsApp, réguas de mensagens e lista de espera'], [9, 10, 'Testes, treinamento em Boa Viagem e homologação do piloto']].map(function (f) {
          return '<div class="pd-fase" style="--a:' + f[0] + ';--b:' + f[1] + '"><span>sem. ' + f[0] + '–' + f[1] + '</span><b>' + f[2] + '</b></div>';
        }).join('') + '</div></div></div>'));
  }

  /* ================= O GRUPO ================= */
  function grupo(container, compacto) {
    if (compacto) {
      container.appendChild(node('<div class="pd-team is-compact"><p>Grupo 5 · seis pessoas, cada uma com uma frente e revisando a de outra.</p><ul>' + GRUPO.map(function (p) {
        return '<li' + (p[3] ? ' class="is-me"' : '') + '><b>' + esc(p[0]) + (p[3] ? ' · eu' : '') + '</b><span>' + esc(p[1]) + '</span></li>';
      }).join('') + '</ul></div>'));
      return;
    }
    container.appendChild(node('<div class="mk-card pd-team"><p class="mk-label">Quem fez o quê · Grupo 5</p><ul>' + GRUPO.map(function (p) {
      return '<li' + (p[3] ? ' class="is-me"' : '') + '><div><b>' + esc(p[0]) + '</b><span>' + esc(p[1]) + (p[3] ? ' · minha parte, com o Tom' : '') + '</span></div><p>' + esc(p[2]) + '</p></li>';
    }).join('') + '</ul><p class="cm-note">Além da minha parte, revisei as causas principais e as divergências entre as fontes.</p></div>'));
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
  function getDoc() { return docP || (docP = loadLib().then(function (lib) { return lib.getDocument(DOC.url).promise; })); }
  function pdfView(container, full) {
    var box = node('<div class="mk-pdf ' + (full ? 'is-full' : 'is-compact') + '" tabindex="0" aria-label="Documento da entrega de Produto"><p class="mk-pdf-msg">Carregando o documento…</p></div>');
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
    return '<a class="mk-btn is-main" href="' + DOC.url + '" download="' + DOC.url + '">Baixar PDF ↓</a>' +
      '<a class="mk-btn" href="' + DOC.url + '" target="_blank" rel="noopener">Abrir em nova aba ↗</a>' + (extra || '');
  }

  /* ================= TELA CHEIA ================= */
  var root, body, lastFocus, aba = 'problema';
  var TABS = [['problema', 'O problema'], ['prototipo', 'Protótipo navegável'], ['numeros', 'Os números'], ['solucao', 'A solução'], ['documento', 'Documento e grupo']];
  function build() {
    root = node('<div id="pd" role="dialog" aria-modal="true" aria-labelledby="pd-title" hidden></div>');
    root.innerHTML =
      '<header class="mk-top"><div class="mk-top-row">' +
        '<div><div class="mk-eyebrow">Produto · Órbita 5 · Entrega em grupo</div><h2 class="mk-title" id="pd-title">Por que os pacientes da Clínica Movimento faltam?</h2></div>' +
        '<div class="mk-top-actions"><a class="mk-btn" href="' + DOC.url + '" download="' + DOC.url + '">Baixar PDF ↓</a><button class="mk-btn" type="button" data-close>Voltar ao planeta ✕</button></div></div>' +
        '<div class="mk-tabs" role="tablist" aria-label="Partes da entrega">' + TABS.map(function (t) { return '<button class="mk-tab" type="button" role="tab" data-tab="' + t[0] + '">' + t[1] + '</button>'; }).join('') + '</div></header>' +
      '<div class="mk-body"><div class="mk-wrap" id="pd-content"></div></div>';
    body = root.querySelector('#pd-content');
    root.querySelector('[data-close]').addEventListener('click', fechar);
    root.querySelectorAll('[data-tab]').forEach(function (b) { b.addEventListener('click', function () { setAba(b.dataset.tab); }); });
    document.body.appendChild(root);
    window.addEventListener('keydown', function (e) {
      if (root.hidden) return;
      if (e.key === 'Escape') { if (!(prototipo.sair && prototipo.sair())) fechar(); e.stopImmediatePropagation(); }
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') e.stopImmediatePropagation();
    }, true);
  }
  function hero() {
    var h = node('<div class="mk-hero"></div>');
    h.innerHTML =
      '<div class="mk-card mk-hero-main"><p class="mk-label">✓ Resumo para o Ricardo · entrega do Grupo 5</p>' +
        '<p class="mk-big">Não é esquecimento: é a <mark>renovação do convênio</mark> na 5ª sessão</p>' +
        '<p class="mk-lead">As faltas custam R$ 18.225,90 por mês. Só 13% dos abandonos são esquecimento; no convênio, a falta salta de 18% para 44% quando acabam as 5 sessões liberadas, somada à sensação de cura precoce. Em vez dos lembretes da agência, propomos renovação antecipada na 3ª sessão e lista de espera ativa, dentro dos R$ 20 mil e das 10 semanas.</p></div>' +
      '<div class="mk-stats">' +
        '<div class="mk-stat"><b>R$ 18.225,90</b><span>perdidos por mês com faltas</span></div>' +
        '<div class="mk-stat"><b>18% → 44%</b><span>de faltas no convênio, da 5ª para a 6ª sessão</span></div>' +
        '<div class="mk-stat"><b>R$ 18 mil</b><span>em 10 semanas, contra R$ 19.800 e 16 semanas da agência</span></div>' +
        '<div class="mk-stat"><b>~2,1 meses</b><span>de payback com as metas de 3 meses</span></div></div>';
    return h;
  }
  function setAba(t) {
    aba = t;
    if (prototipo.sair) { prototipo.sair(); prototipo.sair = null; }
    root.querySelectorAll('[data-tab]').forEach(function (b) { b.setAttribute('aria-selected', b.dataset.tab === t ? 'true' : 'false'); });
    body.innerHTML = '';
    vozesDraw = null;
    body.appendChild(window.CITI_RESUMO ? window.CITI_RESUMO(hero(), t === 'problema' ? 'medio' : 'fino') : hero());
    if (t === 'problema') {
      quiz(body); vozes(body);
      var g = node('<div class="pd-two"></div>'); body.appendChild(g);
      grafSessoes(g, false); grafHoras(g);
      divergencias(body);
    } else if (t === 'numeros') { custo(body); simulador(body); agencia(body); porQueBV(body); }
    else if (t === 'prototipo') { prototipo(body); telas(body); }
    else if (t === 'solucao') { jornada(body); rastro(body); escopo(body); }
    else {
      grupo(body, false);
      var d = node('<div class="mk-card" style="display:grid;gap:14px"><div class="mk-doc-bar"><p>' + DOC.nome + ' · ' + DOC.pags + ' páginas · PDF</p><div class="mk-actions">' + pdfButtons() + '</div></div></div>');
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
    if (prototipo.sair) { prototipo.sair(); prototipo.sair = null; }
    root.classList.remove('is-open');
    setTimeout(function () { if (root.classList.contains('is-open')) return; root.hidden = true; body.innerHTML = ''; }, 280);   // tira o iframe do protótipo da memória
    if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
  }

  /* ================= PAINEL LATERAL ================= */
  function painel(container) {
    function sec(title) { var s = document.createElement('section'); s.className = 'p-sec'; var h3 = document.createElement('h3'); h3.textContent = title; s.appendChild(h3); container.appendChild(s); return s; }
    var a = sec('Nossa resposta');
    a.appendChild(node('<div class="pd-answer"><strong>Não é esquecimento: é a renovação do convênio</strong><span>R$ 18.225,90 perdidos por mês. A falta do convênio salta de 18% para 44% na 6ª sessão. Proposta: renovação antecipada na 3ª sessão e lista de espera ativa, por R$ 18 mil em 10 semanas, com payback de ~2,1 meses.</span></div>'));
    var p = sec('Minha parte: o protótipo');
    var pa = node('<div class="pd-proto-row"><button class="pd-proto-go" type="button"><span class="pd-proto-play" aria-hidden="true">▶</span><span><b>Usar o protótipo</b><small>Trilha 10 · história guiada de 1 min</small></span></button>' +
      '<a class="mk-btn" href="' + PROTO + '" target="_blank" rel="noopener" aria-label="Abrir o protótipo em nova aba">↗</a></div>');
    pa.querySelector('button').addEventListener('click', function () { abrir('prototipo'); });
    p.appendChild(pa);
    var s = sec('O salto da 6ª sessão');
    grafSessoes(s, true);
    var sb = node('<div class="mk-actions"><button class="mk-btn" type="button">Por que os pacientes faltam? →</button></div>');
    sb.querySelector('button').addEventListener('click', function () { if (!palpite) palpite = 'esq'; abrir('problema'); });
    s.appendChild(sb);
    var g = sec('Entrega em grupo');
    grupo(g, true);
    var e = sec('O documento');
    var dr = node('<div class="mk-docrow"><span class="mk-docrow-ico" aria-hidden="true">PDF</span><span class="mk-docrow-t"><b>Grupo 5 · Desafio Produto PTC 26.2</b><small>13 páginas · PDF original</small></span>' +
      '<div class="mk-actions"><a class="mk-btn" href="' + DOC.url + '" download="' + DOC.url + '">Baixar ↓</a><a class="mk-btn" href="' + DOC.url + '" target="_blank" rel="noopener">Nova aba ↗</a><button class="mk-btn" type="button" data-full>Tela cheia ⤢</button></div></div>');
    dr.querySelector('[data-full]').addEventListener('click', function () { abrir('documento'); });
    e.appendChild(dr);
  }

  window.CITI_ENTREGAS = window.CITI_ENTREGAS || {};
  window.CITI_ENTREGAS.produto = { painel: painel, abrir: abrir };
})();
