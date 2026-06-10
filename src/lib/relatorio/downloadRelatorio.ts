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
  const { html, filename, formato = 'a4', orientacao = 'landscape' } = opts

  const pageSize = formato === 'a4'
    ? (orientacao === 'landscape' ? 'size: A4 landscape' : 'size: A4 portrait')
    : (orientacao === 'landscape' ? 'size: A5 landscape' : 'size: A5 portrait')

  const preview = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8"/>
  <title>Preview — ${filename}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #e5e7eb; font-family: Arial, sans-serif; }

    /* barra de ações */
    #toolbar {
      position: fixed;
      top: 0; left: 0; right: 0;
      z-index: 100;
      height: 52px;
      background: #1e3a5f;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 20px;
      box-shadow: 0 2px 8px rgba(0,0,0,.3);
      gap: 12px;
    }
    #toolbar .title {
      color: #cbd5e1;
      font-size: 13px;
      flex: 1;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    #toolbar .actions { display: flex; gap: 8px; flex-shrink: 0; }
    #toolbar button {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 7px 16px;
      border: none;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: opacity .15s;
    }
    #toolbar button:hover { opacity: .85; }
    #btn-print   { background: #fff;    color: #1e3a5f; }
    #btn-pdf     { background: #2563eb; color: #fff; }
    #btn-close   { background: transparent; color: #94a3b8; border: 1px solid #334155 !important; }

    /* área de conteúdo */
    #content-wrap {
      margin-top: 52px;
      padding: 24px;
      display: flex;
      flex-direction: column;
      align-items: center;
      min-height: calc(100vh - 52px);
    }

    /* folha de papel */
    .sheet {
      background: #fff;
      box-shadow: 0 4px 24px rgba(0,0,0,.18);
      border-radius: 2px;
      width: ${orientacao === 'landscape' ? (formato === 'a4' ? '297mm' : '210mm') : (formato === 'a4' ? '210mm' : '148mm')};
      min-height: ${orientacao === 'landscape' ? (formato === 'a4' ? '210mm' : '148mm') : (formato === 'a4' ? '297mm' : '210mm')};
      overflow: hidden;
      margin-bottom: 24px;
    }

    /* esconde toolbar ao imprimir */
    @media print {
      #toolbar, #content-wrap { display: none !important; }
      body { background: none; }
      @page { ${pageSize}; margin: 0; }
    }

    /* frame do relatório ocupa tela toda ao imprimir */
    #report-frame {
      position: fixed;
      top: 0; left: 0;
      width: 100%; height: 100%;
      border: none;
      display: none;
    }
    @media print {
      #report-frame { display: block; }
    }
  </style>
</head>
<body>

  <div id="toolbar">
    <span class="title">📄 ${filename}</span>
    <div class="actions">
      <button id="btn-print" onclick="doPrint()">🖨️ Imprimir</button>
      <button id="btn-pdf"   onclick="doPdf()">⬇️ Baixar PDF</button>
      <button id="btn-close" onclick="window.close()">✕ Fechar</button>
    </div>
  </div>

  <div id="content-wrap">
    <div class="sheet" id="sheet"></div>
  </div>

  <!-- iframe oculto usado para imprimir sem a toolbar -->
  <iframe id="report-frame"></iframe>

  <script>
    // injeta o HTML do relatório na folha de preview
    var reportHtml = ${JSON.stringify(html)};
    var sheet = document.getElementById('sheet');
    sheet.innerHTML = '';
    var inner = document.createElement('div');
    inner.innerHTML = reportHtml;
    // extrai só o conteúdo do body do relatório (sem <html>/<head>)
    var body = inner.querySelector('body');
    if (body) {
      sheet.innerHTML = body.innerHTML;
    } else {
      sheet.innerHTML = inner.innerHTML;
    }

    function doPrint() {
      var frame = document.getElementById('report-frame');
      var fdoc = frame.contentDocument || frame.contentWindow.document;
      fdoc.open();
      fdoc.write(reportHtml);
      fdoc.close();
      setTimeout(function() { frame.contentWindow.print(); }, 400);
    }

    function doPdf() {
      var btn = document.getElementById('btn-pdf');
      btn.textContent = '⏳ Gerando...';
      btn.disabled = true;

      // carrega html2pdf dinamicamente via CDN
      var script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
      script.onload = function() {
        var frame = document.getElementById('report-frame');
        var fdoc = frame.contentDocument || frame.contentWindow.document;
        fdoc.open();
        fdoc.write(reportHtml);
        fdoc.close();
        setTimeout(function() {
          var target = fdoc.querySelector('body') || fdoc.documentElement;
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
      document.head.appendChild(script);
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
