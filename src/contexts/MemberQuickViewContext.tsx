/**
 * Contexto global pra abrir o MemberViewModal de qualquer lugar do app.
 *
 * Uso:
 *   const { openMember } = useMemberQuickView()
 *   <button onClick={() => openMember('uuid-aqui')}>Ver pessoa</button>
 *
 * O modal abre flutuando por cima de tudo (z-index alto), permite navegar
 * entre vários (clicar no cônjuge dentro de outro membro) com pilha LIFO,
 * e fecha empilhando (volta pro anterior).
 */

import React, { createContext, useContext, useState, useCallback } from 'react'
import { useData } from './DataContext'
import MemberViewModal from '../components/members/MemberViewModal'
import type { Member } from '../types'

interface MemberQuickViewContextType {
  openMember: (id: string) => void
  closeAll: () => void
}

const MemberQuickViewContext = createContext<MemberQuickViewContextType | null>(null)

export function MemberQuickViewProvider({ children }: { children: React.ReactNode }) {
  const { members, visitantes } = useData()
  const [stack, setStack] = useState<Member[]>([])

  const findMember = useCallback((id: string): Member | undefined => {
    return [...members, ...visitantes].find(m => m.id === id)
  }, [members, visitantes])

  const openMember = useCallback((id: string) => {
    const m = findMember(id)
    if (!m) {
      console.warn('[MemberQuickView] membro não encontrado:', id)
      return
    }
    setStack(prev => [...prev, m])
  }, [findMember])

  const closeTop = useCallback(() => {
    setStack(prev => prev.slice(0, -1))
  }, [])

  const closeAll = useCallback(() => {
    setStack([])
  }, [])

  // Re-resolve membros do stack quando os dados do DataContext mudam
  // (ex: o usuário editou alguém — pega versão fresca)
  const refreshedStack = stack.map(m => findMember(m.id) ?? m)
  const top = refreshedStack[refreshedStack.length - 1]

  return (
    <MemberQuickViewContext.Provider value={{ openMember, closeAll }}>
      {children}
      {top && (
        <div
          className="fixed inset-0 z-[100]"
          // Cada modal subsequente fica visualmente em cima — z-index aumenta
          style={{ zIndex: 100 + stack.length * 10 }}
        >
          <MemberViewModal
            member={top}
            onClose={closeTop}
          />
        </div>
      )}
    </MemberQuickViewContext.Provider>
  )
}

export function useMemberQuickView() {
  const ctx = useContext(MemberQuickViewContext)
  if (!ctx) {
    // Fallback silencioso pra não quebrar componentes que rodam fora do provider
    return {
      openMember: (id: string) => console.warn('[MemberQuickView] sem provider; tentou abrir', id),
      closeAll: () => {},
    }
  }
  return ctx
}
