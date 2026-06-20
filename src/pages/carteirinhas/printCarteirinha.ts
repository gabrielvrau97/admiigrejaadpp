import type { Carteirinha, Member } from '../../types'
import { openPrintWindow } from '../../lib/print'
import { fmtDate } from '../../lib/format'

const fmt = (d?: string | null) => fmtDate(d) || ''

// ── Coordenadas de impressão (overlay sobre folha A4 pré-impressa) ──────────
// A folha já tem o fundo/design e os campos desenhados. Aqui só "carimbamos"
// os dados nas posições exatas. 4 credenciais empilhadas por folha A4 retrato.
//
// X = distância da BORDA ESQUERDA (cm) — igual para as 4 credenciais.
// Y = distância do TOPO da folha (cm) — uma por credencial (1ª, 2ª, 3ª, 4ª).

const X = {
  nome:       1.5,
  funcao:     3.5,
  filiacao:   11,
  emissao:    11,
  igreja:     11,
  validade:   14,
  codigo:     17.5,
  nascimento: 1.5,
  cpf:        7.5,
  assinatura: 13.5,
} as const

const Y: Record<keyof typeof X, [number, number, number, number]> = {
  nome:       [6.2, 12.6, 19.1, 25.6],
  funcao:     [5,   11.5, 18,   24.5],
  filiacao:   [3.2, 9.6,  16.2, 22.8],
  emissao:    [5.2, 11.7, 18.2, 24.7],
  igreja:     [6.5, 13,   19.5, 26],
  validade:   [5.2, 11.7, 18.2, 24.7],
  codigo:     [5.2, 11.7, 18.2, 24.7],
  nascimento: [7.5, 14,   20.5, 27],
  cpf:        [7.5, 14,   20.5, 27],
  assinatura: [7,   13.5, 20.2, 27],
}

// Linhas-guia para corte entre as credenciais (1|2|3|4)
const SEPARADORES = [8.5, 15, 21.5] // cm a partir do topo

const styles = `
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:Arial,Helvetica,sans-serif;background:#e8e8e8;color:#000}

  .sheet{
    position:relative;
    width:210mm;height:297mm;
    background:#fff;
    overflow:hidden;
    page-break-after:always;
    break-after:page;
  }
  .sheet:last-of-type{page-break-after:auto;break-after:auto}

  /* Campo de dado posicionado em cm sobre a folha */
  .fld{
    position:absolute;
    white-space:nowrap;
    font-size:10pt;
    line-height:1;
    color:#000;
  }
  .fld.nome{font-size:10pt;font-weight:bold;text-transform:uppercase;letter-spacing:.2pt;white-space:normal;max-width:9.5cm;line-height:1.1}
  .fld.codigo{font-family:'Courier New',monospace;font-weight:bold;font-size:9.5pt}
  .fld.funcao{font-weight:bold;text-transform:uppercase;letter-spacing:.2pt}
  .fld.sig img{height:18mm;width:auto;object-fit:contain;display:block}

  /* Linhas de corte */
  .sep{
    position:absolute;left:8mm;right:8mm;
    border-top:0.3mm dashed #c7c7c7;
  }

  .no-print{
    max-width:900px;margin:0 auto 14px;display:flex;align-items:center;gap:8px;
    background:#f0f4ff;border:1px solid #c7d7fb;border-radius:6px;padding:8px 12px
  }
  .no-print button{background:#1d4ed8;color:white;border:none;padding:6px 16px;border-radius:5px;cursor:pointer;font-size:12px}
  .no-print button.close{background:#f3f4f6;border:1px solid #d1d5db;color:#111}

  @media screen{
    .sheet{box-shadow:0 4px 16px rgba(0,0,0,.15);margin:0 auto 20px;outline:1px solid #e2e8f0}
  }
  @media print{
    body{background:#fff}
    .no-print{display:none!important}
    .sheet{box-shadow:none;margin:0;outline:none}
    @page{size:A4 portrait;margin:0}
  }
`

// Gera o overlay de UMA credencial na posição `i` (0..3) da folha
function buildCredencial(c: Carteirinha, m: Member, i: number, origin: string): string {
  const filiacao = [m.family?.mother_name, m.family?.father_name].filter(Boolean).join('<br>')
  const funcao = m.ministry?.functions?.[0] ?? m.ministry?.titles?.[0] ?? ''
  const assinaturaUrl = `${origin}/brand/assinatura-pastor.png`

  const campo = (cls: keyof typeof X, valor: string) =>
    valor
      ? `<div class="fld ${cls}" style="left:${X[cls]}cm;top:${Y[cls][i]}cm">${valor}</div>`
      : ''

  return [
    campo('nome',       m.name ?? ''),
    campo('funcao',     funcao),
    campo('filiacao',   filiacao),
    campo('emissao',    fmt(c.emitida_em)),
    campo('igreja',     m.church?.name ?? ''),
    campo('validade',   fmt(c.valida_ate)),
    campo('codigo',     c.numero ?? ''),
    campo('nascimento', fmt(m.birth_date)),
    campo('cpf',        m.cpf ?? ''),
    `<div class="fld sig" style="left:${X.assinatura}cm;top:${Y.assinatura[i]}cm">
       <img src="${assinaturaUrl}" alt="" onerror="this.style.display='none'"/>
     </div>`,
  ].join('')
}

function buildSeparadores(): string {
  return SEPARADORES.map(cm => `<div class="sep" style="top:${cm}cm"></div>`).join('')
}

function buildSheet(grupo: Array<{ c: Carteirinha; m: Member }>, origin: string): string {
  const campos = grupo.map(({ c, m }, i) => buildCredencial(c, m, i, origin)).join('')
  return `<div class="sheet">${buildSeparadores()}${campos}</div>`
}

function wrap(title: string, info: string, sheets: string): string {
  return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"/>
  <title>${title}</title>
  <style>${styles}</style>
  </head><body>
    <div class="no-print">
      <span style="font-size:12px;color:#1d4ed8;font-weight:600">🪪 ${info}</span>
      <button onclick="window.print()" style="margin-left:auto">🖨️ Imprimir</button>
      <button class="close" onclick="window.close()">✕ Fechar</button>
    </div>
    ${sheets}
  </body></html>`
}

// ── Impressão INDIVIDUAL: 1 credencial na posição 1 da folha ───────────────
export function printCarteirinha(c: Carteirinha, m: Member) {
  const origin = window.location.origin
  const sheet = buildSheet([{ c, m }], origin)
  openPrintWindow(wrap(`Credencial — ${m.name}`, `Credencial — ${m.name}`, sheet), `Credencial — ${m.name}`)
}

// ── Impressão em LOTE: até 4 credenciais por folha A4 ──────────────────────
export function printCarteirinhasLote(items: Array<{ c: Carteirinha; m: Member }>) {
  if (items.length === 0) return
  const origin = window.location.origin

  const folhas: Array<Array<{ c: Carteirinha; m: Member }>> = []
  for (let i = 0; i < items.length; i += 4) folhas.push(items.slice(i, i + 4))

  const sheets = folhas.map(grupo => buildSheet(grupo, origin)).join('')
  const info = `Credenciais em lote · ${items.length} ${items.length === 1 ? 'credencial' : 'credenciais'} · 4 por folha A4`
  openPrintWindow(wrap(`Credenciais em lote (${items.length})`, info, sheets), `Credenciais em lote (${items.length})`)
}
