import html2pdf from 'html2pdf.js'

export interface DownloadRelatorioOptions {
  html: string
  filename: string       // sem extensão
  formato?: 'a4' | 'a5'
  orientacao?: 'portrait' | 'landscape'
}

// Baixa o relatório como PDF em um iframe isolado (sem alterar o DOM principal)
export async function downloadRelatorio(opts: DownloadRelatorioOptions): Promise<void> {
  const { html, filename, formato = 'a4', orientacao = 'portrait' } = opts

  const iframe = document.createElement('iframe')
  iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:210mm;height:297mm;border:none;visibility:hidden;'
  document.body.appendChild(iframe)

  const iframeDoc = iframe.contentDocument ?? iframe.contentWindow?.document
  if (!iframeDoc) {
    document.body.removeChild(iframe)
    return
  }

  iframeDoc.open()
  iframeDoc.write(html)
  iframeDoc.close()

  // aguarda imagens carregarem (logo)
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

// Abre em nova aba para impressão (alternativa ao PDF)
export function imprimirRelatorio(html: string): void {
  const win = window.open('', '_blank', 'width=900,height=700')
  if (!win) return
  win.document.write(html)
  win.document.close()
  win.focus()
  setTimeout(() => win.print(), 500)
}
