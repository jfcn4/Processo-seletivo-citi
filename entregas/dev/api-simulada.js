/* API da Folhagem & Cia simulada no navegador.
   É uma tradução para JavaScript das regras de src/controllers/PlantaController.ts e de
   src/repositories/PlantaRepository.ts: mesmas validações, mesmos status e mesmas mensagens.
   No lugar do PostgreSQL, as plantas ficam num array em memória (e no localStorage, se houver chave).
   As operações do "banco" são assíncronas, como no Prisma: entre um await e outro, outra
   requisição pode rodar. É isso que permite mostrar a venda simultânea de verdade. */
(function (global) {
  'use strict';

  var LUMINOSIDADES = ['SOMBRA', 'MEIA_SOMBRA', 'SOL_PLENO'];
  var CAMPOS = ['nome', 'especie', 'preco', 'estoque', 'luminosidade', 'petFriendly', 'regaACadaDias'];
  var MAIOR_INT_DO_BANCO = 2147483647;

  // prisma/seed.ts
  var SEED = [
    { nome: 'Costela-de-adão', especie: 'Monstera deliciosa', preco: 8990, estoque: 12, luminosidade: 'MEIA_SOMBRA', petFriendly: false, regaACadaDias: 3 },
    { nome: 'Jiboia', especie: 'Epipremnum aureum', preco: 3490, estoque: 20, luminosidade: 'SOMBRA', petFriendly: false, regaACadaDias: 4 },
    { nome: 'Maranta', especie: 'Maranta leuconeura', preco: 4590, estoque: 7, luminosidade: 'MEIA_SOMBRA', petFriendly: true, regaACadaDias: 2 },
    { nome: 'Calathea', especie: 'Goeppertia orbifolia', preco: 7990, estoque: 0, luminosidade: 'SOMBRA', petFriendly: true, regaACadaDias: 3 },
    { nome: 'Zamioculca', especie: 'Zamioculcas zamiifolia', preco: 6490, estoque: 9, luminosidade: 'SOMBRA', petFriendly: false, regaACadaDias: 14 },
    { nome: 'Espada-de-são-jorge', especie: 'Dracaena trifasciata', preco: 3990, estoque: 15, luminosidade: 'MEIA_SOMBRA', petFriendly: false, regaACadaDias: 15 },
    { nome: 'Alecrim', especie: 'Salvia rosmarinus', preco: 1890, estoque: 25, luminosidade: 'SOL_PLENO', petFriendly: true, regaACadaDias: 2 },
    { nome: 'Lavanda', especie: 'Lavandula angustifolia', preco: 2990, estoque: 0, luminosidade: 'SOL_PLENO', petFriendly: false, regaACadaDias: 4 },
    { nome: 'Samambaia', especie: 'Nephrolepis exaltata', preco: 4290, estoque: 6, luminosidade: 'MEIA_SOMBRA', petFriendly: true, regaACadaDias: 2 },
    { nome: 'Cacto-mandacaru', especie: 'Cereus jamacaru', preco: 5490, estoque: 4, luminosidade: 'SOL_PLENO', petFriendly: false, regaACadaDias: 20 }
  ];

  // um "ida e volta" ao banco: cede a vez, e outra requisição pendente pode avançar nesse intervalo
  function tick() { return Promise.resolve().then(function () {}); }
  function copia(p) { return p ? JSON.parse(JSON.stringify(p)) : p; }

  function criar(opcoes) {
    opcoes = opcoes || {};
    var chave = opcoes.chave || null;
    var db = { plantas: [], proximoId: 1 };
    var ouvintes = [];

    function salvar() {
      if (chave) { try { localStorage.setItem(chave, JSON.stringify(db)); } catch (e) { /* sem armazenamento: segue em memória */ } }
      ouvintes.forEach(function (fn) { try { fn(); } catch (e) { /* ouvinte de outra página */ } });
    }
    function semear() {
      db = { plantas: [], proximoId: 1 };
      SEED.forEach(function (p) { inserir(p); });
    }
    function agora() { return new Date().toISOString(); }
    function inserir(d) {
      var t = agora(), p = { id: db.proximoId++, nome: d.nome, especie: d.especie, preco: d.preco, estoque: d.estoque, luminosidade: d.luminosidade, petFriendly: d.petFriendly, regaACadaDias: d.regaACadaDias, createdAt: t, updatedAt: t };
      db.plantas.push(p); return p;
    }

    var carregou = false;
    if (chave) { try { var s = JSON.parse(localStorage.getItem(chave) || 'null'); if (s && Array.isArray(s.plantas)) { db = s; carregou = true; } } catch (e) { /* ignora */ } }
    if (!carregou && opcoes.semear !== false) { semear(); if (chave) salvar(); }

    /* ---------------- Repository (PlantaRepository.ts) ---------------- */
    var repo = {
      createPlanta: function (d) { return tick().then(function () { var p = inserir(d); salvar(); return copia(p); }); },
      findAllPlantas: function (f) {
        return tick().then(function () {
          var lista = db.plantas.filter(function (p) {
            if (f.luminosidade !== undefined && p.luminosidade !== f.luminosidade) return false;
            if (f.petFriendly !== undefined && p.petFriendly !== f.petFriendly) return false;
            if (f.nome && p.nome.toLowerCase().indexOf(f.nome.toLowerCase()) < 0) return false;
            return true;
          });
          var campo = f.ordem || 'id';
          lista.sort(function (a, b) { return campo === 'nome' ? (a.nome < b.nome ? -1 : a.nome > b.nome ? 1 : 0) : a[campo] - b[campo]; });
          return copia(lista);
        });
      },
      findPlantasEsgotadas: function () { return tick().then(function () { return copia(db.plantas.filter(function (p) { return p.estoque === 0; })); }); },
      findPlantaById: function (id) { return tick().then(function () { return copia(db.plantas.filter(function (p) { return p.id === id; })[0] || null); }); },
      updatePlanta: function (id, d) {
        return tick().then(function () {
          var p = db.plantas.filter(function (x) { return x.id === id; })[0];
          CAMPOS.forEach(function (c) { if (d[c] !== undefined) p[c] = d[c]; });
          p.updatedAt = agora(); salvar(); return copia(p);
        });
      },
      deletePlanta: function (id) { return tick().then(function () { db.plantas = db.plantas.filter(function (p) { return p.id !== id; }); salvar(); }); },
      // updateMany com where { estoque: { gte: quantidade } }: conferir e diminuir é UMA operação só
      venderPlanta: function (id, q) {
        return tick().then(function () {
          var p = db.plantas.filter(function (x) { return x.id === id && x.estoque >= q; })[0];
          if (!p) return false;
          p.estoque -= q; p.updatedAt = agora(); salvar(); return true;
        });
      },
      // versão ingênua, só para a demonstração: confere, espera o banco, e só depois diminui
      venderIngenuo: function (id, q) {
        var p;
        return tick().then(function () { p = db.plantas.filter(function (x) { return x.id === id; })[0]; return p && p.estoque >= q; })
          .then(function (ok) { return tick().then(function () { if (!ok) return false; p.estoque -= q; salvar(); return true; }); });
      },
      findPrecoEEstoque: function () { return tick().then(function () { return db.plantas.map(function (p) { return { preco: p.preco, estoque: p.estoque }; }); }); }
    };

    /* ---------------- Validações (PlantaController.ts) ---------------- */
    function ehTextoValido(v) { return typeof v === 'string' && v.trim() !== ''; }
    function ehInteiro(v) { return Number.isInteger(v); }
    function validarCampo(campo, v) {
      if (ehInteiro(v) && v > MAIOR_INT_DO_BANCO) return campo + ' deve ser no máximo ' + MAIOR_INT_DO_BANCO + '.';
      switch (campo) {
        case 'nome': case 'especie': return ehTextoValido(v) ? null : campo + ' deve ser um texto não vazio.';
        case 'preco': return ehInteiro(v) && v > 0 ? null : 'preco deve ser um inteiro maior que zero (valor em centavos).';
        case 'estoque': return ehInteiro(v) && v >= 0 ? null : 'estoque deve ser um inteiro maior ou igual a zero.';
        case 'regaACadaDias': return ehInteiro(v) && v >= 1 ? null : 'regaACadaDias deve ser um inteiro maior ou igual a 1.';
        case 'luminosidade': return typeof v === 'string' && LUMINOSIDADES.indexOf(v) >= 0 ? null : 'luminosidade deve ser um destes valores: ' + LUMINOSIDADES.join(', ') + '.';
        case 'petFriendly': return typeof v === 'boolean' ? null : 'petFriendly deve ser true ou false.';
        default: return null;
      }
    }
    function validarPlanta(body, parcial) {
      for (var i = 0; i < CAMPOS.length; i++) {
        var c = CAMPOS[i], v = body[c];
        if (v === undefined) { if (parcial) continue; return { campo: c, message: 'O campo ' + c + ' é obrigatório.' }; }
        var e = validarCampo(c, v); if (e) return { campo: c, message: e };
      }
      return null;
    }
    function extrair(body) {
      return {
        nome: typeof body.nome === 'string' ? body.nome.trim() : undefined,
        especie: typeof body.especie === 'string' ? body.especie.trim() : undefined,
        preco: body.preco, estoque: body.estoque, luminosidade: body.luminosidade, petFriendly: body.petFriendly, regaACadaDias: body.regaACadaDias
      };
    }
    function parseId(v) { var id = Number(v); return typeof v === 'string' && v !== '' && Number.isInteger(id) && id > 0 && id <= MAIOR_INT_DO_BANCO ? id : null; }
    function lerFiltros(q) {
      var f = {};
      if (q.has('luminosidade')) { var l = q.get('luminosidade'); if (LUMINOSIDADES.indexOf(l) < 0) return { campo: 'luminosidade', message: 'Filtro luminosidade inválido. Use: ' + LUMINOSIDADES.join(', ') + '.' }; f.luminosidade = l; }
      if (q.has('petFriendly')) { var pf = q.get('petFriendly'); if (pf !== 'true' && pf !== 'false') return { campo: 'petFriendly', message: 'Filtro petFriendly deve ser true ou false.' }; f.petFriendly = pf === 'true'; }
      if (q.has('nome')) { var n = q.get('nome'); if (!ehTextoValido(n)) return { campo: 'nome', message: 'Filtro nome deve ser um texto não vazio.' }; f.nome = n.trim(); }
      if (q.has('ordem')) { var o = q.get('ordem'); if (o !== 'preco' && o !== 'nome') return { campo: 'ordem', message: 'Filtro ordem deve ser preco ou nome.' }; f.ordem = o; }
      return f;
    }
    var ID_INVALIDO = { campo: 'id', message: 'O id deve ser um inteiro positivo.' };
    function naoEncontrada(id) { return { message: 'Planta com id ' + id + ' não encontrada.' }; }
    function R(status, body) { return { status: status, body: body === undefined ? null : body }; }

    /* ---------------- Handlers ---------------- */
    var H = {
      create: function (body) {
        var e = validarPlanta(body, false); if (e) return Promise.resolve(R(400, e));
        return repo.createPlanta(extrair(body)).then(function (p) { return R(201, p); });
      },
      list: function (q) {
        var f = lerFiltros(q); if (f.message) return Promise.resolve(R(400, f));
        return repo.findAllPlantas(f).then(function (l) { return R(200, l); });
      },
      esgotadas: function () { return repo.findPlantasEsgotadas().then(function (l) { return R(200, l); }); },
      read: function (raw) {
        var id = parseId(raw); if (id === null) return Promise.resolve(R(400, ID_INVALIDO));
        return repo.findPlantaById(id).then(function (p) { return p ? R(200, p) : R(404, naoEncontrada(id)); });
      },
      update: function (raw, body) {
        var id = parseId(raw); if (id === null) return Promise.resolve(R(400, ID_INVALIDO));
        if (!CAMPOS.some(function (c) { return body[c] !== undefined; })) return Promise.resolve(R(400, { message: 'Nenhum campo válido para atualizar.' }));
        var e = validarPlanta(body, true); if (e) return Promise.resolve(R(400, e));
        return repo.findPlantaById(id).then(function (p) {
          if (!p) return R(404, naoEncontrada(id));
          return repo.updatePlanta(id, extrair(body)).then(function (x) { return R(200, x); });
        });
      },
      remove: function (raw) {
        var id = parseId(raw); if (id === null) return Promise.resolve(R(400, ID_INVALIDO));
        return repo.findPlantaById(id).then(function (p) {
          if (!p) return R(404, naoEncontrada(id));
          return repo.deletePlanta(id).then(function () { return R(204); });
        });
      },
      venda: function (raw, body, ingenua) {
        var id = parseId(raw); if (id === null) return Promise.resolve(R(400, ID_INVALIDO));
        var q = body.quantidade;
        if (!ehInteiro(q) || q <= 0 || q > MAIOR_INT_DO_BANCO) return Promise.resolve(R(400, { campo: 'quantidade', message: 'quantidade deve ser um inteiro maior que zero.' }));
        return repo.findPlantaById(id).then(function (planta) {
          if (!planta) return R(404, naoEncontrada(id));
          return (ingenua ? repo.venderIngenuo : repo.venderPlanta)(id, q).then(function (vendeu) {
            if (!vendeu) {
              return repo.findPlantaById(id).then(function (atual) {
                var d = atual ? atual.estoque : 0;
                return R(400, { campo: 'quantidade', message: 'Estoque insuficiente: temos só ' + d + ' ' + (d === 1 ? 'vaso' : 'vasos') + ' de ' + planta.nome + '.' });
              });
            }
            return repo.findPlantaById(id).then(function (p) { return R(200, p); });
          });
        });
      },
      total: function () {
        return repo.findPrecoEEstoque().then(function (l) {
          return R(200, l.reduce(function (t, p) { return { valorTotalEmCentavos: t.valorTotalEmCentavos + p.preco * p.estoque, totalDeVasos: t.totalDeVasos + p.estoque }; }, { valorTotalEmCentavos: 0, totalDeVasos: 0 }));
        });
      }
    };

    /* ---------------- Rotas (routes.ts), na mesma ordem ---------------- */
    function requisitar(metodo, url, corpo, extra) {
      metodo = String(metodo || 'GET').toUpperCase();
      var u = new URL(url, 'http://localhost:3001'), path = u.pathname.replace(/\/+$/, '') || '/', m;
      var body = {};
      if (corpo != null && corpo !== '') {
        if (typeof corpo === 'string') {
          try { body = JSON.parse(corpo); } catch (e) { return Promise.resolve(R(400, { message: 'O corpo da requisição não é um JSON válido.' })); }
        } else body = corpo;
      }
      if (typeof body !== 'object' || body === null || Array.isArray(body)) body = {};
      var ingenua = !!(extra && extra.ingenua);
      if (path === '/' && metodo === 'GET') return Promise.resolve(R(200, { message: 'API do treinamento de CRUD do CITi 🚀 (simulada no navegador)' }));
      if (/^\/users(\/|$)/.test(path)) return Promise.resolve(R(404, { message: 'O CRUD de usuários do template não faz parte desta simulação.' }));
      if (path === '/plantas' && metodo === 'POST') return H.create(body);
      if (path === '/plantas' && metodo === 'GET') return H.list(u.searchParams);
      if (path === '/plantas/esgotadas' && metodo === 'GET') return H.esgotadas();
      if (path === '/plantas/estoque/valor-total' && metodo === 'GET') return H.total();
      if ((m = path.match(/^\/plantas\/([^/]+)$/))) {
        var raw = decodeURIComponent(m[1]);
        if (metodo === 'GET') return H.read(raw);
        if (metodo === 'PATCH') return H.update(raw, body);
        if (metodo === 'DELETE') return H.remove(raw);
      }
      if ((m = path.match(/^\/plantas\/([^/]+)\/venda$/)) && metodo === 'POST') return H.venda(decodeURIComponent(m[1]), body, ingenua);
      return Promise.resolve(R(404, { message: 'Rota não encontrada' }));
    }

    return {
      requisitar: requisitar,
      restaurar: function () { semear(); salvar(); },
      ouvir: function (fn) { ouvintes.push(fn); return function () { ouvintes = ouvintes.filter(function (x) { return x !== fn; }); }; },
      plantas: function () { return copia(db.plantas); },
      // usado pela demonstração da venda simultânea
      definir: function (id, campos) { var p = db.plantas.filter(function (x) { return x.id === id; })[0]; if (p) { Object.keys(campos).forEach(function (k) { p[k] = campos[k]; }); salvar(); } }
    };
  }

  // fetch que responde a partir da API simulada; o resto (fontes, imagens) segue para a rede
  function instalarFetch(win, api) {
    var original = win.fetch ? win.fetch.bind(win) : null;
    win.fetch = function (entrada, op) {
      op = op || {};
      var url = typeof entrada === 'string' ? entrada : entrada.url;
      var u = new URL(url, win.location.href);
      var nossa = u.origin === win.location.origin && (/^\/?plantas/.test(url) || /\/plantas(\/|$|\?)/.test(u.pathname) || url === '/');
      if (!nossa) return original ? original(entrada, op) : Promise.reject(new Error('fetch indisponível'));
      var caminho = /^\//.test(url) ? url : u.pathname.replace(/^.*?(\/plantas)/, '$1') + u.search;
      return api.requisitar(op.method || 'GET', caminho, op.body).then(function (r) {
        return new win.Response(r.status === 204 ? null : JSON.stringify(r.body), { status: r.status, headers: { 'Content-Type': 'application/json' } });
      });
    };
  }

  global.FolhagemApi = { criar: criar, instalarFetch: instalarFetch, SEED: SEED };
})(window);
