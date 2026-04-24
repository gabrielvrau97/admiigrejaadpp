import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { Carteirinha, Member } from '../../types'

function fmt(d?: string) {
  if (!d) return '—'
  try { return format(new Date(d + 'T00:00:00'), 'dd/MM/yyyy', { locale: ptBR }) } catch { return d }
}

// ── CSS compartilhado ─────────────────────────────────────────────────────
const sharedStyles = (origin: string) => `
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:Arial,sans-serif;background:#f3f4f6;color:#111}

  /* Cada carteirinha: 86x54mm (padrão ISO/IEC 7810 ID-1) */
  .card{
    width:86mm;height:54mm;
    border-radius:3mm;
    overflow:hidden;
    position:relative;
    page-break-inside:avoid;
    break-inside:avoid;
  }
  .card.front{
    background:linear-gradient(135deg,#1e3a8a 0%,#2563eb 60%,#4f46e5 100%);
    color:#fff;
    padding:2.5mm 3.5mm;
    display:flex;
    flex-direction:column;
  }
  .card.front::before{
    content:"";position:absolute;right:-10mm;top:-10mm;
    width:32mm;height:32mm;border-radius:50%;
    background:rgba(255,255,255,0.08);
  }
  .card.front::after{
    content:"";position:absolute;right:-5mm;bottom:-8mm;
    width:20mm;height:20mm;border-radius:50%;
    background:rgba(255,255,255,0.05);
  }
  .front-header{
    display:flex;align-items:center;gap:1.8mm;
    border-bottom:0.3mm solid rgba(255,255,255,0.3);
    padding-bottom:1.2mm;
    position:relative;z-index:2;
  }
  .front-header img{height:8mm;width:auto;filter:brightness(0) invert(1);opacity:.95}
  .front-header .titles{flex:1;min-width:0}
  .front-header .t1{font-size:1.9mm;font-weight:bold;letter-spacing:0.1mm;opacity:.85;text-transform:uppercase}
  .front-header .t2{font-size:2.4mm;font-weight:bold;margin-top:0.3mm}
  .front-body{flex:1;display:flex;gap:2.5mm;margin-top:1.5mm;position:relative;z-index:2}
  .photo{
    width:15mm;height:20mm;
    border-radius:1.2mm;
    background:linear-gradient(135deg,#fff 0%,#dbeafe 100%);
    display:flex;align-items:center;justify-content:center;
    color:#1d4ed8;font-size:9mm;font-weight:bold;
    box-shadow:0 0.8mm 1.5mm rgba(0,0,0,0.15);
    flex-shrink:0;
  }
  .info{flex:1;min-width:0;line-height:1.3}
  .info .nome{font-size:2.6mm;font-weight:bold;margin-bottom:0.8mm;text-transform:uppercase;letter-spacing:0.08mm;line-height:1.15}
  .info .lbl{font-size:1.6mm;opacity:.7;text-transform:uppercase;letter-spacing:0.15mm;font-weight:600}
  .info .val{font-size:2mm;margin-bottom:0.5mm}
  .front-footer{
    position:absolute;left:3.5mm;right:3.5mm;bottom:1.8mm;
    display:flex;justify-content:space-between;align-items:flex-end;
    font-size:1.7mm;opacity:.85;z-index:2;
  }
  .front-footer .num{font-family:monospace;font-weight:bold;font-size:2mm}

  .card.back{
    background:#fff;
    border:1px solid #e5e7eb;
    padding:2.5mm 3.5mm;
    font-size:1.9mm;line-height:1.35;
    display:flex;flex-direction:column;
    color:#374151;
  }
  .back-title{
    font-size:2.2mm;font-weight:bold;color:#1d4ed8;
    text-align:center;border-bottom:0.3mm solid #dbeafe;padding-bottom:0.8mm;margin-bottom:1.2mm;
    text-transform:uppercase;letter-spacing:0.15mm;
  }
  .back-row{display:flex;justify-content:space-between;margin-bottom:0.6mm}
  .back-row .k{color:#6b7280;font-size:1.7mm;font-weight:600;text-transform:uppercase;letter-spacing:0.08mm}
  .back-row .v{color:#111;font-size:1.9mm;text-align:right}
  .back-foot{
    margin-top:auto;
    border-top:0.3mm solid #e5e7eb;
    padding-top:1.2mm;
    text-align:center;
    font-size:1.5mm;color:#9ca3af;
  }
  .signatures{margin-top:1.5mm;display:flex;gap:2.5mm}
  .signatures .sig{
    flex:1;text-align:center;
    border-top:0.3mm solid #374151;padding-top:0.4mm;
    font-size:1.6mm;color:#6b7280;
  }

  /* Layout individual (frente + verso lado a lado) */
  .single-page{
    padding:18px;
    display:flex;gap:20px;justify-content:center;align-items:flex-start;flex-wrap:wrap;
  }
  .single-page .card{box-shadow:0 4px 16px rgba(0,0,0,0.15)}

  /* Layout de lote: 4 carteirinhas por folha A4 retrato (210x297mm) */
  .sheet{
    width:210mm;height:297mm;
    padding:10mm;
    background:#fff;
    display:grid;
    grid-template-columns:repeat(2, 86mm);
    grid-template-rows:repeat(4, 54mm);
    gap:6mm 10mm;
    justify-content:center;
    align-content:start;
    page-break-after:always;
    break-after:page;
  }
  .sheet .card{box-shadow:none;border:0.2mm dashed #cbd5e1}

  .no-print{max-width:900px;margin:0 auto 14px;display:flex;align-items:center;gap:8px;background:#f0f4ff;border:1px solid #c7d7fb;border-radius:6px;padding:8px 12px}
  .no-print button{background:#1d4ed8;color:white;border:none;padding:6px 16px;border-radius:5px;cursor:pointer;font-size:12px}
  .no-print button.close{background:#f3f4f6;border:1px solid #d1d5db;color:#111}

  @media print{
    body{background:#fff}
    .no-print{display:none!important}
    .single-page{padding:4mm}
    .single-page .card{box-shadow:none}
    .sheet{padding:10mm;margin:0}
    .sheet .card{border:0.2mm dashed #cbd5e1}
    @page{size:A4;margin:0}
  }

  /* Referência a variáveis (fica aqui pra não quebrar nada) */
  .brand-ref{display:none;--origin:url(${origin}/brand/logo.png)}
`

// ── Construtores de HTML de 1 carteirinha ─────────────────────────────────
function buildFrente(c: Carteirinha, m: Member, origin: string): string {
  return `
    <div class="card front">
      <div class="front-header">
        <img src="${origin}/brand/logo.png" alt="ADP"/>
        <div class="titles">
          <div class="t1">Assembleia de Deus</div>
          <div class="t2">Igreja Digital · ADP</div>
        </div>
      </div>
      <div class="front-body">
        <div class="photo">${(m.name ?? '?')[0]}</div>
        <div class="info">
          <div class="nome">${m.name ?? '—'}</div>
          <div class="lbl">CPF</div>
          <div class="val">${m.cpf ?? '—'}</div>
          <div class="lbl">Igreja</div>
          <div class="val">${m.church?.name ?? '—'}</div>
        </div>
      </div>
      <div class="front-footer">
        <span>Validade: <strong>${fmt(c.valida_ate)}</strong></span>
        <span class="num">${c.numero}</span>
      </div>
    </div>
  `
}

function buildVerso(c: Carteirinha, m: Member, hoje: string): string {
  return `
    <div class="card back">
      <div class="back-title">Dados do Membro</div>
      <div class="back-row"><span class="k">Nascimento</span><span class="v">${fmt(m.birth_date)}</span></div>
      <div class="back-row"><span class="k">Identidade</span><span class="v">${m.identity ?? '—'}</span></div>
      <div class="back-row"><span class="k">Entrada</span><span class="v">${fmt(m.entry_date)}</span></div>
      <div class="back-row"><span class="k">Batismo</span><span class="v">${fmt(m.baptism_date)}</span></div>
      <div class="back-row"><span class="k">Título</span><span class="v">${m.ministry?.titles?.[0] ?? '—'}</span></div>
      <div class="signatures">
        <div class="sig">Pastor</div>
        <div class="sig">Secretário(a)</div>
      </div>
      <div class="back-foot">Emitida em ${hoje}</div>
    </div>
  `
}

// ── Impressão INDIVIDUAL (frente + verso lado a lado) ─────────────────────
export function printCarteirinha(c: Carteirinha, m: Member) {
  const origin = window.location.origin
  const hoje = format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })

  const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"/>
  <title>Carteirinha — ${m.name}</title>
  <style>${sharedStyles(origin)}</style>
  </head><body>
    <div class="no-print">
      <span style="font-size:12px;color:#1d4ed8;font-weight:600">🪪 Carteirinha — ${m.name}</span>
      <button onclick="window.print()" style="margin-left:auto">🖨️ Imprimir</button>
      <button class="close" onclick="window.close()">✕ Fechar</button>
    </div>
    <div class="single-page">
      ${buildFrente(c, m, origin)}
      ${buildVerso(c, m, hoje)}
    </div>
  </body></html>`

  const win = window.open('', '_blank')
  if (!win) return
  win.document.write(html)
  win.document.close()
  win.focus()
}

// ── Impressão em LOTE: 4 carteirinhas por folha A4 retrato ────────────────
// Layout: 2 colunas × 4 linhas = 8 slots por folha, mas usamos 4 carteirinhas
// com frente + verso alternados (frente impressa, próxima folha verso na
// mesma posição — ideal para impressão frente-e-verso manual).
// Para simplificar e manter UX direta, optamos por: 4 FRENTES por folha,
// e os VERSOS ficam em folhas separadas posicionados na mesma ordem.
export function printCarteirinhasLote(items: Array<{ c: Carteirinha; m: Member }>) {
  if (items.length === 0) return
  const origin = window.location.origin
  const hoje = format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })

  // Agrupa em folhas de 4
  const folhas: Array<Array<{ c: Carteirinha; m: Member }>> = []
  for (let i = 0; i < items.length; i += 4) {
    folhas.push(items.slice(i, i + 4))
  }

  const sheetsHtml = folhas.map(grupo => {
    const frentes = grupo.map(({ c, m }) => buildFrente(c, m, origin)).join('')
    // Preenche slots vazios para manter o grid fixo
    const slotsVazios = 4 - grupo.length
    const preenchedoresFrente = Array(slotsVazios).fill('<div></div>').join('')

    const versos = grupo.map(({ c, m }) => buildVerso(c, m, hoje)).join('')
    const preenchedoresVerso = Array(slotsVazios).fill('<div></div>').join('')

    return `
      <div class="sheet">${frentes}${preenchedoresFrente}</div>
      <div class="sheet">${versos}${preenchedoresVerso}</div>
    `
  }).join('')

  const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"/>
  <title>Carteirinhas em lote (${items.length})</title>
  <style>${sharedStyles(origin)}
    .sheet{box-shadow:0 4px 16px rgba(0,0,0,0.1);margin:0 auto 20px}
    @media print{.sheet{box-shadow:none;margin:0}}
  </style>
  </head><body>
    <div class="no-print">
      <span style="font-size:12px;color:#1d4ed8;font-weight:600">🪪 Carteirinhas em lote · ${items.length} ${items.length === 1 ? 'carteirinha' : 'carteirinhas'} · 4 por folha A4</span>
      <button onclick="window.print()" style="margin-left:auto">🖨️ Imprimir</button>
      <button class="close" onclick="window.close()">✕ Fechar</button>
    </div>
    <p style="max-width:900px;margin:0 auto 12px;font-size:11px;color:#6b7280">
      💡 A impressão gera folhas alternadas: folhas ímpares com as frentes, folhas pares com os versos
      (na mesma ordem). Para frente-e-verso manual, recoloque o papel na mesma ordem.
    </p>
    ${sheetsHtml}
  </body></html>`

  const win = window.open('', '_blank')
  if (!win) return
  win.document.write(html)
  win.document.close()
  win.focus()
}
