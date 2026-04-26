import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Bell, Mail, LogOut, Globe, ChevronDown, Church, Menu, Cake, Heart, CalendarDays, IdCard } from 'lucide-react'
import { format, getMonth, getDate, differenceInDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useAuth } from '../../contexts/AuthContext'
import { useChurch } from '../../contexts/ChurchContext'
import { useData } from '../../contexts/DataContext'

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0')
  const s = (seconds % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

const today = new Date()

function parseDateOnly(s: string): Date {
  return new Date(s + 'T00:00:00')
}

interface NotifItem {
  id: string
  icon: React.ReactNode
  iconBg: string
  msg: string
  time: string
  link?: string
}

interface TopbarProps {
  onOpenSidebar: () => void
}

export default function Topbar({ onOpenSidebar }: TopbarProps) {
  const { logout, sessionRemaining, user } = useAuth()
  const { churches, selectedChurch, setSelectedChurch } = useChurch()
  const { members, visitantes, eventosCalendario, carteirinhas } = useData()
  const [showChurchDD, setShowChurchDD] = useState(false)
  const [lang, setLang] = useState('PT')
  const [showNotif, setShowNotif] = useState(false)

  const isWarning = sessionRemaining < 300

  // Notificações dinâmicas em tempo real
  const notifications: NotifItem[] = useMemo(() => {
    const items: NotifItem[] = []
    const dia = getDate(today)
    const mes = getMonth(today)
    const todayStr = format(today, 'yyyy-MM-dd')

    const all = [...members, ...visitantes].filter(m =>
      selectedChurch ? m.church_id === selectedChurch.id : true,
    )

    // Aniversariantes
    const aniv = all.filter(m => {
      if (!m.birth_date) return false
      const d = parseDateOnly(m.birth_date)
      return getDate(d) === dia && getMonth(d) === mes
    })
    if (aniv.length > 0) {
      items.push({
        id: 'aniv',
        icon: <Cake size={14} />,
        iconBg: 'bg-blue-100 text-blue-600',
        msg: aniv.length === 1
          ? `${aniv[0].name} faz aniversário hoje 🎂`
          : `${aniv.length} aniversariantes hoje`,
        time: 'agora',
        link: '/secretaria/membros',
      })
    }

    // Casados
    const casados = members.filter(m => {
      const w = m.family?.wedding_date
      if (!w) return false
      const d = parseDateOnly(w)
      return getDate(d) === dia && getMonth(d) === mes
    })
    if (casados.length > 0) {
      items.push({
        id: 'casados',
        icon: <Heart size={14} />,
        iconBg: 'bg-pink-100 text-pink-600',
        msg: casados.length === 1
          ? `Aniversário de casamento: ${casados[0].name}`
          : `${casados.length} aniversários de casamento hoje`,
        time: 'agora',
        link: '/secretaria/membros',
      })
    }

    // Eventos do calendário — hoje e próximos 7 dias
    const eventosFut = eventosCalendario
      .filter(e => e.data >= todayStr)
      .filter(e => differenceInDays(parseDateOnly(e.data), today) <= 7)
      .sort((a, b) => a.data.localeCompare(b.data))
      .slice(0, 3)

    eventosFut.forEach(e => {
      const d = parseDateOnly(e.data)
      const dias = differenceInDays(d, today)
      const quando = dias === 0 ? 'hoje' : dias === 1 ? 'amanhã' : `em ${dias} dias`
      items.push({
        id: `ev-${e.id}`,
        icon: <CalendarDays size={14} />,
        iconBg: 'bg-purple-100 text-purple-600',
        msg: `${e.titulo} — ${quando}${e.hora ? ` às ${e.hora}` : ''}`,
        time: format(d, 'dd/MM', { locale: ptBR }),
        link: '/',
      })
    })

    // Credenciais vencendo nos próximos 30 dias
    const credVencendo = carteirinhas.filter(c => {
      if (c.status !== 'ativa') return false
      const v = parseDateOnly(c.valida_ate)
      const d = differenceInDays(v, today)
      return d >= 0 && d <= 30
    })
    if (credVencendo.length > 0) {
      items.push({
        id: 'cred-venc',
        icon: <IdCard size={14} />,
        iconBg: 'bg-amber-100 text-amber-600',
        msg: credVencendo.length === 1
          ? '1 credencial vence nos próximos 30 dias'
          : `${credVencendo.length} credenciais vencem nos próximos 30 dias`,
        time: 'em breve',
        link: '/carteirinhas',
      })
    }

    return items
  }, [members, visitantes, eventosCalendario, carteirinhas, selectedChurch])

  const notifCount = notifications.length

  return (
    <header
      className="fixed top-0 left-0 lg:left-56 right-0 h-12 bg-white/95 backdrop-blur-sm border-b border-gray-200/80 flex items-center px-3 sm:px-5 gap-2 sm:gap-3 z-20"
      style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)' }}
    >
      {/* Hamburguer (só mobile) */}
      <button
        onClick={onOpenSidebar}
        className="lg:hidden p-1.5 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-md -ml-1"
        aria-label="Abrir menu"
      >
        <Menu size={20} />
      </button>

      {/* Church Selector */}
      <div className="relative min-w-0 flex-shrink">
        <button
          onClick={() => setShowChurchDD(p => !p)}
          className="flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-blue-600 transition-all duration-150 hover:bg-blue-50 px-2 py-1 rounded-md -mx-2 max-w-[52vw] sm:max-w-none"
        >
          <Church size={14} className="text-blue-500 flex-shrink-0" />
          <span className="truncate">{selectedChurch ? selectedChurch.name : 'Sede e filiais'}</span>
          <ChevronDown size={12} className={`flex-shrink-0 transition-transform duration-200 ${showChurchDD ? 'rotate-180' : ''}`} />
        </button>
        {showChurchDD && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setShowChurchDD(false)} />
            <div
              className="absolute top-full left-0 mt-1.5 w-60 sm:w-52 bg-white border border-gray-200/80 rounded-lg z-50 py-1 overflow-hidden"
              style={{ boxShadow: '0 4px 16px rgba(0,0,0,0.1), 0 1px 4px rgba(0,0,0,0.06)' }}
            >
              <button
                onClick={() => { setSelectedChurch(null); setShowChurchDD(false) }}
                className={`w-full text-left px-3 py-2 text-sm transition-colors ${!selectedChurch ? 'text-blue-600 font-medium bg-blue-50' : 'text-gray-700 hover:bg-gray-50'}`}
              >
                Sede e filiais
              </button>
              {churches.map(c => (
                <button
                  key={c.id}
                  onClick={() => { setSelectedChurch(c); setShowChurchDD(false) }}
                  className={`w-full text-left px-3 py-2 text-sm transition-colors flex items-center gap-2 ${selectedChurch?.id === c.id ? 'text-blue-600 font-medium bg-blue-50' : 'text-gray-700 hover:bg-gray-50'}`}
                >
                  <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wide ${c.type === 'sede' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>
                    {c.type === 'sede' ? 'Sede' : 'Filial'}
                  </span>
                  {c.name}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="flex-1" />

      {/* Session Timer (esconde no mobile) */}
      <div
        className={`hidden sm:flex items-center gap-1.5 text-xs font-mono px-2.5 py-1 rounded-md font-medium transition-all ${
          isWarning
            ? 'bg-red-50 text-red-600 border border-red-200 animate-pulse'
            : 'bg-gray-50 text-gray-500 border border-gray-100'
        }`}
      >
        <span className="text-[11px]">⏱</span>
        <span>{formatTime(sessionRemaining)}</span>
      </div>

      {/* Language (esconde no mobile) */}
      <button
        onClick={() => setLang(l => l === 'PT' ? 'EN' : 'PT')}
        className="hidden md:flex items-center gap-1 text-xs text-gray-500 hover:text-blue-600 transition-all duration-150 hover:bg-blue-50 px-2 py-1 rounded-md font-medium"
      >
        <Globe size={13} />
        <span>{lang}</span>
      </button>

      <div className="hidden md:block w-px h-5 bg-gray-200" />

      {/* Notifications */}
      <div className="relative">
        <button
          onClick={() => setShowNotif(p => !p)}
          className="relative p-1.5 text-gray-400 hover:text-blue-600 transition-all duration-150 hover:bg-blue-50 rounded-md"
          aria-label="Abrir notificações"
          aria-haspopup="true"
          aria-expanded={showNotif}
        >
          <Bell size={17} />
          {notifCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 bg-red-500 text-white text-[8px] font-bold rounded-full flex items-center justify-center leading-none">
              {notifCount > 9 ? '9+' : notifCount}
            </span>
          )}
        </button>
        {showNotif && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setShowNotif(false)} />
            <div
              className="absolute top-full right-0 mt-1.5 w-80 max-w-[calc(100vw-1rem)] bg-white border border-gray-200/80 rounded-xl z-50 overflow-hidden"
              style={{ boxShadow: '0 8px 24px rgba(0,0,0,0.1), 0 2px 6px rgba(0,0,0,0.06)' }}
            >
              <div className="px-4 py-2.5 border-b border-gray-100 flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-700">Notificações</span>
                <span className="text-[10px] text-gray-400">{notifCount} {notifCount === 1 ? 'item' : 'itens'}</span>
              </div>
              {notifications.length === 0 ? (
                <div className="px-4 py-8 text-center text-xs text-gray-400">
                  Sem novidades por enquanto
                </div>
              ) : (
                <div className="max-h-80 overflow-y-auto">
                  {notifications.map(n => {
                    const content = (
                      <>
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${n.iconBg}`}>
                          {n.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm text-gray-700 leading-snug">{n.msg}</div>
                          <div className="text-xs text-gray-400 mt-0.5">{n.time}</div>
                        </div>
                      </>
                    )
                    return n.link ? (
                      <Link
                        key={n.id}
                        to={n.link}
                        onClick={() => setShowNotif(false)}
                        className="px-4 py-2.5 hover:bg-gray-50 flex items-start gap-3 cursor-pointer transition-colors border-b border-gray-50 last:border-0"
                      >
                        {content}
                      </Link>
                    ) : (
                      <div
                        key={n.id}
                        className="px-4 py-2.5 hover:bg-gray-50 flex items-start gap-3 transition-colors border-b border-gray-50 last:border-0"
                      >
                        {content}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Mail (esconde no mobile) */}
      <button
        className="hidden sm:inline-flex p-1.5 text-gray-400 hover:text-blue-600 transition-all duration-150 hover:bg-blue-50 rounded-md"
        aria-label="Caixa de mensagens"
      >
        <Mail size={17} />
      </button>

      <div className="hidden sm:block w-px h-5 bg-gray-200" />

      {/* User */}
      <div className="flex items-center gap-2.5">
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, #2563eb, #7c3aed)', boxShadow: '0 1px 4px rgba(37,99,235,0.3)' }}
        >
          {user?.name?.[0] ?? 'A'}
        </div>
        <div className="hidden md:block">
          <div className="text-xs font-semibold text-gray-700 leading-tight">{user?.name ?? 'Admin'}</div>
          <div className="text-[10px] text-gray-400 capitalize">{user?.role}</div>
        </div>
      </div>

      {/* Logout */}
      <button
        onClick={logout}
        className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 transition-all duration-150 rounded-md"
        title="Sair"
        aria-label="Sair"
      >
        <LogOut size={15} />
      </button>
    </header>
  )
}
