import { useState } from 'react'
import { Bell, Mail, LogOut, Globe, ChevronDown, Church, Menu } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useChurch } from '../../contexts/ChurchContext'

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0')
  const s = (seconds % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

interface TopbarProps {
  onOpenSidebar: () => void
}

export default function Topbar({ onOpenSidebar }: TopbarProps) {
  const { logout, sessionRemaining, user } = useAuth()
  const { churches, selectedChurch, setSelectedChurch } = useChurch()
  const [showChurchDD, setShowChurchDD] = useState(false)
  const [lang, setLang] = useState('PT')
  const [showNotif, setShowNotif] = useState(false)

  const isWarning = sessionRemaining < 300

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
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[8px] font-bold rounded-full flex items-center justify-center leading-none">3</span>
        </button>
        {showNotif && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setShowNotif(false)} />
            <div
              className="absolute top-full right-0 mt-1.5 w-72 max-w-[calc(100vw-1rem)] bg-white border border-gray-200/80 rounded-xl z-50 overflow-hidden"
              style={{ boxShadow: '0 8px 24px rgba(0,0,0,0.1), 0 2px 6px rgba(0,0,0,0.06)' }}
            >
              <div className="px-4 py-2.5 border-b border-gray-100 flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-700">Notificações</span>
                <span className="text-[10px] text-blue-600 font-medium cursor-pointer hover:underline">Marcar todas como lidas</span>
              </div>
              {[
                { msg: '3 aniversariantes hoje', time: 'agora', dot: 'bg-blue-500' },
                { msg: 'Novo membro cadastrado', time: '2h', dot: 'bg-green-500' },
                { msg: 'Backup automático realizado', time: '5h', dot: 'bg-gray-400' },
              ].map((n, i) => (
                <div key={i} className="px-4 py-2.5 hover:bg-gray-50 flex items-start gap-3 cursor-pointer transition-colors border-b border-gray-50 last:border-0">
                  <div className={`w-1.5 h-1.5 ${n.dot} rounded-full mt-1.5 flex-shrink-0`} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-gray-700 leading-snug">{n.msg}</div>
                    <div className="text-xs text-gray-400 mt-0.5">{n.time}</div>
                  </div>
                </div>
              ))}
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
