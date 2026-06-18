import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { openPrintWindow } from '../../print'

// ── Tipos dos dados de entrada (montados na GraficosPage) ──────────────────
export interface RelatorioSecretariaData {
  churchLabel: string
  totalActive: number
  totalCadastros: number
  totalVisitantes: number
  novosConvertidos: number
  batizadosAguas: number
  batizadosEspirito: number
  convertidos: number
  igrejasTotal: number
  igrejasSede: number
  igrejasFilial: number
  byChurch: { name: string; total: number; ativos: number; visitantes: number }[]
  byCity: { name: string; value: number }[]
  ageGroups: { name: string; Masculino: number; Feminino: number }[]
  baptismByYear: { name: string; 'Águas': number; 'Espírito': number }[]
  civilData: { name: string; value: number }[]
  ministryData: { name: string; value: number }[]
  titlesData: { name: string; value: number }[]
  genderData: { name: string; value: number }[]
  accompCounts: { comAcomp: number; semAcomp: number; comDiscip: number; semDiscip: number }
  acompanhantesRanking: { name: string; count: number }[]
  discipuladoresRanking: { name: string; count: number }[]
}

const COR = '#2563eb'
const pct = (v: number, total: number) => (total > 0 ? `${Math.round((v / total) * 100)}%` : '0%')
const pctNum = (v: number, total: number) => (total > 0 ? Math.round((v / total) * 100) : 0)

// ── Helpers de bloco ────────────────────────────────────────────────────────
function secao(titulo: string, conteudo: string): string {
  return `<div class="secao"><div class="section-title">${titulo}</div>${conteudo}</div>`
}

function barras(items: { label: string; value: number }[], total: number, cor = COR): string {
  if (items.length === 0) return `<p class="vazio">Nenhum dado registrado.</p>`
  return `<div class="barras">${items.map(({ label, value }) => {
    const w = pctNum(value, total)
    return `
      <div class="bar-row">
        <div class="bar-head"><span class="bar-label">${label}</span><span class="bar-val">${value} <span class="bar-pct">(${w}%)</span></span></div>
        <div class="bar-track"><div class="bar-fill" style="width:${w}%;background:${cor}"></div></div>
      </div>`
  }).join('')}</div>`
}

function tabela(headers: string[], rows: (string | number)[][], aligns: ('l' | 'c' | 'r')[] = []): string {
  const al = (i: number) => (aligns[i] === 'r' ? 'right' : aligns[i] === 'c' ? 'center' : 'left')
  const thead = headers.map((h, i) => `<th style="text-align:${al(i)}">${h}</th>`).join('')
  const tbody = rows.length === 0
    ? `<tr><td colspan="${headers.length}" class="vazio">Nenhum dado registrado.</td></tr>`
    : rows.map(r => `<tr>${r.map((c, i) => `<td style="text-align:${al(i)}">${c}</td>`).join('')}</tr>`).join('')
  return `<table class="tbl"><thead><tr>${thead}</tr></thead><tbody>${tbody}</tbody></table>`
}

// ─────────────────────────────────────────────────────────────────────────────
export function printRelatorioSecretaria(d: RelatorioSecretariaData) {
  const origin = window.location.origin
  const agora = new Date()
  const dateStr = format(agora, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
  const dateShort = format(agora, 'dd/MM/yyyy', { locale: ptBR })
  const geradoEm = format(agora, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })

  // ── Seções de conteúdo ─────────────────────────────────────────────────────
  const kpis = `
    <div class="kpis">
      <div class="kpi kpi-b">
        <div class="kpi-label">Membros Ativos</div>
        <div class="kpi-val">${d.totalActive}</div>
        <div class="kpi-sub">de ${d.totalCadastros} cadastros</div>
      </div>
      <div class="kpi kpi-r">
        <div class="kpi-label">Visitantes</div>
        <div class="kpi-val">${d.totalVisitantes}</div>
        <div class="kpi-sub">${d.novosConvertidos} novos convertidos</div>
      </div>
      <div class="kpi kpi-p">
        <div class="kpi-label">Batizados (águas)</div>
        <div class="kpi-val">${d.batizadosAguas}</div>
        <div class="kpi-sub">${pct(d.batizadosAguas, d.totalActive)} dos ativos</div>
      </div>
      <div class="kpi kpi-g">
        <div class="kpi-label">Igrejas</div>
        <div class="kpi-val">${d.igrejasTotal}</div>
        <div class="kpi-sub">${d.igrejasSede} sede · ${d.igrejasFilial} filiais</div>
      </div>
    </div>`

  const espiritual = secao('Situação Espiritual', barras([
    { label: 'Batizados nas águas', value: d.batizadosAguas },
    { label: 'Batismo no Espírito', value: d.batizadosEspirito },
    { label: 'Convertidos', value: d.convertidos },
  ], d.totalActive, '#7c3aed') + (d.totalVisitantes > 0
    ? barras([{ label: 'Novos convertidos (visitantes)', value: d.novosConvertidos }], d.totalVisitantes, '#f59e0b')
    : ''))

  const porIgreja = secao('Distribuição por Igreja',
    tabela(['Igreja', 'Ativos', 'Visitantes', 'Total'],
      d.byChurch.map(c => [c.name, c.ativos, c.visitantes, c.total]),
      ['l', 'c', 'c', 'r']))

  const porMunicipio = secao('Distribuição por Município (Top 8)',
    barras(d.byCity.map(c => ({ label: c.name, value: c.value })),
      d.byCity.reduce((s, c) => s + c.value, 0), '#f59e0b'))

  const totalPiramide = d.ageGroups.reduce((s, g) => s + g.Masculino + g.Feminino, 0)
  const piramide = secao('Pirâmide Etária (membros ativos)',
    tabela(['Faixa etária', 'Masculino', 'Feminino', 'Total'],
      d.ageGroups.map(g => [g.name, g.Masculino, g.Feminino, g.Masculino + g.Feminino]),
      ['l', 'c', 'c', 'r'])
    + `<p class="nota">Total considerado: ${totalPiramide} membros com data de nascimento registrada.</p>`)

  const masc = d.genderData.find(g => g.name === 'Masculino')?.value ?? 0
  const fem = d.genderData.find(g => g.name === 'Feminino')?.value ?? 0
  const genero = secao('Gênero (membros ativos)', barras([
    { label: 'Masculino', value: masc },
    { label: 'Feminino', value: fem },
  ], masc + fem, '#3b82f6'))

  const estadoCivil = secao('Estado Civil (membros ativos)',
    barras(d.civilData.map(c => ({ label: c.name, value: c.value })), d.totalActive, '#06b6d4'))

  const batismos = secao('Histórico de Batismos (últimos anos)',
    tabela(['Ano', 'Águas', 'Espírito'],
      d.baptismByYear.map(b => [b.name, b['Águas'], b['Espírito']]),
      ['l', 'c', 'c']))

  const ministerios = secao('Ministérios (membros ativos)',
    barras(d.ministryData.map(m => ({ label: m.name, value: m.value })), d.totalActive, '#06b6d4'))

  const titulos = secao('Títulos Ministeriais (Top 10)',
    barras(d.titlesData.map(t => ({ label: t.name, value: t.value })), d.totalActive, '#8b5cf6'))

  const a = d.accompCounts
  const acompanhamento = secao('Acompanhamento e Discipulado', `
    <div class="mini-kpis">
      <div class="mini-kpi"><div class="mk-val" style="color:#3b82f6">${a.comAcomp}</div><div class="mk-lbl">Acompanhados <span>(${pct(a.comAcomp, d.totalActive)})</span></div></div>
      <div class="mini-kpi"><div class="mk-val" style="color:#f59e0b">${a.semAcomp}</div><div class="mk-lbl">Sem acompanhante <span>(${pct(a.semAcomp, d.totalActive)})</span></div></div>
      <div class="mini-kpi"><div class="mk-val" style="color:#8b5cf6">${a.comDiscip}</div><div class="mk-lbl">Discipulados <span>(${pct(a.comDiscip, d.totalActive)})</span></div></div>
      <div class="mini-kpi"><div class="mk-val" style="color:#ef4444">${a.semDiscip}</div><div class="mk-lbl">Sem discipulador <span>(${pct(a.semDiscip, d.totalActive)})</span></div></div>
    </div>
    <div class="duas-colunas">
      <div>
        <div class="sub-title">Top Acompanhantes</div>
        ${tabela(['#', 'Nome', 'Membros'],
          d.acompanhantesRanking.map((r, i) => [i + 1, r.name, r.count]), ['c', 'l', 'r'])}
      </div>
      <div>
        <div class="sub-title">Top Discipuladores</div>
        ${tabela(['#', 'Nome', 'Membros'],
          d.discipuladoresRanking.map((r, i) => [i + 1, r.name, r.count]), ['c', 'l', 'r'])}
      </div>
    </div>`)

  const assinaturas = `
    <div class="assinatura-section">
      <div class="section-title">Conferência e Assinaturas</div>
      <p class="declaracao">
        Declaro que as informações constantes neste relatório refletem os dados cadastrais
        da secretaria na data de emissão.
      </p>
      <div class="ass-pastor">
        <img src="${origin}/brand/assinatura-pastor.png" alt="" onerror="this.style.display='none'"/>
        <div class="ass-linha"></div>
        <div class="ass-label"><strong>Gilson Marcos S. da Silva</strong><br/>Pastor Presidente</div>
      </div>
      <div class="ass-grid3">
        <div class="ass-campo"><div class="ass-linha"></div><div class="ass-label">Secretário(a)</div></div>
        <div class="ass-campo"><div class="ass-linha"></div><div class="ass-label">Secretário(a)</div></div>
        <div class="ass-campo"><div class="ass-linha"></div><div class="ass-label">Secretário(a)</div></div>
      </div>
    </div>`

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8"/>
<title>Relatório da Secretaria — ${dateShort}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  body{font-family:Arial,sans-serif;font-size:11px;color:#111;padding:22px;max-width:760px;margin:0 auto}

  .brand-header{width:100%;display:flex;justify-content:center;margin-bottom:8px}
  .brand-header img{max-width:100%;max-height:90px;object-fit:contain}
  .title-bar{border-top:2px solid ${COR};border-bottom:2px solid ${COR};padding:7px 4px;margin-bottom:18px}
  h1{font-size:16px;margin-bottom:2px;color:${COR}}
  .title-bar .sub{font-size:10px;color:#666}

  .kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:20px}
  .kpi{border-radius:7px;padding:11px;text-align:center}
  .kpi-label{font-size:9px;text-transform:uppercase;letter-spacing:.4px;opacity:.75;margin-bottom:4px}
  .kpi-val{font-size:22px;font-weight:bold;line-height:1}
  .kpi-sub{font-size:8.5px;opacity:.7;margin-top:4px}
  .kpi-b{background:#eff6ff;border:1px solid #bfdbfe;color:#1d4ed8}
  .kpi-r{background:#fff1f2;border:1px solid #fecdd3;color:#be123c}
  .kpi-p{background:#f5f3ff;border:1px solid #ddd6fe;color:#6d28d9}
  .kpi-g{background:#ecfdf5;border:1px solid #a7f3d0;color:#047857}

  .secao{margin-bottom:18px;page-break-inside:avoid}
  .section-title{font-size:12px;font-weight:bold;color:#1f2937;margin-bottom:8px;padding-bottom:4px;border-bottom:1.5px solid ${COR}33}
  .sub-title{font-size:10.5px;font-weight:bold;color:#374151;margin:4px 0 6px}
  .vazio{color:#9ca3af;font-style:italic;font-size:10px;padding:4px 0}
  .nota{font-size:9px;color:#9ca3af;margin-top:5px}

  .barras{display:flex;flex-direction:column;gap:7px}
  .bar-row{}
  .bar-head{display:flex;justify-content:space-between;font-size:10px;margin-bottom:2px}
  .bar-label{color:#374151}
  .bar-val{font-weight:bold;color:#374151}
  .bar-pct{font-weight:normal;color:#9ca3af}
  .bar-track{height:7px;background:#f1f5f9;border-radius:4px;overflow:hidden}
  .bar-fill{height:100%;border-radius:4px}

  table.tbl{width:100%;border-collapse:collapse;font-size:10px}
  table.tbl thead th{background:#f8fafc;padding:5px 8px;color:#475569;border-bottom:1.5px solid #e2e8f0;font-size:9.5px;text-transform:uppercase;letter-spacing:.3px}
  table.tbl tbody td{padding:4.5px 8px;border-bottom:1px solid #f1f5f9}
  table.tbl tbody tr:nth-child(even) td{background:#fafbfc}

  .mini-kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:12px}
  .mini-kpi{border:1px solid #e5e7eb;border-radius:6px;padding:8px;text-align:center}
  .mk-val{font-size:18px;font-weight:bold;line-height:1}
  .mk-lbl{font-size:8.5px;color:#6b7280;margin-top:3px}
  .mk-lbl span{color:#9ca3af}
  .duas-colunas{display:grid;grid-template-columns:1fr 1fr;gap:14px}

  .assinatura-section{margin-top:30px;page-break-inside:avoid}
  .declaracao{font-size:10px;color:#374151;margin:8px 0 18px}
  .ass-pastor{width:62mm;margin:0 auto 22px;text-align:center;position:relative}
  .ass-pastor img{max-height:15mm;max-width:55mm;object-fit:contain;position:absolute;left:50%;bottom:14px;transform:translateX(-50%)}
  .ass-linha{border-bottom:1px solid #374151;height:30px}
  .ass-label{font-size:9.5px;color:#4b5563;margin-top:4px}
  .ass-label strong{color:#111;font-size:10.5px}
  .ass-grid3{display:grid;grid-template-columns:repeat(3,1fr);gap:28px;margin-top:6px}
  .ass-campo{text-align:center}
  .ass-campo .ass-linha{height:34px}

  .footer{margin-top:18px;font-size:9px;color:#9ca3af;text-align:right;border-top:1px solid #f3f4f6;padding-top:6px}

  .no-print{margin-bottom:14px;display:flex;gap:8px}
  .no-print button{border:none;padding:7px 16px;border-radius:6px;cursor:pointer;font-size:12px}
  .no-print .imp{background:${COR};color:#fff}
  .no-print .fec{background:#f3f4f6;border:1px solid #d1d5db;color:#111}

  @media print{body{padding:10px}.no-print{display:none!important}}
</style>
</head>
<body>

<div class="no-print">
  <button class="imp" onclick="window.print()">🖨️ Imprimir</button>
  <button class="fec" onclick="window.close()">✕ Fechar</button>
</div>

<div class="brand-header">
  <img src="${origin}/brand/cabecalho.png" alt="AD Piracanjuba" onerror="this.style.display='none'"/>
</div>

<div class="title-bar">
  <h1>Relatório Geral da Secretaria</h1>
  <p class="sub">${d.churchLabel} &nbsp;·&nbsp; ${dateStr} &nbsp;·&nbsp; <strong>${d.totalActive}</strong> membros ativos</p>
</div>

${kpis}
${espiritual}
${porIgreja}
${piramide}
${genero}
${estadoCivil}
${porMunicipio}
${batismos}
${ministerios}
${titulos}
${acompanhamento}
${assinaturas}

<div class="footer">Igreja Digital · Relatório gerado em ${geradoEm}</div>

</body>
</html>`

  openPrintWindow(html, `Relatório Secretaria — ${dateShort}`)
}
