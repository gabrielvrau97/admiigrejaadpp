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
  if (f === 'dinheiro')      return 'Dinheiro'
  if (f === 'pix')           return 'Pix'
  if (f === 'cartao_debito') return 'Débito'
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

  // ── totais gerais ──────────────────────────────────────────────────────────
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

  // ── resumo por forma de pagamento ─────────────────────────────────────────
  const porForma = new Map<string, { entradas: number; saidas: number }>()
  for (const l of sorted) {
    const key = formaPagLabel(l.forma_pagamento)
    const e   = porForma.get(key) ?? { entradas: 0, saidas: 0 }
    if (l.tipo === 'entrada') e.entradas += Number(l.valor)
    else                      e.saidas   += Number(l.valor)
    porForma.set(key, e)
  }

  // ── linhas da tabela com saldo corrido ────────────────────────────────────
  let saldoCorrido = p.saldoAnterior ?? 0
  let ultimaData   = ''
  let linhaIdx     = 0

  const linhas = sorted.map(l => {
    const isEntrada    = l.tipo === 'entrada'
    if (isEntrada) saldoCorrido += Number(l.valor)
    else           saldoCorrido -= Number(l.valor)

    const novodia   = l.data_lancamento !== ultimaData
    ultimaData      = l.data_lancamento
    linhaIdx++

    const membro    = l.member?.name ?? l.member_nome_manual ?? l.fornecedor?.nome ?? '—'
    const descricao = [l.descricao ?? l.referencia_culto, l.categoria?.nome]
                        .filter(Boolean).join(' · ') || '—'
    const corDot    = l.categoria?.cor ?? '#94a3b8'

    const separador = novodia ? `
      <tr class="dia-sep">
        <td colspan="7">
          <span class="dia-data">${fmtDate(l.data_lancamento)}</span>
        </td>
      </tr>` : ''

    const bgRow = linhaIdx % 2 === 0 ? '#f7fafd' : '#ffffff'

    return `${separador}
    <tr style="background:${bgRow}">
      <td class="center td-data">${novodia ? `<strong>${fmtDate(l.data_lancamento)}</strong>` : ''}</td>
      <td class="td-desc">
        <span class="cat-dot" style="background:${corDot}"></span>
        ${descricao}
      </td>
      <td class="td-membro">${membro}</td>
      <td class="center td-forma">${formaPagLabel(l.forma_pagamento)}</td>
      <td class="right td-valor entrada">${isEntrada ? fmt(Number(l.valor)) : ''}</td>
      <td class="right td-valor saida">${!isEntrada ? fmt(Number(l.valor)) : ''}</td>
      <td class="right td-saldo ${saldoCorrido >= 0 ? 'sc-pos' : 'sc-neg'}">${fmt(saldoCorrido)}</td>
    </tr>`
  }).join('')

  // ── linhas resumo categoria ────────────────────────────────────────────────
  const linhasCategoria = Array.from(porCategoria.values())
    .sort((a, b) => (b.entradas + b.saidas) - (a.entradas + a.saidas))
    .map((c, i) => `
    <tr style="background:${i % 2 === 0 ? '#fff' : '#f7fafd'}">
      <td>
        <span class="cat-dot" style="background:${c.cor}"></span>
        ${c.nome}
      </td>
      <td class="right entrada">${c.entradas > 0 ? fmt(c.entradas) : '<span class="vazio">—</span>'}</td>
      <td class="right saida">${c.saidas > 0 ? fmt(c.saidas) : '<span class="vazio">—</span>'}</td>
      <td class="right ${(c.entradas - c.saidas) >= 0 ? 'sc-pos' : 'sc-neg'}" style="font-weight:700">${fmt(c.entradas - c.saidas)}</td>
    </tr>`).join('')

  // ── linhas resumo forma ────────────────────────────────────────────────────
  const linhasForma = Array.from(porForma.entries())
    .map(([forma, v], i) => `
    <tr style="background:${i % 2 === 0 ? '#fff' : '#f7fafd'}">
      <td>${forma}</td>
      <td class="right entrada">${v.entradas > 0 ? fmt(v.entradas) : '<span class="vazio">—</span>'}</td>
      <td class="right saida">${v.saidas > 0 ? fmt(v.saidas) : '<span class="vazio">—</span>'}</td>
    </tr>`).join('')

  // ── card helper ───────────────────────────────────────────────────────────
  function card(label: string, valor: number, borda: string, bg: string, cor: string) {
    return `<div class="sc-card" style="border-color:${borda};background:${bg}">
      <div class="sc-card-label">${label}</div>
      <div class="sc-card-valor" style="color:${cor}">${fmt(valor)}</div>
    </div>`
  }

  const corpo = `
  <style>
    /* ── Cards de saldo ── */
    .sc-cards {
      display: flex;
      gap: 8px;
      margin-bottom: 10px;
    }
    .sc-card {
      flex: 1;
      border: 1.5px solid #c9d8e8;
      border-radius: 5px;
      padding: 6px 10px 7px;
      background: #f7fafd;
    }
    .sc-card-label {
      font-size: 0.75rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.4px;
      color: #7a9cbf;
    }
    .sc-card-valor {
      font-size: 1.3rem;
      font-weight: 900;
      margin-top: 2px;
      line-height: 1.1;
    }

    /* ── Separador de dia ── */
    .dia-sep td {
      background: #dbeafe !important;
      border-top: 1px solid #93c5fd !important;
      border-bottom: 1px solid #93c5fd !important;
      padding: 2px 7px !important;
    }
    .dia-data {
      font-size: 0.78rem;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.6px;
      color: #1e3a5f;
    }

    /* ── Colunas tabela principal ── */
    .td-data   { width: 64px;  font-size: 0.85rem; color: #2d5f8a; }
    .td-desc   { font-size: 0.88rem; color: #1a1a2e; }
    .td-membro { width: 130px; font-size: 0.85rem; color: #374151; }
    .td-forma  { width: 58px;  font-size: 0.82rem; color: #4a5568; }
    .td-valor  { width: 82px;  font-size: 0.9rem; }
    .td-saldo  { width: 88px;  font-size: 0.9rem; font-weight: 800; }

    /* ── Cores semânticas ── */
    .entrada { color: #145a2e !important; font-weight: 700; }
    .saida   { color: #7f1d1d !important; font-weight: 700; }
    .sc-pos  { color: #1e40af !important; }
    .sc-neg  { color: #991b1b !important; }
    .vazio   { color: #b0bec5; font-weight: 400; }

    /* ── Dot de categoria ── */
    .cat-dot {
      display: inline-block;
      width: 7px; height: 7px;
      border-radius: 50%;
      margin-right: 4px;
      vertical-align: middle;
      flex-shrink: 0;
    }

    /* ── Seções de resumo ── */
    .secao {
      margin-top: 14px;
    }
    .secao-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 5px;
    }
    .secao-titulo {
      font-size: 0.88rem;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 0.6px;
      color: #1e3a5f;
      white-space: nowrap;
    }
    .secao-linha {
      flex: 1;
      height: 1.5px;
      background: #c9d8e8;
    }

    /* ── Grade de resumos lado a lado ── */
    .resumos-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      margin-top: 14px;
    }

    /* ── Linha de saldo anterior ── */
    .tr-anterior td {
      background: #eff6ff !important;
      color: #1e40af;
      font-style: italic;
      font-size: 0.85rem;
      border-top: 1px solid #bfdbfe !important;
      border-bottom: 1px solid #bfdbfe !important;
    }
    .tr-anterior td strong { font-weight: 800; }
  </style>

  <!-- Cards de saldo do período -->
  <div class="sc-cards">
    ${p.saldoAnterior !== null
      ? card('Saldo Anterior', p.saldoAnterior, '#93c5fd', '#eff6ff', '#1e40af')
      : ''}
    ${card('Total Entradas', totalEntradas, '#86efac', '#f0fdf4', '#145a2e')}
    ${card('Total Saídas',   totalSaidas,   '#fca5a5', '#fff5f5', '#7f1d1d')}
    ${card('Saldo do Período', saldoPeriodo, '#93c5fd', '#eff6ff', saldoPeriodo >= 0 ? '#1e40af' : '#991b1b')}
    ${saldoAcumulado !== null
      ? card('Saldo Acumulado', saldoAcumulado, '#c4b5fd', '#f5f3ff', saldoAcumulado >= 0 ? '#5b21b6' : '#991b1b')
      : ''}
  </div>

  <!-- Tabela principal — caixa diário -->
  <table>
    <thead>
      <tr>
        <th class="center" style="width:64px">Data</th>
        <th>Descrição / Categoria</th>
        <th style="width:130px">Membro / Dest.</th>
        <th class="center" style="width:58px">Forma</th>
        <th class="right"  style="width:82px">Entrada</th>
        <th class="right"  style="width:82px">Saída</th>
        <th class="right"  style="width:88px">Saldo</th>
      </tr>
    </thead>
    <tbody>
      ${p.saldoAnterior !== null ? `
      <tr class="tr-anterior">
        <td class="center"><strong>—</strong></td>
        <td colspan="4" style="color:#1e40af">Saldo anterior acumulado até ${fmtDate(p.dataInicio)}</td>
        <td></td>
        <td class="right"><strong>${fmt(p.saldoAnterior)}</strong></td>
      </tr>` : ''}
      ${linhas}
    </tbody>
    <tfoot>
      <tr>
        <td colspan="4">TOTAIS DO PERÍODO</td>
        <td class="right">${fmt(totalEntradas)}</td>
        <td class="right">${fmt(totalSaidas)}</td>
        <td class="right">${fmt(saldoPeriodo)}</td>
      </tr>
    </tfoot>
  </table>

  <!-- Resumos lado a lado -->
  <div class="resumos-grid">

    <!-- Resumo por categoria -->
    <div>
      <div class="secao-header">
        <span class="secao-titulo">Por Categoria</span>
        <div class="secao-linha"></div>
      </div>
      <table>
        <thead>
          <tr>
            <th>Categoria</th>
            <th class="right" style="width:90px">Entradas</th>
            <th class="right" style="width:90px">Saídas</th>
            <th class="right" style="width:90px">Saldo</th>
          </tr>
        </thead>
        <tbody>${linhasCategoria}</tbody>
        <tfoot>
          <tr>
            <td>TOTAL</td>
            <td class="right">${fmt(totalEntradas)}</td>
            <td class="right">${fmt(totalSaidas)}</td>
            <td class="right">${fmt(saldoPeriodo)}</td>
          </tr>
        </tfoot>
      </table>
    </div>

    <!-- Resumo por forma de pagamento -->
    <div>
      <div class="secao-header">
        <span class="secao-titulo">Por Forma de Pagamento</span>
        <div class="secao-linha"></div>
      </div>
      <table>
        <thead>
          <tr>
            <th>Forma</th>
            <th class="right" style="width:100px">Entradas</th>
            <th class="right" style="width:100px">Saídas</th>
          </tr>
        </thead>
        <tbody>${linhasForma}</tbody>
        <tfoot>
          <tr>
            <td>TOTAL</td>
            <td class="right">${fmt(totalEntradas)}</td>
            <td class="right">${fmt(totalSaidas)}</td>
          </tr>
        </tfoot>
      </table>
    </div>

  </div>`

  const filtrosLabel = [
    `Período: ${fmtDate(p.dataInicio)} a ${fmtDate(p.dataFim)}`,
    ...p.filtrosTexto,
    `${sorted.length} lançamento${sorted.length !== 1 ? 's' : ''}`,
  ]

  return buildRelatorioHtml({
    titulo: 'Extrato Financeiro',
    subtitulo: 'Caixa diário · Entradas, saídas e saldo corrido',
    filtros: filtrosLabel,
    corpo,
  })
}
