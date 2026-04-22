import React, { createContext, useContext, useState } from 'react'
import type { Church } from '../types'
import { mockChurches } from '../lib/mockData'

interface ChurchContextType {
  churches: Church[]
  selectedChurch: Church | null
  setSelectedChurch: (c: Church | null) => void
}

const ChurchContext = createContext<ChurchContextType | null>(null)

export function ChurchProvider({ children }: { children: React.ReactNode }) {
  const [selectedChurch, setSelectedChurch] = useState<Church | null>(null)

  return (
    <ChurchContext.Provider value={{ churches: mockChurches, selectedChurch, setSelectedChurch }}>
      {children}
    </ChurchContext.Provider>
  )
}

export function useChurch() {
  const ctx = useContext(ChurchContext)
  if (!ctx) throw new Error('useChurch must be used within ChurchProvider')
  return ctx
}
