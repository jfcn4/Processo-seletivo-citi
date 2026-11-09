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

  window.CITI_RESUMO = resumo;
})();
