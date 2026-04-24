import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { Member } from '../../../types'
import { openPrintWindow } from '../../print'

export interface PrintListOptions {
  pageTitle: string
  pageSub?: string
  rows: Array<Record<string, string>>
  headers: string[]
  filtersSummary: string[]
}

export function printMembrosList({ pageTitle, pageSub, rows, headers, filtersSummary }: PrintListOptions) {
  const dateStr = format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })

  const filterBlock = filtersSummary.length > 0
    ? `<div class="filters">
        <p class="filter-title">Filtros aplicados:</p>
        ${filtersSummary.map(l => `<p class="filter-item">• ${l}</p>`).join('')}
       </div>`
    : ''

  const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"/><title>${pageTitle}</title>
    <style>
      *{box-sizing:border-box;margin:0;padding:0}
      body{font-family:Arial,sans-serif;font-size:11px;color:#111;padding:20px}
      .brand-header{width:100%;display:flex;justify-content:center;margin-bottom:8px}
      .brand-header img{max-width:100%;max-height:90px;object-fit:contain}
      .title-bar{border-top:2px solid #1d4ed8;border-bottom:2px solid #1d4ed8;padding:6px 4px;margin-bottom:12px}
      h1{font-size:15px;margin-bottom:2px;color:#1d4ed8}
      p.sub{font-size:10px;color:#666}
      .filters{background:#f0f4ff;border:1px solid #c7d7fb;border-radius:4px;padding:8px 10px;margin-bottom:12px}
      .filter-title{font-size:10px;font-weight:bold;color:#1d4ed8;margin-bottom:4px}
      .filter-item{font-size:10px;color:#374151;margin-bottom:1px}
      table{width:100%;border-collapse:collapse;margin-top:4px}
      th{background:#1d4ed8;color:white;padding:5px 8px;text-align:left;font-size:10px}
      td{padding:4px 8px;border-bottom:1px solid #e5e7eb;font-size:10px}
      tr:nth-child(even) td{background:#f9fafb}
      .footer{margin-top:10px;font-size:9px;color:#9ca3af;text-align:right}
      @media print{body{padding:8px}.no-print{display:none}}
    </style>
    </head><body>
    <div class="no-print" style="margin-bottom:12px;display:flex;gap:8px">
      <button onclick="window.print()" style="background:#1d4ed8;color:white;border:none;padding:6px 16px;border-radius:6px;cursor:pointer;font-size:12px">🖨️ Imprimir</button>
      <button onclick="window.close()" style="background:#f3f4f6;border:1px solid #d1d5db;padding:6px 16px;border-radius:6px;cursor:pointer;font-size:12px">✕ Fechar</button>
    </div>
    <div class="brand-header"><img src="${window.location.origin}/brand/cabecalho.png" alt="AD Piracanjuba" onerror="this.style.display='none'"/></div>
    <div class="title-bar">
      <h1>${pageTitle}</h1>
      <p class="sub">Gerado em ${dateStr} · <strong>${rows.length}</strong> registro(s)${pageSub ? ' · ' + pageSub : ''}</p>
    </div>
    ${filterBlock}
    <table>
      <thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead>
      <tbody>${rows.map(row => `<tr>${headers.map(h => `<td>${row[h] ?? '—'}</td>`).join('')}</tr>`).join('')}</tbody>
    </table>
    <p class="footer">Igreja Digital · ${format(new Date(), 'dd/MM/yyyy HH:mm')}</p>
    </body></html>`

  openPrintWindow(html, `${pageTitle} — Lista`)
}

export function buildFilterSummary(
  search: string,
  activeFilter: string | null,
  quickFiltersLabels: Record<string, string>,
  advSel: Record<string, string>,
  advSim: Record<string, string>,
): string[] {
  const lines: string[] = []
  if (search.trim()) lines.push(`Busca por texto: "${search}"`)
  if (activeFilter) lines.push(`Filtro rápido: ${quickFiltersLabels[activeFilter] ?? activeFilter}`)
  const selLabels: Record<string, string> = {
    status: 'Status', sexo: 'Sexo', estado_civil: 'Estado Civil', tem_filhos: 'Tem filhos',
    escolaridade: 'Escolaridade', titulo: 'Título', funcao: 'Função',
    motivo_entrada: 'Motivo de entrada', motivo_saida: 'Motivo de saída',
    convertido: 'Convertido', batizado_aguas: 'Batizado nas águas', batizado_espirito: 'Batizado no Espírito',
    igreja: 'Igreja',
    nascimento_de: 'Nascimento de', nascimento_ate: 'Nascimento até',
    registro_de: 'Registro de', registro_ate: 'Registro até',
    conversao_de: 'Conversão de', conversao_ate: 'Conversão até',
    casamento_de: 'Casamento de', casamento_ate: 'Casamento até',
    batismo_de: 'Batismo de', batismo_ate: 'Batismo até',
    entrada_de: 'Entrada de', entrada_ate: 'Entrada até',
    idade_min: 'Idade mínima', idade_max: 'Idade máxima',
  }
  const simLabels: Record<string, string> = {
    nome: 'Nome', naturalidade: 'Naturalidade', cpf: 'CPF', profissao: 'Profissão',
    origem_igreja: 'Igreja de origem', email: 'E-mail', telefone: 'Telefone',
    celular: 'Celular', nome_pai: 'Nome do pai', nome_mae: 'Nome da mãe',
    nome_conjuge: 'Nome do cônjuge', endereco: 'Endereço', bairro: 'Bairro', cidade: 'Cidade',
  }
  Object.entries(advSel).forEach(([k, v]) => { if (v) lines.push(`${selLabels[k] ?? k}: ${v}`) })
  Object.entries(advSim).forEach(([k, v]) => { if (v) lines.push(`${simLabels[k] ?? k}: contém "${v}"`) })
  return lines
}

export type { Member }
