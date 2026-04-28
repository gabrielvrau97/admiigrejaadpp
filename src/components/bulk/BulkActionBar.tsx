import React, { useState, useRef, useEffect, useLayoutEffect } from 'react'
import { ChevronDown, X } from 'lucide-react'

export interface BulkAction {
  key: string
  label: string
  icon?: React.ReactNode
  onClick: () => void
  /** Se for ação destrutiva, fica vermelha. */
  danger?: boolean
  /** Coloca a ação dentro do dropdown "Mais" em vez de botão direto. */
  group?: 'main' | 'more'
}

interface Props {
  count: number
  total?: number
  entityLabel?: string  // "membros", "matrículas", etc
  actions: BulkAction[]
  onClear: () => void
  onSelectAllFiltered?: () => void
  selectAllLabel?: string
}

/**
 * Barra flutuante de ações em massa.
 * Fica fixa no rodapé (mobile + desktop) com animação de slide-up.
 * Some quando count = 0.
 */
export default function BulkActionBar({
  count,
  total,
  entityLabel = 'itens',
  actions,
  onClear,
  onSelectAllFiltered,
  selectAllLabel,
}: Props) {
  const [moreOpen, setMoreOpen] = useState(false)
  const moreBtnRef = useRef<HTMLButtonElement>(null)
  const moreMenuRef = useRef<HTMLDivElement>(null)
  const [menuPos, setMenuPos] = useState<{ left: number; bottom: number } | null>(null)

  // Posiciona o menu acima do botão "Mais" quando abre
  useLayoutEffect(() => {
    if (!moreOpen || !moreBtnRef.current) return
    const rect = moreBtnRef.current.getBoundingClientRect()
    const menuWidth = 224 // w-56
    const viewportWidth = window.innerWidth
    // Alinha pela borda direita do botão, mas evita sair da tela
    let left = rect.right - menuWidth
    if (left < 8) left = 8
    if (left + menuWidth > viewportWidth - 8) left = viewportWidth - menuWidth - 8
    const bottom = window.innerHeight - rect.top + 8
    setMenuPos({ left, bottom })
  }, [moreOpen])

  // Fecha quando clica fora do menu E fora do botão
  useEffect(() => {
    if (!moreOpen) return
    const handleClick = (e: MouseEvent) => {
      const target = e.target as Node
      const insideBtn = moreBtnRef.current?.contains(target)
      const insideMenu = moreMenuRef.current?.contains(target)
      if (!insideBtn && !insideMenu) {
        setMoreOpen(false)
      }
    }
    window.addEventListener('mousedown', handleClick)
    return () => window.removeEventListener('mousedown', handleClick)
  }, [moreOpen])

  if (count === 0) return null

  const mainActions = actions.filter(a => a.group !== 'more')
  const moreActions = actions.filter(a => a.group === 'more')

  return (
    <div
      className="fixed bottom-3 left-1/2 -translate-x-1/2 z-40 w-[calc(100vw-1.5rem)] max-w-3xl"
      style={{ animation: 'slideUp 200ms ease-out' }}
    >
      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translate(-50%, 20px); }
          to { opacity: 1; transform: translate(-50%, 0); }
        }
      `}</style>
      <div
        className="bg-gray-900 text-white rounded-xl shadow-2xl border border-gray-800 overflow-hidden"
        style={{ boxShadow: '0 10px 40px rgba(0,0,0,0.3), 0 4px 12px rgba(0,0,0,0.15)' }}
      >
        {/* Linha 1: contador + ações */}
        <div className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2.5">
          <div className="flex items-center gap-2 shrink-0">
            <div className="bg-blue-500 text-white text-xs font-bold rounded-full min-w-[28px] h-7 px-2 flex items-center justify-center">
              {count}
            </div>
            <span className="text-sm font-medium hidden sm:inline">
              {entityLabel} selecionado{count !== 1 ? 's' : ''}
            </span>
          </div>

          <div className="flex-1 flex items-center gap-1 sm:gap-1.5 overflow-x-auto scrollbar-thin">
            {mainActions.map(a => (
              <button
                key={a.key}
                onClick={a.onClick}
                className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                  a.danger
                    ? 'bg-red-500/10 text-red-300 hover:bg-red-500/20 hover:text-red-200'
                    : 'bg-white/10 text-white hover:bg-white/20'
                }`}
              >
                {a.icon}
                <span className="hidden sm:inline">{a.label}</span>
                <span className="sm:hidden">{a.label.split(' ')[0]}</span>
              </button>
            ))}

            {moreActions.length > 0 && (
              <button
                ref={moreBtnRef}
                onClick={() => setMoreOpen(p => !p)}
                className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-medium bg-white/10 text-white hover:bg-white/20 whitespace-nowrap shrink-0"
              >
                Mais
                <ChevronDown size={12} className={`transition-transform ${moreOpen ? 'rotate-180' : ''}`} />
              </button>
            )}
          </div>

          <button
            onClick={onClear}
            className="shrink-0 p-1.5 hover:bg-white/10 rounded-lg transition-colors"
            title="Limpar seleção"
            aria-label="Limpar seleção"
          >
            <X size={14} />
          </button>
        </div>

        {/* Linha 2 (opcional): selecionar todos filtrados */}
        {onSelectAllFiltered && total !== undefined && count < total && (
          <div className="border-t border-gray-800 bg-gray-800/50 px-3 sm:px-4 py-2 text-xs text-gray-300 flex items-center justify-between">
            <span>{count} de {total} selecionados nesta página</span>
            <button
              onClick={onSelectAllFiltered}
              className="text-blue-300 hover:text-blue-200 font-medium"
            >
              {selectAllLabel ?? `Selecionar todos os ${total} filtrados`}
            </button>
          </div>
        )}
      </div>

      {/* Dropdown "Mais" — renderizado fora do container com overflow */}
      {moreOpen && menuPos && moreActions.length > 0 && (
        <div
          ref={moreMenuRef}
          className="fixed z-50 w-56 bg-white text-gray-700 rounded-lg shadow-xl border border-gray-200 overflow-hidden"
          style={{ left: menuPos.left, bottom: menuPos.bottom }}
        >
          {moreActions.map(a => (
            <button
              key={a.key}
              onClick={() => { setMoreOpen(false); a.onClick() }}
              className={`w-full text-left px-3 py-2.5 text-sm flex items-center gap-2 transition-colors ${
                a.danger
                  ? 'text-red-600 hover:bg-red-50'
                  : 'text-gray-700 hover:bg-blue-50'
              }`}
            >
              {a.icon}
              {a.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
