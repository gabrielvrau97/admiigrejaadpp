import React, { createContext, useContext, useState } from 'react'
import type { FinTesoureiro } from '../lib/api/fin_tesoureiros'

const STORAGE_PREFIX = 'fin_tesoureiro_ativo'

function storageKey(userId: string) {
  return `${STORAGE_PREFIX}:${userId}`
}

interface TesureiroContextType {
  tesoureiro: FinTesoureiro | null
  setTesoureiro: (t: FinTesoureiro | null) => void
  initForUser: (userId: string) => void
  clearTesoureiro: () => void
}

const TesureiroContext = createContext<TesureiroContextType | null>(null)

export function TesureiroProvider({ children }: { children: React.ReactNode }) {
  const [tesoureiro, setTesureiroState] = useState<FinTesoureiro | null>(null)
  const [currentKey, setCurrentKey] = useState<string | null>(null)

  // Chamado pelo AuthContext ao identificar o usuário logado
  function initForUser(userId: string) {
    const key = storageKey(userId)
    setCurrentKey(key)
    try {
      const raw = sessionStorage.getItem(key)
      setTesureiroState(raw ? JSON.parse(raw) : null)
    } catch {
      setTesureiroState(null)
    }
  }

  function clearTesoureiro() {
    if (currentKey) {
      try { sessionStorage.removeItem(currentKey) } catch { /* ignora */ }
    }
    setTesureiroState(null)
    setCurrentKey(null)
  }

  function setTesoureiro(t: FinTesoureiro | null) {
    setTesureiroState(t)
    if (!currentKey) return
    try {
      if (t) sessionStorage.setItem(currentKey, JSON.stringify(t))
      else sessionStorage.removeItem(currentKey)
    } catch { /* ignora */ }
  }

  return (
    <TesureiroContext.Provider value={{ tesoureiro, setTesoureiro, initForUser, clearTesoureiro }}>
      {children}
    </TesureiroContext.Provider>
  )
}

export function useTesoureiro() {
  const ctx = useContext(TesureiroContext)
  if (!ctx) throw new Error('useTesoureiro must be used within TesureiroProvider')
  return ctx
}

export { TesureiroContext }
