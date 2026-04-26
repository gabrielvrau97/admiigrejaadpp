import { useState, useMemo } from 'react'
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, getDay, differenceInYears, getYear, getMonth, getDate } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { MessageCircle, ChevronLeft, ChevronRight, Church, Users, Heart, Droplets, TrendingUp, TrendingDown, Minus, CalendarDays, Baby, Sparkles, Plus } from 'lucide-react'
import { useData, filterByType, getAge } from '../contexts/DataContext'
import { useChurch } from '../contexts/ChurchContext'
import type { EventoCalendario, Member } from '../types'
import EventoCalendarioModal from '../components/dashboard/EventoCalendarioModal'

const today = new Date()
const currentYear = getYear(today)
const prevYear = currentYear - 1

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseDateOnly(s: string): Date {
  return new Date(s + 'T00:00:00')
}

/** Retorna membros cujo birth_date cai no dia/mês de `target`. */
function aniversariantesDoDia(members: Member[], target: Date): Member[] {
  const dia = getDate(target)
  const mes = getMonth(target)
  return members.filter(m => {
    if (!m.birth_date) return false
    const d = parseDateOnly(m.birth_date)
    return getDate(d) === dia && getMonth(d) === mes
  })
}

/** Retorna membros cujo wedding_date cai no dia/mês de `target`. */
function casadosDoDia(members: Member[], target: Date): Member[] {
  const dia = getDate(target)
  const mes = getMonth(target)
  return members.filter(m => {
    const w = m.family?.wedding_date
    if (!w) return false
    const d = parseDateOnly(w)
    return getDate(d) === dia && getMonth(d) === mes
  })
}

const corDot: Record<string, string> = {
  blue: 'bg-blue-400',
  green: 'bg-green-400',
  red: 'bg-red-400',
  amber: 'bg-amber-400',
  purple: 'bg-purple-400',
  orange: 'bg-orange-400',
  pink: 'bg-pink-400',
  gray: 'bg-gray-400',
}

// ─── MiniCalendar ────────────────────────────────────────────────────────────

interface MiniCalendarProps {
  eventos: EventoCalendario[]
  onAdd: (date: string) => void
  onEdit: (e: EventoCalendario) => void
}

function MiniCalendar({ eventos, onAdd, onEdit }: MiniCalendarProps) {
  const [current, setCurrent] = useState(today)
  const start = startOfMonth(current)
  const end = endOfMonth(current)
  const days = eachDayOfInterval({ start, end })
  const blanks = Array.from({ length: getDay(start) })

  const eventosDoMes = useMemo(() => {
    const m = getMonth(current)
    const y = getYear(current)
    return eventos.filter(e => {
      const d = parseDateOnly(e.data)
      return getMonth(d) === m && getYear(d) === y
    })
  }, [eventos, current])

  const eventosNaData = (day: Date) =>
    eventosDoMes.filter(e => isSameDay(parseDateOnly(e.data), day))

  const proximos = useMemo(() => {
    const todayStr = format(today, 'yyyy-MM-dd')
    return [...eventos]
      .filter(e => e.data >= todayStr)
      .sort((a, b) => a.data.localeCompare(b.data) || (a.hora ?? '').localeCompare(b.hora ?? ''))
      .slice(0, 4)
  }, [eventos])

  return (
    <div className="bg-white rounded-xl border border-gray-200/80 overflow-hidden" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CalendarDays size={14} className="text-blue-500" />
          <h3 className="font-semibold text-gray-800 text-sm">
            {format(current, 'MMMM yyyy', { locale: ptBR }).replace(/^\w/, c => c.toUpperCase())}
          </h3>
        </div>
        <div className="flex gap-0.5 items-center">
          <button
            onClick={() => onAdd(format(current, 'yyyy-MM-dd'))}
            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-all"
            title="Novo evento"
          >
            <Plus size={13} />
          </button>
          <button
            onClick={() => setCurrent(subMonths(current, 1))}
            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-all"
          >
            <ChevronLeft size={13} />
          </button>
          <button
            onClick={() => setCurrent(addMonths(current, 1))}
            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-all"
          >
            <ChevronRight size={13} />
          </button>
        </div>
      </div>

      <div className="p-3">
        <div className="grid grid-cols-7 gap-0.5 text-center mb-1">
          {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((d, i) => (
            <div key={i} className="text-[10px] font-bold text-gray-300 py-1 uppercase tracking-wider">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-0.5 text-center">
          {blanks.map((_, i) => <div key={`b-${i}`} />)}
          {days.map(day => {
            const isToday = isSameDay(day, today)
            const evDay = eventosNaData(day)
            const dateStr = format(day, 'yyyy-MM-dd')
            return (
              <button
                key={day.toISOString()}
                onClick={() => evDay.length === 1 ? onEdit(evDay[0]) : onAdd(dateStr)}
                className={`text-xs py-1.5 rounded-lg cursor-pointer relative transition-all duration-100 font-medium ${
                  isToday
                    ? 'text-white font-bold shadow-sm'
                    : 'hover:bg-blue-50 text-gray-600 hover:text-blue-600'
                }`}
                style={isToday ? { background: 'linear-gradient(135deg,#2563eb,#1d4ed8)' } : {}}
                title={evDay.map(e => e.titulo).join(' · ') || undefined}
              >
                {format(day, 'd')}
                {evDay.length > 0 && !isToday && (
                  <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2 flex gap-0.5">
                    {evDay.slice(0, 3).map(e => (
                      <div key={e.id} className={`w-1 h-1 ${corDot[e.cor] ?? 'bg-blue-400'} rounded-full`} />
                    ))}
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </div>

      <div className="px-3 pb-3 space-y-1.5 border-t border-gray-50 pt-2.5">
        {proximos.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-2">Nenhum evento futuro</p>
        ) : (
          proximos.map(e => (
            <button
              key={e.id}
              onClick={() => onEdit(e)}
              className="w-full flex items-center gap-2 text-xs text-left hover:bg-gray-50 rounded px-1 py-1 transition-colors"
            >
              <div className={`w-1.5 h-1.5 ${corDot[e.cor] ?? 'bg-blue-400'} rounded-full shrink-0`} />
              <span className="font-semibold text-gray-400 w-9 shrink-0">
                {format(parseDateOnly(e.data), 'dd/MM')}
              </span>
              <span className="text-gray-600 truncate flex-1">{e.titulo}</span>
              {e.hora && <span className="text-gray-400 shrink-0">{e.hora}</span>}
            </button>
          ))
        )}
      </div>
    </div>
  )
}

// ─── BaptismCard ─────────────────────────────────────────────────────────────

function BaptismCard({ members }: { members: Member[] }) {
  function baptismsByYear(year: number) {
    return members.filter(m => m.baptism && m.baptism_date && getYear(parseDateOnly(m.baptism_date)) === year).length
  }
  const baptismsThisYear = baptismsByYear(currentYear)
  const baptismsPrevYear = baptismsByYear(prevYear)
  const baptismDiff = baptismsThisYear - baptismsPrevYear
  const trend = baptismDiff > 0 ? 'up' : baptismDiff < 0 ? 'down' : 'equal'
  const pct = baptismsPrevYear > 0 ? Math.abs(Math.round((baptismDiff / baptismsPrevYear) * 100)) : null
  const years = [currentYear - 4, currentYear - 3, currentYear - 2, prevYear, currentYear]
  const counts = years.map(baptismsByYear)
  const max = Math.max(...counts, 1)

  return (
    <div className="bg-white rounded-xl border border-gray-200/80 p-5" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
      <div className="flex items-center gap-2 mb-4">
        <div className="w-7 h-7 bg-blue-50 rounded-lg flex items-center justify-center">
          <Droplets size={14} className="text-blue-500" />
        </div>
        <div>
          <h3 className="font-semibold text-gray-800 text-sm">Batismos — comparativo anual</h3>
          <p className="text-xs text-gray-400">Histórico dos últimos 5 anos</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="text-center p-4 rounded-xl border border-blue-100" style={{ background: 'linear-gradient(135deg,#eff6ff,#dbeafe)' }}>
          <div className="text-3xl font-bold text-blue-700">{baptismsThisYear}</div>
          <div className="text-xs font-semibold text-blue-500 mt-1 uppercase tracking-wide">{currentYear}</div>
        </div>
        <div className="text-center p-4 rounded-xl bg-gray-50 border border-gray-100">
          <div className="text-3xl font-bold text-gray-500">{baptismsPrevYear}</div>
          <div className="text-xs font-semibold text-gray-400 mt-1 uppercase tracking-wide">{prevYear}</div>
        </div>
      </div>

      <div className={`flex items-center gap-2 text-xs font-medium rounded-xl px-3 py-2.5 mb-4 ${
        trend === 'up' ? 'bg-green-50 text-green-700 border border-green-100' :
        trend === 'down' ? 'bg-red-50 text-red-600 border border-red-100' :
        'bg-gray-50 text-gray-500 border border-gray-100'
      }`}>
        {trend === 'up' && <TrendingUp size={13} />}
        {trend === 'down' && <TrendingDown size={13} />}
        {trend === 'equal' && <Minus size={13} />}
        {trend === 'up' && `+${baptismDiff} batismos a mais que ${prevYear}${pct ? ` (+${pct}%)` : ''}`}
        {trend === 'down' && `${baptismDiff} batismos a menos que ${prevYear}${pct ? ` (${pct}% menos)` : ''}`}
        {trend === 'equal' && `Mesmo número que ${prevYear}`}
      </div>

      <div className="space-y-2">
        {years.map((yr, i) => {
          const pctBar = Math.round((counts[i] / max) * 100)
          const isCurrent = yr === currentYear
          return (
            <div key={yr} className="flex items-center gap-3 text-xs">
              <span className={`w-10 text-right font-medium ${isCurrent ? 'text-blue-600' : 'text-gray-400'}`}>{yr}</span>
              <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                <div
                  className={`h-2 rounded-full transition-all duration-500 ${isCurrent ? 'bg-gradient-to-r from-blue-400 to-blue-600' : 'bg-gray-300'}`}
                  style={{ width: `${pctBar}%` }}
                />
              </div>
              <span className={`w-5 font-bold ${isCurrent ? 'text-blue-600' : 'text-gray-400'}`}>{counts[i]}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Cards principais ────────────────────────────────────────────────────────

const topCardStyles = [
  { gradient: 'linear-gradient(135deg,#2563eb,#1d4ed8)', shadow: 'rgba(37,99,235,0.3)' },
  { gradient: 'linear-gradient(135deg,#059669,#047857)', shadow: 'rgba(5,150,105,0.3)' },
  { gradient: 'linear-gradient(135deg,#e11d48,#be123c)', shadow: 'rgba(225,29,72,0.3)' },
  { gradient: 'linear-gradient(135deg,#7c3aed,#6d28d9)', shadow: 'rgba(124,58,237,0.3)' },
]

// ─── Dashboard ───────────────────────────────────────────────────────────────

export default function Dashboard() {
  const { members, visitantes, eventosCalendario, saveEventoCalendario, saveEventosCalendarioBulk, removeEventoCalendario } = useData()
  const { selectedChurch, churches } = useChurch()

  const [modalOpen, setModalOpen] = useState(false)
  const [modalDate, setModalDate] = useState<string | undefined>(undefined)
  const [editingEvento, setEditingEvento] = useState<EventoCalendario | null>(null)

  const filtM = selectedChurch ? members.filter(m => m.church_id === selectedChurch.id) : members
  const filtV = selectedChurch ? visitantes.filter(v => v.church_id === selectedChurch.id) : visitantes

  const activeMembers = filtM.filter(m => m.status === 'ativo' && m.member_type !== 'visitante')
  const activeVisitantes = filtV.filter(m => m.status === 'ativo')
  const newMembersThisYear = filtM.filter(m => m.entry_date && getYear(parseDateOnly(m.entry_date)) === currentYear && m.member_type !== 'visitante')
  const newVisitantesThisYear = filtV.filter(m => m.entry_date && getYear(parseDateOnly(m.entry_date)) === currentYear)

  const allFilt = [...filtM, ...filtV]
  const criancas = filterByType(allFilt, 'criancas')
  const adolescentes = filterByType(allFilt, 'adolescentes')
  const jovens = filterByType(allFilt, 'jovens')

  const baptismsThisYear = filtM.filter(m => m.baptism && m.baptism_date && getYear(parseDateOnly(m.baptism_date)) === currentYear).length
  const baptismsPrevYear = filtM.filter(m => m.baptism && m.baptism_date && getYear(parseDateOnly(m.baptism_date)) === prevYear).length
  const baptismDiff = baptismsThisYear - baptismsPrevYear

  // Aniversariantes e casados do dia (reais)
  const aniversariantes = useMemo(
    () => aniversariantesDoDia(allFilt, today),
    [allFilt],
  )
  const casados = useMemo(
    () => casadosDoDia(filtM, today),
    [filtM],
  )

  const totalChurches = churches.length || 1
  const sedes = churches.filter(c => c.type === 'sede').length
  const filiais = churches.filter(c => c.type === 'filial').length

  const topCards = [
    {
      label: selectedChurch ? 'Igreja selecionada' : 'Igrejas',
      value: selectedChurch ? 1 : totalChurches,
      sub: selectedChurch
        ? selectedChurch.type === 'sede' ? 'Sede' : 'Filial'
        : `${sedes} sede · ${filiais} filiais`,
      icon: <Church size={20} />,
    },
    {
      label: 'Membros ativos',
      value: activeMembers.length,
      sub: `+${newMembersThisYear.length} novos em ${currentYear}`,
      icon: <Users size={20} />,
    },
    {
      label: 'Visitantes ativos',
      value: activeVisitantes.length,
      sub: `+${newVisitantesThisYear.length} novos em ${currentYear}`,
      icon: <Heart size={20} />,
    },
    {
      label: `Batismos ${currentYear}`,
      value: baptismsThisYear,
      sub: baptismDiff >= 0 ? `+${baptismDiff} vs ${prevYear}` : `${baptismDiff} vs ${prevYear}`,
      icon: <Droplets size={20} />,
    },
  ]

  const segCards = [
    { label: 'Crianças', sub: '8 a 12 anos', value: criancas.length, color: 'bg-amber-400', light: 'bg-amber-50 text-amber-700 border-amber-100', icon: <Baby size={15} /> },
    { label: 'Adolescentes', sub: '13 a 17 anos', value: adolescentes.length, color: 'bg-orange-400', light: 'bg-orange-50 text-orange-700 border-orange-100', icon: <Sparkles size={15} /> },
    { label: 'Jovens', sub: '18+ solteiros', value: jovens.length, color: 'bg-purple-500', light: 'bg-purple-50 text-purple-700 border-purple-100', icon: <Users size={15} /> },
  ]

  const openNew = (date?: string) => {
    setEditingEvento(null)
    setModalDate(date)
    setModalOpen(true)
  }
  const openEdit = (e: EventoCalendario) => {
    setEditingEvento(e)
    setModalDate(undefined)
    setModalOpen(true)
  }
  const closeModal = () => {
    setModalOpen(false)
    setEditingEvento(null)
  }

  const groupId = churches[0]?.group_id

  const handleSaveSingle = async (e: Partial<EventoCalendario>) => {
    if (!groupId) throw new Error('Sem grupo de igrejas')
    await saveEventoCalendario({
      ...e,
      church_group_id: groupId,
      church_id: selectedChurch?.id,
    })
  }

  const handleSaveMany = async (
    list: Omit<EventoCalendario, 'id' | 'created_at' | 'updated_at' | 'church_group_id'>[],
  ) => {
    if (!groupId) throw new Error('Sem grupo de igrejas')
    await saveEventosCalendarioBulk(
      list.map(l => ({
        ...l,
        church_group_id: groupId,
        church_id: selectedChurch?.id,
      })),
    )
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Painel</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {format(today, "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })}
          </p>
        </div>
      </div>

      {/* Cards principais */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {topCards.map((c, i) => {
          const s = topCardStyles[i]
          return (
            <div
              key={c.label}
              className="rounded-xl p-4 text-white relative overflow-hidden"
              style={{ background: s.gradient, boxShadow: `0 4px 14px ${s.shadow}` }}
            >
              <div className="absolute -right-4 -top-4 w-20 h-20 rounded-full bg-white/10" />
              <div className="absolute -right-1 -bottom-6 w-16 h-16 rounded-full bg-white/5" />
              <div className="relative">
                <div className="flex items-start justify-between mb-3">
                  <div className="p-2 bg-white/15 rounded-lg backdrop-blur-sm">
                    {c.icon}
                  </div>
                </div>
                <div className="text-3xl font-bold tracking-tight">{c.value}</div>
                <div className="text-sm font-medium opacity-90 mt-0.5">{c.label}</div>
                <div className="text-xs opacity-65 mt-1">{c.sub}</div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Segmentação por faixa etária */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {segCards.map(c => (
          <div key={c.label} className="bg-white rounded-xl border border-gray-200/80 px-4 py-3.5 flex items-center gap-3" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <div className={`w-1.5 self-stretch rounded-full ${c.color} shrink-0`} />
            <div className="flex-1 min-w-0">
              <div className="text-2xl font-bold text-gray-800">{c.value}</div>
              <div className="text-sm font-semibold text-gray-700">{c.label}</div>
              <div className="text-xs text-gray-400 mt-0.5">{c.sub} · membros ativos</div>
            </div>
            <div className={`p-2 rounded-lg border ${c.light} shrink-0`}>
              {c.icon}
            </div>
          </div>
        ))}
      </div>

      {/* Linha principal: Aniversariantes + Casados + Calendário */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Aniversariantes */}
        <div className="bg-white rounded-xl border border-gray-200/80 overflow-hidden" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-base">🎂</span>
              <h3 className="font-semibold text-gray-800 text-sm">Aniversariantes do dia</h3>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">{aniversariantes.length}</span>
          </div>
          <div className="p-3">
            {aniversariantes.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">Nenhum aniversariante hoje</p>
            ) : (
              <div className="space-y-1 max-h-72 overflow-y-auto">
                {aniversariantes.map(m => {
                  const idade = m.birth_date ? differenceInYears(today, parseDateOnly(m.birth_date)) : null
                  const cidade = m.contacts?.city
                  const phone = m.contacts?.phones?.[0] ?? m.contacts?.cellphone1
                  return (
                    <div key={m.id} className="flex items-center gap-3 px-1 py-2 rounded-lg hover:bg-gray-50 transition-colors">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                        style={{ background: 'linear-gradient(135deg,#60a5fa,#2563eb)' }}>
                        {m.name[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-gray-800 truncate">{m.name}</div>
                        <div className="text-xs text-gray-400">
                          {idade !== null ? `${idade} anos` : '?'}
                          {cidade ? ` · ${cidade}` : ''}
                        </div>
                      </div>
                      {phone && (
                        <a
                          href={`https://wa.me/55${phone.replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1 text-[10px] bg-green-50 border border-green-100 text-green-700 px-2 py-1 rounded-lg hover:bg-green-100 transition-colors font-medium shrink-0"
                        >
                          <MessageCircle size={10} />
                          <span>WhatsApp</span>
                        </a>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Casados */}
        <div className="bg-white rounded-xl border border-gray-200/80 overflow-hidden" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-base">💍</span>
              <h3 className="font-semibold text-gray-800 text-sm">Casados do dia</h3>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-pink-50 text-pink-700">{casados.length}</span>
          </div>
          <div className="p-3">
            {casados.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">Nenhum aniversário de casamento hoje</p>
            ) : (
              <div className="space-y-1 max-h-72 overflow-y-auto">
                {casados.map(m => {
                  const w = m.family?.wedding_date
                  const anos = w ? differenceInYears(today, parseDateOnly(w)) : null
                  const conjuge = m.family?.spouse_name
                  return (
                    <div key={m.id} className="flex items-center gap-3 px-1 py-2 rounded-lg hover:bg-gray-50 transition-colors">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                        style={{ background: 'linear-gradient(135deg,#f9a8d4,#e11d48)' }}>
                        {m.name[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-gray-800 truncate">{m.name}</div>
                        <div className="text-xs text-gray-400 truncate">
                          {conjuge ? `& ${conjuge}` : 'Casado(a)'}
                          {anos !== null ? ` · ${anos} ${anos === 1 ? 'ano' : 'anos'}` : ''}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Calendário */}
        <MiniCalendar
          eventos={eventosCalendario}
          onAdd={openNew}
          onEdit={openEdit}
        />
      </div>

      {/* Batismos */}
      <BaptismCard members={filtM} />

      {modalOpen && (
        <EventoCalendarioModal
          onClose={closeModal}
          initialDate={modalDate}
          editing={editingEvento}
          onSaveSingle={handleSaveSingle}
          onSaveMany={handleSaveMany}
          onDelete={editingEvento ? removeEventoCalendario : undefined}
        />
      )}
    </div>
  )
}

// re-export getAge usage workaround (não usado aqui mas mantém parity com Dashboard antigo)
void getAge
