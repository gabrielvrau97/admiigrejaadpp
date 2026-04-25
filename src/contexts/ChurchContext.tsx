import React, { createContext, useContext, useEffect, useState } from 'react'
import type { Church } from '../types'
import { listChurches } from '../lib/api/churches'
import { useAuth } from './AuthContext'

interface ChurchContextType {
  churches: Church[]
  selectedChurch: Church | null
  setSelectedChurch: (c: Church | null) => void
  loading: boolean
  reload: () => Promise<void>
}

const ChurchContext = createContext<ChurchContextType | null>(null)

export function ChurchProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const [churches, setChurches] = useState<Church[]>([])
  const [selectedChurch, setSelectedChurch] = useState<Church | null>(null)
  const [loading, setLoading] = useState(true)

  const reload = async () => {
    setLoading(true)
    try {
      const list = await listChurches()
      setChurches(list)
    } catch (err) {
      console.error('[ChurchContext] erro ao carregar igrejas:', err)
      setChurches([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user) void reload()
    else { setChurches([]); setSelectedChurch(null); setLoading(false) }
  }, [user])

  return (
    <ChurchContext.Provider value={{ churches, selectedChurch, setSelectedChurch, loading, reload }}>
      {children}
    </ChurchContext.Provider>
  )
}

export function useChurch() {
  const ctx = useContext(ChurchContext)
  if (!ctx) throw new Error('useChurch must be used within ChurchProvider')
  return ctx
}
