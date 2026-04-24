import { useEffect, useRef } from 'react'

/**
 * Hook que adiciona UX básica a modais:
 * - Fecha com tecla Esc
 * - Move o foco para o primeiro input/textarea/select focável dentro do container
 *
 * Uso:
 *   const containerRef = useModalUX({ onClose })
 *   return <div ref={containerRef}>...</div>
 *
 * Use o genérico pra tipar o elemento (ex: useModalUX<HTMLFormElement>({ onClose }))
 */
export function useModalUX<T extends HTMLElement = HTMLDivElement>({ onClose }: { onClose: () => void }) {
  const ref = useRef<T>(null)

  // Esc fecha
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  // Foco automático no primeiro campo focável
  useEffect(() => {
    const current = ref.current
    if (!current) return
    const selector = [
      'input:not([type="hidden"]):not([disabled]):not([readonly])',
      'textarea:not([disabled]):not([readonly])',
      'select:not([disabled])',
    ].join(',')
    const first = current.querySelector<HTMLElement>(selector)
    // timeout pra não conflitar com animações de entrada
    const t = setTimeout(() => first?.focus(), 50)
    return () => clearTimeout(t)
  }, [])

  return ref
}
