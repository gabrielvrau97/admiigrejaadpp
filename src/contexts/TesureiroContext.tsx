import React, { createContext, useContext, useState, useEffect } from 'react'
import type { FinTesoureiro } from '../lib/api/fin_tesoureiros'

const STORAGE_KEY = 'fin_tesoureiro_ativo'

interface TesureiroContextType {
  tesoureiro: FinTesoureiro | null
  setTesoureiro: (t: FinTesoureiro | null) => void
}

const TesureiroContext = createContext<TesureiroContextType | null>(null)

export function TesureiroProvider({ children }: { children: React.ReactNode }) {
  const [tesoureiro, setTesureiroState] = useState<FinTesoureiro | null>(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY)
      return raw ? JSON.parse(raw) : null
    } catch { return null }
  })

  function setTesoureiro(t: FinTesoureiro | null) {
    setTesureiroState(t)
    try {
      if (t) sessionStorage.setItem(STORAGE_KEY, JSON.stringify(t))
      else sessionStorage.removeItem(STORAGE_KEY)
    } catch { /* ignora */ }
  }

  return (
    <TesureiroContext.Provider value={{ tesoureiro, setTesoureiro }}>
      {children}
    </TesureiroContext.Provider>
  )
}

export function useTesoureiro() {
  const ctx = useContext(TesureiroContext)
  if (!ctx) throw new Error('useTesoureiro must be used within TesureiroProvider')
  return ctx
}
