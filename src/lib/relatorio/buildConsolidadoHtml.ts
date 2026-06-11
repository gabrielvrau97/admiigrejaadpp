import { buildRelatorioHtml, type Assinante } from './buildRelatorioHtml'
import type { DashKpis, CatFatia, FormaPagamentoStat, TituloStat } from '../api/fin_dashboard'

function fmt(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}
function pctStr(val: number, total: number) {
  if (total <= 0) return '0,0%'
  return ((val / total) * 100).toFixed(1).replace('.', ',') + '%'
}
function fmtDate(iso: string) {
  const [y, m, d] = iso.slice(0, 10).split('-')
  return `${d}/${m}/${y}`
}
function formaPagLabel(f: string) {
  if (f === 'dinheiro') return 'Dinheiro'
  if (f === 'pix') return 'Pix'
  if (f === 'cartao_debito') return 'Débito'
  if (f === 'cartao_credito') return 'Crédito'
  return f
}

// Retorna HTML do badge de delta ou '' se não há comparativo
function deltaBadge(current: number, prev: number | undefined, asPp = false): string {
  if (prev === undefined || prev === 0) return ''
  const d = asPp ? (current - prev) : ((current - prev) / Math.abs(prev)) * 100
  if (Math.abs(d) < 0.5) return '<span class="delta-eq">= ant.</span>'
  const cls = d > 0 ? 'delta-up' : 'delta-dn'
  const arrow = d > 0 ? '▲' : '▼'
  const label = asPp ? `${Math.abs(d).toFixed(1)}pp` : `${Math.abs(d).toFixed(1)}%`
  return `<span class="${cls}">${arrow} ${label}</span>`
}

export interface ConsolidadoParams {
  kpis: DashKpis
  kpisPrev?: DashKpis
  saldoAnterior: number
  distEntrada: CatFatia[]
  distSaida: CatFatia[]
  formaEntrada: FormaPagamentoStat[]
  formaSaida: FormaPagamentoStat[]
  tituloStats: TituloStat[]
  tituloStatsPrev?: TituloStat[]
  membrosAtivosTotal: number
  dataInicio: string
  dataFim: string
  periodoLabel: string
  assinantes?: Assinante[]
}

export function buildConsolidadoHtml(p: ConsolidadoParams): string {
  const saldoPeriodo   = p.kpis.saldo
  const saldoAcumulado = p.saldoAnterior + saldoPeriodo
  const totalEntradas  = p.kpis.totalEntradas
  const totalSaidas    = p.kpis.totalSaidas

  const pctEngaj = p.membrosAtivosTotal > 0
    ? Math.min(100, (p.kpis.qtdCadastrados / p.membrosAtivosTotal) * 100)
    : 0
  const pctEngajPrev = p.kpisPrev && p.membrosAtivosTotal > 0
    ? Math.min(100, (p.kpisPrev.qtdCadastrados / p.membrosAtivosTotal) * 100)
    : undefined

  // ── KPI cards ──────────────────────────────────────────────────────────────
  function kpiCard(label: string, valor: string, accent: string, bg: string, delta = '') {
    return `
    <div class="kpi-card" style="border-left:3px solid ${accent}; background:${bg}">
      <div class="kpi-label">${label}</div>
      <div class="kpi-valor" style="color:${accent}">${valor}</div>
      ${delta ? `<div class="kpi-delta">${delta}</div>` : ''}
    </div>`
  }

  const kpiSection = `
  <div class="kpi-row">
    ${kpiCard('Entradas', fmt(totalEntradas), '#16a34a', '#f0fdf4',
        deltaBadge(totalEntradas, p.kpisPrev?.totalEntradas))}
    ${kpiCard('Saídas', fmt(totalSaidas), '#dc2626', '#fff5f5',
        deltaBadge(totalSaidas, p.kpisPrev?.totalSaidas))}
    ${kpiCard('Saldo do Período', fmt(saldoPeriodo),
        saldoPeriodo >= 0 ? '#2563eb' : '#ea580c',
        saldoPeriodo >= 0 ? '#eff6ff' : '#fff7ed',
        deltaBadge(saldoPeriodo, p.kpisPrev?.saldo))}
    ${kpiCard('Saldo Acumulado', fmt(saldoAcumulado), '#7c3aed', '#faf5ff')}
    ${kpiCard('Lançamentos', String(p.kpis.qtdLancamentos), '#0891b2', '#ecfeff',
        deltaBadge(p.kpis.qtdLancamentos, p.kpisPrev?.qtdLancamentos))}
  </div>`

  // ── Categorias (2 colunas) ──────────────────────────────────────────────────
  function catRows(cats: CatFatia[], grandTotal: number) {
    if (cats.length === 0) return '<tr><td colspan="3" class="dim center">Sem dados</td></tr>'
    return cats.map(c => `
    <tr>
      <td><span class="dot" style="background:${c.cor}"></span>${c.nome}</td>
      <td class="right fw6">${fmt(c.total)}</td>
      <td class="right dim">${pctStr(c.total, grandTotal)}</td>
    </tr>`).join('')
  }

  const catSection = `
  <div class="two-col">
    <div class="col-block">
      <div class="sec-titulo verde">▲ Entradas por Categoria</div>
      <table class="mini-table">
        <thead><tr><th>Categoria</th><th class="right">Total</th><th class="right">%</th></tr></thead>
        <tbody>${catRows(p.distEntrada, totalEntradas)}</tbody>
        <tfoot><tr>
          <td><strong>Total</strong></td>
          <td class="right"><strong>${fmt(totalEntradas)}</strong></td>
          <td class="right dim">100%</td>
        </tr></tfoot>
      </table>
    </div>
    <div class="col-block">
      <div class="sec-titulo vermelho">▼ Saídas por Categoria</div>
      <table class="mini-table">
        <thead><tr><th>Categoria</th><th class="right">Total</th><th class="right">%</th></tr></thead>
        <tbody>${catRows(p.distSaida, totalSaidas)}</tbody>
        <tfoot><tr>
          <td><strong>Total</strong></td>
          <td class="right"><strong>${fmt(totalSaidas)}</strong></td>
          <td class="right dim">100%</td>
        </tr></tfoot>
      </table>
    </div>
  </div>`

  // ── Formas de pagamento (2 colunas) ─────────────────────────────────────────
  function formaRows(formas: FormaPagamentoStat[], grandTotal: number) {
    const f = formas.filter(x => x.forma !== 'sem_info')
    if (f.length === 0) return '<tr><td colspan="3" class="dim center">Sem dados</td></tr>'
    return f.map(x => `
    <tr>
      <td>${formaPagLabel(x.forma)}</td>
      <td class="right fw6">${fmt(x.total)}</td>
      <td class="right dim">${pctStr(x.total, grandTotal)}</td>
    </tr>`).join('')
  }

  const formaSection = `
  <div class="two-col">
    <div class="col-block">
      <div class="sec-titulo verde">Entradas por Forma de Pagamento</div>
      <table class="mini-table">
        <thead><tr><th>Forma</th><th class="right">Total</th><th class="right">%</th></tr></thead>
        <tbody>${formaRows(p.formaEntrada, totalEntradas)}</tbody>
      </table>
    </div>
    <div class="col-block">
      <div class="sec-titulo vermelho">Saídas por Forma de Pagamento</div>
      <table class="mini-table">
        <thead><tr><th>Forma</th><th class="right">Total</th><th class="right">%</th></tr></thead>
        <tbody>${formaRows(p.formaSaida, totalSaidas)}</tbody>
      </table>
    </div>
  </div>`

  // ── Engajamento geral ───────────────────────────────────────────────────────
  function engCard(num: string, lab: string, cls: string, delta = '') {
    return `
    <div class="eng-card ${cls}">
      <div class="eng-num">${num}</div>
      ${delta ? `<div class="eng-delta">${delta}</div>` : ''}
      <div class="eng-lab">${lab}</div>
    </div>`
  }

  const engajSection = `
  <div class="sec-titulo azul">Contribuintes — Engajamento Geral</div>
  <div class="eng-cards">
    ${engCard(String(p.membrosAtivosTotal), 'Membros ativos', '')}
    ${engCard(String(p.kpis.qtdCadastrados), 'Cadastrados contribuíram', 'destaque-verde',
        deltaBadge(p.kpis.qtdCadastrados, p.kpisPrev?.qtdCadastrados))}
    ${engCard(pctStr(p.kpis.qtdCadastrados, p.membrosAtivosTotal), 'Taxa de engajamento', 'destaque-azul',
        deltaBadge(pctEngaj, pctEngajPrev, true))}
    ${engCard(fmt(p.kpis.totalCadastrados), 'Total contribuído (cadastrados)', 'destaque-verde2',
        deltaBadge(p.kpis.totalCadastrados, p.kpisPrev?.totalCadastrados))}
    ${engCard(String(p.kpis.qtdNaoCadastrados), 'Contribuintes não cadastrados', 'destaque-amber',
        deltaBadge(p.kpis.qtdNaoCadastrados, p.kpisPrev?.qtdNaoCadastrados))}
  </div>`

  // ── Por título — com delta ──────────────────────────────────────────────────
  const prevTituloMap = new Map<string, TituloStat>(
    (p.tituloStatsPrev ?? []).map(t => [t.titulo, t])
  )

  const temDeltaTitulo = p.tituloStatsPrev && p.tituloStatsPrev.length > 0

  const tituloRows = p.tituloStats.length === 0
    ? `<tr><td colspan="${temDeltaTitulo ? 6 : 5}" class="dim center">Sem dados</td></tr>`
    : p.tituloStats.map(t => {
        const pctT = t.totalMembros > 0 ? (t.contribuiram / t.totalMembros) * 100 : 0
        const barW = Math.max(0, Math.min(100, pctT))
        const prev = prevTituloMap.get(t.titulo)
        const prevPctT = prev && t.totalMembros > 0
          ? (prev.contribuiram / t.totalMembros) * 100
          : undefined
        const deltaEngaj = temDeltaTitulo
          ? `<td class="center">${deltaBadge(pctT, prevPctT, true) || '<span class="delta-eq">—</span>'}</td>`
          : ''
        return `
    <tr>
      <td class="fw6">${t.titulo}</td>
      <td class="center">${t.totalMembros}</td>
      <td class="center verde-t fw6">${t.contribuiram}</td>
      <td class="center">
        <div class="bar-wrap">
          <div class="bar-fill" style="width:${barW}%"></div>
          <span class="bar-label">${pctT.toFixed(1)}%</span>
        </div>
      </td>
      ${deltaEngaj}
      <td class="right fw6">${fmt(t.totalContribuido)}</td>
    </tr>`
      }).join('')

  const tituloSection = p.tituloStats.length > 0 ? `
  <div class="sec-titulo azul" style="margin-top:7px">Contribuição por Título</div>
  <table class="mini-table">
    <thead><tr>
      <th>Título</th>
      <th class="center">Membros</th>
      <th class="center">Contrib.</th>
      <th class="center" style="width:100px">Engajamento</th>
      ${temDeltaTitulo ? '<th class="center" style="width:60px">Δ ant.</th>' : ''}
      <th class="right">Total contribuído</th>
    </tr></thead>
    <tbody>${tituloRows}</tbody>
  </table>` : ''

  // ── CSS do corpo ────────────────────────────────────────────────────────────
  const corpo = `
  <style>
    .kpi-row { display:flex; gap:6px; margin-bottom:9px; }
    .kpi-card { flex:1; padding:6px 8px; border-radius:4px; }
    .kpi-label { font-size:0.67rem; font-weight:700; text-transform:uppercase; letter-spacing:0.5px; color:#6a8aaa; }
    .kpi-valor { font-size:1.0rem; font-weight:900; line-height:1.2; margin-top:2px; }
    .kpi-delta { margin-top:3px; }

    .two-col { display:flex; gap:10px; margin-bottom:8px; }
    .col-block { flex:1; min-width:0; }

    .sec-titulo {
      font-size:0.7rem; font-weight:800; text-transform:uppercase;
      letter-spacing:0.7px; padding:3px 0 2px;
      border-bottom:1.5px solid currentColor; margin-bottom:4px;
    }
    .sec-titulo.verde    { color:#16a34a; border-color:#bbf7d0; }
    .sec-titulo.vermelho { color:#dc2626; border-color:#fecaca; }
    .sec-titulo.azul     { color:#2563eb; border-color:#bfdbfe; }

    .mini-table { width:100%; border-collapse:collapse; font-size:0.8rem; }
    .mini-table thead th {
      background:#f1f5f9; color:#3a6a96; font-size:0.67rem;
      font-weight:700; text-transform:uppercase; letter-spacing:0.4px;
      padding:3px 5px; text-align:left;
    }
    .mini-table thead th.right  { text-align:right; }
    .mini-table thead th.center { text-align:center; }
    .mini-table tbody tr { border-bottom:1px solid #f0f4f8; }
    .mini-table tbody td { padding:3px 5px; color:#2a3f52; vertical-align:middle; }
    .mini-table tbody td.right  { text-align:right; }
    .mini-table tbody td.center { text-align:center; }
    .mini-table tfoot td { padding:3px 5px; border-top:1.5px solid #c8daea; background:#f8fafc; }
    .mini-table tfoot td.right { text-align:right; }

    .eng-cards { display:flex; gap:6px; margin-bottom:5px; }
    .eng-card {
      flex:1; padding:5px 8px; border:1px solid #e5edf4;
      border-radius:4px; text-align:center; background:#f8fafc;
    }
    .eng-card.destaque-verde  { background:#f0fdf4; border-color:#bbf7d0; }
    .eng-card.destaque-verde2 { background:#f0fdf4; border-color:#86efac; }
    .eng-card.destaque-azul   { background:#eff6ff; border-color:#bfdbfe; }
    .eng-card.destaque-amber  { background:#fffbeb; border-color:#fde68a; }
    .eng-num   { font-size:1.05rem; font-weight:900; color:#1c2b3a; line-height:1; }
    .eng-delta { font-size:0.62rem; margin-top:2px; }
    .eng-lab   { font-size:0.62rem; color:#7a9ab8; margin-top:2px; font-weight:600; text-transform:uppercase; letter-spacing:0.3px; }

    .bar-wrap  { position:relative; background:#e5edf4; border-radius:3px; height:12px; width:100%; overflow:hidden; }
    .bar-fill  { position:absolute; left:0; top:0; height:100%; background:#3b82f6; border-radius:3px; }
    .bar-label { position:absolute; right:3px; top:0; line-height:12px; font-size:0.65rem; font-weight:700; color:#1e3a5c; }

    .dot     { display:inline-block; width:6px; height:6px; border-radius:50%; margin-right:4px; vertical-align:middle; }
    .right   { text-align:right; }
    .center  { text-align:center; }
    .fw6     { font-weight:700; }
    .dim     { color:#9ab4cc; font-weight:400; font-style:italic; }
    .verde-t { color:#16a34a; }
    .azul-t  { color:#2563eb; }
    .amber-t { color:#d97706; }

    .delta-up { font-size:0.62rem; font-weight:800; color:#16a34a; }
    .delta-dn { font-size:0.62rem; font-weight:800; color:#dc2626; }
    .delta-eq { font-size:0.62rem; color:#94a3b8; }
  </style>

  ${kpiSection}
  ${catSection}
  ${formaSection}
  ${engajSection}
  ${tituloSection}
  `

  return buildRelatorioHtml({
    titulo: 'Consolidado Financeiro',
    subtitulo: `${fmtDate(p.dataInicio)} a ${fmtDate(p.dataFim)} — ${p.periodoLabel}`,
    filtros: [
      `Período: ${fmtDate(p.dataInicio)} a ${fmtDate(p.dataFim)}`,
      `${p.kpis.qtdLancamentos} lançamento${p.kpis.qtdLancamentos !== 1 ? 's' : ''}`,
      `${p.membrosAtivosTotal} membros ativos`,
      ...(p.kpisPrev ? [`Δ comparado com período anterior`] : []),
    ],
    corpo,
    assinantes: p.assinantes,
  })
}
