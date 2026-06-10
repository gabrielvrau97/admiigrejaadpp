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
  if (f === 'dinheiro') return 'Dinheiro'
  if (f === 'pix') return 'Pix'
  if (f === 'cartao_debito') return 'Débito'
  if (f === 'cartao_credito') return 'Crédito'
  return f
}

export interface ExtratoRelatorioParams {
  lancamentos: FinLancamento[]   // já filtrados, serão reordenados por data ASC aqui
  saldoAnterior: number | null
  dataInicio: string
  dataFim: string
  filtrosTexto: string[]          // labels dos filtros ativos para exibir no cabeçalho
}

export function buildExtratoHtml(p: ExtratoRelatorioParams): string {
  // ordena por data_lancamento ASC, depois por created_at para desempate
  const sorted = [...p.lancamentos].sort((a, b) => {
    const d = a.data_lancamento.localeCompare(b.data_lancamento)
    if (d !== 0) return d
    return (a.created_at ?? '').localeCompare(b.created_at ?? '')
  })

  // ── totais gerais ──────────────────────────────────────────────────────────
  const totalEntradas = sorted.filter(l => l.tipo === 'entrada').reduce((s, l) => s + Number(l.valor), 0)
  const totalSaidas   = sorted.filter(l => l.tipo === 'saida').reduce((s, l) => s + Number(l.valor), 0)
  const saldoPeriodo  = totalEntradas - totalSaidas
  const saldoAcumulado = p.saldoAnterior !== null ? p.saldoAnterior + saldoPeriodo : null

  // ── resumo por categoria ───────────────────────────────────────────────────
  const porCategoria = new Map<string, { nome: string; cor: string; entradas: number; saidas: number }>()
  for (const l of sorted) {
    const key = l.categoria?.id ?? '__sem__'
    const nome = l.categoria?.nome ?? 'Sem categoria'
    const cor  = l.categoria?.cor  ?? '#94a3b8'
    const entry = porCategoria.get(key) ?? { nome, cor, entradas: 0, saidas: 0 }
    if (l.tipo === 'entrada') entry.entradas += Number(l.valor)
    else                      entry.saidas   += Number(l.valor)
    porCategoria.set(key, entry)
  }

  // ── resumo por forma de pagamento ─────────────────────────────────────────
  const porForma = new Map<string, { entradas: number; saidas: number }>()
  for (const l of sorted) {
    const key = formaPagLabel(l.forma_pagamento)
    const entry = porForma.get(key) ?? { entradas: 0, saidas: 0 }
    if (l.tipo === 'entrada') entry.entradas += Number(l.valor)
    else                      entry.saidas   += Number(l.valor)
    porForma.set(key, entry)
  }

  // ── linhas da tabela principal com saldo corrido ───────────────────────────
  let saldoCorrido = p.saldoAnterior ?? 0
  let ultimaData = ''

  const linhas = sorted.map(l => {
    const isEntrada = l.tipo === 'entrada'
    if (isEntrada) saldoCorrido += Number(l.valor)
    else           saldoCorrido -= Number(l.valor)

    const dataStr = fmtDate(l.data_lancamento)
    const separadorDia = l.data_lancamento !== ultimaData
    ultimaData = l.data_lancamento

    const membro = l.member?.name ?? l.member_nome_manual ?? l.fornecedor?.nome ?? ''
    const descricao = [l.categoria?.nome, l.descricao ?? l.referencia_culto].filter(Boolean).join(' — ')

    const separador = separadorDia
      ? `<tr class="dia-separador"><td colspan="7">${dataStr}</td></tr>`
      : ''

    return `${separador}
    <tr>
      <td class="center">${separadorDia ? dataStr : ''}</td>
      <td>${descricao || '—'}</td>
      <td>${membro}</td>
      <td class="center">${formaPagLabel(l.forma_pagamento)}</td>
      <td class="right entrada">${isEntrada ? fmt(Number(l.valor)) : ''}</td>
      <td class="right saida">${!isEntrada ? fmt(Number(l.valor)) : ''}</td>
      <td class="right saldo-corrido ${saldoCorrido >= 0 ? 'positivo' : 'negativo'}">${fmt(saldoCorrido)}</td>
    </tr>`
  }).join('')

  // ── tabela de resumo por categoria ────────────────────────────────────────
  const linhasCategoria = Array.from(porCategoria.values())
    .sort((a, b) => (b.entradas + b.saidas) - (a.entradas + a.saidas))
    .map(c => `
    <tr>
      <td>
        <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${c.cor};margin-right:5px;vertical-align:middle;"></span>
        ${c.nome}
      </td>
      <td class="right entrada">${c.entradas > 0 ? fmt(c.entradas) : '—'}</td>
      <td class="right saida">${c.saidas > 0 ? fmt(c.saidas) : '—'}</td>
      <td class="right ${(c.entradas - c.saidas) >= 0 ? 'positivo' : 'negativo'}">${fmt(c.entradas - c.saidas)}</td>
    </tr>`).join('')

  // ── tabela de resumo por forma de pagamento ───────────────────────────────
  const linhasForma = Array.from(porForma.entries())
    .map(([forma, v]) => `
    <tr>
      <td>${forma}</td>
      <td class="right entrada">${v.entradas > 0 ? fmt(v.entradas) : '—'}</td>
      <td class="right saida">${v.saidas > 0 ? fmt(v.saidas) : '—'}</td>
    </tr>`).join('')

  const corpo = `
  <style>
    .dia-separador td {
      background: #e8eef5 !important;
      color: #1e3a5f;
      font-weight: 700;
      font-size: 9px;
      text-transform: uppercase;
      letter-spacing: .5px;
      padding: 3px 6px !important;
      border-bottom: none !important;
    }
    .saldo-corrido { font-weight: 700; }
    .positivo { color: #1e40af !important; }
    .negativo { color: #991b1b !important; }
    .resumo-section { margin-top: 8mm; }
    .resumo-section-title {
      font-size: 10px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: .5px;
      color: #1e3a5f;
      border-bottom: 2px solid #1e3a5f;
      padding-bottom: 3px;
      margin-bottom: 4px;
    }
    .cards-saldo {
      display: flex;
      gap: 6px;
      margin-bottom: 5mm;
    }
    .card-saldo {
      flex: 1;
      border-radius: 5px;
      padding: 6px 10px;
      border: 1px solid #d0dbe8;
    }
    .card-saldo-label { font-size: 8.5px; color: #666; text-transform: uppercase; letter-spacing: .3px; }
    .card-saldo-valor { font-size: 13px; font-weight: 800; margin-top: 2px; }
  </style>

  <!-- Cards de resumo do período -->
  <div class="cards-saldo">
    ${p.saldoAnterior !== null ? `
    <div class="card-saldo" style="border-color:#93c5fd;background:#eff6ff;">
      <div class="card-saldo-label">Saldo Anterior</div>
      <div class="card-saldo-valor" style="color:#1e40af;">${fmt(p.saldoAnterior)}</div>
    </div>` : ''}
    <div class="card-saldo" style="border-color:#86efac;background:#f0fdf4;">
      <div class="card-saldo-label">Total Entradas</div>
      <div class="card-saldo-valor" style="color:#166534;">${fmt(totalEntradas)}</div>
    </div>
    <div class="card-saldo" style="border-color:#fca5a5;background:#fff5f5;">
      <div class="card-saldo-label">Total Saídas</div>
      <div class="card-saldo-valor" style="color:#991b1b;">${fmt(totalSaidas)}</div>
    </div>
    <div class="card-saldo" style="border-color:#93c5fd;background:#eff6ff;">
      <div class="card-saldo-label">Saldo do Período</div>
      <div class="card-saldo-valor" style="color:${saldoPeriodo >= 0 ? '#1e40af' : '#991b1b'};">${fmt(saldoPeriodo)}</div>
    </div>
    ${saldoAcumulado !== null ? `
    <div class="card-saldo" style="border-color:#c4b5fd;background:#f5f3ff;">
      <div class="card-saldo-label">Saldo Acumulado</div>
      <div class="card-saldo-valor" style="color:${saldoAcumulado >= 0 ? '#5b21b6' : '#991b1b'};">${fmt(saldoAcumulado)}</div>
    </div>` : ''}
  </div>

  <!-- Tabela principal: caixa diário -->
  <table>
    <thead>
      <tr>
        <th class="center" style="width:60px;">Data</th>
        <th>Descrição / Categoria</th>
        <th style="width:120px;">Membro / Dest.</th>
        <th class="center" style="width:60px;">Forma</th>
        <th class="right" style="width:80px;">Entrada</th>
        <th class="right" style="width:80px;">Saída</th>
        <th class="right" style="width:85px;">Saldo</th>
      </tr>
    </thead>
    <tbody>
      ${p.saldoAnterior !== null ? `
      <tr style="background:#dbeafe;">
        <td class="center" style="color:#1e40af;font-weight:700;">Anterior</td>
        <td colspan="5" style="color:#1e40af;font-style:italic;">Saldo acumulado até ${fmtDate(p.dataInicio)}</td>
        <td class="right" style="font-weight:800;color:#1e40af;">${fmt(p.saldoAnterior)}</td>
      </tr>` : ''}
      ${linhas}
    </tbody>
    <tfoot>
      <tr>
        <td colspan="4" style="font-weight:700;">TOTAIS DO PERÍODO</td>
        <td class="right">${fmt(totalEntradas)}</td>
        <td class="right">${fmt(totalSaidas)}</td>
        <td class="right">${fmt(saldoPeriodo)}</td>
      </tr>
    </tfoot>
  </table>

  <!-- Resumo por categoria -->
  <div class="resumo-section">
    <div class="resumo-section-title">Resumo por Categoria</div>
    <table>
      <thead>
        <tr>
          <th>Categoria</th>
          <th class="right" style="width:100px;">Entradas</th>
          <th class="right" style="width:100px;">Saídas</th>
          <th class="right" style="width:100px;">Saldo</th>
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
  <div class="resumo-section">
    <div class="resumo-section-title">Resumo por Forma de Pagamento</div>
    <table>
      <thead>
        <tr>
          <th>Forma de Pagamento</th>
          <th class="right" style="width:100px;">Entradas</th>
          <th class="right" style="width:100px;">Saídas</th>
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
  `

  const filtrosLabel: string[] = [
    `Período: ${fmtDate(p.dataInicio)} a ${fmtDate(p.dataFim)}`,
    ...p.filtrosTexto,
    `${sorted.length} lançamento${sorted.length !== 1 ? 's' : ''}`,
  ]

  return buildRelatorioHtml({
    titulo: 'Extrato Financeiro',
    subtitulo: 'Caixa diário — entradas, saídas e saldo corrido',
    filtros: filtrosLabel,
    corpo,
  })
}
