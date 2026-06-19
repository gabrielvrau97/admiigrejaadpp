import type { Certificado } from '../../types'
import { openPrintWindow } from '../../lib/print'

// Deriva o semestre/ano a partir da data de conclusão
function semestre(dataIso: string): string {
  const d = new Date(dataIso + 'T00:00:00')
  const mes = d.getMonth() + 1 // 1–12
  const ano = d.getFullYear()
  return mes <= 6 ? `1º Semestre de ${ano}` : `2º Semestre de ${ano}`
}

const certStyles = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Georgia', 'Times New Roman', serif;
    background: #e8e8e8;
    padding: 20px;
    color: #111;
  }

  /* ── Folha A4 landscape ── */
  .cert {
    width: 297mm; height: 210mm;
    margin: 0 auto 24px;
    background: #fff;
    position: relative;
    padding: 0;
    box-shadow: 0 8px 28px rgba(0,0,0,0.18);
    page-break-after: always;
    break-after: page;
    overflow: hidden;
  }

  /* ── Marca d'água: logo grande, clarinha, lado esquerdo ── */
  .watermark {
    position: absolute;
    top: 50%;
    left: -30mm;
    transform: translateY(-50%);
    width: 140mm;
    height: 140mm;
    object-fit: contain;
    opacity: 0.055;
    pointer-events: none;
    z-index: 0;
    filter: grayscale(100%);
  }

  /* ── Borda dupla ornamental ── */
  .cert::before {
    content: "";
    position: absolute;
    inset: 5mm;
    border: 2.5px solid #1a3a6b;
    pointer-events: none;
    z-index: 10;
  }
  .cert::after {
    content: "";
    position: absolute;
    inset: 7.5mm;
    border: 1px solid #3b6bbf;
    pointer-events: none;
    z-index: 10;
  }

  /* ── Conteúdo principal ── */
  .inner {
    position: absolute;
    inset: 0;
    padding: 11mm 16mm 10mm 16mm;
    display: flex;
    flex-direction: column;
    z-index: 2;
  }

  /* ── Cabeçalho ── */
  .header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-bottom: 4mm;
    border-bottom: 1.5px solid #c9a84c;
    margin-bottom: 6mm;
  }
  .header-brand {
    display: flex;
    align-items: center;
    gap: 4mm;
  }
  .header-brand img {
    height: 15mm;
    width: auto;
    object-fit: contain;
  }
  .header-text h1 {
    font-size: 6.5mm;
    font-weight: bold;
    color: #1a3a6b;
    letter-spacing: 0.4mm;
    text-transform: uppercase;
    line-height: 1;
  }
  .header-text p {
    font-size: 3.8mm;
    color: #4a5568;
    margin-top: 0.8mm;
    letter-spacing: 0.2mm;
  }
  .cert-badge {
    text-align: right;
  }
  .cert-badge .badge-label {
    font-size: 2.8mm;
    text-transform: uppercase;
    letter-spacing: 1.5px;
    color: #8a9ab8;
    font-family: Arial, sans-serif;
    display: block;
  }
  .cert-badge .badge-num {
    font-size: 3mm;
    font-family: 'Courier New', monospace;
    color: #6b7280;
    letter-spacing: 0.5px;
  }

  /* ── Corpo central ── */
  .body {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    padding: 0 6mm;
  }

  .cert-label {
    font-size: 3mm;
    letter-spacing: 4px;
    text-transform: uppercase;
    color: #8a9ab8;
    font-family: Arial, sans-serif;
    margin-bottom: 1.5mm;
  }
  .cert-title {
    font-size: 13mm;
    font-weight: bold;
    color: #1a3a6b;
    letter-spacing: 1.5mm;
    text-transform: uppercase;
    line-height: 1;
    margin-bottom: 5mm;
    font-family: Georgia, serif;
  }
  .cert-title::after {
    content: "";
    display: block;
    width: 30mm;
    height: 0.8mm;
    background: #c9a84c;
    margin: 3mm auto 0;
    border-radius: 1px;
  }

  .body-text {
    font-size: 4.2mm;
    line-height: 1.7;
    color: #2d3748;
    max-width: 220mm;
    text-align: center;
  }
  .body-text .aluno {
    display: block;
    font-size: 7mm;
    font-weight: bold;
    font-style: italic;
    color: #1a3a6b;
    margin: 2mm 0 2mm;
    white-space: nowrap;
    line-height: 1.1;
  }
  .body-text strong {
    color: #1a3a6b;
    font-weight: bold;
  }

  /* ── Rodapé com assinaturas ── */
  .footer {
    display: flex;
    justify-content: space-around;
    align-items: flex-end;
    padding-top: 4mm;
    border-top: 1px solid #e2e8f0;
  }

  .signature {
    text-align: center;
    min-width: 60mm;
  }
  .signature .sign-img {
    height: 26mm;
    display: flex;
    align-items: flex-end;
    justify-content: center;
    margin-bottom: 1mm;
  }
  .signature .sign-img img {
    max-height: 26mm;
    max-width: 90mm;
    object-fit: contain;
  }
  .sign-line {
    border-top: 0.5mm solid #2d3748;
    padding-top: 1.5mm;
    font-size: 3.5mm;
    font-weight: bold;
    color: #1a3a6b;
    letter-spacing: 0.3mm;
    white-space: nowrap;
  }
  .sign-role {
    font-size: 3mm;
    color: #718096;
    margin-top: 0.5mm;
    font-family: Arial, sans-serif;
  }

  /* Participante: espaço limpo para assinatura manual */
  .signature.participante .sign-space {
    height: 14mm;
    width: 58mm;
    margin: 0 auto 1mm;
  }

  /* ── Barra utilitária (sem impressão) ── */
  .no-print {
    max-width: 1000px;
    margin: 0 auto 14px;
    display: flex;
    align-items: center;
    gap: 8px;
    background: #fff7ed;
    border: 1px solid #fdba74;
    border-radius: 6px;
    padding: 8px 12px;
  }
  .no-print button {
    background: #1a3a6b;
    color: white;
    border: none;
    padding: 6px 16px;
    border-radius: 5px;
    cursor: pointer;
    font-size: 12px;
  }
  .no-print button.close {
    background: #f3f4f6;
    border: 1px solid #d1d5db;
    color: #111;
  }

  @media print {
    body { background: #fff; padding: 0; }
    .no-print { display: none !important; }
    .cert { margin: 0; box-shadow: none; page-break-after: always; }
    .cert:last-child { page-break-after: auto; }
    @page { size: A4 landscape; margin: 0; }
  }
`

function buildCert(c: Certificado, origin: string): string {
  const assinaturaUrl = `${origin}/brand/assinatura-pastor.png`
  const semStr = semestre(c.data_conclusao)

  return `
    <div class="cert">

      <!-- Marca d'água -->
      <img class="watermark" src="${origin}/brand/logo.png" alt=""/>

      <div class="inner">

        <!-- CABEÇALHO -->
        <div class="header">
          <div class="header-brand">
            <img src="${origin}/brand/logo.png" alt="ADP" onerror="this.style.display='none'"/>
            <div class="header-text">
              <h1>Assembleia de Deus</h1>
              <p>Campo de Piracanjuba</p>
            </div>
          </div>
          <div class="cert-badge">
            <span class="badge-label">Certificado</span>
            <span class="badge-num">${c.numero}</span>
          </div>
        </div>

        <!-- CORPO -->
        <div class="body">
          <div class="cert-label">de conclusão</div>
          <div class="cert-title">Certificado</div>
          <p class="body-text">
            Certificamos que
            <span class="aluno">${c.nome_aluno}</span>
            concluiu o Seminário Bíblico <strong>${c.nome_seminario}</strong> promovido por este Campo,
            cumprindo a carga horária total de <strong>${c.carga_horaria} horas</strong>,
            realizado no <strong>${semStr}</strong>.
          </p>
        </div>

        <!-- RODAPÉ: assinaturas -->
        <div class="footer">

          <!-- Pastor -->
          <div class="signature">
            <div class="sign-img">
              <img src="${assinaturaUrl}" alt="Assinatura" onerror="this.style.display='none'"/>
            </div>
            <div class="sign-line">Gilson Marcos S. da Silva</div>
            <div class="sign-role">Pastor Presidente · ADP Piracanjuba</div>
          </div>

          <!-- Participante -->
          <div class="signature participante">
            <div class="sign-space"></div>
            <div class="sign-line">${c.nome_aluno}</div>
            <div class="sign-role">Participante</div>
          </div>

        </div>
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
      <span style="font-size:12px;color:#1a3a6b;font-weight:600">Certificado — ${c.nome_aluno}</span>
      <button onclick="window.print()" style="margin-left:auto">Imprimir</button>
      <button class="close" onclick="window.close()">Fechar</button>
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
      <span style="font-size:12px;color:#1a3a6b;font-weight:600">Certificados em lote · ${certs.length} ${certs.length === 1 ? 'certificado' : 'certificados'}</span>
      <button onclick="window.print()" style="margin-left:auto">Imprimir todos</button>
      <button class="close" onclick="window.close()">Fechar</button>
    </div>
    ${pages}
  </body></html>`

  openPrintWindow(html, `Certificados em lote (${certs.length})`)
}
