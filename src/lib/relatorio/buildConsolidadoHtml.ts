import { buildRelatorioHtml } from './buildRelatorioHtml'
import type {
  DashKpis, CatFatia, FormaPagamentoStat, TituloStat, ContribNaoCadastrado,
} from '../api/fin_dashboard'

function fmt(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}
function pct(val: number, total: number) {
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

export interface ConsolidadoParams {
  kpis: DashKpis
  saldoAnterior: number
  distEntrada: CatFatia[]
  distSaida: CatFatia[]
  formaEntrada: FormaPagamentoStat[]
  formaSaida: FormaPagamentoStat[]
  tituloStats: TituloStat[]
  naoCadastrados: ContribNaoCadastrado[]
  membrosAtivosTotal: number
  dataInicio: string
  dataFim: string
  periodoLabel: string
}

export function buildConsolidadoHtml(p: ConsolidadoParams): string {
  const saldoPeriodo  = p.kpis.saldo
  const saldoAcumulado = p.saldoAnterior + saldoPeriodo
  const pctEngajamento = p.membrosAtivosTotal > 0
    ? Math.min(100, Math.round((p.kpis.qtdCadastrados / p.membrosAtivosTotal) * 100))
    : 0
  const totalEntradas = p.kpis.totalEntradas
  const totalSaidas   = p.kpis.totalSaidas

  // ── KPI cards ──────────────────────────────────────────────────────────────
  function kpiCard(label: string, valor: string, accent: string, bg: string) {
    return `
    <div class="kpi-card" style="border-left:3px solid ${accent}; background:${bg}">
      <div class="kpi-label">${label}</div>
      <div class="kpi-valor" style="color:${accent}">${valor}</div>
    </div>`
  }

  const kpiSection = `
  <div class="kpi-row">
    ${kpiCard('Entradas', fmt(totalEntradas), '#16a34a', '#f0fdf4')}
    ${kpiCard('Saídas', fmt(totalSaidas), '#dc2626', '#fff5f5')}
    ${kpiCard('Saldo do Período', fmt(saldoPeriodo), saldoPeriodo >= 0 ? '#2563eb' : '#ea580c', saldoPeriodo >= 0 ? '#eff6ff' : '#fff7ed')}
    ${kpiCard('Saldo Acumulado', fmt(saldoAcumulado), '#7c3aed', '#faf5ff')}
    ${kpiCard('Lançamentos', String(p.kpis.qtdLancamentos), '#0891b2', '#ecfeff')}
  </div>`

  // ── Categorias (2 colunas) ──────────────────────────────────────────────────
  function catRows(cats: CatFatia[], grandTotal: number) {
    if (cats.length === 0) return '<tr><td colspan="3" class="dim center">Sem dados</td></tr>'
    return cats.map(c => `
    <tr>
      <td>
        <span class="dot" style="background:${c.cor}"></span>${c.nome}
      </td>
      <td class="right fw6">${fmt(c.total)}</td>
      <td class="right dim">${pct(c.total, grandTotal)}</td>
    </tr>`).join('')
  }

  const catSection = `
  <div class="two-col">
    <div class="col-block">
      <div class="sec-titulo verde">▲ Entradas por Categoria</div>
      <table class="mini-table">
        <thead><tr>
          <th>Categoria</th><th class="right">Total</th><th class="right">%</th>
        </tr></thead>
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
        <thead><tr>
          <th>Categoria</th><th class="right">Total</th><th class="right">%</th>
        </tr></thead>
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
      <td class="right dim">${pct(x.total, grandTotal)}</td>
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

  // ── Contribuintes — engajamento ─────────────────────────────────────────────
  const engajSection = `
  <div class="sec-titulo azul">Contribuintes — Engajamento Geral</div>
  <div class="eng-cards">
    <div class="eng-card">
      <div class="eng-num">${p.membrosAtivosTotal}</div>
      <div class="eng-lab">Membros ativos</div>
    </div>
    <div class="eng-card destaque-verde">
      <div class="eng-num verde-t">${p.kpis.qtdCadastrados}</div>
      <div class="eng-lab">Cadastrados contribuíram</div>
    </div>
    <div class="eng-card destaque-azul">
      <div class="eng-num azul-t">${pctEngajamento}%</div>
      <div class="eng-lab">Taxa de engajamento</div>
    </div>
    <div class="eng-card destaque-amber">
      <div class="eng-num amber-t">${p.kpis.qtdNaoCadastrados}</div>
      <div class="eng-lab">Não cadastrados</div>
    </div>
    <div class="eng-card">
      <div class="eng-num">${fmt(p.kpis.totalCadastrados)}</div>
      <div class="eng-lab verde-t">Total cadastrados</div>
    </div>
    <div class="eng-card">
      <div class="eng-num">${fmt(p.kpis.totalNaoCadastrados)}</div>
      <div class="eng-lab amber-t">Total não cadastrados</div>
    </div>
  </div>`

  // ── Contribuintes — por título ──────────────────────────────────────────────
  const tituloRows = p.tituloStats.length === 0
    ? '<tr><td colspan="5" class="dim center">Sem dados</td></tr>'
    : p.tituloStats.map(t => {
        const pctT = t.totalMembros > 0
          ? Math.round((t.contribuiram / t.totalMembros) * 100)
          : 0
        const barW = Math.max(0, Math.min(100, pctT))
        return `
    <tr>
      <td class="fw6">${t.titulo}</td>
      <td class="center">${t.totalMembros}</td>
      <td class="center verde-t fw6">${t.contribuiram}</td>
      <td class="center">
        <div class="bar-wrap">
          <div class="bar-fill" style="width:${barW}%"></div>
          <span class="bar-label">${pctT}%</span>
        </div>
      </td>
      <td class="right fw6">${fmt(t.totalContribuido)}</td>
    </tr>`
      }).join('')

  const tituloSection = p.tituloStats.length > 0 ? `
  <div class="sec-titulo azul" style="margin-top:7px">Contribuição por Título</div>
  <table class="mini-table">
    <thead><tr>
      <th>Título</th>
      <th class="center">Total</th>
      <th class="center">Contrib.</th>
      <th class="center" style="width:120px">Engajamento</th>
      <th class="right">Total contribuído</th>
    </tr></thead>
    <tbody>${tituloRows}</tbody>
  </table>` : ''

  // ── Não cadastrados (resumido) ──────────────────────────────────────────────
  const naoCadSection = p.naoCadastrados.length > 0 ? `
  <div class="sec-titulo amber" style="margin-top:7px">Contribuintes não cadastrados na secretaria (${p.naoCadastrados.length})</div>
  <table class="mini-table">
    <thead><tr><th>Nome</th><th class="right">Total contribuído</th></tr></thead>
    <tbody>
      ${p.naoCadastrados.slice(0, 12).map(nc => `
      <tr><td>${nc.nome}</td><td class="right fw6 amber-t">${fmt(nc.total)}</td></tr>`).join('')}
      ${p.naoCadastrados.length > 12 ? `<tr><td colspan="2" class="dim center">... e mais ${p.naoCadastrados.length - 12} contribuinte(s)</td></tr>` : ''}
    </tbody>
  </table>` : ''

  // ── CSS do corpo ────────────────────────────────────────────────────────────
  const corpo = `
  <style>
    /* ── KPIs ── */
    .kpi-row { display:flex; gap:6px; margin-bottom:9px; }
    .kpi-card { flex:1; padding:6px 8px; border-radius:4px; }
    .kpi-label { font-size:0.68rem; font-weight:700; text-transform:uppercase; letter-spacing:0.5px; color:#6a8aaa; }
    .kpi-valor { font-size:1.05rem; font-weight:900; line-height:1.2; margin-top:2px; }

    /* ── 2 colunas ── */
    .two-col { display:flex; gap:10px; margin-bottom:8px; }
    .col-block { flex:1; min-width:0; }

    /* ── Seção título ── */
    .sec-titulo {
      font-size:0.7rem; font-weight:800; text-transform:uppercase;
      letter-spacing:0.7px; padding:3px 0 2px;
      border-bottom:1.5px solid currentColor; margin-bottom:4px;
    }
    .sec-titulo.verde   { color:#16a34a; border-color:#bbf7d0; }
    .sec-titulo.vermelho{ color:#dc2626; border-color:#fecaca; }
    .sec-titulo.azul    { color:#2563eb; border-color:#bfdbfe; }
    .sec-titulo.amber   { color:#d97706; border-color:#fde68a; }

    /* ── Mini-tabela ── */
    .mini-table { width:100%; border-collapse:collapse; font-size:0.8rem; }
    .mini-table thead th {
      background:#f1f5f9; color:#3a6a96; font-size:0.68rem;
      font-weight:700; text-transform:uppercase; letter-spacing:0.4px;
      padding:3px 5px; text-align:left;
    }
    .mini-table thead th.right  { text-align:right; }
    .mini-table thead th.center { text-align:center; }
    .mini-table tbody tr { border-bottom:1px solid #f0f4f8; }
    .mini-table tbody td { padding:3px 5px; color:#2a3f52; vertical-align:middle; }
    .mini-table tbody td.right  { text-align:right; }
    .mini-table tbody td.center { text-align:center; }
    .mini-table tfoot td {
      padding:3px 5px; border-top:1.5px solid #c8daea;
      background:#f8fafc; font-size:0.8rem;
    }
    .mini-table tfoot td.right { text-align:right; }

    /* ── Engajamento cards ── */
    .eng-cards { display:flex; gap:6px; margin-bottom:5px; flex-wrap:wrap; }
    .eng-card {
      flex:1; min-width:0; padding:5px 8px; border:1px solid #e5edf4;
      border-radius:4px; text-align:center; background:#f8fafc;
    }
    .eng-card.destaque-verde { background:#f0fdf4; border-color:#bbf7d0; }
    .eng-card.destaque-azul  { background:#eff6ff; border-color:#bfdbfe; }
    .eng-card.destaque-amber { background:#fffbeb; border-color:#fde68a; }
    .eng-num { font-size:1.1rem; font-weight:900; color:#1c2b3a; line-height:1; }
    .eng-lab { font-size:0.65rem; color:#7a9ab8; margin-top:2px; font-weight:600; text-transform:uppercase; letter-spacing:0.3px; }

    /* ── Barra de progresso inline ── */
    .bar-wrap { position:relative; background:#e5edf4; border-radius:3px; height:12px; width:100%; overflow:hidden; }
    .bar-fill  { position:absolute; left:0; top:0; height:100%; background:#3b82f6; border-radius:3px; }
    .bar-label { position:absolute; right:3px; top:0; line-height:12px; font-size:0.65rem; font-weight:700; color:#1e3a5c; }

    /* ── Utilitários ── */
    .dot   { display:inline-block; width:6px; height:6px; border-radius:50%; margin-right:4px; vertical-align:middle; }
    .right  { text-align:right; }
    .center { text-align:center; }
    .fw6    { font-weight:700; }
    .dim    { color:#9ab4cc; font-weight:400; font-style:italic; }
    .verde-t  { color:#16a34a; }
    .azul-t   { color:#2563eb; }
    .amber-t  { color:#d97706; }
  </style>

  ${kpiSection}
  ${catSection}
  ${formaSection}
  ${engajSection}
  ${tituloSection}
  ${naoCadSection}
  `

  return buildRelatorioHtml({
    titulo: 'Consolidado Financeiro',
    subtitulo: `${fmtDate(p.dataInicio)} a ${fmtDate(p.dataFim)} — ${p.periodoLabel}`,
    filtros: [
      `Período: ${fmtDate(p.dataInicio)} a ${fmtDate(p.dataFim)}`,
      `${p.kpis.qtdLancamentos} lançamento${p.kpis.qtdLancamentos !== 1 ? 's' : ''}`,
      `${p.membrosAtivosTotal} membros ativos`,
    ],
    corpo,
  })
}
