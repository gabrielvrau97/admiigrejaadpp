import React, { useState, useMemo } from 'react'
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, getDay, differenceInYears, getYear } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { MessageCircle, ChevronLeft, ChevronRight, Church, Users, Heart, Droplets, TrendingUp, TrendingDown, Minus, CalendarDays, Baby, Sparkles } from 'lucide-react'
import { mockBirthdays, mockChurches } from '../lib/mockData'
import { useData, filterByType, getAge } from '../contexts/DataContext'
import { useChurch } from '../contexts/ChurchContext'

const today = new Date()
const currentYear = getYear(today)
const prevYear = currentYear - 1

const events = [
  { date: new Date(currentYear, 11, 1), label: 'Culto de Abertura' },
  { date: new Date(currentYear, 11, 8), label: 'Reunião de Célula' },
  { date: new Date(currentYear, 11, 15), label: 'Culto de Santa Ceia' },
  { date: new Date(currentYear, 11, 25), label: 'Natal do Senhor' },
  { date: new Date(currentYear, 11, 31), label: 'Réveillon' },
]

function MiniCalendar() {
  const [current, setCurrent] = useState(today)
  const start = startOfMonth(current)
  const end = endOfMonth(current)
  const days = eachDayOfInterval({ start, end })
  const blanks = Array.from({ length: getDay(start) })

  return (
    <div className="bg-white rounded-xl border border-gray-200/80 overflow-hidden" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CalendarDays size={14} className="text-blue-500" />
          <h3 className="font-semibold text-gray-800 text-sm">
            {format(current, 'MMMM yyyy', { locale: ptBR }).replace(/^\w/, c => c.toUpperCase())}
          </h3>
        </div>
        <div className="flex gap-0.5">
          <button
            onClick={() => setCurrent(subMonths(current, 1))}
            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-all duration-150"
          >
            <ChevronLeft size={13} />
          </button>
          <button
            onClick={() => setCurrent(addMonths(current, 1))}
            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-all duration-150"
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
            const hasEvent = events.some(e => isSameDay(e.date, day))
            return (
              <div
                key={day.toISOString()}
                className={`text-xs py-1.5 rounded-lg cursor-pointer relative transition-all duration-100 font-medium ${
                  isToday
                    ? 'text-white font-bold shadow-sm'
                    : 'hover:bg-blue-50 text-gray-600 hover:text-blue-600'
                }`}
                style={isToday ? { background: 'linear-gradient(135deg,#2563eb,#1d4ed8)' } : {}}
              >
                {format(day, 'd')}
                {hasEvent && !isToday && (
                  <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 bg-blue-400 rounded-full" />
                )}
              </div>
            )
          })}
        </div>
      </div>

      <div className="px-3 pb-3 space-y-1.5 border-t border-gray-50 pt-2.5">
        {events.slice(0, 4).map((e, i) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            <div className="w-1.5 h-1.5 bg-blue-400 rounded-full shrink-0" />
            <span className="font-semibold text-gray-400 w-9 shrink-0">{format(e.date, 'dd/MM')}</span>
            <span className="text-gray-600 truncate">{e.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function calcAge(birthDate: string): number {
  return differenceInYears(today, new Date(birthDate + 'T00:00:00'))
}

function BaptismCard({ members }: { members: ReturnType<typeof useData>['members'] }) {
  function baptismsByYear(year: number) {
    return members.filter(m => m.baptism && m.baptism_date && getYear(new Date(m.baptism_date)) === year).length
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

const topCardStyles = [
  { gradient: 'linear-gradient(135deg,#2563eb,#1d4ed8)', shadow: 'rgba(37,99,235,0.3)' },
  { gradient: 'linear-gradient(135deg,#059669,#047857)', shadow: 'rgba(5,150,105,0.3)' },
  { gradient: 'linear-gradient(135deg,#e11d48,#be123c)', shadow: 'rgba(225,29,72,0.3)' },
  { gradient: 'linear-gradient(135deg,#7c3aed,#6d28d9)', shadow: 'rgba(124,58,237,0.3)' },
]

export default function Dashboard() {
  const { members, visitantes } = useData()
  const { selectedChurch } = useChurch()

  const filtM = selectedChurch ? members.filter(m => m.church_id === selectedChurch.id) : members
  const filtV = selectedChurch ? visitantes.filter(v => v.church_id === selectedChurch.id) : visitantes

  const activeMembers = filtM.filter(m => m.status === 'ativo' && m.member_type !== 'visitante')
  const activeVisitantes = filtV.filter(m => m.status === 'ativo')
  const newMembersThisYear = filtM.filter(m => m.entry_date && getYear(new Date(m.entry_date)) === currentYear && m.member_type !== 'visitante')
  const newVisitantesThisYear = filtV.filter(m => m.entry_date && getYear(new Date(m.entry_date)) === currentYear)

  const allFilt = [...filtM, ...filtV]
  const criancas = filterByType(allFilt, 'criancas')
  const adolescentes = filterByType(allFilt, 'adolescentes')
  const jovens = filterByType(allFilt, 'jovens')

  const baptismsThisYear = filtM.filter(m => m.baptism && m.baptism_date && getYear(new Date(m.baptism_date)) === currentYear).length
  const baptismsPrevYear = filtM.filter(m => m.baptism && m.baptism_date && getYear(new Date(m.baptism_date)) === prevYear).length
  const baptismDiff = baptismsThisYear - baptismsPrevYear

  const married = filtM.filter(m => m.civil_status === 'casado').slice(0, 2)

  const topCards = [
    {
      label: selectedChurch ? 'Igreja selecionada' : 'Igrejas',
      value: selectedChurch ? 1 : mockChurches.length,
      sub: selectedChurch
        ? selectedChurch.type === 'sede' ? 'Sede' : 'Filial'
        : `${mockChurches.filter(c => c.type === 'sede').length} sede · ${mockChurches.filter(c => c.type === 'filial').length} filiais`,
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
              {/* Círculo decorativo */}
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
      <div className="grid grid-cols-3 gap-3">
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
            <span className="badge-blue text-[10px] font-bold px-2 py-0.5 rounded-full">{mockBirthdays.length}</span>
          </div>
          <div className="p-3">
            {mockBirthdays.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">Nenhum aniversariante hoje</p>
            ) : (
              <div className="space-y-1">
                {mockBirthdays.map(m => (
                  <div key={m.id} className="flex items-center gap-3 px-1 py-2 rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                      style={{ background: 'linear-gradient(135deg,#60a5fa,#2563eb)' }}>
                      {m.name[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-gray-800 truncate">{m.name}</div>
                      <div className="text-xs text-gray-400">
                        {m.birth_date ? calcAge(m.birth_date) : '?'} anos · {m.contacts?.city ?? ''}
                      </div>
                    </div>
                    {(m.contacts?.phones?.[0]) && (
                      <a
                        href={`https://wa.me/55${m.contacts.phones[0].replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1 text-[10px] bg-green-50 border border-green-100 text-green-700 px-2 py-1 rounded-lg hover:bg-green-100 transition-colors font-medium shrink-0"
                      >
                        <MessageCircle size={10} />
                        <span>WhatsApp</span>
                      </a>
                    )}
                  </div>
                ))}
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
            <span className="badge-green text-[10px] font-bold px-2 py-0.5 rounded-full">0</span>
          </div>
          <div className="p-3">
            <p className="text-sm text-gray-400 text-center py-6">Nenhum aniversário de casamento hoje</p>
            <div className="space-y-1">
              {married.map(m => (
                <div key={m.id} className="flex items-center gap-3 px-1 py-2 rounded-lg opacity-30">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                    style={{ background: 'linear-gradient(135deg,#f9a8d4,#e11d48)' }}>
                    {m.name[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-gray-800 truncate">{m.name}</div>
                    <div className="text-xs text-gray-400">Casado(a)</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Calendário */}
        <MiniCalendar />
      </div>

      {/* Batismos */}
      <BaptismCard members={filtM} />
    </div>
  )
}
