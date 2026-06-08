import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { FinLancamento } from '../../../types'
import type { FinTesoureiro } from '../../api/fin_tesoureiros'
import { openPrintWindow } from '../../print'

const FORMAS_ORDEM = ['dinheiro', 'pix', 'cartao_debito', 'cartao_credito']
const FORMAS_LABEL: Record<string, string> = {
  dinheiro: 'Dinheiro',
  pix: 'Pix',
  cartao_debito: 'Cartão Débito',
  cartao_credito: 'Cartão Crédito',
}

function fmtMoeda(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

interface FormaTotal { label: string; total: number; qtd: number }

function agrupaPorForma(lancamentos: FinLancamento[]): FormaTotal[] {
  const map = new Map<string, { total: number; qtd: number }>()
  for (const l of lancamentos) {
    const key = l.forma_pagamento ?? 'dinheiro'
    const cur = map.get(key) ?? { total: 0, qtd: 0 }
    map.set(key, { total: cur.total + Number(l.valor), qtd: cur.qtd + 1 })
  }
  // Ordena pela sequência preferida, depois por valor desc para as demais
  const known = FORMAS_ORDEM.filter(k => map.has(k)).map(k => ({
    label: FORMAS_LABEL[k] ?? k,
    ...map.get(k)!,
  }))
  const others = [...map.entries()]
    .filter(([k]) => !FORMAS_ORDEM.includes(k))
    .sort((a, b) => b[1].total - a[1].total)
    .map(([k, v]) => ({ label: FORMAS_LABEL[k] ?? k, ...v }))
  return [...known, ...others]
}

export function printRelatorioTesouraria(
  lancamentos: FinLancamento[],
  tesoureiro: FinTesoureiro,
  data: Date = new Date(),
) {
  const dateStr = format(data, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
  const dateShort = format(data, 'dd/MM/yyyy', { locale: ptBR })
  const geradoEm = format(new Date(), 'dd/MM/yyyy HH:mm', { locale: ptBR })

  const entradas = lancamentos.filter(l => l.tipo === 'entrada')
  const saidas = lancamentos.filter(l => l.tipo === 'saida')
  const totalEntradas = entradas.reduce((s, l) => s + Number(l.valor), 0)
  const totalSaidas = saidas.reduce((s, l) => s + Number(l.valor), 0)
  const saldo = totalEntradas - totalSaidas
  const saldoCor = saldo >= 0 ? '#059669' : '#dc2626'

  const formasEntrada = agrupaPorForma(entradas)
  const formasSaida = agrupaPorForma(saidas)

  function blocoFormas(list: FormaTotal[], cor: string, bgLinha: string) {
    if (list.length === 0) {
      return `<tr><td colspan="3" style="color:#9ca3af;font-style:italic;padding:6px 10px">Nenhum lançamento</td></tr>`
    }
    return list.map(({ label, total, qtd }) => `
      <tr>
        <td style="padding:6px 10px">${label}</td>
        <td style="padding:6px 10px;color:#6b7280;text-align:center">${qtd} lanç.</td>
        <td style="padding:6px 10px;text-align:right;font-weight:600;color:${cor}">${fmtMoeda(total)}</td>
      </tr>`).join('')
  }

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8"/>
<title>Relatório de Tesouraria — ${dateShort}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:Arial,sans-serif;font-size:11px;color:#111;padding:20px;max-width:680px;margin:0 auto}
  .brand-header{width:100%;display:flex;justify-content:center;margin-bottom:8px}
  .brand-header img{max-width:100%;max-height:90px;object-fit:contain}
  .title-bar{border-top:2px solid #059669;border-bottom:2px solid #059669;padding:6px 4px;margin-bottom:16px}
  h1{font-size:15px;margin-bottom:2px;color:#059669}
  p.sub{font-size:10px;color:#666}
  .totais-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:20px}
  .total-card{border-radius:6px;padding:12px;text-align:center}
  .total-card .label{font-size:9px;color:#6b7280;margin-bottom:4px;text-transform:uppercase;letter-spacing:0.5px}
  .total-card .value{font-size:17px;font-weight:bold}
  .total-card .qtd{font-size:9px;color:#9ca3af;margin-top:3px}
  .card-e{background:#ecfdf5;border:1px solid #a7f3d0}
  .card-s{background:#fef2f2;border:1px solid #fecaca}
  .card-d{background:#eff6ff;border:1px solid #bfdbfe}
  .section-title{font-size:11px;font-weight:bold;color:#374151;margin:0 0 6px;padding-bottom:3px;border-bottom:1px solid #e5e7eb}
  .formas-wrap{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px}
  table.formas{width:100%;border-collapse:collapse}
  table.formas thead th{background:#f9fafb;padding:5px 10px;text-align:left;font-size:10px;color:#374151;border-bottom:1px solid #e5e7eb}
  table.formas thead th:last-child{text-align:right}
  table.formas thead th:nth-child(2){text-align:center}
  table.formas tbody tr:nth-child(even) td{background:#f9fafb}
  table.formas tfoot td{padding:6px 10px;font-weight:bold;border-top:1px solid #d1d5db;font-size:11px}
  table.formas tfoot td:last-child{text-align:right}
  .assinatura-section{margin-top:28px;page-break-inside:avoid}
  .assinatura-box{display:flex;gap:40px;align-items:flex-end;margin-top:12px;flex-wrap:wrap}
  .assinatura-campo{flex:1;min-width:180px}
  .assinatura-linha{border-bottom:1px solid #374151;margin-bottom:4px;height:32px}
  .assinatura-label{font-size:9px;color:#6b7280;text-align:center}
  .footer{margin-top:16px;font-size:9px;color:#9ca3af;text-align:right;border-top:1px solid #f3f4f6;padding-top:6px}
  @media print{body{padding:8px}.no-print{display:none}}
</style>
</head>
<body>

<div class="no-print" style="margin-bottom:12px;display:flex;gap:8px">
  <button onclick="window.print()" style="background:#059669;color:white;border:none;padding:6px 16px;border-radius:6px;cursor:pointer;font-size:12px">🖨️ Imprimir</button>
  <button onclick="window.close()" style="background:#f3f4f6;border:1px solid #d1d5db;padding:6px 16px;border-radius:6px;cursor:pointer;font-size:12px">✕ Fechar</button>
</div>

<div class="brand-header">
  <img src="${window.location.origin}/brand/cabecalho.png" alt="AD Piracanjuba" onerror="this.style.display='none'"/>
</div>

<div class="title-bar">
  <h1>Relatório Diário de Tesouraria</h1>
  <p class="sub">${dateStr} &nbsp;·&nbsp; Tesoureiro: <strong>${tesoureiro.nome}</strong> &nbsp;·&nbsp; ${lancamentos.length} lançamento(s)</p>
</div>

<!-- Totais -->
<div class="totais-grid">
  <div class="total-card card-e">
    <div class="label">Entradas</div>
    <div class="value" style="color:#059669">${fmtMoeda(totalEntradas)}</div>
    <div class="qtd">${entradas.length} lançamento(s)</div>
  </div>
  <div class="total-card card-s">
    <div class="label">Saídas</div>
    <div class="value" style="color:#dc2626">${fmtMoeda(totalSaidas)}</div>
    <div class="qtd">${saidas.length} lançamento(s)</div>
  </div>
  <div class="total-card card-d">
    <div class="label">Saldo do Dia</div>
    <div class="value" style="color:${saldoCor}">${fmtMoeda(saldo)}</div>
    <div class="qtd">&nbsp;</div>
  </div>
</div>

<!-- Formas de pagamento -->
<div class="formas-wrap">
  <div>
    <div class="section-title" style="color:#059669">Entradas por Forma de Pagamento</div>
    <table class="formas">
      <thead><tr><th>Forma</th><th>Qtd.</th><th>Total</th></tr></thead>
      <tbody>${blocoFormas(formasEntrada, '#059669', '#f0fdf4')}</tbody>
      ${formasEntrada.length > 1 ? `<tfoot><tr>
        <td colspan="2">Total</td>
        <td style="color:#059669">${fmtMoeda(totalEntradas)}</td>
      </tr></tfoot>` : ''}
    </table>
  </div>
  <div>
    <div class="section-title" style="color:#dc2626">Saídas por Forma de Pagamento</div>
    <table class="formas">
      <thead><tr><th>Forma</th><th>Qtd.</th><th>Total</th></tr></thead>
      <tbody>${blocoFormas(formasSaida, '#dc2626', '#fef2f2')}</tbody>
      ${formasSaida.length > 1 ? `<tfoot><tr>
        <td colspan="2">Total</td>
        <td style="color:#dc2626">${fmtMoeda(totalSaidas)}</td>
      </tr></tfoot>` : ''}
    </table>
  </div>
</div>

<!-- Assinatura -->
<div class="assinatura-section">
  <div class="section-title">Declaração e Assinatura</div>
  <p style="font-size:10px;color:#374151;margin:8px 0 14px">
    Declaro que os valores acima são verdadeiros e conferem com os valores recebidos e pagos nesta data.
  </p>
  <div class="assinatura-box">
    <div class="assinatura-campo">
      <div class="assinatura-linha"></div>
      <div class="assinatura-label">${tesoureiro.nome} — Tesoureiro(a)</div>
    </div>
    <div class="assinatura-campo">
      <div class="assinatura-linha"></div>
      <div class="assinatura-label">Pastor / Supervisor — Conferência</div>
    </div>
    <div class="assinatura-campo" style="max-width:130px">
      <div class="assinatura-linha"></div>
      <div class="assinatura-label">Data</div>
    </div>
  </div>
</div>

<div class="footer">Igreja Digital · Gerado em ${geradoEm}</div>

</body>
</html>`

  openPrintWindow(html, `Relatório Tesouraria — ${dateShort}`)
}
