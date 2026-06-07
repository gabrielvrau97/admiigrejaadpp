import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { FinLancamento } from '../../../types'
import type { FinTesoureiro } from '../../api/fin_tesoureiros'
import { openPrintWindow } from '../../print'

const FORMAS: Record<string, string> = {
  dinheiro: 'Dinheiro',
  pix: 'Pix',
  cartao_debito: 'Débito',
  cartao_credito: 'Crédito',
}

function fmtMoeda(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function agrupaPorForma(lancamentos: FinLancamento[]): { forma: string; total: number }[] {
  const map = new Map<string, number>()
  for (const l of lancamentos) {
    const forma = l.forma_pagamento ?? 'dinheiro'
    map.set(forma, (map.get(forma) ?? 0) + Number(l.valor))
  }
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([forma, total]) => ({ forma: FORMAS[forma] ?? forma, total }))
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

  const formasEntrada = agrupaPorForma(entradas)
  const formasSaida = agrupaPorForma(saidas)

  function rowsLancamentos(list: FinLancamento[], cor: string) {
    if (list.length === 0) return `<tr><td colspan="5" style="text-align:center;color:#9ca3af;font-style:italic">Nenhum lançamento</td></tr>`
    return list.map(l => {
      const nome = l.member?.name ?? l.member_nome_manual ?? l.fornecedor?.nome ?? '—'
      const forma = FORMAS[l.forma_pagamento ?? 'dinheiro'] ?? l.forma_pagamento ?? '—'
      const parc = l.parcelas && l.parcelas > 1 ? ` (${l.parcelas}x)` : ''
      return `<tr>
        <td>${l.categoria?.nome ?? '—'}</td>
        <td>${nome}</td>
        <td>${l.descricao ?? l.referencia_culto ?? '—'}</td>
        <td>${forma}${parc}</td>
        <td style="text-align:right;font-weight:600;color:${cor}">${fmtMoeda(Number(l.valor))}</td>
      </tr>`
    }).join('')
  }

  function rowsFormas(list: { forma: string; total: number }[]) {
    if (list.length === 0) return ''
    return list.map(({ forma, total }) =>
      `<tr><td style="padding:3px 6px">${forma}</td><td style="padding:3px 6px;text-align:right">${fmtMoeda(total)}</td></tr>`
    ).join('')
  }

  const saldoCor = saldo >= 0 ? '#059669' : '#dc2626'

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8"/>
<title>Relatório de Tesouraria — ${dateShort}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:Arial,sans-serif;font-size:11px;color:#111;padding:20px}
  .brand-header{width:100%;display:flex;justify-content:center;margin-bottom:8px}
  .brand-header img{max-width:100%;max-height:90px;object-fit:contain}
  .title-bar{border-top:2px solid #059669;border-bottom:2px solid #059669;padding:6px 4px;margin-bottom:14px}
  h1{font-size:15px;margin-bottom:2px;color:#059669}
  p.sub{font-size:10px;color:#666}
  .section-title{font-size:11px;font-weight:bold;color:#374151;margin:14px 0 6px;padding-bottom:3px;border-bottom:1px solid #e5e7eb}
  table.lancamentos{width:100%;border-collapse:collapse;margin-bottom:4px}
  table.lancamentos th{background:#f3f4f6;color:#374151;padding:5px 8px;text-align:left;font-size:10px;border-bottom:1px solid #d1d5db}
  table.lancamentos td{padding:4px 8px;border-bottom:1px solid #f3f4f6;font-size:10px;vertical-align:top}
  table.lancamentos tr:last-child td{border-bottom:none}
  .totais-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin:14px 0}
  .total-card{border-radius:6px;padding:10px 12px;text-align:center}
  .total-card .label{font-size:9px;color:#6b7280;margin-bottom:4px;text-transform:uppercase;letter-spacing:0.5px}
  .total-card .value{font-size:16px;font-weight:bold}
  .card-e{background:#ecfdf5;border:1px solid #a7f3d0}
  .card-s{background:#fef2f2;border:1px solid #fecaca}
  .card-d{background:#eff6ff;border:1px solid #bfdbfe}
  table.formas{font-size:10px;border-collapse:collapse}
  table.formas td{vertical-align:top}
  .formas-wrap{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:8px}
  .assinatura-section{margin-top:28px;page-break-inside:avoid}
  .assinatura-box{display:flex;gap:40px;align-items:flex-end;margin-top:12px;flex-wrap:wrap}
  .assinatura-campo{flex:1;min-width:200px}
  .assinatura-linha{border-bottom:1px solid #374151;margin-bottom:4px;height:32px}
  .assinatura-label{font-size:9px;color:#6b7280;text-align:center}
  .footer{margin-top:16px;font-size:9px;color:#9ca3af;text-align:right;border-top:1px solid #f3f4f6;padding-top:6px}
  @media print{body{padding:8px}.no-print{display:none}table.lancamentos td,table.lancamentos th{font-size:9px}}
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
    <div style="font-size:9px;color:#6b7280;margin-top:2px">${entradas.length} lançamento(s)</div>
  </div>
  <div class="total-card card-s">
    <div class="label">Saídas</div>
    <div class="value" style="color:#dc2626">${fmtMoeda(totalSaidas)}</div>
    <div style="font-size:9px;color:#6b7280;margin-top:2px">${saidas.length} lançamento(s)</div>
  </div>
  <div class="total-card card-d">
    <div class="label">Saldo do Dia</div>
    <div class="value" style="color:${saldoCor}">${fmtMoeda(saldo)}</div>
  </div>
</div>

<!-- Formas de pagamento -->
${(formasEntrada.length > 0 || formasSaida.length > 0) ? `
<div class="section-title">Resumo por Forma de Pagamento</div>
<div class="formas-wrap">
  ${formasEntrada.length > 0 ? `
  <div>
    <div style="font-size:10px;font-weight:bold;color:#059669;margin-bottom:4px">Entradas</div>
    <table class="formas">
      ${rowsFormas(formasEntrada)}
    </table>
  </div>` : ''}
  ${formasSaida.length > 0 ? `
  <div>
    <div style="font-size:10px;font-weight:bold;color:#dc2626;margin-bottom:4px">Saídas</div>
    <table class="formas">
      ${rowsFormas(formasSaida)}
    </table>
  </div>` : ''}
</div>` : ''}

<!-- Entradas -->
<div class="section-title">Entradas (${entradas.length})</div>
<table class="lancamentos">
  <thead>
    <tr>
      <th>Categoria</th><th>Membro / Beneficiário</th><th>Descrição</th><th>Forma</th><th style="text-align:right">Valor</th>
    </tr>
  </thead>
  <tbody>
    ${rowsLancamentos(entradas, '#059669')}
    <tr style="background:#ecfdf5">
      <td colspan="4" style="font-weight:bold;text-align:right;padding:5px 8px">Total Entradas</td>
      <td style="font-weight:bold;text-align:right;color:#059669;padding:5px 8px">${fmtMoeda(totalEntradas)}</td>
    </tr>
  </tbody>
</table>

<!-- Saídas -->
<div class="section-title">Saídas (${saidas.length})</div>
<table class="lancamentos">
  <thead>
    <tr>
      <th>Categoria</th><th>Membro / Beneficiário</th><th>Descrição</th><th>Forma</th><th style="text-align:right">Valor</th>
    </tr>
  </thead>
  <tbody>
    ${rowsLancamentos(saidas, '#dc2626')}
    <tr style="background:#fef2f2">
      <td colspan="4" style="font-weight:bold;text-align:right;padding:5px 8px">Total Saídas</td>
      <td style="font-weight:bold;text-align:right;color:#dc2626;padding:5px 8px">${fmtMoeda(totalSaidas)}</td>
    </tr>
  </tbody>
</table>

<!-- Assinatura -->
<div class="assinatura-section">
  <div class="section-title">Declaração e Assinatura</div>
  <p style="font-size:10px;color:#374151;margin-bottom:12px">
    Declaro que os lançamentos acima são verdadeiros e conferem com os valores recebidos e pagos nesta data.
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
    <div class="assinatura-campo" style="max-width:140px">
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
