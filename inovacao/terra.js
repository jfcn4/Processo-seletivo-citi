/* Inovação · a Terra da missão espacial.
   Uma cena Three.js própria (não um segundo renderer): superfície com a Blue Marble da NASA,
   terminador suave, reflexo do Sol só no oceano, nuvens numa segunda esfera, atmosfera fina
   calculada pela distância do raio de visão à borda do planeta, estrelas discretas e uma luz
   solar direcional que também ilumina a nave quando ela chega aqui.
   O index.html só chama criar() quando a missão começa pela primeira vez; tudo é reaproveitado
   nas viagens seguintes e pode ser liberado com dispose().

   Coordenadas: SphereGeometry do Three.js com textura equirretangular (u = 0 em −180°,
   Greenwich em u = 0,5). Um ponto (lat, lon) fica em (cos lat · cos lon, sen lat, −cos lat · sen lon). */
(function () {
  'use strict';

  var D2R = Math.PI / 180;
  function dirLatLon(THREE, lat, lon, out) {
    var la = lat * D2R, lo = lon * D2R;
    return (out || new THREE.Vector3()).set(Math.cos(la) * Math.cos(lo), Math.sin(la), -Math.cos(la) * Math.sin(lo));
  }

  var VERT_SUP = [
    'varying vec2 vUv; varying vec3 vN; varying vec3 vP;',
    'void main(){',
    '  vUv = uv;',
    '  vec4 w = modelMatrix * vec4(position, 1.0);',
    '  vP = w.xyz; vN = normalize(mat3(modelMatrix) * normal);',
    '  gl_Position = projectionMatrix * viewMatrix * w;',
    '}'
  ].join('\n');

  // superfície: dia com terminador suave, noite quase preta, oceano com reflexo do Sol e um véu azul na borda
  var FRAG_SUP = [
    'uniform sampler2D uMapa; uniform vec3 uSol; uniform float uBrilho;',
    'varying vec2 vUv; varying vec3 vN; varying vec3 vP;',
    'void main(){',
    '  vec3 N = normalize(vN), L = normalize(uSol), V = normalize(cameraPosition - vP);',
    '  vec3 c = pow(texture2D(uMapa, vUv).rgb, vec3(0.92));',
    '  float ndl = dot(N, L);',
    '  float dia = smoothstep(-0.12, 0.30, ndl);',
    '  float luz = 0.20 + 0.80 * pow(clamp(ndl, 0.0, 1.0), 0.8);',
    '  float oceano = smoothstep(0.03, 0.11, c.b - max(c.r, c.g) * 0.9);',
    '  vec3 H = normalize(L + V);',
    '  float esp = pow(max(dot(N, H), 0.0), 70.0) * oceano * dia;',
    '  float borda = pow(1.0 - max(dot(N, V), 0.0), 2.6);',
    '  vec3 cor = c * luz * dia * uBrilho + c * 0.018;',
    '  float faixa = dia * (1.0 - dia) * 4.0;',
    '  cor += vec3(0.16, 0.06, 0.01) * faixa * 0.35;',
    '  cor += vec3(1.0, 0.93, 0.80) * esp * 0.45;',
    '  cor = mix(cor, vec3(0.32, 0.56, 1.0) * (0.15 + 0.85 * dia), borda * 0.6 * smoothstep(-0.3, 0.4, ndl));',
    '  gl_FragColor = vec4(cor, 1.0);',
    '}'
  ].join('\n');

  // nuvens: a textura em tons de cinza vira transparência; o lado da noite escurece as nuvens
  var FRAG_NUV = [
    'uniform sampler2D uNuvens; uniform vec3 uSol; uniform float uOpac;',
    'varying vec2 vUv; varying vec3 vN; varying vec3 vP;',
    'void main(){',
    '  vec3 N = normalize(vN), L = normalize(uSol);',
    '  float a = smoothstep(0.24, 0.92, texture2D(uNuvens, vUv).r) * uOpac;',
    '  float ndl = dot(N, L);',
    '  float dia = smoothstep(-0.10, 0.30, ndl);',
    '  vec3 cor = vec3(0.90, 0.92, 0.95) * (0.05 + 0.80 * dia * (0.30 + 0.70 * clamp(ndl, 0.0, 1.0)));',
    '  gl_FragColor = vec4(cor, a * (0.55 + 0.45 * dia));',
    '}'
  ].join('\n');

  // atmosfera: para cada pixel da casca, a menor distância do raio de visão ao centro diz
  // quanta atmosfera ele atravessa. Some na borda externa (não vira um anel neon).
  var VERT_ATM = [
    'varying vec3 vP;',
    'void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vP = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }'
  ].join('\n');
  var FRAG_ATM = [
    'uniform vec3 uCentro; uniform float uR; uniform float uRa; uniform vec3 uSol; uniform float uForca;',
    'varying vec3 vP;',
    'void main(){',
    '  vec3 d = normalize(vP - cameraPosition);',
    '  vec3 oc = uCentro - cameraPosition;',
    '  vec3 q = cameraPosition + d * dot(oc, d);',
    '  float h = length(q - uCentro);',
    '  float x = clamp((h - uR) / (uRa - uR), 0.0, 1.0);',
    '  float dens = pow(1.0 - x, 2.4) * step(uR * 0.995, h);',
    '  float sol = smoothstep(-0.35, 0.45, dot(normalize(q - uCentro), normalize(uSol)));',
    '  vec3 cor = mix(vec3(0.20, 0.42, 1.0), vec3(0.55, 0.78, 1.0), 1.0 - x);',
    '  gl_FragColor = vec4(cor * dens * sol * uForca, 1.0);',
    '}'
  ].join('\n');

  function estrelas(THREE, n, raio) {
    var pos = new Float32Array(n * 3), col = new Float32Array(n * 3), s = 9173;
    function r() { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }
    for (var i = 0; i < n; i++) {
      var u = r() * 2 - 1, th = r() * Math.PI * 2, k = Math.sqrt(1 - u * u), b = 0.35 + Math.pow(r(), 3) * 0.65;
      pos[i * 3] = raio * k * Math.cos(th); pos[i * 3 + 1] = raio * u; pos[i * 3 + 2] = raio * k * Math.sin(th);
      var tint = r();
      col[i * 3] = b * (tint > 0.85 ? 0.82 : 1); col[i * 3 + 1] = b * (tint > 0.85 ? 0.9 : 0.98); col[i * 3 + 2] = b;
    }
    var g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    var m = new THREE.PointsMaterial({ size: 1.5, sizeAttenuation: false, vertexColors: true, transparent: true, opacity: 0.85, depthWrite: false, fog: false });
    var p = new THREE.Points(g, m); p.frustumCulled = false;
    return p;
  }

  /* opts: { R, segs, mapa, nuvens (url ou null), aniso, estrelas } */
  function criar(THREE, opts) {
    var R = opts.R || 100, segs = opts.segs || 96;
    var scene = new THREE.Scene();
    scene.background = new THREE.Color(0x010307);

    // luz do Sol (para a nave; a Terra usa o mesmo vetor nos shaders) e um preenchimento azulado fraco
    var sol = new THREE.DirectionalLight(0xfff3e2, 2.1);
    scene.add(sol); scene.add(sol.target);
    scene.add(new THREE.AmbientLight(0x1d2c45, 0.55));
    scene.add(new THREE.HemisphereLight(0x9fc4ff, 0x05070c, 0.35));

    var ceu = estrelas(THREE, opts.estrelas || 1600, 2600);
    scene.add(ceu);

    var grupo = new THREE.Group();   // orientação: a China voltada para quem chega
    var giro = new THREE.Group();    // rotação suave em torno do eixo polar (Y local)
    grupo.add(giro); scene.add(grupo);

    var uSol = { value: new THREE.Vector3(1, 0, 0) };
    var matSup = new THREE.ShaderMaterial({
      uniforms: { uMapa: { value: null }, uSol: uSol, uBrilho: { value: 1.0 } },
      vertexShader: VERT_SUP, fragmentShader: FRAG_SUP
    });
    var geoSup = new THREE.SphereGeometry(R, segs, Math.round(segs * 0.66));
    var sup = new THREE.Mesh(geoSup, matSup);
    giro.add(sup);

    var nuv = null, geoNuv = null, matNuv = null;
    if (opts.nuvens) {
      matNuv = new THREE.ShaderMaterial({
        uniforms: { uNuvens: { value: null }, uSol: uSol, uOpac: { value: 0.62 } },
        vertexShader: VERT_SUP, fragmentShader: FRAG_NUV, transparent: true, depthWrite: false
      });
      geoNuv = new THREE.SphereGeometry(R * 1.007, Math.round(segs * 0.75), Math.round(segs * 0.5));
      nuv = new THREE.Mesh(geoNuv, matNuv); nuv.renderOrder = 1; nuv.visible = false;
      giro.add(nuv);
    }

    var Ra = R * 1.038;
    var uCentro = { value: new THREE.Vector3() };
    var matAtm = new THREE.ShaderMaterial({
      uniforms: { uCentro: uCentro, uR: { value: R }, uRa: { value: Ra }, uSol: uSol, uForca: { value: 1.35 } },
      vertexShader: VERT_ATM, fragmentShader: FRAG_ATM,
      side: THREE.BackSide, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
    });
    var geoAtm = new THREE.SphereGeometry(Ra, 64, 40);
    var atm = new THREE.Mesh(geoAtm, matAtm); atm.renderOrder = 2;
    grupo.add(atm);

    // texturas: assíncronas; a missão só revela a Terra quando estão prontas
    var loader = new THREE.TextureLoader(), texSup = null, texNuv = null, estado = 'idle', promessa = null;
    function carregar() {
      if (promessa) return promessa;
      estado = 'loading';
      function um(url) {
        return new Promise(function (ok, falha) { loader.load(url, ok, undefined, falha); });
      }
      var pedidos = [um(opts.mapa).then(function (t) {
        t.anisotropy = opts.aniso || 4; t.minFilter = THREE.LinearMipmapLinearFilter;
        texSup = t; matSup.uniforms.uMapa.value = t; matSup.needsUpdate = true;
      })];
      // nuvens são opcionais: se falharem, a Terra segue sem elas
      if (nuv) pedidos.push(um(opts.nuvens).then(function (t) {
        t.anisotropy = 2; texNuv = t; matNuv.uniforms.uNuvens.value = t; nuv.visible = true;
      }, function () { nuv.visible = false; }));
      promessa = Promise.all(pedidos).then(function () { estado = 'ready'; }, function (e) { estado = 'error'; throw e; });
      return promessa;
    }
    // envia as texturas para a GPU fora do quadro da revelação (num quadro em que nada se move)
    function preparar(renderer, camera) {
      if (estado !== 'ready' || preparar.feito) return;
      preparar.feito = true;
      if (renderer.initTexture) { if (texSup) renderer.initTexture(texSup); if (texNuv) renderer.initTexture(texNuv); }
      try { renderer.compile(scene, camera); } catch (e) {}
    }

    var CHINA_LOCAL = dirLatLon(THREE, 35, 105);
    var tmpM = new THREE.Matrix4(), tmpV = new THREE.Vector3(), tmpV2 = new THREE.Vector3(), tmpQ = new THREE.Quaternion();

    /* Posiciona a Terra: centro em `centro`, com a China voltada para `paraFora` (vetor unitário
       do centro para a câmera final) e o norte o mais perto possível de `acima`. */
    function orientar(centro, paraFora, acima) {
      grupo.position.copy(centro); uCentro.value.copy(centro);
      var n = tmpV.copy(paraFora).normalize();
      var norte = tmpV2.copy(acima).addScaledVector(n, -acima.dot(n)).normalize();
      var leste = new THREE.Vector3().crossVectors(norte, n);
      // base local da China: normal, norte e leste no ponto (35° N, 105° E)
      var nl = CHINA_LOCAL.clone();
      var nortel = new THREE.Vector3(0, 1, 0).addScaledVector(nl, -nl.y).normalize();
      var lestel = new THREE.Vector3().crossVectors(nortel, nl);
      var Mw = new THREE.Matrix4().makeBasis(leste, norte, n);
      var Ml = new THREE.Matrix4().makeBasis(lestel, nortel, nl);
      tmpM.copy(Mw).multiply(Ml.transpose());
      grupo.quaternion.setFromRotationMatrix(tmpM);
      // Sol de lado: ilumina a China e deixa o terminador do lado do Pacífico
      uSol.value.copy(n).multiplyScalar(0.5).addScaledVector(leste, -0.82).addScaledVector(norte, 0.22).normalize();
      sol.position.copy(centro).addScaledVector(uSol.value, R * 30);
      sol.target.position.copy(centro);
      grupo.updateMatrixWorld(true);
    }
    // ângulo do giro diário (rad). 0 = China exatamente voltada para a câmera final
    function girar(a, nuvensA) { giro.rotation.y = a; if (nuv) nuv.rotation.y = nuvensA || 0; }

    function pontoLatLon(lat, lon, alt, out) {
      dirLatLon(THREE, lat, lon, out).multiplyScalar(R + (alt || 0));
      return giro.localToWorld(out);
    }
    /* Rota em grande círculo que sai de `a` com rumo `rumo` (graus a partir do norte, sentido horário) e
       percorre `comp` graus, com um leve arco de altitude; em coordenadas locais do globo (calculada uma vez).
       Rumo oeste a partir da China: Ásia Central, Oriente Médio, África e, do outro lado do horizonte, o Brasil. */
    function rotaLocal(a, rumo, comp, alt, n) {
      var la = a[0] * D2R, lo = a[1] * D2R, b = rumo * D2R, out = [];
      var A = dirLatLon(THREE, a[0], a[1]);
      var norte = new THREE.Vector3(-Math.sin(la) * Math.cos(lo), Math.cos(la), Math.sin(la) * Math.sin(lo));
      var leste = new THREE.Vector3(-Math.sin(lo), 0, -Math.cos(lo));
      var dir = norte.multiplyScalar(Math.cos(b)).addScaledVector(leste, Math.sin(b));
      for (var i = 0; i < n; i++) {
        var u = i / (n - 1), s = u * comp * D2R;
        out.push(A.clone().multiplyScalar(Math.cos(s)).addScaledVector(dir, Math.sin(s)).multiplyScalar(R * (1.003 + alt * Math.sin(Math.PI * Math.min(1, u * 1.15)))));
      }
      return out;
    }
    // leva pontos locais do globo para o mundo (sem alocar: `out` é reaproveitado)
    function paraMundo(locais, out) {
      giro.updateMatrixWorld(true);
      for (var i = 0; i < locais.length; i++) (out[i] || (out[i] = new THREE.Vector3())).copy(locais[i]).applyMatrix4(giro.matrixWorld);
      return out;
    }

    function seguirCamera(camera) { ceu.position.copy(camera.position); }

    function dispose() {
      [geoSup, geoNuv, geoAtm, ceu.geometry].forEach(function (g) { if (g) g.dispose(); });
      [matSup, matNuv, matAtm, ceu.material].forEach(function (m) { if (m) m.dispose(); });
      if (texSup) texSup.dispose(); if (texNuv) texNuv.dispose();
      texSup = texNuv = null; promessa = null; estado = 'idle'; preparar.feito = false;
    }

    return {
      scene: scene, grupo: grupo, R: R, luz: sol,
      carregar: carregar, preparar: preparar, estado: function () { return estado; },
      orientar: orientar, girar: girar, pontoLatLon: pontoLatLon, rotaLocal: rotaLocal, paraMundo: paraMundo, seguirCamera: seguirCamera,
      dispose: dispose
    };
  }

  window.CITI_TERRA = { criar: criar, dirLatLon: dirLatLon };
})();
