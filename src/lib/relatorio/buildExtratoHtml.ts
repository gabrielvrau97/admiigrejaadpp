import type { FinLancamento } from '../../types'
import { buildRelatorioHtml } from './buildRelatorioHtml'

function fmt(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}
function fmtDate(s: string) {
  if (!s) return ''
  const [y, m, d] = s.slice(0, 10).split('-')
  return `${d}/${m}/${y}`
}
function formaPagLabel(f?: string) {
  if (!f) return '—'
  if (f === 'dinheiro')       return 'Dinheiro'
  if (f === 'pix')            return 'Pix'
  if (f === 'cartao_debito')  return 'Débito'
  if (f === 'cartao_credito') return 'Crédito'
  return f
}

export interface ExtratoRelatorioParams {
  lancamentos: FinLancamento[]
  saldoAnterior: number | null
  dataInicio: string
  dataFim: string
  filtrosTexto: string[]
}

export function buildExtratoHtml(p: ExtratoRelatorioParams): string {
  const sorted = [...p.lancamentos].sort((a, b) => {
    const d = a.data_lancamento.localeCompare(b.data_lancamento)
    return d !== 0 ? d : (a.created_at ?? '').localeCompare(b.created_at ?? '')
  })

  // ── totais ─────────────────────────────────────────────────────────────────
  const totalEntradas  = sorted.filter(l => l.tipo === 'entrada').reduce((s, l) => s + Number(l.valor), 0)
  const totalSaidas    = sorted.filter(l => l.tipo === 'saida').reduce((s, l) => s + Number(l.valor), 0)
  const saldoPeriodo   = totalEntradas - totalSaidas
  const saldoAcumulado = p.saldoAnterior !== null ? p.saldoAnterior + saldoPeriodo : null

  // ── resumo por categoria ───────────────────────────────────────────────────
  const porCategoria = new Map<string, { nome: string; cor: string; entradas: number; saidas: number }>()
  for (const l of sorted) {
    const key  = l.categoria?.id ?? '__sem__'
    const nome = l.categoria?.nome ?? 'Sem categoria'
    const cor  = l.categoria?.cor  ?? '#94a3b8'
    const e    = porCategoria.get(key) ?? { nome, cor, entradas: 0, saidas: 0 }
    if (l.tipo === 'entrada') e.entradas += Number(l.valor)
    else                      e.saidas   += Number(l.valor)
    porCategoria.set(key, e)
  }

  // ── resumo por forma ───────────────────────────────────────────────────────
  const porForma = new Map<string, { entradas: number; saidas: number }>()
  for (const l of sorted) {
    const key = formaPagLabel(l.forma_pagamento)
    const e   = porForma.get(key) ?? { entradas: 0, saidas: 0 }
    if (l.tipo === 'entrada') e.entradas += Number(l.valor)
    else                      e.saidas   += Number(l.valor)
    porForma.set(key, e)
  }

  // ── linhas caixa diário ────────────────────────────────────────────────────
  let saldoCorrido = p.saldoAnterior ?? 0
  let ultimaData   = ''

  const linhas = sorted.map(l => {
    const isEntrada = l.tipo === 'entrada'
    saldoCorrido += isEntrada ? Number(l.valor) : -Number(l.valor)

    const novodia   = l.data_lancamento !== ultimaData
    ultimaData      = l.data_lancamento

    // Membro / destino
    const membro = l.member?.name ?? l.member_nome_manual ?? l.fornecedor?.nome ?? '—'

    // Categoria com dot colorido
    const corDot   = l.categoria?.cor ?? '#94a3b8'
    const catNome  = l.categoria?.nome ?? '—'

    // Descrição limpa (sem duplicar categoria)
    const desc = l.descricao ?? l.referencia_culto ?? ''

    // Separador de dia sutil
    const sep = novodia ? `
      <tr class="dia-row">
        <td class="dia-cell" colspan="8">${fmtDate(l.data_lancamento)}</td>
      </tr>` : ''

    return `${sep}
    <tr class="data-row">
      <td class="col-data center">${novodia ? `<b>${fmtDate(l.data_lancamento)}</b>` : ''}</td>
      <td class="col-membro">${membro}</td>
      <td class="col-cat">
        <span class="dot" style="background:${corDot}"></span>${catNome}
      </td>
      <td class="col-forma center">${formaPagLabel(l.forma_pagamento)}</td>
      <td class="col-desc">${desc}</td>
      <td class="col-val right entrada">${isEntrada ? fmt(Number(l.valor)) : ''}</td>
      <td class="col-val right saida">${!isEntrada ? fmt(Number(l.valor)) : ''}</td>
      <td class="col-saldo right ${saldoCorrido >= 0 ? 'sc-pos' : 'sc-neg'}">${fmt(saldoCorrido)}</td>
    </tr>`
  }).join('')

  // ── linhas resumo categoria ────────────────────────────────────────────────
  const linhasCategoria = Array.from(porCategoria.values())
    .sort((a, b) => (b.entradas + b.saidas) - (a.entradas + a.saidas))
    .map(c => `
    <tr>
      <td>
        <span class="dot" style="background:${c.cor}"></span>${c.nome}
      </td>
      <td class="right entrada">${c.entradas > 0 ? fmt(c.entradas) : '<span class="dim">—</span>'}</td>
      <td class="right saida">${c.saidas > 0 ? fmt(c.saidas) : '<span class="dim">—</span>'}</td>
      <td class="right ${(c.entradas - c.saidas) >= 0 ? 'sc-pos' : 'sc-neg'} fw7">${fmt(c.entradas - c.saidas)}</td>
    </tr>`).join('')

  // ── linhas resumo forma ────────────────────────────────────────────────────
  const linhasForma = Array.from(porForma.entries())
    .map(([forma, v]) => `
    <tr>
      <td>${forma}</td>
      <td class="right entrada">${v.entradas > 0 ? fmt(v.entradas) : '<span class="dim">—</span>'}</td>
      <td class="right saida">${v.saidas > 0 ? fmt(v.saidas) : '<span class="dim">—</span>'}</td>
    </tr>`).join('')

  // ── helper card ───────────────────────────────────────────────────────────
  function card(label: string, valor: number, acento: string, corValor: string) {
    return `<div class="sc-card" style="border-bottom: 2.5px solid ${acento}">
      <div class="sc-card-label">${label}</div>
      <div class="sc-card-valor" style="color:${corValor}">${fmt(valor)}</div>
    </div>`
  }

  const corpo = `
  <style>
    /* ── Cards ── */
    .sc-cards {
      display: flex;
      gap: 8px;
      margin-bottom: 10px;
    }
    .sc-card {
      flex: 1;
      padding: 7px 10px 6px;
      background: #f8fafc;
      border: 1px solid #dce8f0;
      border-radius: 4px;
    }
    .sc-card-label {
      font-size: 0.72rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #8aabca;
    }
    .sc-card-valor {
      font-size: 1.2rem;
      font-weight: 900;
      margin-top: 2px;
      line-height: 1;
    }

    /* ── Separador de dia ── */
    .dia-row .dia-cell {
      padding: 3px 8px !important;
      font-size: 0.72rem;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      color: #6a94b8;
      background: #f0f6fb !important;
      border-top: 1px solid #dce8f2 !important;
      border-bottom: none !important;
    }
    .data-row:nth-child(odd) { background: #fff; }
    .data-row:nth-child(even) { background: #f7fafd; }

    /* ── Colunas tabela principal ── */
    .col-data   { width: 56px;  color: #5a7a96; font-size: 0.82rem; }
    .col-membro { width: 150px; font-size: 0.86rem; color: #1c2b3a; }
    .col-cat    { width: 100px; font-size: 0.82rem; color: #3a6a96; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100px; }
    .col-forma  { width: 54px;  font-size: 0.8rem;  color: #5a7a96; }
    .col-desc   { font-size: 0.84rem; color: #4a6a84; }
    .col-val    { width: 78px;  font-size: 0.88rem; }
    .col-saldo  { width: 84px;  font-size: 0.88rem; font-weight: 800; }

    /* ── Cores ── */
    .sc-pos { color: #1a4a8a !important; }
    .sc-neg { color: #8b1c1c !important; }
    .fw7    { font-weight: 700; }
    .dim    { color: #c0cdd8; font-weight: 400; }

    /* dot de categoria */
    .dot {
      display: inline-block;
      width: 6px; height: 6px;
      border-radius: 50%;
      margin-right: 4px;
      vertical-align: middle;
      flex-shrink: 0;
    }

    /* ── Secções de resumo ── */
    .sec-titulo {
      font-size: 0.78rem;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.6px;
      color: #3a6a96;
      padding-bottom: 4px;
      border-bottom: 1px solid #c8daea;
      margin-bottom: 5px;
      margin-top: 14px;
    }

    /* ── Grade resumos ── */
    .resumos-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }
  </style>

  <!-- Cards de saldo -->
  <div class="sc-cards">
    ${p.saldoAnterior !== null
      ? card('Saldo Anterior', p.saldoAnterior, '#60a5fa', '#1a4a8a')
      : ''}
    ${card('Entradas', totalEntradas, '#4ade80', '#14532d')}
    ${card('Saídas',   totalSaidas,   '#f87171', '#7f1d1d')}
    ${card('Saldo do Período', saldoPeriodo, saldoPeriodo >= 0 ? '#60a5fa' : '#f87171', saldoPeriodo >= 0 ? '#1a4a8a' : '#7f1d1d')}
    ${saldoAcumulado !== null
      ? card('Saldo Acumulado', saldoAcumulado, '#a78bfa', saldoAcumulado >= 0 ? '#4c1d95' : '#7f1d1d')
      : ''}
  </div>

  <!-- Tabela principal -->
  <table>
    <thead>
      <tr>
        <th class="center" style="width:56px">Data</th>
        <th style="width:150px">Membro / Dest.</th>
        <th style="width:100px">Categoria</th>
        <th class="center" style="width:54px">Forma</th>
        <th>Descrição / Referência</th>
        <th class="right" style="width:78px">Entrada</th>
        <th class="right" style="width:78px">Saída</th>
        <th class="right" style="width:84px">Saldo</th>
      </tr>
    </thead>
    <tbody>
      ${p.saldoAnterior !== null ? `
      <tr style="background:#eff6ff">
        <td class="center" style="color:#6a94b8;font-size:0.8rem">—</td>
        <td colspan="5" style="color:#4a7ab8;font-size:0.82rem;font-style:italic">
          Saldo acumulado anterior a ${fmtDate(p.dataInicio)}
        </td>
        <td></td>
        <td class="right sc-pos fw7">${fmt(p.saldoAnterior)}</td>
      </tr>` : ''}
      ${linhas}
    </tbody>
    <tfoot>
      <tr>
        <td colspan="5">Totais do período — ${sorted.length} lançamento${sorted.length !== 1 ? 's' : ''}</td>
        <td class="right">${fmt(totalEntradas)}</td>
        <td class="right">${fmt(totalSaidas)}</td>
        <td class="right ${saldoPeriodo >= 0 ? 'sc-pos' : 'sc-neg'}">${fmt(saldoPeriodo)}</td>
      </tr>
    </tfoot>
  </table>

  <!-- Resumos lado a lado -->
  <div class="resumos-grid">

    <div>
      <div class="sec-titulo">Resumo por Categoria</div>
      <table>
        <thead>
          <tr>
            <th>Categoria</th>
            <th class="right" style="width:80px">Entradas</th>
            <th class="right" style="width:80px">Saídas</th>
            <th class="right" style="width:80px">Saldo</th>
          </tr>
        </thead>
        <tbody>${linhasCategoria}</tbody>
        <tfoot>
          <tr>
            <td>Total</td>
            <td class="right">${fmt(totalEntradas)}</td>
            <td class="right">${fmt(totalSaidas)}</td>
            <td class="right ${saldoPeriodo >= 0 ? 'sc-pos' : 'sc-neg'}">${fmt(saldoPeriodo)}</td>
          </tr>
        </tfoot>
      </table>
    </div>

    <div>
      <div class="sec-titulo">Resumo por Forma de Pagamento</div>
      <table>
        <thead>
          <tr>
            <th>Forma</th>
            <th class="right" style="width:90px">Entradas</th>
            <th class="right" style="width:90px">Saídas</th>
          </tr>
        </thead>
        <tbody>${linhasForma}</tbody>
        <tfoot>
          <tr>
            <td>Total</td>
            <td class="right">${fmt(totalEntradas)}</td>
            <td class="right">${fmt(totalSaidas)}</td>
          </tr>
        </tfoot>
      </table>
    </div>

  </div>`

  return buildRelatorioHtml({
    titulo: 'Extrato Financeiro',
    subtitulo: 'Caixa diário · entradas, saídas e saldo corrido',
    filtros: [
      `Período: ${fmtDate(p.dataInicio)} a ${fmtDate(p.dataFim)}`,
      ...p.filtrosTexto,
      `${sorted.length} lançamento${sorted.length !== 1 ? 's' : ''}`,
    ],
    corpo,
  })
}
