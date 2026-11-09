/* Resumo em dois tamanhos, compartilhado por todas as entregas.
   CITI_RESUMO(heroNode, modo) recebe o resumo que cada entrega já monta (cartão principal + 4 números)
   e devolve uma versão mais enxuta:
     'medio' (primeira aba): a frase principal em destaque, os números em chips e o parágrafo recolhido;
     'fino'  (demais abas):  só uma faixa com a frase e os números pequenos.
   No painel lateral, o cartão "Minha resposta" vira uma chamada curta com "ver mais". */
(function () {
  'use strict';

  function txt(el) { return el ? el.innerHTML : ''; }
  function pegar(hero) {
    var main = hero.querySelector('.mk-hero-main, .dx-hero-main') || hero;
    return {
      label: (main.querySelector('.mk-label, .dx-label') || {}).textContent || '',
      big: txt(main.querySelector('.mk-big, .dx-big')),
      lead: txt(main.querySelector('.mk-lead, .dx-lead')),
      tipos: Array.prototype.map.call(hero.querySelectorAll('.dx-types'), function (e) { return e.outerHTML; }).join(''),
      extra: Array.prototype.map.call(hero.querySelectorAll('.dx-callout'), function (e) { return e.outerHTML; }).join(''),
      stats: Array.prototype.map.call(hero.querySelectorAll('.mk-stat, .dx-stat'), function (s) {
        return { b: txt(s.querySelector('b')), s: (s.querySelector('span') || {}).textContent || '' };
      })
    };
  }

  function resumo(hero, modo) {
    var d = pegar(hero), el = document.createElement('section');
    el.className = 'rs rs-' + (modo === 'fino' ? 'fino' : 'medio');
    el.setAttribute('aria-label', 'Resumo da entrega');
    if (modo === 'fino') {
      el.innerHTML = '<p class="rs-big">' + d.big + '</p>' +
        '<ul class="rs-chips is-mini">' + d.stats.map(function (s) { return '<li title="' + s.s.replace(/"/g, '&quot;') + '"><b>' + s.b + '</b><span>' + s.s + '</span></li>'; }).join('') + '</ul>';
      return el;
    }
    el.innerHTML = '<div class="rs-main"><p class="rs-label">' + d.label + '</p><p class="rs-big">' + d.big + '</p></div>' +
      '<ul class="rs-chips">' + d.stats.map(function (s) { return '<li><b>' + s.b + '</b><span>' + s.s + '</span></li>'; }).join('') + '</ul>' +
      d.tipos +
      (d.lead || d.extra ? '<details class="rs-more"><summary>Ler o resumo completo</summary>' + (d.lead ? '<p>' + d.lead + '</p>' : '') + d.extra + '</details>' : '');
    return el;
  }

  /* painel lateral: o cartão de resposta fica curto, com "ver mais" */
  var CARDS = '.mk-answer, .gg-answer, .cm-answer, .pd-answer';
  function encurtar(root) {
    Array.prototype.forEach.call(root.querySelectorAll(CARDS), function (card) {
      if (card.dataset.rs) return;
      card.dataset.rs = '1';
      var span = card.querySelector('span');
      if (!span) return;
      card.classList.add('rs-card');
      span.classList.add('rs-clamp');
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'rs-vermais'; b.textContent = 'ver mais'; b.setAttribute('aria-expanded', 'false');
      b.addEventListener('click', function () {
        var aberto = card.classList.toggle('is-aberto');
        b.textContent = aberto ? 'ver menos' : 'ver mais'; b.setAttribute('aria-expanded', aberto ? 'true' : 'false');
      });
      card.appendChild(b);
      // só mostra o botão se o texto realmente passou de 2 linhas
      requestAnimationFrame(function () { if (span.scrollHeight <= span.clientHeight + 2) b.hidden = true; });
    });
  }
  function observar() {
    var pb = document.getElementById('p-body');
    if (!pb || !window.MutationObserver) return;
    new MutationObserver(function () { encurtar(pb); }).observe(pb, { childList: true, subtree: true });
    encurtar(pb);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', observar); else observar();

  /* ---------- convite para rolar ----------
     Quando há mais conteúdo abaixo, a borda de baixo esmaece (o último bloco aparece pela metade)
     e, enquanto a pessoa ainda não rolou, um botão "Role para ver mais" aparece no rodapé.
     Vale para o painel lateral (inclusive o do Sol) e para todas as entregas abertas em tela cheia.
     No celular, a folha em meia altura já deixa o conteúdo cortado, então o convite só entra na altura cheia. */
  var REDUZ = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function convite(sc, host, opts) {
    if (!sc || sc.dataset.scue) return;
    sc.dataset.scue = '1';
    var cue = document.createElement('div');
    cue.className = 'scue' + (opts.cls ? ' ' + opts.cls : ''); cue.setAttribute('aria-hidden', 'true');
    cue.innerHTML = '<div class="scue-fade"></div><button type="button" class="scue-btn" tabindex="-1">Role para ver mais <span>↓</span></button>';
    host.appendChild(cue);
    var btn = cue.querySelector('.scue-btn'), pend = false;
    btn.addEventListener('click', function () { sc.scrollBy({ top: Math.round(sc.clientHeight * 0.7), behavior: REDUZ ? 'auto' : 'smooth' }); });
    function medir() {
      pend = false;
      var ativo = opts.ativo ? opts.ativo() : true;
      var resta = sc.scrollHeight - sc.clientHeight - sc.scrollTop;
      var temMais = ativo && sc.scrollHeight - sc.clientHeight > 48 && resta > 24;
      if (opts.pos && temMais) opts.pos(cue);
      cue.classList.toggle('is-fade', temMais);
      cue.classList.toggle('is-btn', temMais && sc.scrollTop < 40 && resta > 140);
    }
    function agendar() { if (!pend) { pend = true; requestAnimationFrame(medir); } }
    sc.addEventListener('scroll', agendar, { passive: true });
    window.addEventListener('resize', agendar);
    if (window.MutationObserver) new MutationObserver(agendar).observe(opts.observar || sc, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'hidden', 'open'] });
    sc.addEventListener('load', agendar, true);   // imagens e iframes que chegam depois
    if (opts.pos) sc.addEventListener('transitionend', agendar);
    setInterval(function () { if (document.visibilityState === 'visible') agendar(); }, 1200);   // rede de segurança (vídeo, pdf, fontes)
    agendar();
    return agendar;
  }
  var OVERLAYS = { mk: '.mk-body', gg: '.mk-body', pd: '.mk-body', cm: '.mk-body', dv: '.mk-body', dx: '.dx-body' };
  function ligarOverlay(el) {
    var sel = el && el.id && OVERLAYS[el.id];
    if (!sel) return;
    var sc = el.querySelector(sel);
    convite(sc, el, { cls: 'scue-ov', ativo: function () { return !el.hidden; } });
  }
  function ligarTudo() {
    var panel = document.getElementById('panel');
    if (panel) convite(panel, document.body, {
      cls: 'scue-panel', observar: panel,
      ativo: function () {
        var b = document.body;
        if (!panel.classList.contains('is-open') || b.classList.contains('has-overlay')) return false;
        return !b.classList.contains('is-sheet') || panel.classList.contains('is-full');
      },
      pos: function (cue) { cue.style.setProperty('--scue', (getComputedStyle(panel).getPropertyValue('--accent') || '').trim() || '#4fe577'); var r = panel.getBoundingClientRect(); cue.style.left = r.left + 'px'; cue.style.width = r.width + 'px'; cue.style.top = (r.top + panel.clientHeight - 0) + 'px'; }
    });
    Object.keys(OVERLAYS).forEach(function (id) { ligarOverlay(document.getElementById(id)); });
    if (window.MutationObserver) new MutationObserver(function (ms) {
      ms.forEach(function (m) { Array.prototype.forEach.call(m.addedNodes, ligarOverlay); });
    }).observe(document.body, { childList: true });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ligarTudo); else ligarTudo();

  window.CITI_RESUMO = resumo;
})();
