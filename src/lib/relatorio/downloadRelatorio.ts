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

// Abre preview em nova aba com barra de ações (imprimir / baixar PDF / fechar)
export function previewRelatorio(opts: DownloadRelatorioOptions): void {
  const { html, filename, formato = 'a4', orientacao = 'portrait' } = opts

  // Dimensões da folha em px a 96dpi (1mm ≈ 3.7795px)
  const W = formato === 'a4'
    ? (orientacao === 'landscape' ? '1122px' : '794px')
    : (orientacao === 'landscape' ? '794px'  : '559px')
  const H = formato === 'a4'
    ? (orientacao === 'landscape' ? '794px'  : '1122px')
    : (orientacao === 'landscape' ? '559px'  : '794px')

  const htmlEscaped = JSON.stringify(html)

  const preview = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>${filename}</title>
  <style>
    *, *::before, *::after { margin:0; padding:0; box-sizing:border-box; }

    body {
      background: #d1d5db;
      font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
      min-height: 100vh;
    }

    /* ── Toolbar ── */
    #toolbar {
      position: fixed;
      inset: 0 0 auto 0;
      z-index: 200;
      height: 48px;
      background: #0f2133;
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 0 16px;
      box-shadow: 0 2px 12px rgba(0,0,0,.35);
    }
    .tb-icon {
      font-size: 16px;
      flex-shrink: 0;
    }
    .tb-title {
      flex: 1;
      font-size: 12px;
      font-weight: 600;
      color: #94a3b8;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .tb-sep {
      width: 1px;
      height: 24px;
      background: #1e3a5f;
      flex-shrink: 0;
    }
    .tb-btn {
      display: flex;
      align-items: center;
      gap: 5px;
      padding: 6px 14px;
      border: none;
      border-radius: 5px;
      font-size: 12px;
      font-weight: 700;
      cursor: pointer;
      letter-spacing: 0.2px;
      transition: filter .15s, transform .1s;
      flex-shrink: 0;
    }
    .tb-btn:hover  { filter: brightness(1.12); }
    .tb-btn:active { transform: scale(.97); }
    .tb-btn-print { background: #e8f0fb; color: #1c3d5c; }
    .tb-btn-pdf   { background: #2563eb; color: #fff; }
    .tb-btn-close { background: transparent; color: #64748b; border: 1px solid #1e3a5f; }
    .tb-btn:disabled { opacity: .5; cursor: not-allowed; }

    /* ── Área de conteúdo ── */
    #wrap {
      margin-top: 48px;
      padding: 28px 20px 36px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0;
    }

    /* ── Folha de papel ── */
    .sheet-wrap {
      position: relative;
    }
    .sheet-shadow {
      position: absolute;
      inset: 0;
      box-shadow: 0 6px 32px rgba(0,0,0,.22), 0 1px 4px rgba(0,0,0,.12);
      border-radius: 1px;
      pointer-events: none;
      z-index: 1;
    }
    #sheet-frame {
      display: block;
      background: #fff;
      border: none;
      width: ${W};
      height: ${H};
      border-radius: 1px;
      position: relative;
      z-index: 0;
    }

    /* ── Spinner de carregamento ── */
    #loading {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #fff;
      z-index: 10;
      border-radius: 1px;
      transition: opacity .3s;
    }
    .spinner {
      width: 28px; height: 28px;
      border: 3px solid #dde8f2;
      border-top-color: #2563eb;
      border-radius: 50%;
      animation: spin .7s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    @media print {
      #toolbar, #wrap { display: none !important; }
    }
  </style>
</head>
<body>

  <!-- Toolbar -->
  <div id="toolbar">
    <span class="tb-icon">📄</span>
    <span class="tb-title">${filename}</span>
    <div class="tb-sep"></div>
    <button class="tb-btn tb-btn-print" onclick="doPrint()">🖨️ Imprimir</button>
    <button class="tb-btn tb-btn-pdf"   id="btn-pdf" onclick="doPdf()">⬇️ Baixar PDF</button>
    <button class="tb-btn tb-btn-close" onclick="window.close()">✕ Fechar</button>
  </div>

  <!-- Folha -->
  <div id="wrap">
    <div class="sheet-wrap">
      <div class="sheet-shadow"></div>
      <div id="loading"><div class="spinner"></div></div>
      <iframe id="sheet-frame" scrolling="auto"></iframe>
    </div>
  </div>

  <script>
    var reportHtml = ${htmlEscaped};

    // Renderiza o relatório completo (com <head>/<style>) dentro do iframe
    var frame = document.getElementById('sheet-frame');
    frame.addEventListener('load', function() {
      var loading = document.getElementById('loading');
      if (loading) { loading.style.opacity = '0'; setTimeout(function(){ loading.remove(); }, 300); }
      // ajusta altura do iframe ao conteúdo real
      try {
        var h = frame.contentDocument.documentElement.scrollHeight;
        if (h > 0) frame.style.height = h + 'px';
      } catch(e) {}
    });
    var fdoc = frame.contentDocument || frame.contentWindow.document;
    fdoc.open(); fdoc.write(reportHtml); fdoc.close();

    // Iframe dedicado para impressão (oculto)
    function getPrintFrame() {
      var pf = document.getElementById('print-frame');
      if (!pf) {
        pf = document.createElement('iframe');
        pf.id = 'print-frame';
        pf.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:${W};height:${H};border:none;visibility:hidden;';
        document.body.appendChild(pf);
      }
      return pf;
    }

    function doPrint() {
      var pf = getPrintFrame();
      var pdoc = pf.contentDocument || pf.contentWindow.document;
      pdoc.open(); pdoc.write(reportHtml); pdoc.close();
      setTimeout(function() { pf.contentWindow.focus(); pf.contentWindow.print(); }, 500);
    }

    function doPdf() {
      var btn = document.getElementById('btn-pdf');
      btn.textContent = '⏳ Gerando...';
      btn.disabled = true;
      var s = document.createElement('script');
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
      s.onload = function() {
        var pf = getPrintFrame();
        var pdoc = pf.contentDocument || pf.contentWindow.document;
        pdoc.open(); pdoc.write(reportHtml); pdoc.close();
        setTimeout(function() {
          var target = pdoc.querySelector('body') || pdoc.documentElement;
          html2pdf().set({
            margin: 0,
            filename: '${filename}.pdf',
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true, scrollX: 0, scrollY: 0 },
            jsPDF: { unit: 'mm', format: '${formato}', orientation: '${orientacao}' }
          }).from(target).save().then(function() {
            btn.textContent = '⬇️ Baixar PDF';
            btn.disabled = false;
          });
        }, 400);
      };
      document.head.appendChild(s);
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
