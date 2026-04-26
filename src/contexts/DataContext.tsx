import React, { createContext, useContext, useEffect, useState } from 'react'
import type { Member, Seminario, Matricula, Carteirinha, Certificado, EventoCalendario } from '../types'
import { differenceInYears } from 'date-fns'
import { useAuth } from './AuthContext'
import * as MembersApi from '../lib/api/members'
import * as SeminariosApi from '../lib/api/seminarios'
import * as MatriculasApi from '../lib/api/matriculas'
import * as CarteirinhasApi from '../lib/api/carteirinhas'
import * as CertificadosApi from '../lib/api/certificados'
import * as EventosCalendarioApi from '../lib/api/eventos-calendario'

interface DataContextType {
  // Estado (cache local — espelho do banco)
  members: Member[]
  visitantes: Member[]
  seminarios: Seminario[]
  matriculas: Matricula[]
  carteirinhas: Carteirinha[]
  certificados: Certificado[]
  eventosCalendario: EventoCalendario[]

  // Setters legados (mantidos pra compatibilidade — atualizam só estado local)
  setMembers: React.Dispatch<React.SetStateAction<Member[]>>
  setVisitantes: React.Dispatch<React.SetStateAction<Member[]>>
  setSeminarios: React.Dispatch<React.SetStateAction<Seminario[]>>
  setMatriculas: React.Dispatch<React.SetStateAction<Matricula[]>>
  setCarteirinhas: React.Dispatch<React.SetStateAction<Carteirinha[]>>
  setCertificados: React.Dispatch<React.SetStateAction<Certificado[]>>
  setEventosCalendario: React.Dispatch<React.SetStateAction<EventoCalendario[]>>

  // Novas APIs persistentes
  loading: boolean
  reload: () => Promise<void>

  saveMember: (m: Partial<Member> & { id?: string }) => Promise<Member>
  removeMember: (id: string) => Promise<void>

  saveSeminario: (s: Partial<Seminario> & { id?: string }) => Promise<Seminario>
  removeSeminario: (id: string) => Promise<void>

  saveMatricula: (m: Partial<Matricula> & { id?: string }) => Promise<Matricula>
  removeMatricula: (id: string) => Promise<void>

  saveCarteirinha: (c: Partial<Carteirinha> & { id?: string }) => Promise<Carteirinha>
  removeCarteirinha: (id: string) => Promise<void>

  saveCertificado: (c: Partial<Certificado> & { id?: string }) => Promise<Certificado>
  removeCertificado: (id: string) => Promise<void>

  saveEventoCalendario: (e: Partial<EventoCalendario> & { id?: string }) => Promise<EventoCalendario>
  saveEventosCalendarioBulk: (
    list: Omit<EventoCalendario, 'id' | 'created_at' | 'updated_at'>[],
  ) => Promise<EventoCalendario[]>
  removeEventoCalendario: (id: string) => Promise<void>
}

const DataContext = createContext<DataContextType | null>(null)

export function DataProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()

  const [members, setMembers] = useState<Member[]>([])
  const [visitantes, setVisitantes] = useState<Member[]>([])
  const [seminarios, setSeminarios] = useState<Seminario[]>([])
  const [matriculas, setMatriculas] = useState<Matricula[]>([])
  const [carteirinhas, setCarteirinhas] = useState<Carteirinha[]>([])
  const [certificados, setCertificados] = useState<Certificado[]>([])
  const [eventosCalendario, setEventosCalendario] = useState<EventoCalendario[]>([])
  const [loading, setLoading] = useState(true)

  const reload = async () => {
    setLoading(true)
    try {
      const [m, s, mt, ca, ce, ev] = await Promise.all([
        MembersApi.listMembers(),
        SeminariosApi.listSeminarios(),
        MatriculasApi.listMatriculas(),
        CarteirinhasApi.listCarteirinhas(),
        CertificadosApi.listCertificados(),
        EventosCalendarioApi.listEventosCalendario(),
      ])
      // Divide membros vs visitantes pelo member_type
      setMembers(m.filter(x => x.member_type !== 'visitante'))
      setVisitantes(m.filter(x => x.member_type === 'visitante'))
      setSeminarios(s)
      setMatriculas(mt)
      setCarteirinhas(ca)
      setCertificados(ce)
      setEventosCalendario(ev)
    } catch (err) {
      console.error('[DataContext] erro ao carregar dados:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user) void reload()
    else {
      setMembers([]); setVisitantes([]); setSeminarios([])
      setMatriculas([]); setCarteirinhas([]); setCertificados([])
      setEventosCalendario([])
      setLoading(false)
    }
  }, [user])

  // ── Members ────────────────────────────────────────────────────────────
  const saveMember = async (m: Partial<Member> & { id?: string }): Promise<Member> => {
    const saved = m.id
      ? await MembersApi.updateMember(m.id, m)
      : await MembersApi.createMember(m)
    // Atualiza cache local
    const updateList = (list: Member[]) => {
      const without = list.filter(x => x.id !== saved.id)
      return [...without, saved].sort((a, b) => a.name.localeCompare(b.name))
    }
    if (saved.member_type === 'visitante') {
      setVisitantes(updateList)
      setMembers(prev => prev.filter(x => x.id !== saved.id))
    } else {
      setMembers(updateList)
      setVisitantes(prev => prev.filter(x => x.id !== saved.id))
    }
    return saved
  }

  const removeMember = async (id: string): Promise<void> => {
    await MembersApi.softDeleteMember(id)
    setMembers(prev => prev.filter(x => x.id !== id))
    setVisitantes(prev => prev.filter(x => x.id !== id))
  }

  // ── Seminários ─────────────────────────────────────────────────────────
  const saveSeminario = async (s: Partial<Seminario> & { id?: string }): Promise<Seminario> => {
    const saved = s.id
      ? await SeminariosApi.updateSeminario(s.id, s)
      : await SeminariosApi.createSeminario(s as Omit<Seminario, 'id' | 'created_at' | 'updated_at'>)
    setSeminarios(prev => {
      const without = prev.filter(x => x.id !== saved.id)
      return [saved, ...without]
    })
    return saved
  }
  const removeSeminario = async (id: string) => {
    await SeminariosApi.deleteSeminario(id)
    setSeminarios(prev => prev.filter(x => x.id !== id))
  }

  // ── Matriculas ─────────────────────────────────────────────────────────
  const saveMatricula = async (m: Partial<Matricula> & { id?: string }): Promise<Matricula> => {
    const saved = m.id
      ? await MatriculasApi.updateMatricula(m.id, m)
      : await MatriculasApi.createMatricula(m as Omit<Matricula, 'id' | 'created_at' | 'updated_at'>)
    setMatriculas(prev => {
      const without = prev.filter(x => x.id !== saved.id)
      return [saved, ...without]
    })
    return saved
  }
  const removeMatricula = async (id: string) => {
    await MatriculasApi.deleteMatricula(id)
    setMatriculas(prev => prev.filter(x => x.id !== id))
  }

  // ── Carteirinhas ──────────────────────────────────────────────────────
  const saveCarteirinha = async (c: Partial<Carteirinha> & { id?: string }): Promise<Carteirinha> => {
    const saved = c.id
      ? await CarteirinhasApi.updateCarteirinha(c.id, c)
      : await CarteirinhasApi.createCarteirinha(c as Omit<Carteirinha, 'id' | 'created_at'>)
    setCarteirinhas(prev => {
      const without = prev.filter(x => x.id !== saved.id)
      return [saved, ...without]
    })
    return saved
  }
  const removeCarteirinha = async (id: string) => {
    await CarteirinhasApi.deleteCarteirinha(id)
    setCarteirinhas(prev => prev.filter(x => x.id !== id))
  }

  // ── Certificados ──────────────────────────────────────────────────────
  const saveCertificado = async (c: Partial<Certificado> & { id?: string }): Promise<Certificado> => {
    const saved = c.id
      ? await CertificadosApi.updateCertificado(c.id, c)
      : await CertificadosApi.createCertificado(c as Omit<Certificado, 'id' | 'created_at'>)
    setCertificados(prev => {
      const without = prev.filter(x => x.id !== saved.id)
      return [saved, ...without]
    })
    return saved
  }
  const removeCertificado = async (id: string) => {
    await CertificadosApi.deleteCertificado(id)
    setCertificados(prev => prev.filter(x => x.id !== id))
  }

  // ── Eventos do Calendário ────────────────────────────────────────────────
  const saveEventoCalendario = async (
    e: Partial<EventoCalendario> & { id?: string },
  ): Promise<EventoCalendario> => {
    const saved = e.id
      ? await EventosCalendarioApi.updateEventoCalendario(e.id, e)
      : await EventosCalendarioApi.createEventoCalendario(
          e as Omit<EventoCalendario, 'id' | 'created_at' | 'updated_at'>,
        )
    setEventosCalendario(prev => {
      const without = prev.filter(x => x.id !== saved.id)
      return [...without, saved].sort((a, b) => a.data.localeCompare(b.data))
    })
    return saved
  }

  const saveEventosCalendarioBulk = async (
    list: Omit<EventoCalendario, 'id' | 'created_at' | 'updated_at'>[],
  ): Promise<EventoCalendario[]> => {
    const saved = await EventosCalendarioApi.createEventosCalendarioBulk(list)
    setEventosCalendario(prev =>
      [...prev, ...saved].sort((a, b) => a.data.localeCompare(b.data)),
    )
    return saved
  }

  const removeEventoCalendario = async (id: string) => {
    await EventosCalendarioApi.deleteEventoCalendario(id)
    setEventosCalendario(prev => prev.filter(x => x.id !== id))
  }

  return (
    <DataContext.Provider
      value={{
        members, visitantes, seminarios, matriculas, carteirinhas, certificados, eventosCalendario,
        setMembers, setVisitantes, setSeminarios, setMatriculas, setCarteirinhas, setCertificados, setEventosCalendario,
        loading, reload,
        saveMember, removeMember,
        saveSeminario, removeSeminario,
        saveMatricula, removeMatricula,
        saveCarteirinha, removeCarteirinha,
        saveCertificado, removeCertificado,
        saveEventoCalendario, saveEventosCalendarioBulk, removeEventoCalendario,
      }}
    >
      {children}
    </DataContext.Provider>
  )
}

export function useData() {
  const ctx = useContext(DataContext)
  if (!ctx) throw new Error('useData must be used within DataProvider')
  return ctx
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
    case 'novos-convertidos':
      return active.filter(m => m.conversion)
    default:
      return active
  }
}
