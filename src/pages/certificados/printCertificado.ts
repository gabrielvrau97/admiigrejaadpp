import type { Certificado } from '../../types'
import { openPrintWindow } from '../../lib/print'
import { fmtDateLongo as fmtLongo } from '../../lib/format'

const certStyles = `
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:Georgia,'Times New Roman',serif;background:#f3f4f6;padding:20px;color:#111}

  .cert{
    width:297mm;height:210mm;
    margin:0 auto 24px;
    background:#fff;
    position:relative;
    padding:18mm 22mm;
    box-shadow:0 8px 24px rgba(0,0,0,0.15);
    page-break-after:always;
    break-after:page;
  }

  .cert::before{content:"";position:absolute;inset:6mm;border:2px solid #1d4ed8;pointer-events:none}
  .cert::after{content:"";position:absolute;inset:9mm;border:0.5mm solid #1d4ed8;pointer-events:none}

  .corner{
    position:absolute;width:20mm;height:20mm;
    background:radial-gradient(circle at 50% 50%, rgba(29,78,216,0.05) 0%, transparent 70%);
    pointer-events:none;
  }
  .corner.tl{top:9mm;left:9mm}
  .corner.tr{top:9mm;right:9mm;transform:scaleX(-1)}
  .corner.bl{bottom:9mm;left:9mm;transform:scaleY(-1)}
  .corner.br{bottom:9mm;right:9mm;transform:scale(-1,-1)}

  .header{
    display:flex;align-items:center;justify-content:center;gap:8mm;
    padding-bottom:6mm;border-bottom:0.5mm solid #dbeafe;
    margin-bottom:10mm;position:relative;z-index:2;
  }
  .header img{height:22mm;width:auto}
  .header .titles h1{font-size:7mm;font-weight:bold;color:#1d4ed8;letter-spacing:0.5mm;text-transform:uppercase;line-height:1}
  .header .titles p{font-size:3.5mm;color:#4b5563;margin-top:1mm;letter-spacing:0.3mm}

  .main{text-align:center;padding:0 10mm;position:relative;z-index:2}
  .cert-label{font-size:6mm;color:#6b7280;letter-spacing:3mm;text-transform:uppercase;margin-bottom:4mm;font-weight:600}
  .cert-title{font-size:16mm;font-weight:bold;color:#1d4ed8;letter-spacing:2mm;text-transform:uppercase;line-height:1;margin-bottom:8mm;font-family:Georgia,serif}
  .body-text{font-size:5mm;line-height:1.6;color:#1f2937;margin-bottom:4mm}
  .aluno-name{font-size:11mm;font-weight:bold;color:#111;margin:5mm 0;font-style:italic;font-family:Georgia,serif}
  .seminario-name{font-size:7mm;font-weight:bold;color:#1d4ed8;margin:3mm 0;font-family:Georgia,serif}
  .details{display:flex;justify-content:center;gap:10mm;margin-top:6mm;font-size:4mm;color:#4b5563}
  .details strong{color:#111;font-weight:bold}

  .footer{position:absolute;bottom:22mm;left:22mm;right:22mm;display:flex;justify-content:space-between;align-items:flex-end;z-index:2}
  .signature{text-align:center;width:70mm}
  .sign-line{border-top:0.5mm solid #1f2937;padding-top:2mm;font-size:3.5mm;font-weight:bold;color:#1f2937;letter-spacing:0.3mm}
  .sign-role{font-size:3mm;color:#6b7280;margin-top:0.5mm}

  .cert-num{font-family:monospace;font-size:3mm;color:#6b7280;letter-spacing:0.5mm;text-align:center}

  .seal{
    width:34mm;height:34mm;
    border:0.6mm solid #1d4ed8;border-radius:50%;
    display:flex;flex-direction:column;align-items:center;justify-content:center;
    color:#1d4ed8;font-size:2.8mm;font-weight:bold;text-align:center;
    text-transform:uppercase;letter-spacing:0.3mm;
    line-height:1.3;padding:2mm;background:rgba(29,78,216,0.03);
  }
  .seal .top{font-size:3mm}
  .seal .mid{font-size:5mm;font-style:italic;margin:1mm 0;font-family:Georgia,serif}
  .seal .bot{font-size:2.5mm;opacity:.85}

  .no-print{max-width:1000px;margin:0 auto 14px;display:flex;align-items:center;gap:8px;background:#fff7ed;border:1px solid #fdba74;border-radius:6px;padding:8px 12px}
  .no-print button{background:#c2410c;color:white;border:none;padding:6px 16px;border-radius:5px;cursor:pointer;font-size:12px}
  .no-print button.close{background:#f3f4f6;border:1px solid #d1d5db;color:#111}

  @media print{
    body{background:#fff;padding:0}
    .no-print{display:none!important}
    .cert{margin:0;box-shadow:none;page-break-after:always}
    .cert:last-child{page-break-after:auto}
    @page{size:A4 landscape;margin:0}
  }
`

function buildCert(c: Certificado, origin: string): string {
  return `
    <div class="cert">
      <div class="corner tl"></div>
      <div class="corner tr"></div>
      <div class="corner bl"></div>
      <div class="corner br"></div>

      <div class="header">
        <img src="${origin}/brand/logo.png" alt="ADP" onerror="this.style.display='none'"/>
        <div class="titles">
          <h1>Assembleia de Deus</h1>
          <p>ADP Piracanjuba · Igreja Digital</p>
        </div>
      </div>

      <div class="main">
        <div class="cert-label">Certificado de Conclusão</div>
        <div class="cert-title">Certificamos</div>
        <p class="body-text">que</p>
        <div class="aluno-name">${c.nome_aluno}</div>
        <p class="body-text">concluiu com aproveitamento o seminário</p>
        <div class="seminario-name">"${c.nome_seminario}"</div>
        <p class="body-text">
          com carga horária de <strong>${c.carga_horaria} horas</strong>,
          finalizado em <strong>${fmtLongo(c.data_conclusao)}</strong>.
        </p>
        <div class="details">
          <span>Emitido em ${fmtLongo(c.emitido_em)}</span>
        </div>
      </div>

      <div class="footer">
        <div class="signature">
          <div class="sign-line">Pastor Presidente</div>
          <div class="sign-role">ADP Piracanjuba</div>
        </div>
        <div class="seal">
          <div class="top">ADP</div>
          <div class="mid">Selo</div>
          <div class="bot">Oficial</div>
        </div>
        <div class="signature">
          <div class="sign-line">Secretaria Geral</div>
          <div class="sign-role">ADP Piracanjuba</div>
        </div>
      </div>

      <div style="position:absolute;bottom:13mm;left:0;right:0;text-align:center;z-index:2">
        <div class="cert-num">${c.numero}</div>
      </div>
    </div>
  `
}

export function printCertificado(c: Certificado) {
  const origin = window.location.origin
  const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"/>
  <title>Certificado — ${c.nome_aluno}</title>
  <style>${certStyles}</style>
  </head><body>
    <div class="no-print">
      <span style="font-size:12px;color:#c2410c;font-weight:600">🏆 Certificado — ${c.nome_aluno}</span>
      <button onclick="window.print()" style="margin-left:auto">🖨️ Imprimir</button>
      <button class="close" onclick="window.close()">✕ Fechar</button>
    </div>
    ${buildCert(c, origin)}
  </body></html>`

  openPrintWindow(html, `Certificado — ${c.nome_aluno}`)
}

export function printCertificadosLote(certs: Certificado[]) {
  if (certs.length === 0) return
  const origin = window.location.origin
  const pages = certs.map(c => buildCert(c, origin)).join('')
  const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"/>
  <title>Certificados em lote (${certs.length})</title>
  <style>${certStyles}</style>
  </head><body>
    <div class="no-print">
      <span style="font-size:12px;color:#c2410c;font-weight:600">🏆 Certificados em lote · ${certs.length} ${certs.length === 1 ? 'certificado' : 'certificados'}</span>
      <button onclick="window.print()" style="margin-left:auto">🖨️ Imprimir todos</button>
      <button class="close" onclick="window.close()">✕ Fechar</button>
    </div>
    ${pages}
  </body></html>`

  openPrintWindow(html, `Certificados em lote (${certs.length})`)
}
