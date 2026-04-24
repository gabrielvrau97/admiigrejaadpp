/**
 * Abre uma janela com HTML pronto pra impressão.
 * Checa se o navegador bloqueou o pop-up e avisa o usuário.
 */
export function openPrintWindow(html: string, title = 'Impressão'): Window | null {
  const win = window.open('', '_blank')

  if (!win) {
    alert(
      'Não foi possível abrir a janela de impressão.\n\n' +
      'Seu navegador bloqueou o pop-up. Permita pop-ups para este site e tente novamente.'
    )
    return null
  }

  try {
    win.document.open()
    win.document.write(html)
    win.document.close()
    win.document.title = title
    win.focus()
    return win
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[openPrintWindow] erro ao escrever HTML na janela:', err)
    try { win.close() } catch { /* noop */ }
    alert('Ocorreu um erro ao preparar a janela de impressão. Tente novamente.')
    return null
  }
}
