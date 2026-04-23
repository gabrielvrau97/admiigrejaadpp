import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { Carteirinha, Member } from '../../types'

function fmt(d?: string) {
  if (!d) return '—'
  try { return format(new Date(d + 'T00:00:00'), 'dd/MM/yyyy', { locale: ptBR }) } catch { return d }
}

export function printCarteirinha(c: Carteirinha, m: Member) {
  const origin = window.location.origin
  const hoje = format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })

  const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"/>
  <title>Carteirinha — ${m.name}</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:Arial,sans-serif;background:#f3f4f6;padding:18px;color:#111}
    .page{display:flex;gap:20px;justify-content:center;align-items:flex-start;flex-wrap:wrap}
    .card{
      width:86mm;height:54mm;
      border-radius:4mm;
      overflow:hidden;
      box-shadow:0 4px 16px rgba(0,0,0,0.15);
      position:relative;
      page-break-inside:avoid;
    }
    .front{
      background:linear-gradient(135deg,#1e3a8a 0%,#2563eb 60%,#4f46e5 100%);
      color:#fff;
      padding:3mm 4mm;
      display:flex;
      flex-direction:column;
    }
    .front::before{
      content:"";
      position:absolute;right:-10mm;top:-10mm;
      width:35mm;height:35mm;
      border-radius:50%;
      background:rgba(255,255,255,0.08);
    }
    .front::after{
      content:"";
      position:absolute;right:-5mm;bottom:-8mm;
      width:22mm;height:22mm;
      border-radius:50%;
      background:rgba(255,255,255,0.05);
    }
    .front-header{
      display:flex;align-items:center;gap:2mm;
      border-bottom:0.3mm solid rgba(255,255,255,0.3);
      padding-bottom:1.5mm;
      position:relative;z-index:2;
    }
    .front-header img{height:9mm;width:auto;filter:brightness(0) invert(1);opacity:.95}
    .front-header .titles{flex:1;min-width:0}
    .front-header .t1{font-size:2.1mm;font-weight:bold;letter-spacing:0.15mm;opacity:.85;text-transform:uppercase}
    .front-header .t2{font-size:2.6mm;font-weight:bold;margin-top:0.4mm}
    .front-body{flex:1;display:flex;gap:3mm;margin-top:2mm;position:relative;z-index:2}
    .photo{
      width:17mm;height:22mm;
      border-radius:1.5mm;
      background:linear-gradient(135deg,#fff 0%,#dbeafe 100%);
      display:flex;align-items:center;justify-content:center;
      color:#1d4ed8;font-size:10mm;font-weight:bold;
      box-shadow:0 1mm 2mm rgba(0,0,0,0.15);
      flex-shrink:0;
    }
    .info{flex:1;min-width:0;font-size:2.2mm;line-height:1.35}
    .info .nome{font-size:3mm;font-weight:bold;margin-bottom:1mm;text-transform:uppercase;letter-spacing:0.1mm}
    .info .lbl{font-size:1.8mm;opacity:.7;text-transform:uppercase;letter-spacing:0.2mm;font-weight:600}
    .info .val{font-size:2.3mm;margin-bottom:0.7mm}
    .front-footer{
      position:absolute;left:4mm;right:4mm;bottom:2mm;
      display:flex;justify-content:space-between;align-items:flex-end;
      font-size:1.9mm;opacity:.85;z-index:2;
    }
    .front-footer .num{font-family:monospace;font-weight:bold;font-size:2.2mm}

    .back{
      background:#fff;
      border:1px solid #e5e7eb;
      padding:3mm 4mm;
      font-size:2mm;line-height:1.4;
      display:flex;flex-direction:column;
      color:#374151;
    }
    .back-title{
      font-size:2.4mm;font-weight:bold;color:#1d4ed8;
      text-align:center;border-bottom:0.3mm solid #dbeafe;padding-bottom:1mm;margin-bottom:1.5mm;
      text-transform:uppercase;letter-spacing:0.2mm;
    }
    .back-row{display:flex;justify-content:space-between;margin-bottom:0.7mm}
    .back-row .k{color:#6b7280;font-size:1.9mm;font-weight:600;text-transform:uppercase;letter-spacing:0.1mm}
    .back-row .v{color:#111;font-size:2.1mm;text-align:right}
    .back-foot{
      margin-top:auto;
      border-top:0.3mm solid #e5e7eb;
      padding-top:1.5mm;
      text-align:center;
      font-size:1.7mm;color:#9ca3af;
    }
    .signatures{
      margin-top:2mm;
      display:flex;gap:3mm;
    }
    .signatures .sig{
      flex:1;text-align:center;
      border-top:0.3mm solid #374151;padding-top:0.5mm;
      font-size:1.8mm;color:#6b7280;
    }

    @media print{
      body{background:#fff;padding:0}
      .no-print{display:none!important}
      .page{padding:4mm}
      @page{size:A4;margin:6mm}
    }
  </style>
  </head><body>
    <div class="no-print" style="margin-bottom:14px;display:flex;align-items:center;gap:8px;background:#f0f4ff;border:1px solid #c7d7fb;border-radius:6px;padding:8px 12px;max-width:800px;margin-left:auto;margin-right:auto">
      <span style="font-size:12px;color:#1d4ed8;font-weight:600">🪪 Carteirinha — ${m.name}</span>
      <button onclick="window.print()" style="background:#1d4ed8;color:white;border:none;padding:6px 16px;border-radius:5px;cursor:pointer;font-size:12px;margin-left:auto">🖨️ Imprimir</button>
      <button onclick="window.close()" style="background:#f3f4f6;border:1px solid #d1d5db;padding:6px 16px;border-radius:5px;cursor:pointer;font-size:12px">✕ Fechar</button>
    </div>

    <div class="page">
      <!-- FRENTE -->
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

      <!-- VERSO -->
      <div class="card back">
        <div class="back-title">Dados do Membro</div>
        <div class="back-row"><span class="k">Nascimento</span><span class="v">${fmt(m.birth_date)}</span></div>
        <div class="back-row"><span class="k">Identidade</span><span class="v">${m.identity ?? '—'}</span></div>
        <div class="back-row"><span class="k">Data de entrada</span><span class="v">${fmt(m.entry_date)}</span></div>
        <div class="back-row"><span class="k">Batismo águas</span><span class="v">${fmt(m.baptism_date)}</span></div>
        <div class="back-row"><span class="k">Título</span><span class="v">${m.ministry?.titles?.[0] ?? '—'}</span></div>

        <div class="signatures">
          <div class="sig">Pastor</div>
          <div class="sig">Secretário(a)</div>
        </div>

        <div class="back-foot">Emitida em ${hoje} · Documento de identificação eclesiástica</div>
      </div>
    </div>
  </body></html>`

  const win = window.open('', '_blank')
  if (!win) return
  win.document.write(html)
  win.document.close()
  win.focus()
}
