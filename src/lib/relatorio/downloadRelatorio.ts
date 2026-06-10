import html2pdf from 'html2pdf.js'

export interface DownloadRelatorioOptions {
  html: string
  filename: string
  formato?: 'a4' | 'a5'
  orientacao?: 'portrait' | 'landscape'
}

// Baixa direto como PDF (sem preview) — usado pelo recibo
export async function downloadRelatorio(opts: DownloadRelatorioOptions): Promise<void> {
  const { html, filename, formato = 'a4', orientacao = 'portrait' } = opts

  const iframe = document.createElement('iframe')
  iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:210mm;height:297mm;border:none;visibility:hidden;'
  document.body.appendChild(iframe)

  const iframeDoc = iframe.contentDocument ?? iframe.contentWindow?.document
  if (!iframeDoc) { document.body.removeChild(iframe); return }

  iframeDoc.open()
  iframeDoc.write(html)
  iframeDoc.close()

  await new Promise<void>(resolve => setTimeout(resolve, 600))
  const target = iframeDoc.querySelector('body') ?? iframeDoc.documentElement

  await html2pdf()
    .set({
      margin: 0,
      filename: `${filename}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, scrollX: 0, scrollY: 0 },
      jsPDF: { unit: 'mm', format: formato, orientation: orientacao },
    })
    .from(target)
    .save()
    .finally(() => document.body.removeChild(iframe))
}

// Abre preview em nova aba — tela toda, toolbar fixa, relatório renderizado fullscreen
export function previewRelatorio(opts: DownloadRelatorioOptions): void {
  const { html, filename, formato: _fmt = 'a4', orientacao: _ori = 'portrait' } = opts
  void _fmt; void _ori

  const htmlPreview = html
    .replace(
      '</style>',
      `
  /* ── PREVIEW OVERRIDE: tela toda, sem largura fixa ── */
  html, body { width: 100% !important; background: #fff !important; }
  .page {
    width: 100% !important;
    min-height: auto !important;
    padding: 20px 32px 24px !important;
    margin: 0 !important;
  }
  .rodape-tela { display: none !important; }
  </style>`
    )

  const htmlPreviewEscaped = JSON.stringify(htmlPreview)

  const preview = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>${filename}</title>
  <style>
    *, *::before, *::after { margin:0; padding:0; box-sizing:border-box; }
    html, body { height: 100%; overflow: hidden; }
    body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background: #fff; }

    /* ── Toolbar ── */
    #toolbar {
      position: fixed;
      inset: 0 0 auto 0;
      z-index: 200;
      height: 44px;
      background: #0f2133;
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 0 14px;
      box-shadow: 0 1px 6px rgba(0,0,0,.4);
    }
    .tb-icon { font-size: 15px; flex-shrink: 0; }
    .tb-title {
      flex: 1;
      font-size: 12px;
      font-weight: 600;
      color: #7a9ab8;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .tb-sep { width: 1px; height: 20px; background: #1e3a5f; flex-shrink: 0; margin: 0 2px; }
    .tb-btn {
      display: flex;
      align-items: center;
      gap: 5px;
      padding: 5px 13px;
      border: none;
      border-radius: 5px;
      font-size: 12px;
      font-weight: 700;
      cursor: pointer;
      flex-shrink: 0;
      transition: filter .12s, transform .08s;
    }
    .tb-btn:hover  { filter: brightness(1.1); }
    .tb-btn:active { transform: scale(.97); }
    .tb-btn-print { background: #e8f0fb; color: #1c3d5c; }
    .tb-btn-pdf   { background: #2563eb; color: #fff; }
    .tb-btn-close { background: transparent; color: #64748b; border: 1px solid #243a52; }
    .tb-btn:disabled { opacity: .45; cursor: not-allowed; }

    /* ── Iframe fullscreen abaixo da toolbar ── */
    #sheet-frame {
      position: fixed;
      top: 44px;
      left: 0; right: 0; bottom: 0;
      width: 100%;
      height: calc(100vh - 44px);
      border: none;
      background: #fff;
    }

    @media print {
      #toolbar { display: none !important; }
      #sheet-frame { top: 0; height: 100vh; }
    }
  </style>
</head>
<body>

  <div id="toolbar">
    <span class="tb-icon">📄</span>
    <span class="tb-title">${filename}</span>
    <div class="tb-sep"></div>
    <button class="tb-btn tb-btn-print" onclick="doPrint()">🖨️ Imprimir / Salvar PDF</button>
    <button class="tb-btn tb-btn-close" onclick="window.close()">✕ Fechar</button>
  </div>

  <iframe id="sheet-frame" scrolling="yes"></iframe>

  <script>
    var previewHtml = ${htmlPreviewEscaped};

    var frame = document.getElementById('sheet-frame');
    var fdoc = frame.contentDocument || frame.contentWindow.document;
    fdoc.open(); fdoc.write(previewHtml); fdoc.close();

    // iframe oculto para impressão/PDF — usa o mesmo previewHtml
    function getPrintFrame() {
      var pf = document.getElementById('print-frame');
      if (!pf) {
        pf = document.createElement('iframe');
        pf.id = 'print-frame';
        pf.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:210mm;height:297mm;border:none;visibility:hidden;';
        document.body.appendChild(pf);
      }
      return pf;
    }

    function doPrint() {
      var pf = getPrintFrame();
      var pdoc = pf.contentDocument || pf.contentWindow.document;
      pdoc.open(); pdoc.write(previewHtml); pdoc.close();
      setTimeout(function() { pf.contentWindow.focus(); pf.contentWindow.print(); }, 500);
    }
  </script>
</body>
</html>`

  const win = window.open('', '_blank')
  if (!win) return
  win.document.open()
  win.document.write(preview)
  win.document.close()
  win.focus()
}
