/* Inovação · a missão espacial da nave.
   Clicar na nave tira o visitante do sistema solar do CITi, atravessa o hiperespaço, chega à Terra,
   enquadra a China e transforma a rota que nasce dali na capa da BAQIAO (巴桥).

   O controlador é uma linha do tempo única, avançada pelo dt do loop principal (nada de setTimeout
   para câmera ou objetos 3D). Enquanto está ativo, só ele mexe na câmera e na nave.
   Fases: idle → acquireCamera → departure → leavingSystem → hyperspace → earthReveal →
          earthApproach → chinaArrival → baqiaoReveal → completed, além de returning (volta curta ao
          sistema) e exiting (cancelamento já na Terra: escurece antes de trocar de cena).

   A troca de cenário acontece no pico do hiperespaço, quando um véu escuro preso à câmera cobre o
   fundo: câmera e nave passam para a cena da Terra sem mudar de coordenadas, e o RenderPass troca
   de cena. Mesmo renderer, mesmo composer, mesmo requestAnimationFrame.

   O marcador e o arco são um único desenho SVG projetado do 3D a cada quadro: o mesmo traço sai da
   China, atravessa o horizonte e se deforma até o arco da capa da entrega. Sem troca de
   representação, não há salto. */
(function () {
  'use strict';

  // linha do tempo (s). Ver o storyboard no topo de cada fase.
  var T = { dep: 0.8, sai: 1.8, hip: 2.7, swap: 3.25, rev: 3.9, apr: 5.1, che: 6.4, baq: 7.3, fim: 8.75 };
  var FASES = [[T.fim, 'baqiaoReveal'], [T.baq, 'baqiaoReveal'], [T.che, 'chinaArrival'], [T.apr, 'earthApproach'],
    [T.rev, 'earthReveal'], [T.hip, 'hyperspace'], [T.sai, 'leavingSystem'], [T.dep, 'departure'], [0, 'acquireCamera']];
  var CHINA = [35, 105];
  var N_ARCO = 48;
  var D2R = Math.PI / 180;

  function c01(x) { return x < 0 ? 0 : x > 1 ? 1 : x; }
  function seg(t, a, b) { return c01((t - a) / (b - a)); }
  function lerp(a, b, k) { return a + (b - a) * k; }
  function inOut(x) { return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; }
  function eIn(x) { return x * x * x; }
  function eOut(x) { return 1 - Math.pow(1 - x, 3); }
  function inOutSine(x) { return -(Math.cos(Math.PI * x) - 1) / 2; }
  function damp(k, dt) { return 1 - Math.exp(-k * dt); }

  function criar(ctx) {
    var THREE = ctx.THREE, cam = ctx.camera, nave = ctx.nave, warp = ctx.warp;
    var terra = null;
    function V() { return new THREE.Vector3(); }
    var F = V(), U = V(), Rt = V(), C = V(), WUP = new THREE.Vector3(0, 1, 0), ORIG = V();
    var cPos = V(), cAlvo = V(), cUp = V(), look0 = V(), pos0 = V(), up0 = V(), tA = V(), tB = V(), tC = V(), nariz = V();
    var qAlvo = new THREE.Quaternion(), qF = new THREE.Quaternion(), m4 = new THREE.Matrix4();
    var S = { fase: 'idle', t: 0, ts: T.swap, v: 0, v0: 0, lag: 0, naTerra: false, espera: 0, semTerra: false, D0: 2500,
      fov0: 45, bloom0: 0.8, som: {}, rt: 0, r0: { pos: V(), look: V(), up: V(), fov: 45, warp: 0, veu: 0 } };

    /* ---------- véu: esfera escura presa à câmera, entre a nave e o fundo ---------- */
    var veu = new THREE.Mesh(new THREE.SphereGeometry(140, 24, 16),
      new THREE.MeshBasicMaterial({ color: 0x020509, side: THREE.BackSide, transparent: true, opacity: 0, depthWrite: false, fog: false }));
    veu.renderOrder = 9; veu.visible = false; veu.frustumCulled = false;
    cam.add(veu);
    function setVeu(o) { veu.material.opacity = o; veu.visible = o > 0.001; }

    /* ---------- interface: botão de pular e o desenho do arco ---------- */
    var pular = document.createElement('button');
    pular.type = 'button'; pular.className = 'mi-pular'; pular.hidden = true;
    pular.setAttribute('aria-label', 'Pular viagem e abrir a entrega de Inovação');
    pular.innerHTML = '<span>Pular viagem</span><svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M3 3l5 5-5 5M9 3l5 5-5 5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    pular.addEventListener('click', function () { skip(); });
    document.body.appendChild(pular);

    var NS = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('class', 'mi-arco'); svg.setAttribute('aria-hidden', 'true');
    svg.innerHTML = '<path class="mi-rota" fill="none"/><circle class="mi-pulso" r="7"/><circle class="mi-ponto" r="4"/><circle class="mi-br" r="4"/>' +
      '<text class="mi-rot mi-rot-cn">China</text><text class="mi-rot mi-rot-br">Brasil</text>';
    svg.style.display = 'none';
    document.body.appendChild(svg);
    var elRota = svg.querySelector('.mi-rota'), elPonto = svg.querySelector('.mi-ponto'), elPulso = svg.querySelector('.mi-pulso'),
      elBr = svg.querySelector('.mi-br'), elRotCn = svg.querySelector('.mi-rot-cn'), elRotBr = svg.querySelector('.mi-rot-br');
    var rotaLocal = null, rotaMundo = [], proj = [], projVis = 0;
    for (var i = 0; i < N_ARCO; i++) proj.push({ x: 0, y: 0 });

    function marcaFase(f) {
      if (S.fase === f) return;
      S.fase = f; document.body.setAttribute('data-missao', f);
    }

    /* ---------- enquadramento de perseguição ---------- */
    // distância da câmera à nave: no celular em pé a nave fica um pouco menor, para as asas e o destino caberem
    function perseguicao() {
      var base = Math.max(6.0, 4.4 / Math.max(0.3, cam.aspect));
      return { b: base * 0.93, h: base * 0.36 };
    }
    // inclinação para a nave ficar no terço inferior, com espaço livre à frente para o destino
    function inclinacao(b, h) {
      return Math.atan2(h, b) - Math.atan(0.42 * Math.tan(cam.fov * D2R / 2));
    }
    // direção de olhar inclinada `th` para baixo em relação a F (no plano F–U)
    function olhar(th, out) { return out.copy(F).multiplyScalar(Math.cos(th)).addScaledVector(U, -Math.sin(th)); }
    function aplicarCamera(pos, alvo, up, k) {
      cam.position.copy(pos);
      m4.lookAt(pos, alvo, up); qAlvo.setFromRotationMatrix(m4);
      if (k >= 1) cam.quaternion.copy(qAlvo); else cam.quaternion.slerp(qAlvo, k);
    }

    /* ---------- distância final à Terra: disco um pouco maior que a altura no computador,
       um pouco menor que a largura no celular em pé ---------- */
    function distFinal() {
      var vf = cam.fov * D2R, hf = 2 * Math.atan(Math.tan(vf / 2) * cam.aspect);
      var k = cam.aspect >= 1 ? 1.06 : 0.92;
      return terra.R / Math.sin(Math.min(1.3, k * Math.min(vf, hf) / 2));
    }

    function garantirTerra() {
      if (terra) return terra;
      var mobile = ctx.COARSE || window.innerWidth <= 720;
      var max = ctx.renderer.capabilities.maxTextureSize || 4096;
      terra = window.CITI_TERRA.criar(THREE, {
        R: 100, segs: mobile ? 64 : 96,
        // 4K só no computador (no enquadramento final mostra rios e litoral bem mais nítidos), e só se a
        // qualidade adaptativa não tiver precisado baixar a resolução; celular usa 2K
        mapa: (!mobile && max >= 4096 && ctx.quality.pr >= ctx.quality.cap - 0.01) ? ctx.base + 'assets/inovacao/terra-4k.jpg' : ctx.base + 'assets/inovacao/terra-2k.jpg',
        nuvens: ctx.base + 'assets/inovacao/nuvens-2k.jpg',
        aniso: Math.min(8, ctx.renderer.capabilities.getMaxAnisotropy ? ctx.renderer.capabilities.getMaxAnisotropy() : 4),
        estrelas: mobile ? 900 : 1600
      });
      rotaLocal = terra.rotaLocal(CHINA, 274, 100, 0.05, N_ARCO);
      return terra;
    }
    // baixa as texturas antes do clique (o index.html chama quando o computador está ocioso)
    function preCarregar() { garantirTerra().carregar().catch(function () {}); }

    /* ================= start ================= */
    function start() {
      if (S.fase !== 'idle') return false;
      garantirTerra();
      terra.carregar().catch(function () {});
      // shaders da Terra e da nave sob a luz da Terra compilados agora, num quadro em que nada se move
      terra.scene.add(nave.g);
      try { ctx.renderer.compile(terra.scene, cam); } catch (e) {}
      ctx.scene.add(nave.g);
      terra.preparar(ctx.renderer, cam);

      S.t = 0; S.espera = 0; S.naTerra = false; S.semTerra = false; S.semFade = 0; S.lag = 0; S.ts = T.swap; S.som = {};
      S.v0 = S.v = Math.min(14, nave.vel || 6);
      S.fov0 = cam.fov; S.bloom0 = ctx.bloom.strength;
      // direção de saída: para longe de onde a câmera olha, subindo 22°. Funciona de qualquer ângulo
      // e quase não gira a câmera; o sistema afunda e encolhe na parte de baixo do quadro.
      cam.getWorldDirection(tA); tA.y = 0;
      if (tA.lengthSq() < 1e-4) tA.copy(nave.fwd).setY(0);
      if (tA.lengthSq() < 1e-4) tA.set(0, 0, -1);
      tA.normalize();
      F.copy(tA).multiplyScalar(Math.cos(22 * D2R)).addScaledVector(WUP, Math.sin(22 * D2R)).normalize();
      U.copy(WUP).addScaledVector(F, -F.dot(WUP)).normalize();
      Rt.crossVectors(F, U);   // direita da tela na perseguição
      m4.lookAt(F, ORIG, WUP); qF.setFromRotationMatrix(m4);   // +Z (o bico) apontando para F
      // pose inicial da câmera, para a transição partir exatamente do quadro atual
      pos0.copy(cam.position);
      cam.getWorldDirection(tA);
      look0.copy(cam.position).addScaledVector(tA, Math.max(8, cam.position.distanceTo(nave.p)));
      up0.copy(cam.up);
      warp.mat.depthTest = true;   // a nave passa a esconder os riscos que ficam atrás dela
      pular.hidden = false; pular.classList.remove('is-on');
      document.body.classList.add('is-mission');
      marcaFase('acquireCamera');
      return true;
    }

    /* ================= update ================= */
    function update(dt, tg) {
      if (S.fase === 'idle' || S.fase === 'completed') return;
      if (S.fase === 'returning' || S.fase === 'exiting') { atualizaRetorno(dt); return; }
      var t = S.t + dt, segura = false;
      if (!S.naTerra && !S.semTerra && t >= T.swap) {
        var est = terra.estado();
        if (est === 'ready') trocaParaTerra();
        else if (est === 'error' || S.espera > 4.5) iniciaSemTerra();
        else { S.espera += dt; t = T.swap; segura = true; }   // segura no hiperespaço até a Terra chegar
      }
      if (S.semTerra && t < T.baq - 0.5) t = T.baq - 0.5;
      S.t = t;
      for (var k = 0; k < FASES.length; k++) if (t >= FASES[k][0]) { marcaFase(FASES[k][1]); break; }
      if (t > 0.35 && !pular.classList.contains('is-on') && t < T.baq) pular.classList.add('is-on');
      if (t >= T.baq + 0.25) pular.classList.remove('is-on');

      sons(t);
      if (S.semTerra) { S.semFade += dt; atualizaSemTerra(dt, t); }
      else if (!S.naTerra) atualizaSolar(dt, t, segura);
      else atualizaTerra(dt, t);
      // sem a Terra, o hiperespaço termina no próprio ritmo, como se a viagem continuasse
      atualizaHiperespaco(dt, S.semTerra ? T.swap + S.semFade : t);
      if (t >= T.che + 0.4) atualizaBaqiao(dt, t);
      ctx.naveRastro(dt, tg, Math.min(1, S.v / 120));
      if (S.fase !== 'idle' && t >= T.fim) concluir();
    }

    function sons(t) {
      var s = S.som;
      if (!s.a && t >= T.dep) { s.a = 1; ctx.Sound.whoosh(1, 1.6, true); }
      if (!s.b && t >= 1.25) { s.b = 1; if (ctx.Sound.salto) ctx.Sound.salto(); }
      if (!s.c && t >= 4.0 && S.naTerra) { s.c = 1; ctx.Sound.arrive(); }
    }

    /* ---------- cenas 1 a 3 (e o começo da 4): ainda no sistema do CITi ---------- */
    function atualizaSolar(dt, t, segura) {
      var v;
      if (t < T.dep) v = lerp(S.v0, 3, eOut(seg(t, 0, T.dep)));
      else if (t < T.sai) v = 3 + 37 * eIn(seg(t, T.dep, T.sai));
      else if (t < T.hip) v = 40 + 80 * Math.pow(seg(t, T.sai, T.hip), 2);
      else v = 120 + 50 * eOut(seg(t, T.hip, T.swap));
      var acc = dt > 0 ? (v - S.v) / dt : 0; S.v = v;
      // a nave vira para a direção de saída com suavidade (slerp), sem girar de repente
      nave.g.quaternion.slerp(qF, damp(lerp(2.0, 9, seg(t, 0.5, 1.9)), dt));
      nariz.set(0, 0, 1).applyQuaternion(nave.g.quaternion);
      if (!segura) nave.p.addScaledVector(nariz, v * dt);
      nave.g.position.copy(nave.p); nave.hit.position.copy(nave.p);
      // inércia: quando a nave acelera, ela se afasta um pouco da câmera antes do quadro estabilizar
      S.lag += (Math.min(1.4, Math.max(0, acc * 0.012)) - S.lag) * damp(4, dt);
      var p = perseguicao(), th = inclinacao(p.b + S.lag, p.h);
      S.th = th;
      cPos.copy(nave.p).addScaledVector(F, -(p.b + S.lag)).addScaledVector(U, p.h);
      cAlvo.copy(cPos).addScaledVector(olhar(th, tA), 10);
      cUp.copy(U);
      // cena 1: da pose atual até atrás da nave, mirando sempre num ponto entre o centro do quadro e a nave
      var a = inOut(seg(t, 0, 1.15));
      if (a < 1) {
        cPos.lerpVectors(pos0, cPos, a);
        tB.copy(look0).lerp(nave.p, Math.min(1, a * 1.6)); cAlvo.lerpVectors(tB, cAlvo, a);
        cUp.lerpVectors(up0, U, a).normalize();
        aplicarCamera(cPos, cAlvo, cUp, 1);
      } else aplicarCamera(cPos, cAlvo, cUp, damp(10, dt));
      motores(v);
    }

    // motores: brilho e jato verde acompanham a velocidade
    function motores(v) {
      var k = Math.min(1, v / 120), ud = nave.g.userData;
      ud.glows.forEach(function (gl) { var s = 0.75 + 0.4 * k; gl.scale.set(s, s, 1); });
      if (ud.trails) ud.trails.forEach(function (tr) { tr.scale.z = 1 - 0.5 * k; tr.material.opacity = 0.75 - 0.3 * k; });
    }
    function motoresNormais() {
      var ud = nave.g.userData;
      ud.glows.forEach(function (gl) { gl.scale.set(0.75, 0.75, 1); });
      if (ud.trails) ud.trails.forEach(function (tr) { tr.scale.z = 1; tr.material.opacity = 0.75; });
    }

    /* ---------- cena 4: hiperespaço (reaproveita warp/updateWarp da introdução) e véu ---------- */
    function atualizaHiperespaco(dt, t) {
      var ent = inOut(seg(t, T.sai, T.hip)) * 0.2 + inOut(seg(t, T.hip, 3.15)) * 0.42;
      var sai = 1 - inOut(seg(t, 3.75, 4.55));
      var inten = ent * sai, vel = (300 * seg(t, T.sai, T.hip) + 520 * inOut(seg(t, T.hip, 3.15))) * (0.35 + 0.65 * sai);
      warp.lines.visible = inten > 0.002;
      // ponto de fuga à frente da nave (a câmera olha um pouco para baixo dela) e tom mais frio que o da introdução
      warp.lines.rotation.x = S.th || 0;
      warp.mat.color.setRGB(0.72, 0.88, 1.0);
      if (warp.lines.visible) ctx.updateWarp(vel, inten, dt);
      setVeu(S.semTerra ? 1 : inOut(seg(t, 2.85, 3.2)) * (1 - inOut(seg(t, 3.7, 4.5))));
      var fov = S.fov0 + 7 * inOut(seg(t, T.hip, 3.2)) * (1 - inOut(seg(t, 3.5, 4.4)));
      if (Math.abs(cam.fov - fov) > 1e-3) { cam.fov = fov; cam.updateProjectionMatrix(); ctx.updatePixAng(); }
    }

    /* ---------- troca de cena: no pico do hiperespaço, com o véu fechado ---------- */
    function trocaParaTerra() {
      terra.preparar(ctx.renderer, cam);   // se as texturas chegaram durante a viagem, sobem para a GPU agora
      S.naTerra = true; S.ts = T.swap;
      C.copy(cam.position).addScaledVector(F, S.D0);
      tB.copy(Rt).multiplyScalar(0.8).addScaledVector(U, 0.6).normalize();
      tA.copy(F).multiplyScalar(-Math.cos(17 * D2R)).addScaledVector(tB, Math.sin(17 * D2R));
      terra.orientar(C, tA, U);
      terra.girar(-0.24, -0.24);
      terra.scene.add(cam); terra.scene.add(nave.g);
      ctx.renderPass.scene = terra.scene;
      cam.near = 1; cam.updateProjectionMatrix();   // mais precisão de profundidade para a Terra a 2 500 unidades
      ctx.bloom.strength = 0.22;
      terra.seguirCamera(cam);
    }

    /* ---------- cenas 5 a 7: revelação, aproximação e chegada ---------- */
    function atualizaTerra(dt, t) {
      var u = seg(t, S.ts, T.baq);
      var d = S.D0 * Math.pow(distFinal() / S.D0, inOut(u));
      cPos.copy(C).addScaledVector(F, -d);
      // cena 6: a câmera ultrapassa a nave; ela sai pela parte de baixo do quadro
      var p = perseguicao(), o = inOutSine(seg(t, T.apr, T.che));
      S.lag += (0 - S.lag) * damp(3, dt);
      var fb = lerp(p.b + S.lag, -2.6, o), hb = lerp(p.h, p.h * 2.3, o);
      nave.p.copy(cPos).addScaledVector(F, fb).addScaledVector(U, -hb);
      nave.g.position.copy(nave.p); nave.hit.position.copy(nave.p);
      nave.g.quaternion.slerp(qF, damp(9, dt));
      nave.g.visible = t < T.che + 0.3;
      S.v = 160 * (1 - o);
      motores(S.v);
      var th = inclinacao(p.b, p.h) * (1 - inOut(seg(t, T.apr - 0.3, T.che)));
      S.th = th;
      cAlvo.copy(cPos).addScaledVector(olhar(th, tA), 10);
      aplicarCamera(cPos, cAlvo, U, damp(10, dt));
      // o globo já chega orientado; resta só uma rotação suave até a China ficar de frente
      var gir = -0.24 * (1 - eOut(u));
      terra.girar(gir, gir + 0.01 * (t - S.ts));
      terra.seguirCamera(cam);
    }

    /* ---------- falha da textura: sai do hiperespaço direto para a BAQIAO ---------- */
    function iniciaSemTerra() {
      S.semTerra = true; S.semFade = 0; nave.g.visible = false;
    }
    function atualizaSemTerra(dt) {
      // mantém o véu fechado e a câmera parada; o arco nasce do centro da tela
      S.v *= 1 - damp(3, dt);
    }

    /* ---------- cena 7 e 8: marcador, arco e a capa da BAQIAO ---------- */
    var ent = null;   // contrato com entregas/inovacao.js durante a revelação
    function projeta(v, out) {
      tC.copy(v).project(cam);
      out.x = (tC.x * 0.5 + 0.5) * window.innerWidth; out.y = (-tC.y * 0.5 + 0.5) * window.innerHeight;
      return tC.z < 1;
    }
    // um ponto está escondido se o raio da câmera até ele bate na Terra antes
    function oculto(p) {
      var R = terra.R * 0.998;
      tA.subVectors(p, cam.position); var L = tA.length(); tA.divideScalar(L);
      tB.subVectors(C, cam.position);
      var tca = tB.dot(tA), d2 = tB.lengthSq() - tca * tca;
      if (d2 > R * R) return false;
      var th = tca - Math.sqrt(R * R - d2);
      return th > 0 && th < L - 0.5;
    }
    function bez(g, s, out) {
      var a = 1 - s;
      out.x = a * a * g.b.x + 2 * a * s * g.c.x + s * s * g.a.x;
      out.y = a * a * g.b.y + 2 * a * s * g.c.y + s * s * g.a.y;
      return out;
    }
    var pB = { x: 0, y: 0 }, pM = [];
    for (var j = 0; j < N_ARCO; j++) pM.push({ x: 0, y: 0 });

    function atualizaBaqiao(dt, t) {
      var W = window.innerWidth, H = window.innerHeight;
      if (svg.style.display === 'none') { svg.style.display = ''; svg.classList.add('is-on'); }
      svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
      // projeção da rota (ou, sem Terra, um traço sintético a partir do centro)
      if (!S.semTerra) {
        terra.paraMundo(rotaLocal, rotaMundo);
        projVis = N_ARCO;
        for (var i = 0; i < N_ARCO; i++) {
          if (i > 0 && oculto(rotaMundo[i])) { projVis = i; break; }
          projeta(rotaMundo[i], proj[i]);
        }
        if (projVis < 6) projVis = 6;
      } else {
        projVis = N_ARCO;
        var r = Math.min(W, H) * 0.32;
        for (var q = 0; q < N_ARCO; q++) { var s = q / (N_ARCO - 1); proj[q].x = W / 2 - r * s; proj[q].y = H / 2 - r * 0.35 * Math.sin(Math.PI * s); }
      }
      var desenha = inOut(seg(t, T.baq, T.baq + 0.65));
      var cortina = inOutSine(seg(t, 7.7, 8.3));
      var morf = inOut(seg(t, 7.85, 8.6));
      if (t >= 7.55 && !ent && window.CITI_ENTREGAS && window.CITI_ENTREGAS.inova) ent = window.CITI_ENTREGAS.inova.preparar();
      if (ent) ent.cortina(cortina);
      var g = ent && ent.geom();
      var n = projVis;
      for (var k = 0; k < n; k++) {
        var P = pM[k];
        if (g && morf > 0) { bez(g, k / (n - 1), pB); P.x = lerp(proj[k].x, pB.x, morf); P.y = lerp(proj[k].y, pB.y, morf); }
        else { P.x = proj[k].x; P.y = proj[k].y; }
      }
      // traço parcial (nasce do ponto) com interpolação no último trecho
      var fim = Math.max(desenha, morf) * (n - 1), ult = Math.floor(fim), d = 'M' + pM[0].x.toFixed(1) + ' ' + pM[0].y.toFixed(1);
      for (var m = 1; m <= ult && m < n; m++) d += 'L' + pM[m].x.toFixed(1) + ' ' + pM[m].y.toFixed(1);
      if (ult < n - 1 && fim > ult) {
        var fr = fim - ult, A = pM[ult], B = pM[ult + 1];
        d += 'L' + (A.x + (B.x - A.x) * fr).toFixed(1) + ' ' + (A.y + (B.y - A.y) * fr).toFixed(1);
      }
      elRota.setAttribute('d', fim > 0.01 ? d : '');
      // marcador: aparece quando a câmera quase parou e acompanha a ponta do arco
      var mk = inOut(seg(t, 6.9, 7.25));
      elPonto.setAttribute('cx', pM[0].x.toFixed(1)); elPonto.setAttribute('cy', pM[0].y.toFixed(1));
      elPulso.setAttribute('cx', pM[0].x.toFixed(1)); elPulso.setAttribute('cy', pM[0].y.toFixed(1));
      elPonto.style.opacity = mk; elPulso.style.opacity = mk * (1 - morf);
      elRotCn.setAttribute('x', (pM[0].x + 12).toFixed(1)); elRotCn.setAttribute('y', (pM[0].y + 4).toFixed(1));
      elRotCn.style.opacity = mk * (1 - inOut(seg(t, 7.6, 7.85)));
      var br = inOut(seg(t, 8.35, 8.6)), last = pM[n - 1];
      elBr.setAttribute('cx', last.x.toFixed(1)); elBr.setAttribute('cy', last.y.toFixed(1)); elBr.style.opacity = br;
      elRotBr.style.opacity = 0;
      if (ent && t >= 8.35 && !S.titulo) { S.titulo = true; ent.revelarTitulo(); }
    }

    /* ================= fim, pular, cancelar ================= */
    function limpaInterface() {
      svg.style.display = 'none'; svg.classList.remove('is-on'); elRota.setAttribute('d', '');
      pular.classList.remove('is-on'); pular.hidden = true;
    }
    // devolve tudo ao sistema do CITi, com a câmera parada um pouco além da visão geral (atrás da entrega aberta)
    function estaciona() {
      if (S.naTerra) {
        ctx.scene.add(cam); ctx.scene.add(nave.g);
        ctx.renderPass.scene = ctx.scene;
        S.naTerra = false;
      }
      setVeu(0);
      warp.lines.visible = false; warp.mat.opacity = 0; warp.mat.depthTest = false; warp.lines.rotation.x = 0; warp.mat.color.setRGB(1, 1, 1);
      cam.near = 0.1; cam.fov = 45; cam.updateProjectionMatrix(); ctx.updatePixAng();
      ctx.bloom.strength = S.bloom0;
      cam.position.copy(ctx.overviewPos()).multiplyScalar(1.3);
      cam.up.set(0, 1, 0); cam.lookAt(ORIG);
      motoresNormais();
      nave.g.visible = true;
      // a nave volta de fora do sistema e retoma a rota pelos seis planetas
      ctx.naveRetomar(tA.set(-70, 22, -95));
    }
    function concluir() {
      if (ent) { ent.concluir(); ent = null; }
      limpaInterface();
      estaciona();
      S.titulo = false;
      marcaFase('completed');
    }
    function skip() {
      if (S.fase === 'idle' || S.fase === 'completed' || S.fase === 'returning' || S.fase === 'exiting') return;
      if (ent) { ent.concluir(); ent = null; }
      else if (window.CITI_ENTREGAS && window.CITI_ENTREGAS.inova) window.CITI_ENTREGAS.inova.abrir();
      limpaInterface(); estaciona(); S.titulo = false;
      marcaFase('completed');
    }
    function finish() { skip(); }
    // Esc durante a viagem: volta ao sistema solar (sem a entrega)
    function cancel() {
      if (S.fase === 'idle' || S.fase === 'completed' || S.fase === 'returning' || S.fase === 'exiting') return false;
      if (ent) { ent.descartar(); ent = null; }
      limpaInterface(); S.titulo = false;
      document.body.setAttribute('data-missao', 'cancelled');
      if (S.naTerra || S.semTerra) { S.rt = 0; S.r0.veu = veu.material.opacity; S.fase = 'exiting'; document.body.setAttribute('data-missao', 'exiting'); }
      else {
        // ainda no sistema: a nave retoma a rota de onde está e a câmera volta à visão geral
        motoresNormais(); ctx.naveRetomar(null);
        comecaRetorno();
      }
      return true;
    }
    // a entrega fechou: volta curta e previsível até a visão geral
    function reset() {
      if (S.fase !== 'completed') return;
      comecaRetorno();
    }
    function comecaRetorno() {
      S.rt = 0;
      S.r0.pos.copy(cam.position);
      cam.getWorldDirection(tA);
      S.r0.look.copy(cam.position).addScaledVector(tA, Math.max(10, cam.position.length()));
      S.r0.up.set(0, 1, 0).applyQuaternion(cam.quaternion);
      S.r0.fov = cam.fov; S.r0.warp = warp.mat.opacity; S.r0.veu = veu.material.opacity;
      marcaFase('returning');
    }
    function atualizaRetorno(dt) {
      S.rt += dt;
      if (S.fase === 'exiting') {
        setVeu(lerp(S.r0.veu, 1, inOut(seg(S.rt, 0, 0.25))));
        if (S.rt >= 0.25) { estaciona(); setVeu(1); comecaRetorno(); S.r0.veu = 1; }
        return;
      }
      var u = seg(S.rt, 0, 0.9), e = eOut(u);
      cPos.lerpVectors(S.r0.pos, ctx.overviewPos(), e);
      cAlvo.lerpVectors(S.r0.look, ORIG, e);
      cUp.lerpVectors(S.r0.up, WUP, e).normalize();
      aplicarCamera(cPos, cAlvo, cUp, 1);
      var fov = lerp(S.r0.fov, 45, e);
      if (Math.abs(cam.fov - fov) > 1e-3) { cam.fov = fov; cam.updateProjectionMatrix(); ctx.updatePixAng(); }
      var w = S.r0.warp * (1 - seg(S.rt, 0, 0.3));
      warp.lines.visible = w > 0.002; if (warp.lines.visible) ctx.updateWarp(200, w, dt); else warp.mat.depthTest = false;
      setVeu(S.r0.veu * (1 - inOut(seg(S.rt, 0, 0.45))));
      if (u >= 1) termina();
    }
    function termina() {
      setVeu(0); warp.lines.visible = false; warp.mat.opacity = 0; warp.mat.depthTest = false; warp.lines.rotation.x = 0; warp.mat.color.setRGB(1, 1, 1);
      cam.near = 0.1; cam.fov = 45; cam.updateProjectionMatrix(); ctx.updatePixAng();
      ctx.bloom.strength = S.bloom0;
      document.body.classList.remove('is-mission');
      document.body.removeAttribute('data-missao');
      S.fase = 'idle';
      ctx.aoTerminar();
    }

    function dispose() {
      cam.remove(veu); veu.geometry.dispose(); veu.material.dispose();
      if (terra) { terra.dispose(); terra = null; }
      pular.remove(); svg.remove();
    }

    return {
      start: start, update: update, skip: skip, cancel: cancel, finish: finish, reset: reset, dispose: dispose,
      preCarregar: preCarregar,
      fase: function () { return S.fase; },
      tempo: function () { return S.t; },
      ativa: function () { return S.fase !== 'idle'; },
      // a missão segura a nave do clique até estacionar; depois a rota normal volta a valer
      controlaNave: function () { return S.fase !== 'idle' && S.fase !== 'completed' && S.fase !== 'returning' && S.fase !== 'exiting'; },
      emVoo: function () { return S.fase !== 'idle' && S.fase !== 'completed'; }
    };
  }

  window.CITI_MISSAO = { criar: criar, T: T };
})();
