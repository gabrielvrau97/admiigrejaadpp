import { buildRelatorioHtml } from './buildRelatorioHtml'
import type { ContribuicoesPorMembroResult } from '../api/fin_dashboard'
import { fmt as fmtCurrency } from './_utils'

const MESES_CURTOS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

// Retorna '—' para zero; usado nas células mensais
function fmt(v: number) {
  return v === 0 ? '—' : fmtCurrency(v)
}
const fmtTotal = fmtCurrency

export interface ContribuicoesParams {
  resultado: ContribuicoesPorMembroResult
  ano: number
  categoriasLabel: string   // ex: "Dízimo, Oferta" ou "Todas as categorias"
  mesesAtivos: string[]     // meses com pelo menos 1 lançamento
}

export function buildContribuicoesHtml(p: ContribuicoesParams): string {
  const { resultado, ano, categoriasLabel, mesesAtivos } = p

  // usa mesesAtivos para exibir somente meses com dados (ou todos se quiser)
  // mas exibe todos os 12 meses mesmo assim para facilitar leitura
  const meses = resultado.meses

  const mesHeader = meses
    .map(m => {
      const [, mm] = m.split('-')
      return `<th class="mes-th">${MESES_CURTOS[parseInt(mm, 10) - 1]}</th>`
    })
    .join('')

  const linhas = resultado.membros.map((membro, idx) => {
    const bg = idx % 2 === 0 ? '' : 'class="row-alt"'
    const colunasMes = meses
      .map(m => {
        const val = membro.meses[m] ?? 0
        return `<td class="val-td ${val > 0 ? 'val-pos' : 'val-zero'}">${fmt(val)}</td>`
      })
      .join('')
    return `<tr ${bg}>
      <td class="nome-td">${membro.nome}</td>
      ${colunasMes}
      <td class="total-td">${fmtTotal(membro.total)}</td>
    </tr>`
  }).join('')

  // linha de totais
  const totalMesCols = meses
    .map(m => `<td class="total-mes-td">${resultado.totaisMes[m] > 0 ? fmtTotal(resultado.totaisMes[m]) : '—'}</td>`)
    .join('')

  const tabelaHtml = `
  <style>
    .contrib-table { width: 100%; border-collapse: collapse; font-size: 9px; }
    .contrib-table th {
      background: #1e3a5f;
      color: #fff;
      padding: 6px 4px;
      text-align: center;
      white-space: nowrap;
      font-weight: 700;
      border: 1px solid #2a4a6b;
    }
    .contrib-table th.nome-th { text-align: left; min-width: 120px; padding-left: 8px; }
    .contrib-table th.mes-th { min-width: 52px; }
    .contrib-table th.total-th { background: #0f2133; min-width: 72px; }
    .contrib-table td {
      padding: 5px 4px;
      border: 1px solid #e5e7eb;
      text-align: center;
      font-size: 9px;
      color: #374151;
    }
    .contrib-table td.nome-td {
      text-align: left;
      padding-left: 8px;
      font-weight: 600;
      color: #111827;
      white-space: nowrap;
    }
    .contrib-table td.val-pos { color: #065f46; font-weight: 600; }
    .contrib-table td.val-zero { color: #d1d5db; }
    .contrib-table td.total-td {
      font-weight: 800;
      color: #1e3a5f;
      background: #f0f4ff;
      border-left: 2px solid #2563eb;
    }
    .contrib-table tr.row-alt td { background: #f9fafb; }
    .contrib-table tr.row-alt td.total-td { background: #e8eeff; }
    .contrib-table .totais-row td {
      background: #0f2133 !important;
      color: #fff !important;
      font-weight: 800;
      padding: 7px 4px;
      border-color: #1e3a5f;
    }
    .contrib-table .totais-row td.nome-total { text-align: left; padding-left: 8px; font-size: 9px; letter-spacing: .03em; }
    .contrib-table td.total-mes-td {
      font-weight: 700;
      font-size: 9px;
    }
    .resumo-bar {
      display: flex; gap: 12px; flex-wrap: wrap;
      margin-bottom: 10px;
    }
    .resumo-pill {
      background: #f0f4ff;
      border: 1px solid #c7d7f0;
      border-radius: 6px;
      padding: 4px 10px;
      font-size: 9px;
      color: #1e3a5f;
      font-weight: 600;
    }
    .resumo-pill span { color: #2563eb; font-weight: 800; }
  </style>

  <div class="resumo-bar">
    <div class="resumo-pill">Contribuintes: <span>${resultado.membros.length}</span></div>
    <div class="resumo-pill">Total arrecadado: <span>${fmtTotal(resultado.totalGeral)}</span></div>
    <div class="resumo-pill">Categorias: <span>${categoriasLabel}</span></div>
  </div>

  <table class="contrib-table">
    <thead>
      <tr>
        <th class="nome-th">Contribuinte</th>
        ${mesHeader}
        <th class="total-th">Total</th>
      </tr>
    </thead>
    <tbody>
      ${linhas}
      <tr class="totais-row">
        <td class="nome-total">TOTAL GERAL</td>
        ${totalMesCols}
        <td style="font-weight:900; font-size:10px;">${fmtTotal(resultado.totalGeral)}</td>
      </tr>
    </tbody>
  </table>`

  return buildRelatorioHtml({
    titulo: `Extrato de Contribuições — ${ano}`,
    subtitulo: `Contribuições por membro · ${categoriasLabel}`,
    filtros: [`Ano: ${ano}`, `Categorias: ${categoriasLabel}`],
    corpo: tabelaHtml,
  })
}
