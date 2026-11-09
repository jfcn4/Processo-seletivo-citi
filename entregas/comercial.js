/* Entrega do planeta Comercial: desafio 1 (ICP) + desafio 2 (diagnóstico) + indicação de leads.
   painel(): resumo no painel lateral (resposta, os dois PDFs, o funil do ICP e o placar de leads).
   abrir(aba): tela cheia com o filtro do ICP, a calculadora de porte, o roteiro da reunião e o placar.
   Todos os números vêm dos dois documentos entregues; as contas são refeitas aqui, na hora.
   A tabela de leads original tem nomes e telefones de pessoas reais: aqui só aparecem empresa,
   poder de decisão e pontos, nunca o contato. */
(function () {
  'use strict';

  var DOCS = {
    icp: { url: 'Desafio_Comercial_1_ICP_Joao_Felipe_Costa_Neves.pdf', nome: 'Desafio 1 · ICP', pags: 6 },
    diag: { url: 'Desafio_Comercial_2_Diagnostico_Joao_Felipe_Costa_Neves.pdf', nome: 'Desafio 2 · Diagnóstico', pags: 9 }
  };
  var PDFJS = window.MK_PDFJS_BASE || 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/';
  var ICP_MIN = 30e6, ICP_MAX = 200e6;

  /* ---------- desafio 1: as 8 empresas da matriz de qualificação ---------- */
  // t: [sede em PE, porte, tradicional, complexidade] -> [passou?, detalhe]
  var EMP = [
    { id: 'ita', nome: 'Transportadora Itamaracá', setor: 'Transporte urbano', t: [[1, 'Abreu e Lima'], [1, 'R$ 110 a 150 mi'], [1, 'desde 1966'], [1, '200+ ônibus']], fim: 'escolhida' },
    { id: 'coral', nome: 'Armazém Coral Achaqui', setor: 'Varejo de construção e casa', t: [[1, 'Recife'], [1, 'R$ 100 a 160 mi'], [1, 'desde 1961'], [1, '24 lojas']], fim: 'escolhida' },
    { id: 'ea', nome: 'Grupo Entre Amigos', setor: 'Restaurantes', t: [[1, 'Recife'], [1, 'R$ 45 a 80 mi'], [1, 'desde 1994'], [1, '5 casas, 2 estados']], fim: 'escolhida' },
    { id: 'ca', nome: 'Cidade Alta Transportes', setor: 'Transporte urbano', t: [[1, 'RMR'], [1, 'estimo R$ 75 a 100 mi'], [1, 'desde 1993'], [1, '180+ ônibus']], fim: 'reserva', motivo: 'Reserva: mesmo setor e mesmo gatilho da Itamaracá' },
    { id: 'cam', nome: 'Camarada Camarão', setor: 'Restaurantes', t: [[0, 'hoje controlada pelo Grupo Alife Nino'], [0, '~R$ 360 mi previstos para 2023'], [1, 'desde 2005'], [1, '35 unidades']], fim: 'fora', motivo: 'Fora por porte e controle' },
    { id: 'novo', nome: 'Novo Atacarejo', setor: 'Atacarejo', t: [[1, 'PE'], [0, 'R$ 5,8 bi em 2024'], [1, ''], [1, '']], fim: 'fora', motivo: 'Fora por porte' },
    { id: 'pm', nome: 'Pague Menos', setor: 'Farmácias', t: [[0, 'sede no Ceará'], [0, 'rede nacional'], [1, ''], [1, '118 lojas em PE']], fim: 'fora', motivo: 'Fora por região e porte' },
    { id: 'ap', nome: 'Armazém Paraíba', setor: 'Varejo', t: [[0, 'sede em João Pessoa'], [0, 'provável não: 47 lojas, 12 mil pessoas'], [1, ''], [1, '']], fim: 'fora', motivo: 'Fora por região' }
  ];
  var TRACOS = ['Sede em PE', 'Porte R$ 30–200 mi', 'Tradicional', 'Complexidade'];
  var ETAPAS = [
    { n: 0, nome: 'As 8 avaliadas', txt: 'Comecei com oito empresas pernambucanas ou com operação forte em Pernambuco. Avance as etapas para ver o filtro acontecer na ordem em que apliquei.' },
    { n: 1, nome: '1 · Filtro eliminatório', txt: 'Sede em PE e porte entre R$ 30 e 200 milhões são os traços mais objetivos do ICP, então descarto cedo o que não passa. Quatro caem aqui, o que confirma que esses dois devem ser checados primeiro.' },
    { n: 2, nome: '2 · Pontuação', txt: 'Tempo de mercado (tradicional) e número de unidades ou frentes a coordenar (complexidade). As quatro que sobraram passam nos dois.' },
    { n: 3, nome: '3 · Diversificação', txt: 'Três setores diferentes, para mostrar que o ICP vale além de um tipo de negócio. A Cidade Alta fica de reserva: mesmo setor e mesmo gatilho da Itamaracá.' },
    { n: 4, nome: '4 · Gatilho', txt: 'Só entrou quem tem um fato público de 2026 que justifica a ligação agora.' }
  ];
  var ALVOS = [
    { id: 'ita', nome: 'Transportadora Itamaracá', setor: 'Transporte urbano · Consórcio Conorte, RMR', desde: 1966, unid: '200+ ônibus · ~800 colaboradores', porte: 'R$ 110 a 150 mi',
      fit: 'Painel de frota por garagem', fitTxt: 'Para cada ônibus: idade e vida útil restante, manutenção preventiva vencida ou em dia e disponibilidade diária, cruzando com o GPS dos veículos novos. Piloto pelos 66 ônibus que estão chegando.',
      dor: ['A frota vai ficar mista: Euro 6 passam de 80 para 146, convivendo com veículos antigos.', 'A vida útil é fiscalizada: o MPPE apontou que cerca de um terço dos ônibus do Grande Recife já passou dela.', 'Ônibus parado custa caro: vira viagem não realizada e risco de penalidade.'],
      gatilho: 'Agosto de 2026: BNDES aprova cerca de R$ 53 milhões para 66 ônibus com ar-condicionado, câmeras e GPS.',
      gancho: 'Vi que vocês estão recebendo 66 ônibus novos. Como estão organizando a manutenção de uma frota que agora mistura veículos novos e antigos?' },
    { id: 'coral', nome: 'Armazém Coral Achaqui', setor: 'Varejo de construção, casa e cama, mesa e banho', desde: 1961, unid: '24 lojas na RMR · 500+ funcionários', porte: 'R$ 100 a 160 mi',
      fit: 'Estoque integrado entre lojas e canais digitais', fitTxt: 'O pedido feito no e-commerce, no app ou no WhatsApp reserva o produto na loja mais próxima com saldo real, com alerta de falta por loja. Piloto com 3 lojas e o canal WhatsApp.',
      dor: ['Muitos itens, muitas lojas: do cimento ao cama, mesa e banho, com saldo conferido por telefone entre unidades.', 'Canais novos sobre um processo antigo tendem a consultar o estoque por fora.', 'A loja física continua no centro: integrar o estoque faz dela o ponto de retirada e entrega.'],
      gatilho: 'Fevereiro de 2026: 65 anos de fundação, com a empresa anunciando modernização e reforma das lojas.',
      gancho: 'Vi que vocês estão modernizando as lojas nos 65 anos da rede. Essa modernização inclui a parte de estoque entre as lojas e o online?' },
    { id: 'ea', nome: 'Grupo Entre Amigos', setor: 'Restaurantes de culinária regional', desde: 1994, unid: '4 casas no Recife + 1 em Fortaleza', porte: 'R$ 45 a 80 mi',
      fit: 'Painel de CMV e estoque de insumos por unidade', fitTxt: 'Ligado à ficha técnica de cada prato, para comparar as casas entre si. Piloto pela carne de bode, comparando Recife e Fortaleza.',
      dor: ['Compras casa a casa: cada gerente na sua planilha.', 'Fornecimento mais difícil a distância: com uma casa a 800 km, frete, perdas e variação de preço pesam mais.', 'Sem um CMV comparado, o grupo não sabe qual formato é mais rentável para a próxima expansão.'],
      gatilho: 'Março de 2026: primeira unidade fora de Pernambuco em mais de 30 anos, no RioMar Fortaleza (1.600 m², 400 lugares).',
      gancho: 'Parabéns pela casa de Fortaleza! Como está sendo abastecer uma unidade a 800 km mantendo o padrão das casas do Recife?' }
  ];

  /* ---------- porte: as duas contas independentes de cada empresa ---------- */
  // cada premissa: [rótulo, valor do documento, mín, máx, passo, formato, é premissa minha?]
  var PORTE = {
    ita: {
      faixa: [110e6, 150e6],
      p: { pax: ['Passageiros por dia', 102000, 0, 0, 0, 'n', 0], tar: ['Tarifa (bilhete único 2026)', 4.47, 0, 0, 0, 'r2', 0], desc: ['Gratuidades e integrações', 25, 15, 35, 1, '%', 1],
        func: ['Colaboradores', 800, 0, 0, 0, 'n', 0], rpf: ['Receita por funcionário', 150000, 110000, 190000, 5000, 'k', 1] },
      contas: [
        { nome: 'Pela demanda', v: function (p) { return p.pax * p.tar * 365 * (1 - p.desc / 100); }, txt: function (p) { return fmtN(p.pax) + ' passageiros/dia × R$ ' + num(p.tar, 2) + ' × 365 dias × (1 − ' + p.desc + '%)'; } },
        { nome: 'Pela equipe', v: function (p) { return p.func * p.rpf; }, txt: function (p) { return fmtN(p.func) + ' colaboradores × ' + fmtK(p.rpf) + ' por funcionário'; } }
      ] },
    coral: {
      faixa: [100e6, 160e6],
      p: { fluxo: ['Pessoas por dia nas lojas', 10000, 0, 0, 0, 'n', 0], conv: ['Quantas compram', 50, 35, 65, 1, '%', 1], ticket: ['Ticket médio', 70, 50, 90, 1, 'r0', 1],
        func: ['Funcionários (porte declarado)', 500, 0, 0, 0, 'n', 0], rpf: ['Receita por funcionário no varejo', 250000, 180000, 320000, 5000, 'k', 1] },
      contas: [
        { nome: 'Pelo fluxo de clientes', v: function (p) { return p.fluxo * p.conv / 100 * p.ticket * 360; }, txt: function (p) { return fmtN(p.fluxo) + ' pessoas × ' + p.conv + '% que compram × R$ ' + p.ticket + ' × 360 dias'; } },
        { nome: 'Pela equipe', v: function (p) { return p.func * p.rpf; }, txt: function (p) { return 'acima de ' + fmtN(p.func) + ' funcionários × ' + fmtK(p.rpf); } }
      ] },
    ea: {
      faixa: [45e6, 80e6],
      p: { pess: ['Pessoas (5 casas × ~100)', 500, 0, 0, 0, 'n', 0], rpf: ['Receita por funcionário', 120000, 90000, 150000, 5000, 'k', 1],
        lug: ['Lugares (5 casas × ~300)', 1500, 0, 0, 0, 'n', 1], giro: ['Clientes por lugar por dia', 1.2, 0.9, 1.5, 0.05, 'x', 1], ticket: ['Ticket médio', 95, 75, 115, 1, 'r0', 1] },
      contas: [
        { nome: 'Pela equipe', v: function (p) { return p.pess * p.rpf; }, txt: function (p) { return fmtN(p.pess) + ' pessoas × ' + fmtK(p.rpf) + ' por funcionário'; } },
        { nome: 'Pela capacidade', v: function (p) { return p.lug * p.giro * p.ticket * 360; }, txt: function (p) { return fmtN(p.lug) + ' lugares × ' + num(p.giro, 2) + ' cliente por lugar × R$ ' + p.ticket + ' × 360 dias'; } }
      ] }
  };

  /* ---------- desafio 2: o roteiro da reunião com a Itamaracá ---------- */
  var ETAPAS_R = [
    { k: 'ab', nome: 'Abertura', min: 5 }, { k: 'S', nome: 'Situação', min: 10 }, { k: 'P', nome: 'Problema', min: 10 },
    { k: 'I', nome: 'Implicação', min: 10 }, { k: 'N', nome: 'Necessidade', min: 5 }, { k: 'fe', nome: 'Fechamento', min: 5 }
  ];
  var PERG = {
    S: [
      ['S1', 'Hoje, como funciona a manutenção de um ônibus, desde o problema aparecer até ele voltar para a rua?', 'Entender o fluxo real, e não o do manual', 'Processo atual, base para desenhar o fluxo futuro'],
      ['S2', 'Onde vocês registram isso: num sistema, em planilha ou em ordem de serviço de papel?', 'Descobrir a maturidade digital e de onde viriam os dados', 'Plataformas atuais e esforço de integração'],
      ['S3', 'Quantas garagens são, e cada uma controla a própria frota?', 'Medir a complexidade e achar onde começar', 'Escopo do piloto: uma garagem ou todas'],
      ['S4', 'Quem cuida disso no dia a dia? Existe um gerente de manutenção e um time de TI interno?', 'Mapear quem usa e quem decide, e se o CITi constrói tudo ou trabalha junto com o time deles', 'Pessoas envolvidas e modelo de projeto'],
      ['S5', 'Os ônibus novos vêm com GPS e câmeras. Vocês já usam esses dados para alguma coisa além do monitoramento do consórcio?', 'Saber se existe dado parado que o painel pode aproveitar', 'Fontes de dados disponíveis e o potencial rápido do projeto'],
      ['S6', 'Como vocês prestam contas ao Grande Recife Consórcio sobre a idade e as condições da frota?', 'Entender a obrigação regulatória, que traz urgência', 'Requisitos de relatório que o painel precisa gerar']
    ],
    P: [
      ['P1', 'Se eu perguntar agora quantos ônibus estão parados na garagem e por quê, quanto tempo leva para ter essa resposta?', 'Falta de visibilidade. Uma resposta de horas, ou um “tenho que ligar para a garagem”, confirma', 'Área prioritária do projeto e a principal tela do painel'],
      ['P2', 'Hoje a maior parte da manutenção é programada ou acontece quando o ônibus quebra?', 'Corretiva demais. Se for mais corretiva, a dor existe', 'Escopo do módulo de preventiva'],
      ['P3', 'Com os 66 novos chegando, como fica o controle de uma frota que mistura Euro 6 novos e veículos mais antigos?', 'Frota mista. Testa se o gatilho virou dor', 'Regras de negócio por tipo de veículo'],
      ['P4', 'Como vocês decidem qual ônibus antigo sai primeiro quando chega um novo?', 'Decisão sem dado. “Experiência” ou “pela idade” sem histórico de custo confirma', 'Funcionalidade de priorização da renovação'],
      ['P5', 'Onde esse processo mais trava hoje: na informação, nas peças ou nas pessoas?', 'Pergunta aberta para achar uma dor que eu não previ', 'Pode mudar o foco do projeto. Se a resposta for “peças”, o escopo vira estoque de peças']
    ],
    I: [
      ['I1', 'Quando um ônibus quebra no meio do dia, o que acontece com as viagens daquela linha?', 'Ligar a quebra à viagem não realizada e ao passageiro perdido', 'Impacto na receita por evento'],
      ['I2', 'Em média, quantos ônibus ficam indisponíveis por dia, e quanto cada um deixa de faturar?', 'Pedir ao próprio cliente o número central do business case', 'Custo anual da indisponibilidade'],
      ['I3', 'Quantos ônibus vocês deixam de reserva por não saber quando o próximo vai quebrar?', 'Mostrar capital parado. Pelo financiamento, cada ônibus novo custa cerca de R$ 800 mil (R$ 53 mi ÷ 66)', 'Economia potencial ao reduzir a frota reserva'],
      ['I4', 'Quando a manutenção é corretiva, quanto sai mais caro que a programada, contando guincho, peça urgente e hora extra?', 'Medir a diferença de custo entre corretiva e preventiva', 'Ganho com preventiva, um argumento de ROI'],
      ['I5', 'Quanto tempo a equipe gasta por semana montando relatórios da frota para a diretoria e para o consórcio?', 'Medir horas gastas em trabalho manual', 'Horas e pessoas envolvidas, ganho de produtividade'],
      ['I6', 'Se a fiscalização sobre a vida útil apertar, como isso afetaria a operação ou a relação com o Grande Recife Consórcio?', 'Tornar explícito o risco regulatório sem soar como acusação', 'Urgência e prazo do projeto'],
      ['I7', 'E com os 66 ônibus novos, que foram financiados, o que significa para vocês cada um deles ficar parado?', 'Ligar o custo do financiamento à disponibilidade. Ônibus novo parado é parcela paga sem receita', 'Reforça o business case e o argumento de começar o piloto pela frota nova']
    ],
    N: [
      ['N1', 'Se você abrisse uma tela de manhã e visse a situação de cada ônibus de todas as garagens, o que mudaria na sua rotina?', 'O cliente descreve o cenário ideal', 'Cenário ideal e as telas prioritárias'],
      ['N2', 'Daqui a seis meses, o que precisaria ter acontecido para você considerar que valeu a pena?', 'Definir o critério de sucesso em números', 'Indicadores do projeto, por exemplo disponibilidade de frota acima de X%'],
      ['N3', 'Por onde faria sentido começar: pelos 66 ônibus novos ou por uma garagem inteira?', 'Deixar o cliente escolher o piloto, que vira o escopo da fase 1', 'Escopo e tamanho do piloto, que definem o preço'],
      ['N4', 'Existe um momento em que isso precisaria estar funcionando, como a chegada dos novos ônibus ou uma auditoria do consórcio?', 'Descobrir o prazo real', 'Prazo e cronograma'],
      ['N5', 'Além de você, quem precisaria estar convencido para isso andar?', 'Mapear o comitê de decisão, que pode incluir os sócios da família', 'Quem participa da próxima reunião e quem aprova o orçamento']
    ]
  };
  var INTRO = {
    S: 'Mapeiam o processo atual, as pessoas e as ferramentas. São poucas e diretas, porque perguntar o que dá para pesquisar cansa o diretor.',
    P: 'Cada uma testa uma parte da hipótese: falta visibilidade da frota, a manutenção é mais corretiva que preventiva e a frota mista complica o controle. Se nenhuma se confirmar, entra o plano B.',
    I: 'Transformam “às vezes um ônibus fica parado” em um número que justifica investir. Cada uma liga a dor a receita, capital parado, horas da equipe ou relação com o órgão gestor.',
    N: 'Fazem o diretor descrever, com as palavras dele, o cenário ideal e o critério de sucesso. Uma solução que ele mesmo descreveu ele defende internamente.'
  };
  var COLS = { S: 'Objetivo', P: 'Parte da hipótese testada', I: 'Objetivo', N: 'Objetivo' };
  // checklist do time de Soluções (seção 7) e as perguntas que respondem cada item
  var NEEDS = [
    ['Área prioritária', ['P1', 'P5']], ['Processo atual', ['S1', 'P2']], ['Pessoas envolvidas', ['S4', 'N5']],
    ['Plataformas que já usam', ['S2', 'S5']], ['Tem time de TI?', ['S4']], ['Cenário ideal e critério de sucesso', ['N1', 'N2']],
    ['Prazo', ['N4', 'I6']], ['Escopo do piloto', ['S3', 'N3']], ['Números do business case', ['I2', 'I3']]
  ];
  var PIVOS = [
    { nome: 'Escala de motoristas e cobradores', txt: 'Cerca de 800 colaboradores em turnos. A dor típica é falta de pessoal e hora extra.', mede: 'horas extras e viagens perdidas por falta de pessoal' },
    { nome: 'Estoque de peças entre garagens', txt: 'Ônibus parado esperando peça que estava em outra garagem.', mede: 'tempo de ônibus parado por falta de peça' },
    { nome: 'Indicadores para o consórcio', txt: 'Pontualidade e viagens realizadas, cruzando o GPS.', mede: 'viagens não realizadas e penalidades do órgão gestor' }
  ];
  var RECEITA_DIA = 125e6 / 200 / 365;   // ≈ R$ 1.712 por ônibus por dia (estimativa do desafio 1)

  /* ---------- indicação de leads (sem nomes nem telefones) ---------- */
  var LEADS = [
    ['Armazém Coral', 'D', 0, 8], ['Grupo Entre Amigos', 'D', 0, 8], ['Transportadora Itamaracá', 'D', 0, 8], ['Transportadora Itamaracá', 'D', 0, 8],
    ['Grupo Entre Amigos', 'D', 0, 8], ['Cidade Alta Transportes', 'D', 0, 8], ['Bode do Nô', 'D', 0, 8], ['Casa dos Frios', 'D', 0, 8],
    ['Colégio Núcleo', 'D', 1, 9], ['Colégio Núcleo', 'I', 0, 6], ['Colégio Núcleo', 'D', 0, 8]
  ];
  var DA_PESQUISA = ['Armazém Coral', 'Grupo Entre Amigos', 'Transportadora Itamaracá', 'Cidade Alta Transportes'];
  var NIVEIS = [[0, 'Iniciante'], [10, 'Bronze'], [25, 'Prata'], [50, 'Ouro'], [80, 'Diamante']];
  var PTS = LEADS.reduce(function (s, l) { return s + l[3]; }, 0);   // 87

  /* ---------- utilidades ---------- */
  function node(html) { var t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function num(v, d) { return v.toFixed(d == null ? 1 : d).replace('.', ','); }
  function fmtN(v) { return String(Math.round(v)).replace(/\B(?=(\d{3})+(?!\d))/g, '.'); }
  function fmtK(v) { return 'R$ ' + fmtN(v / 1000) + ' mil'; }
  function mi(v) { return 'R$ ' + num(v / 1e6, v >= 1e8 ? 0 : 1).replace(/,0$/, '') + ' mi'; }
  function brl(v) { return 'R$ ' + fmtN(v); }
  function fmtP(f, v) { return f === '%' ? v + '%' : f === 'k' ? fmtK(v) : f === 'r2' ? 'R$ ' + num(v, 2) : f === 'r0' ? 'R$ ' + v : f === 'x' ? num(v, 2) : fmtN(v); }
  function seg(items, aria, cls) {
    var g = node('<div class="cm-seg' + (cls ? ' ' + cls : '') + '" role="group" aria-label="' + aria + '"></div>');
    items.forEach(function (it) { var b = node('<button type="button"></button>'); b.textContent = it[1]; b.dataset.v = it[0]; g.appendChild(b); });
    return g;
  }
  function marcar(g, v) { g.querySelectorAll('button').forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.v === String(v) ? 'true' : 'false'); }); }
  var REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ================= ICP: o filtro, etapa por etapa ================= */
  var etapa = 4;
  function status(e, s) {   // como a empresa está depois da etapa s
    if (s >= 1 && (!e.t[0][0] || !e.t[1][0])) return 'out1';
    if (s >= 2 && (!e.t[2][0] || !e.t[3][0])) return 'out2';
    if (s >= 3 && e.fim === 'reserva') return 'reserva';
    if (s >= 3 && e.fim === 'escolhida') return 'escolhida';
    return 'viva';
  }
  function restantes(s) { return EMP.filter(function (e) { var st = status(e, s); return st === 'viva' || st === 'escolhida'; }).length; }

  function funil(container, compacto) {
    var c = node('<div class="' + (compacto ? 'cm-funil is-compact' : 'mk-card cm-funil') + '"></div>');
    if (!compacto) c.innerHTML = '<p class="mk-label">Como cheguei nas 3 empresas · avance as etapas</p>';
    var ctr = seg(ETAPAS.map(function (e) { return [e.n, compacto ? (e.n ? 'Etapa ' + e.n : 'Início') : e.nome]; }), 'Etapas do filtro', compacto ? 'is-sm' : '');
    var play = compacto ? null : node('<button type="button" class="mk-btn cm-play">▶ Reproduzir o filtro</button>');
    var bar = node('<div class="cm-funil-top"></div>'); bar.appendChild(ctr); if (play) bar.appendChild(play);
    c.appendChild(bar);
    var bars = node('<div class="cm-bars" aria-hidden="true"></div>'); c.appendChild(bars);
    var txt = node('<p class="cm-note" aria-live="polite"></p>'); c.appendChild(txt);
    var list = node('<ol class="cm-emp' + (compacto ? ' is-compact' : '') + '"></ol>'); c.appendChild(list);
    container.appendChild(c);
    var timer = null;
    function draw() {
      marcar(ctr, etapa);
      var counts = ETAPAS.map(function (e) { return restantes(e.n); });
      bars.innerHTML = counts.map(function (n, i) {
        return '<div class="cm-bar' + (i === etapa ? ' is-on' : '') + (i > etapa ? ' is-next' : '') + '"><span style="height:' + (n / 8 * 100) + '%"><b>' + n + '</b></span><em>' + (i ? 'etapa ' + i : 'início') + '</em></div>';
      }).join('');
      txt.textContent = compacto ? (etapa === 4 ? '8 avaliadas, 3 escolhidas e 1 reserva.' : ETAPAS[etapa].nome.replace(/^\d · /, '') + ': ' + counts[etapa] + ' seguem.') : ETAPAS[etapa].txt;
      list.innerHTML = EMP.map(function (e) {
        var st = status(e, etapa), out = st === 'out1' || st === 'out2';
        var tr = e.t.map(function (t, k) {
          var ativo = (k < 2 && etapa >= 1) || (k >= 2 && etapa >= 2);
          if (!ativo || (st === 'out1' && k >= 2)) return '<span class="cm-tr is-idle" title="' + esc(TRACOS[k]) + '">' + TRACOS[k].split(' ')[0] + '</span>';
          return '<span class="cm-tr ' + (t[0] ? 'is-ok' : 'is-no') + '" title="' + esc(TRACOS[k] + (t[1] ? ': ' + t[1] : '')) + '">' + (t[0] ? '✓ ' : '✕ ') + TRACOS[k].split(' ')[0] + '</span>';
        }).join('');
        var tag = out ? e.motivo : st === 'reserva' ? 'Reserva' : st === 'escolhida' ? (etapa >= 4 ? 'Escolhida · gatilho 2026' : 'Escolhida') : 'Em análise';
        return '<li class="is-' + st + '"><div class="cm-emp-n"><b>' + esc(e.nome) + '</b><span>' + esc(e.setor) + '</span></div>' +
          (compacto ? '' : '<div class="cm-trs">' + tr + '</div>') + '<span class="cm-st">' + esc(tag) + '</span></li>';
      }).join('');
    }
    ctr.querySelectorAll('button').forEach(function (b) { b.addEventListener('click', function () { if (timer) { clearInterval(timer); timer = null; } etapa = +b.dataset.v; draw(); }); });
    if (play) play.addEventListener('click', function () {
      if (timer) clearInterval(timer);
      etapa = 0; draw();
      if (REDUCED) { etapa = 4; draw(); return; }
      timer = setInterval(function () { etapa++; draw(); if (etapa >= 4) { clearInterval(timer); timer = null; } }, 1400);
    });
    draw();
  }

  function alvos(container) {
    var wrap = node('<div class="cm-alvos"></div>');
    ALVOS.forEach(function (a) {
      var c = node('<article class="mk-card cm-alvo"></article>');
      c.innerHTML = '<header><p class="mk-label">' + esc(a.setor) + '</p><h3>' + esc(a.nome) + '</h3>' +
        '<p class="cm-meta"><span>desde ' + a.desde + '</span><span>' + esc(a.unid) + '</span><span class="is-money">' + esc(a.porte) + '/ano</span></p></header>' +
        '<div class="cm-fit"><p class="mk-label">Hipótese de fit</p><b>' + esc(a.fit) + '</b><p>' + esc(a.fitTxt) + '</p></div>' +
        '<details class="cm-why"><summary>Por que essa dor é provável</summary><ul>' + a.dor.map(function (d) { return '<li>' + esc(d) + '</li>'; }).join('') + '</ul></details>' +
        '<div class="cm-hook"><p class="mk-label">Gatilho</p><p>' + esc(a.gatilho) + '</p><blockquote>“' + esc(a.gancho) + '”</blockquote></div>';
      wrap.appendChild(c);
    });
    container.appendChild(wrap);
  }

  /* ================= PORTE: as duas contas, com as premissas na mão ================= */
  var porteSel = 'ita', porteVals = {};
  Object.keys(PORTE).forEach(function (k) { porteVals[k] = {}; Object.keys(PORTE[k].p).forEach(function (q) { porteVals[k][q] = PORTE[k].p[q][1]; }); });

  function calculadora(container) {
    var c = node('<div class="mk-card cm-porte"></div>');
    c.innerHTML = '<p class="mk-label">O porte se sustenta? Mexa nas premissas</p>' +
      '<p class="cm-note">Nenhuma das três publica balanço, então cada faturamento foi estimado por duas contas independentes. Os números das fontes ficam fixos; as premissas que são minhas (marcadas) podem variar em torno do valor que usei.</p>';
    var top = node('<div class="cm-porte-top"></div>');
    var emp = seg(ALVOS.map(function (a) { return [a.id, a.nome.replace('Transportadora ', '').replace(' Achaqui', '')]; }), 'Empresa');
    var pres = seg([['min', 'Conservador'], ['doc', 'Valores do documento'], ['max', 'Otimista']], 'Cenário', 'is-sm');
    top.appendChild(emp); top.appendChild(pres); c.appendChild(top);
    var grid = node('<div class="cm-porte-grid"></div>');
    var sls = node('<div class="mk-sliders"></div>'), right = node('<div class="cm-porte-out"></div>');
    grid.appendChild(sls); grid.appendChild(right); c.appendChild(grid);
    container.appendChild(c);

    function build() {
      marcar(emp, porteSel);
      var cfg = PORTE[porteSel], v = porteVals[porteSel];
      sls.innerHTML = '';
      Object.keys(cfg.p).forEach(function (q) {
        var p = cfg.p[q], id = 'cm-sl-' + porteSel + '-' + q;
        if (!p[4]) {
          sls.appendChild(node('<div class="mk-sl cm-fixo"><div class="mk-sl-top"><label>' + esc(p[0]) + '</label><output>' + fmtP(p[5], p[1]) + '</output></div><p class="mk-sl-notes"><span style="--dot:var(--ink-faint)">' + (p[6] ? 'premissa minha, fixa nas duas contas' : 'número da fonte') + '</span></p></div>'));
          return;
        }
        var s = node('<div class="mk-sl"><div class="mk-sl-top"><label for="' + id + '">' + esc(p[0]) + '</label><output>' + fmtP(p[5], v[q]) + '</output></div>' +
          '<input id="' + id + '" type="range" min="' + p[2] + '" max="' + p[3] + '" step="' + p[4] + '" value="' + v[q] + '">' +
          '<p class="mk-sl-notes"><span style="--dot:var(--cm-acc)">premissa minha · no documento: ' + fmtP(p[5], p[1]) + '</span></p></div>');
        var inp = s.querySelector('input'), out = s.querySelector('output');
        inp.addEventListener('input', function () { v[q] = +inp.value; out.textContent = fmtP(p[5], v[q]); draw(); });
        sls.appendChild(s);
      });
      draw();
    }
    function cenario(qual) {
      var cfg = PORTE[porteSel], v = porteVals[porteSel];
      Object.keys(cfg.p).forEach(function (q) { var p = cfg.p[q]; if (p[4]) v[q] = qual === 'min' ? p[2] : qual === 'max' ? p[3] : p[1]; });
      build();
    }
    function qualCenario() {
      var cfg = PORTE[porteSel], v = porteVals[porteSel], tipo = null;
      Object.keys(cfg.p).forEach(function (q) {
        var p = cfg.p[q]; if (!p[4]) return;
        var t = v[q] === p[2] ? 'min' : v[q] === p[3] ? 'max' : v[q] === p[1] ? 'doc' : 'x';
        tipo = tipo === null ? t : tipo === t ? t : 'x';
      });
      return tipo;
    }
    function draw() {
      marcar(pres, qualCenario());
      var cfg = PORTE[porteSel], v = porteVals[porteSel];
      var vals = cfg.contas.map(function (k) { return k.v(v); });
      var nar = right.clientWidth > 0 && right.clientWidth < 420;
      var VW = nar ? 340 : 520, VH = 150, l = 14, r = VW - 14, MAX = 250e6, x = function (m) { return l + (r - l) * Math.min(m, MAX) / MAX; };
      var s = '<svg viewBox="0 0 ' + VW + ' ' + VH + '" role="img" aria-label="Faixa do ICP de R$ 30 a 200 milhões e as duas estimativas de faturamento">';
      s += '<rect x="' + x(ICP_MIN) + '" y="40" width="' + (x(ICP_MAX) - x(ICP_MIN)) + '" height="56" rx="10" fill="rgba(242,193,78,.1)" stroke="rgba(242,193,78,.45)" stroke-dasharray="4 4"/>' +
        '<text x="' + (x(ICP_MAX) - 6) + '" y="35" text-anchor="end" font-size="11.5" fill="#f2c14e">faixa do ICP · R$ 30 a 200 mi</text>';
      s += '<rect x="' + x(cfg.faixa[0]) + '" y="62" width="' + (x(cfg.faixa[1]) - x(cfg.faixa[0])) + '" height="12" rx="6" fill="rgba(233,245,238,.22)"/>';
      [0, 50, 100, 150, 200, 250].forEach(function (t) { s += '<line x1="' + x(t * 1e6) + '" x2="' + x(t * 1e6) + '" y1="100" y2="106" stroke="rgba(233,245,238,.3)"/><text class="tick" x="' + x(t * 1e6) + '" y="122" text-anchor="middle">' + t + (t ? '' : ' mi') + '</text>'; });
      vals.forEach(function (m, i) {
        var cx = x(m), dentro = m >= ICP_MIN && m <= ICP_MAX, cor = dentro ? (i ? '#9be8b0' : '#4fe577') : '#ff6b7d', y = i ? 82 : 54;
        s += '<g class="cm-mk"><line x1="' + cx + '" x2="' + cx + '" y1="' + (i ? 68 : 54) + '" y2="' + (i ? 82 : 68) + '" stroke="' + cor + '" stroke-width="2"/>' +
          '<circle cx="' + cx + '" cy="' + y + '" r="7" fill="' + cor + '" stroke="#0b1a14" stroke-width="2"/>' +
          '<text x="' + Math.max(l + 30, Math.min(r - 30, cx)) + '" y="' + (i ? 146 : 14) + '" text-anchor="middle" font-size="12.5" font-weight="600" fill="' + cor + '">' + (i ? 'B ' : 'A ') + mi(m) + (m > MAX ? ' →' : '') + '</text></g>';
      });
      s += '</svg>';
      var media = (vals[0] + vals[1]) / 2, dif = Math.abs(vals[0] - vals[1]) / media * 100, dentroAmbas = vals.every(function (m) { return m >= ICP_MIN && m <= ICP_MAX; });
      right.innerHTML = '<div class="cm-chart">' + s.replace(/(<text[^>]*?) fill="([^"]+)"/g, '$1 style="fill:$2"') + '</div>' +
        '<div class="cm-legend"><span style="--dot:rgba(233,245,238,.4)">faixa que declarei: ' + mi(cfg.faixa[0]) + ' a ' + mi(cfg.faixa[1]).replace('R$ ', '') + '</span></div>' +
        cfg.contas.map(function (k, i) { return '<div class="cm-conta"><span class="cm-conta-l">' + (i ? 'B' : 'A') + '</span><div><b>' + esc(k.nome) + ': ' + mi(vals[i]) + '</b><small>' + esc(k.txt(v)) + '</small></div></div>'; }).join('') +
        '<p class="cm-verdict ' + (dentroAmbas ? 'is-ok' : 'is-warn') + '">' + (dentroAmbas
          ? '✓ As duas contas ficam no ICP' + (dif < 15 ? ' e quase se encontram (diferença de ' + num(dif, 0) + '%).' : ' (diferença de ' + num(dif, 0) + '% entre elas).')
          : '⚠ Uma conta sai da faixa: nesse cenário a empresa ' + (vals.some(function (m) { return m > ICP_MAX; }) ? 'passa do teto de R$ 200 mi. O enunciado aceita “dentro ou muito perto” da faixa, e é por isso que declarei uma faixa, não um número.' : 'fica abaixo de R$ 30 mi.')) + '</p>';
    }
    emp.querySelectorAll('button').forEach(function (b) { b.addEventListener('click', function () { porteSel = b.dataset.v; build(); }); });
    pres.querySelectorAll('button').forEach(function (b) { b.addEventListener('click', function () { cenario(b.dataset.v); }); });
    build();
  }

  /* ================= DIAGNÓSTICO: o roteiro da reunião ================= */
  var etapaR = 'P', needSel = null, pergSel = null;
  function todas() { var o = {}; ['S', 'P', 'I', 'N'].forEach(function (k) { PERG[k].forEach(function (q) { o[q[0]] = { q: q, k: k }; }); }); return o; }
  var IDX = todas();

  function roteiro(container) {
    var c = node('<div class="mk-card cm-rot"></div>');
    c.innerHTML = '<p class="mk-label">A reunião de 45 minutos com o diretor · clique numa etapa</p>';
    var tl = node('<div class="cm-tl" role="tablist" aria-label="Etapas da reunião"></div>');
    ETAPAS_R.forEach(function (e) {
      var b = node('<button type="button" role="tab" style="flex:' + e.min + '"><b>' + e.nome + '</b><span>' + e.min + ' min' + (PERG[e.k] ? ' · ' + PERG[e.k].length + ' perguntas' : '') + '</span></button>');
      b.dataset.k = e.k; tl.appendChild(b);
      b.addEventListener('click', function () { etapaR = e.k; pergSel = null; draw(); });
    });
    c.appendChild(tl);
    var body = node('<div class="cm-rot-body" aria-live="polite"></div>'); c.appendChild(body);
    container.appendChild(c);
    function cards(k) {
      return '<p class="cm-note">' + INTRO[k] + '</p><div class="cm-qs">' + PERG[k].map(function (q) {
        return '<article class="cm-q' + (pergSel === q[0] ? ' is-hot' : '') + '" id="cm-q-' + q[0] + '"><span class="cm-q-id">' + q[0] + '</span><div><p class="cm-q-p">“' + esc(q[1]) + '”</p>' +
          '<dl><div><dt>' + COLS[k] + '</dt><dd>' + esc(q[2]) + '</dd></div><div><dt>Informação para a proposta</dt><dd>' + esc(q[3]) + '</dd></div></dl></div></article>';
      }).join('') + '</div>';
    }
    function draw() {
      tl.querySelectorAll('button').forEach(function (b) { b.setAttribute('aria-selected', b.dataset.k === etapaR ? 'true' : 'false'); });
      if (etapaR === 'ab') {
        body.innerHTML = '<div class="cm-script"><p class="mk-label">Rapport pelo gatilho</p><blockquote>“José, obrigado pelo tempo. Vi que a Itamaracá conseguiu o financiamento do BNDES para 66 ônibus novos com ar-condicionado, GPS e câmeras. Para uma empresa com mais de 50 anos de operação, é uma renovação grande. Como foi tomar essa decisão?”</blockquote>' +
          '<p class="cm-note"><b>Por quê:</b> parte de um fato público e positivo, e não de um problema. A pergunta aberta faz o diretor contar a história da renovação, e normalmente é aí que ele mesmo cita a pressão da frota antiga.</p></div>' +
          '<div class="cm-script"><p class="mk-label">Combinação da pauta</p><blockquote>“A ideia de hoje é eu entender como funciona a gestão da frota de vocês, e não apresentar uma solução pronta. Tenho algumas perguntas sobre a operação e a manutenção. No final, se fizer sentido para os dois lados, combinamos um próximo passo. Temos uns 45 minutos, certo?”</blockquote>' +
          '<p class="cm-note"><b>Por quê:</b> o diretor sabe que não vai ouvir um discurso de vendas e autoriza as perguntas. Ao confirmar o tempo, eu também respeito a agenda dele.</p></div>' +
          '<div class="cm-prep"><p class="mk-label">Preparação antes da reunião</p><ul><li>Ler as notícias do financiamento do BNDES e da entrega dos 50 ônibus do Conorte, em 25 de setembro.</li><li>Levar o dado do MPPE (um terço da frota do Grande Recife passou da vida útil) só para usar se o assunto surgir, nunca como acusação.</li><li>Ter a hipótese pronta, mas não apresentá-la: quem deve nomear a dor é o cliente.</li></ul></div>';
      } else if (etapaR === 'fe') {
        body.innerHTML = '<div class="cm-script"><p class="mk-label">1 · Resumo com as palavras dele</p><blockquote>“Deixa eu ver se entendi: hoje vocês levam [tempo da P1] para saber quais ônibus estão parados, cerca de [número da I2] ficam indisponíveis por dia, e com os 66 novos chegando isso fica ainda mais importante. Faz sentido?”</blockquote></div>' +
          '<div class="cm-script"><p class="mk-label">2 · Próximo passo proposto</p><blockquote>“O próximo passo que eu sugiro é conhecer a garagem e ver como a manutenção funciona na prática. Faz sentido uma visita na terça, dia 17 de novembro, às 9h, com você, o gerente de manutenção e quem cuida dos sistemas?”</blockquote></div>' +
          '<div class="cm-invite" aria-label="Convite proposto"><div class="cm-cal"><span>nov</span><b>17</b><span>terça · 9h</span></div><div><b>Visita técnica à garagem principal · 1h30</b>' +
          '<p>Itamaracá: diretor, gerente de manutenção e responsável por TI ou sistemas. CITi: eu (comercial) e um consultor de Soluções.</p><p class="cm-ok">Resultado esperado: fluxo de manutenção mapeado, fontes de dados identificadas e escopo do piloto definido.</p></div></div>' +
          '<p class="cm-note"><b>Por que uma visita, e não já uma proposta:</b> é cedo para preço. A visita coloca na sala quem usa o processo e quem vai integrar, justamente o que o time de Soluções precisa.</p>' +
          '<div class="cm-script is-alt"><p class="mk-label">3 · Se ele disser “vamos alinhar internamente”</p><blockquote>“Claro. Para facilitar essa conversa, posso te mandar amanhã um resumo de uma página com o que conversamos e os números que você me passou. Podemos já deixar um horário reservado na próxima semana para eu ouvir o retorno? Que tal quinta, às 16h, por 20 minutos?”</blockquote><p class="cm-note">Assim saio da reunião com uma data na agenda de qualquer jeito. Depois: e-mail em até 24h com o resumo da dor, os números citados e o convite.</p></div>';
      } else body.innerHTML = cards(etapaR);
      if (pergSel) { var el = body.querySelector('#cm-q-' + pergSel); if (el) el.scrollIntoView({ block: 'nearest', behavior: REDUCED ? 'auto' : 'smooth' }); }
    }
    roteiro.ir = function (id) { var it = IDX[id]; if (!it) return; etapaR = it.k; pergSel = id; draw(); };
    draw();
  }

  function matriz(container) {
    var c = node('<div class="mk-card cm-mat"></div>');
    c.innerHTML = '<p class="mk-label">Da reunião para a proposta · o que o time de Soluções precisa</p>' +
      '<p class="cm-note">Cada pergunta existe para preencher um item da proposta. Clique num item para ver quais perguntas o respondem; clique numa pergunta para lê-la no roteiro acima.</p>';
    var grid = node('<div class="cm-mat-grid"></div>');
    var needs = node('<div class="cm-needs" role="group" aria-label="O que Soluções precisa"></div>');
    NEEDS.forEach(function (n, i) {
      var b = node('<button type="button"><span>' + esc(n[0]) + '</span><em>' + n[1].join(' · ') + '</em></button>');
      b.addEventListener('click', function () { needSel = needSel === i ? null : i; draw(); });
      b.dataset.i = i; needs.appendChild(b);
    });
    var mapa = node('<div class="cm-mapa"></div>');
    ['S', 'P', 'I', 'N'].forEach(function (k) {
      var col = node('<div class="cm-mapa-col"><p>' + { S: 'Situação', P: 'Problema', I: 'Implicação', N: 'Necessidade' }[k] + '</p></div>');
      PERG[k].forEach(function (q) {
        var b = node('<button type="button" title="' + esc(q[1]) + '">' + q[0] + '</button>');
        b.dataset.id = q[0];
        b.addEventListener('click', function () { if (roteiro.ir) { roteiro.ir(q[0]); var r = document.querySelector('#cm .cm-rot'); if (r) r.scrollIntoView({ block: 'start', behavior: REDUCED ? 'auto' : 'smooth' }); } });
        col.appendChild(b);
      });
      mapa.appendChild(col);
    });
    grid.appendChild(needs); grid.appendChild(mapa); c.appendChild(grid);
    var out = node('<p class="cm-mat-out" aria-live="polite"></p>'); c.appendChild(out);
    container.appendChild(c);
    function draw() {
      var ids = needSel == null ? null : NEEDS[needSel][1];
      needs.querySelectorAll('button').forEach(function (b) { b.setAttribute('aria-pressed', +b.dataset.i === needSel ? 'true' : 'false'); });
      mapa.querySelectorAll('button').forEach(function (b) { b.classList.toggle('is-on', !!ids && ids.indexOf(b.dataset.id) >= 0); b.classList.toggle('is-dim', !!ids && ids.indexOf(b.dataset.id) < 0); });
      if (ids == null) {
        var usadas = {}; NEEDS.forEach(function (n) { n[1].forEach(function (q) { usadas[q] = 1; }); });
        out.textContent = Object.keys(usadas).length + ' das 23 perguntas alimentam diretamente um item da proposta. As outras dão o tamanho da dor (implicação) ou abrem espaço para uma dor que eu não previ.';
      } else out.innerHTML = '<b>' + esc(NEEDS[needSel][0]) + '</b> sai de ' + ids.map(function (id) { return '<b>' + id + '</b> (' + esc(IDX[id].q[3].toLowerCase()) + ')'; }).join(' e ') + '.';
    }
    draw();
  }

  function business(container) {
    var c = node('<div class="mk-card cm-bc"></div>');
    c.innerHTML = '<p class="mk-label">Esboço do business case · ilustrativo, como no documento</p>' +
      '<p class="cm-note">Na reunião, os números certos vêm do diretor (perguntas I2 e I3). Aqui eles partem da estimativa do desafio 1: R$ 125 mi ÷ 200 ônibus ÷ 365 dias ≈ <b>' + brl(RECEITA_DIA) + '</b> de receita por ônibus por dia.</p>';
    var grid = node('<div class="cm-bc-grid"></div>'), sls = node('<div class="mk-sliders"></div>'), out = node('<div class="cm-bc-out" aria-live="polite"></div>');
    var st = { parados: 5, reserva: 3 };
    [['parados', 'Ônibus parados evitados por dia', 1, 10, 'I2'], ['reserva', 'Ônibus que saem da frota reserva', 0, 6, 'I3']].forEach(function (d) {
      var s = node('<div class="mk-sl"><div class="mk-sl-top"><label for="cm-bc-' + d[0] + '">' + d[1] + '</label><output>' + st[d[0]] + '</output></div><input id="cm-bc-' + d[0] + '" type="range" min="' + d[2] + '" max="' + d[3] + '" step="1" value="' + st[d[0]] + '"><p class="mk-sl-notes"><span style="--dot:var(--cm-acc)">o número real sai da pergunta ' + d[4] + '</span></p></div>');
      var inp = s.querySelector('input'), o = s.querySelector('output');
      inp.addEventListener('input', function () { st[d[0]] = +inp.value; o.textContent = inp.value; draw(); });
      sls.appendChild(s);
    });
    grid.appendChild(sls); grid.appendChild(out); c.appendChild(grid);
    container.appendChild(c);
    function draw() {
      var viagens = st.parados * RECEITA_DIA * 365, capital = st.reserva * 800000, total = viagens + capital;
      out.innerHTML = '<div class="gg-kpi"><b>' + mi(viagens) + '/ano</b><span>em viagens preservadas: ' + st.parados + ' × ' + brl(RECEITA_DIA) + ' × 365</span></div>' +
        '<div class="gg-kpi"><b>' + mi(capital) + '</b><span>de capital liberado: ' + st.reserva + ' × R$ 800 mil por ônibus novo</span></div>' +
        '<p class="cm-note">Juntos, <b>' + mi(total) + '</b> no primeiro ano. Se o custo do projeto for uma fração disso, o retorno se paga em meses: esse é o argumento que o diretor leva para os sócios.</p>';
    }
    draw();
  }

  function planoB(container) {
    var c = node('<div class="mk-card cm-pb"><p class="mk-label">Plano B · se a hipótese não se confirmar</p><p class="cm-note">Se P1 a P4 não mostrarem dor na manutenção, a pergunta aberta P5 indica para onde ir. A estrutura da reunião continua a mesma; só trocam as perguntas de Implicação.</p></div>');
    var g = seg(PIVOS.map(function (p, i) { return [i, p.nome]; }), 'Pivôs possíveis', 'is-sm');
    var out = node('<p class="cm-pb-out" aria-live="polite"></p>');
    c.appendChild(g); c.appendChild(out); container.appendChild(c);
    function sel(i) { marcar(g, i); var p = PIVOS[i]; out.innerHTML = esc(p.txt) + ' As perguntas de Implicação passam a medir <b>' + esc(p.mede) + '</b>.'; }
    g.querySelectorAll('button').forEach(function (b) { b.addEventListener('click', function () { sel(+b.dataset.v); }); });
    sel(0);
  }

  /* ================= LEADS ================= */
  function nivel(p) { var n = NIVEIS[0]; NIVEIS.forEach(function (x) { if (p >= x[0]) n = x; }); return n[1]; }
  function placar(container, compacto) {
    var c = node('<div class="' + (compacto ? 'cm-placar is-compact' : 'mk-card cm-placar') + '"></div>');
    var MAX = 100, pos = function (v) { return Math.min(100, v / MAX * 100); };
    c.innerHTML = (compacto ? '' : '<p class="mk-label">Indicação de leads · meu placar</p>') +
      '<div class="cm-score"><b>' + PTS + '</b><span>pontos · nível <strong>' + nivel(PTS) + '</strong></span></div>' +
      '<div class="cm-lvl" role="img" aria-label="' + PTS + ' pontos, nível ' + nivel(PTS) + '. Diamante começa em 80.">' +
        '<div class="cm-lvl-fill" style="width:' + pos(PTS) + '%"></div>' +
        NIVEIS.slice(1).map(function (n) { return '<span class="cm-lvl-t' + (PTS >= n[0] ? ' is-ok' : '') + '" style="left:' + pos(n[0]) + '%"><i></i><em>' + n[1] + ' · ' + n[0] + '</em></span>'; }).join('') +
      '</div>' +
      '<div class="cm-lstats"><span><b>11</b> leads válidos</span><span><b>11</b> dentro do ICP</span><span><b>10</b> decisores</span></div>';
    container.appendChild(c);
  }
  function leadsTabela(container) {
    var c = node('<div class="mk-card cm-leads"><p class="mk-label">Os 11 leads · sem nomes nem telefones</p><p class="cm-note">A planilha original tem o contato de pessoas reais, então aqui fica só o que importa para a pontuação. Os destacados vieram direto da minha pesquisa de ICP.</p></div>');
    var tb = '<div class="cm-ltab" role="table" aria-label="Leads indicados"><div role="row" class="is-h"><span role="columnheader">Empresa</span><span role="columnheader">Poder de decisão</span><span role="columnheader">ICP</span><span role="columnheader">2º contato</span><span role="columnheader" class="n">Pontos</span></div>';
    LEADS.forEach(function (l) {
      var daPesq = DA_PESQUISA.indexOf(l[0]) >= 0;
      tb += '<div role="row" class="' + (daPesq ? 'is-pesq' : '') + '"><span role="cell"><b>' + esc(l[0]) + '</b>' + (daPesq ? '<em>da pesquisa de ICP</em>' : '') + '</span><span role="cell">' + (l[1] === 'D' ? 'Decisor' : 'Influenciador') + '</span><span role="cell">Dentro</span><span role="cell">' + (l[2] ? 'LinkedIn' : '—') + '</span><span role="cell" class="n">' + l[3] + '</span></div>';
    });
    c.insertAdjacentHTML('beforeend', tb + '</div><p class="cm-note">6 dos 11 leads são das empresas que avaliei no desafio 1. O que separou quase todos do lead perfeito (9 pontos) foi o segundo contato: com ele, o total iria de ' + PTS + ' para ' + (PTS + LEADS.filter(function (l) { return !l[2]; }).length) + '.</p>');
    container.appendChild(c);
  }
  function montaLead(container) {
    var c = node('<div class="mk-card cm-build"><p class="mk-label">Monte um lead e veja quanto ele vale</p></div>');
    var st = { num: true, icp: true, poder: 'D', seg: false };
    var row = node('<div class="cm-build-row"></div>');
    var t1 = node('<button type="button" class="cm-tog" data-k="num">Número de contato</button>');
    var t2 = node('<button type="button" class="cm-tog" data-k="icp">Dentro do ICP · +4</button>');
    var t3 = node('<button type="button" class="cm-tog" data-k="seg">LinkedIn ou e-mail · +1</button>');
    var pod = seg([['D', 'Decisor · +3'], ['I', 'Influenciador · +1'], ['?', 'Não sei o cargo']], 'Poder de decisão', 'is-sm');
    row.appendChild(t1); row.appendChild(t2); row.appendChild(pod); row.appendChild(t3);
    var out = node('<div class="cm-build-out" aria-live="polite"></div>');
    c.appendChild(row); c.appendChild(out); container.appendChild(c);
    [t1, t2, t3].forEach(function (b) { b.addEventListener('click', function () { st[b.dataset.k] = !st[b.dataset.k]; draw(); }); });
    pod.querySelectorAll('button').forEach(function (b) { b.addEventListener('click', function () { st.poder = b.dataset.v; draw(); }); });
    function draw() {
      [t1, t2, t3].forEach(function (b) { b.setAttribute('aria-pressed', st[b.dataset.k] ? 'true' : 'false'); });
      marcar(pod, st.poder);
      var partes = [], p = 0;
      if (st.num) {
        p = 1; partes.push('1 (válido)');
        if (st.icp) { p += 4; partes.push('4 (ICP)'); }
        if (st.poder === 'D') { p += 3; partes.push('3 (decisor)'); } else if (st.poder === 'I') { p += 1; partes.push('1 (influenciador)'); }
        if (st.seg) { p += 1; partes.push('1 (2º contato)'); }
      }
      out.innerHTML = '<b class="cm-build-pts' + (p === 9 ? ' is-max' : p === 0 ? ' is-zero' : '') + '">' + p + '</b><span>' + (st.num ? partes.join(' + ') + (p === 9 ? ' · lead perfeito' : '') : 'sem número o lead não pontua, e nenhum bônus conta') + '</span>';
    }
    draw();
  }

  /* ================= PDF ================= */
  var libP, docP = {};
  function loadLib() {
    if (window.pdfjsLib) return Promise.resolve(window.pdfjsLib);
    return libP || (libP = new Promise(function (res, rej) {
      var s = document.createElement('script'); s.src = PDFJS + 'pdf.min.js';
      s.onload = function () { window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS + 'pdf.worker.min.js'; res(window.pdfjsLib); };
      s.onerror = rej; document.head.appendChild(s);
    }));
  }
  function getDoc(url) { return docP[url] || (docP[url] = loadLib().then(function (lib) { return lib.getDocument(url).promise; })); }
  function pdfView(container, full, d) {
    var box = node('<div class="mk-pdf ' + (full ? 'is-full' : 'is-compact') + '" tabindex="0" aria-label="Documento: ' + esc(d.nome) + '"><p class="mk-pdf-msg">Carregando o documento…</p></div>');
    container.appendChild(box);
    getDoc(d.url).then(function (doc) {
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
    return box;
  }
  function pdfButtons(d, extra) {
    return '<a class="mk-btn is-main" href="' + d.url + '" download="' + d.url + '">Baixar PDF ↓</a>' +
      '<a class="mk-btn" href="' + d.url + '" target="_blank" rel="noopener">Abrir em nova aba ↗</a>' + (extra || '');
  }
  // os dois documentos com uma chave para alternar entre eles
  function documentos(container, full, inicial) {
    var atual = inicial || 'icp';
    var wrap = node('<div class="cm-docs' + (full ? ' mk-card' : '') + '"></div>');
    var g = seg([['icp', DOCS.icp.nome], ['diag', DOCS.diag.nome]], 'Documento', full ? '' : 'is-sm');
    var bar = node('<div class="mk-doc-bar"></div>'), info = node('<p></p>'), acts = node('<div class="mk-actions"></div>');
    bar.appendChild(full ? info : g); bar.appendChild(acts);
    if (full) wrap.appendChild(g);
    wrap.appendChild(bar);
    var view = node('<div></div>'); wrap.appendChild(view);
    container.appendChild(wrap);
    function show(k) {
      atual = k; marcar(g, k);
      var d = DOCS[k];
      info.textContent = d.nome + ' · ' + d.pags + ' páginas · PDF';
      acts.innerHTML = pdfButtons(d, full ? '' : '<button class="mk-btn" type="button" data-full>Tela cheia ⤢</button>');
      var fb = acts.querySelector('[data-full]'); if (fb) fb.addEventListener('click', function () { abrir('documentos', atual); });
      view.innerHTML = ''; pdfView(view, full, d);
    }
    g.querySelectorAll('button').forEach(function (b) { b.addEventListener('click', function () { if (b.dataset.v !== atual) show(b.dataset.v); }); });
    show(atual);
  }

  /* ================= TELA CHEIA ================= */
  var root, body, lastFocus, aba = 'icp', docInicial = 'icp';
  var TABS = [['icp', 'O ICP'], ['porte', 'O porte'], ['diagnostico', 'Diagnóstico'], ['leads', 'Leads'], ['documentos', 'Documentos']];
  function build() {
    root = node('<div id="cm" role="dialog" aria-modal="true" aria-labelledby="cm-title" hidden></div>');
    root.innerHTML =
      '<header class="mk-top"><div class="mk-top-row">' +
        '<div><div class="mk-eyebrow">Comercial · Órbita 6 · Entrega</div><h2 class="mk-title" id="cm-title">Quem o CITi deveria ligar amanhã, e o que perguntar</h2></div>' +
        '<div class="mk-top-actions"><button class="mk-btn" type="button" data-close>Voltar ao planeta ✕</button></div></div>' +
        '<div class="mk-tabs" role="tablist" aria-label="Partes da entrega">' + TABS.map(function (t) { return '<button class="mk-tab" type="button" role="tab" data-tab="' + t[0] + '">' + t[1] + '</button>'; }).join('') + '</div></header>' +
      '<div class="mk-body"><div class="mk-wrap" id="cm-content"></div></div>';
    body = root.querySelector('#cm-content');
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
      '<div class="mk-card mk-hero-main"><p class="mk-label">✓ Resumo das duas entregas</p>' +
        '<p class="mk-big">3 empresas pernambucanas no ICP e um <mark>roteiro de diagnóstico</mark> para a Itamaracá</p>' +
        '<p class="mk-lead">Transporte, varejo e restaurantes: todas com sede em PE, mais de 30 anos e várias unidades, com porte estimado por duas contas independentes. Para a Itamaracá, uma reunião de 45 minutos que sai com a visita à garagem marcada, e cada pergunta ligada ao que a proposta precisa.</p></div>' +
      '<div class="mk-stats">' +
        '<div class="mk-stat"><b>8 → 3</b><span>empresas avaliadas e escolhidas</span></div>' +
        '<div class="mk-stat"><b>R$ 45–160 mi</b><span>faixa estimada das três</span></div>' +
        '<div class="mk-stat"><b>23 perguntas</b><span>SPIN, cada uma com objetivo</span></div>' +
        '<div class="mk-stat"><b>' + PTS + ' pts · ' + nivel(PTS) + '</b><span>na indicação de leads</span></div></div>';
    return h;
  }
  function setAba(t) {
    aba = t;
    root.querySelectorAll('[data-tab]').forEach(function (b) { b.setAttribute('aria-selected', b.dataset.tab === t ? 'true' : 'false'); });
    body.innerHTML = '';
    roteiro.ir = null;
    body.appendChild(hero());
    if (t === 'icp') { funil(body, false); alvos(body); }
    else if (t === 'porte') calculadora(body);
    else if (t === 'diagnostico') {
      body.appendChild(node('<div class="mk-card cm-ctx"><p class="mk-label">Contexto da reunião</p><dl class="cm-ctx-grid">' +
        '<div><dt>Interlocutor</dt><dd>José Anchieta, diretor</dd></div><div><dt>Gatilho</dt><dd>~R$ 53 mi do BNDES para 66 ônibus Euro 6 (ago/2026)</dd></div>' +
        '<div><dt>Hipótese de fit</dt><dd>Painel de frota por garagem</dd></div><div><dt>Objetivo</dt><dd>Sair com a visita à garagem marcada, e o diretor enxergando em reais quanto custa um ônibus parado</dd></div></dl></div>'));
      roteiro(body); matriz(body); business(body); planoB(body);
    } else if (t === 'leads') {
      var g = node('<div class="cm-leads-top"></div>'); body.appendChild(g);
      placar(g, false); montaLead(g); leadsTabela(body);
    } else documentos(body, true, docInicial);
    root.querySelector('.mk-body').scrollTop = 0;
  }
  function abrir(t, doc) {
    if (!root) build();
    lastFocus = document.activeElement;
    if (doc) docInicial = doc;
    root.hidden = false;
    setAba(t || aba);
    requestAnimationFrame(function () { root.classList.add('is-open'); });
    root.querySelector('[data-close]').focus({ preventScroll: true });
  }
  function fechar() {
    if (!root || root.hidden) return;
    root.classList.remove('is-open');
    setTimeout(function () { if (!root.classList.contains('is-open')) root.hidden = true; }, 280);
    if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
  }

  /* ================= PAINEL LATERAL ================= */
  function painel(container) {
    function sec(title) { var s = document.createElement('section'); s.className = 'p-sec'; var h3 = document.createElement('h3'); h3.textContent = title; s.appendChild(h3); container.appendChild(s); return s; }
    var a = sec('Minha resposta');
    a.appendChild(node('<div class="cm-answer"><strong>Itamaracá, Armazém Coral e Entre Amigos</strong><span>Três empresas de PE dentro do ICP, cada uma com hipótese de fit e gatilho de 2026. Para a Itamaracá, o roteiro de diagnóstico: 45 minutos, 23 perguntas SPIN e a visita à garagem como próximo passo.</span></div>'));
    var e = sec('Minhas entregas');
    documentos(e, false, 'icp');
    var f = sec('Do filtro ao alvo');
    etapa = 4; funil(f, true);
    var b = node('<div class="mk-actions"><button class="mk-btn" type="button">Ver o filtro etapa por etapa →</button></div>');
    b.querySelector('button').addEventListener('click', function () { abrir('icp'); });
    f.appendChild(b);
    var l = sec('Indicação de leads');
    placar(l, true);
    var bl = node('<div class="mk-actions"><button class="mk-btn" type="button">Ver os leads →</button></div>');
    bl.querySelector('button').addEventListener('click', function () { abrir('leads'); });
    l.appendChild(bl);
  }

  window.CITI_ENTREGAS = window.CITI_ENTREGAS || {};
  window.CITI_ENTREGAS.comercial = { painel: painel, abrir: abrir };
})();
