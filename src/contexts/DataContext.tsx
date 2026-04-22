import React, { createContext, useContext, useState } from 'react'
import type { Member } from '../types'
import { mockMembers, mockVisitantes } from '../lib/mockData'
import { differenceInYears } from 'date-fns'

interface DataContextType {
  members: Member[]
  setMembers: React.Dispatch<React.SetStateAction<Member[]>>
  visitantes: Member[]
  setVisitantes: React.Dispatch<React.SetStateAction<Member[]>>
}

const DataContext = createContext<DataContextType>({
  members: [],
  setMembers: () => {},
  visitantes: [],
  setVisitantes: () => {},
})

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [members, setMembers] = useState<Member[]>(mockMembers)
  const [visitantes, setVisitantes] = useState<Member[]>(mockVisitantes)
  return (
    <DataContext.Provider value={{ members, setMembers, visitantes, setVisitantes }}>
      {children}
    </DataContext.Provider>
  )
}

export function useData() {
  return useContext(DataContext)
}

export function getAge(birthDate: string): number {
  return differenceInYears(new Date(), new Date(birthDate + 'T00:00:00'))
}

export function filterByType(members: Member[], type: string): Member[] {
  const active = members.filter(m => m.status !== 'deleted')
  switch (type) {
    case 'membros':
      return active.filter(m => m.member_type === 'membro' || !m.member_type)
    case 'visitantes':
      return active.filter(m => m.member_type === 'visitante')
    case 'criancas':
      return active.filter(m => {
        if (!m.birth_date) return false
        const age = getAge(m.birth_date)
        return age >= 8 && age <= 12
      })
    case 'adolescentes':
      return active.filter(m => {
        if (!m.birth_date) return false
        const age = getAge(m.birth_date)
        return age >= 13 && age <= 17
      })
    case 'jovens':
      return active.filter(m => {
        if (!m.birth_date) return false
        const age = getAge(m.birth_date)
        return age >= 18 && m.civil_status === 'solteiro'
      })
    case 'congregados':
      return active
    case 'novos-convertidos':
      return active.filter(m => m.conversion)
    default:
      return active
  }
}
