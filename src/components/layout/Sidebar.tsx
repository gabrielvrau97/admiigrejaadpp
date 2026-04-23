import React, { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, Users, UserCheck, Baby, Heart,
  BarChart2, Settings, Church, UserCog, Database,
  ChevronDown, Shield, X, GraduationCap, IdCard, Award
} from 'lucide-react'

interface NavItem {
  label: string
  path?: string
  icon?: React.ReactNode
  children?: NavItem[]
}

const secretariaItems: NavItem[] = [
  { label: 'Painel', path: '/dashboard', icon: <LayoutDashboard size={14} /> },
  {
    label: 'Pessoas', icon: <Users size={14} />,
    children: [
      { label: 'Membros', path: '/secretaria/membros', icon: <UserCheck size={14} /> },
      { label: 'Visitantes', path: '/secretaria/visitantes', icon: <Users size={14} /> },
      { label: 'Congregados', path: '/secretaria/congregados', icon: <Users size={14} /> },
      { label: 'Crianças', path: '/secretaria/criancas', icon: <Baby size={14} /> },
      { label: 'Adolescentes', path: '/secretaria/adolescentes', icon: <Users size={14} /> },
      { label: 'Jovens', path: '/secretaria/jovens', icon: <Users size={14} /> },
      { label: 'Novos convertidos', path: '/secretaria/novos-convertidos', icon: <Heart size={14} /> },
    ]
  },
  { label: 'Gráficos', path: '/secretaria/graficos', icon: <BarChart2 size={14} /> },
  { label: 'Configurações', path: '/secretaria/configuracoes', icon: <Settings size={14} /> },
]

const academicoItems: NavItem[] = [
  { label: 'Seminários', path: '/seminarios', icon: <GraduationCap size={14} /> },
  { label: 'Certificados', path: '/certificados', icon: <Award size={14} /> },
]

const documentosItems: NavItem[] = [
  { label: 'Carteirinhas', path: '/carteirinhas', icon: <IdCard size={14} /> },
]

const controleItems: NavItem[] = [
  { label: 'Igrejas', path: '/controle/igrejas', icon: <Church size={14} /> },
  { label: 'Usuários', path: '/controle/usuarios', icon: <UserCog size={14} /> },
  { label: 'Meu perfil', path: '/controle/meu-perfil', icon: <UserCheck size={14} /> },
  { label: 'Backup', path: '/controle/backup', icon: <Database size={14} /> },
  { label: 'Acessos', path: '/controle/acessos', icon: <Shield size={14} /> },
  { label: 'Configurações', path: '/controle/configuracoes', icon: <Settings size={14} /> },
]

function NavGroup({ items, title, onNavigate }: { items: NavItem[]; title: string; onNavigate?: () => void }) {
  const location = useLocation()
  const [expanded, setExpanded] = useState<Record<string, boolean>>({ 'Pessoas': true })

  const isActive = (item: NavItem): boolean => {
    if (item.path) return location.pathname === item.path || location.pathname.startsWith(item.path + '/')
    if (item.children) return item.children.some(c => c.path && location.pathname.startsWith(c.path))
    return false
  }

  return (
    <div className="mb-5">
      <div className="px-3 mb-1.5 flex items-center gap-2">
        <span className="text-[9px] font-bold uppercase tracking-widest text-blue-400/50">{title}</span>
        <div className="flex-1 h-px bg-white/5" />
      </div>
      {items.map((item) => {
        if (item.children) {
          const open = expanded[item.label] ?? false
          const active = isActive(item)
          return (
            <div key={item.label}>
              <button
                onClick={() => setExpanded(p => ({ ...p, [item.label]: !p[item.label] }))}
                className={`sidebar-item ${active ? 'text-white' : ''}`}
              >
                <span className={`transition-colors duration-150 ${active ? 'text-blue-300' : 'text-blue-400/50'}`}>
                  {item.icon}
                </span>
                <span className="flex-1">{item.label}</span>
                <span className="transition-transform duration-200" style={{ transform: open ? 'rotate(0deg)' : 'rotate(-90deg)' }}>
                  <ChevronDown size={11} className="text-blue-400/40" />
                </span>
              </button>
              {open && (
                <div className="ml-3 mt-0.5 mb-1 border-l border-white/8 pl-2 space-y-0.5">
                  {item.children.map(child => (
                    child.path ? (
                      <NavLink
                        key={child.path}
                        to={child.path}
                        onClick={onNavigate}
                        className={({ isActive }) =>
                          `sidebar-item text-[0.8rem] ${isActive ? 'active' : 'text-blue-200/60'}`
                        }
                      >
                        <span className="text-blue-400/40">{child.icon}</span>
                        <span>{child.label}</span>
                      </NavLink>
                    ) : null
                  ))}
                </div>
              )}
            </div>
          )
        }
        return item.path ? (
          <NavLink
            key={item.path}
            to={item.path}
            onClick={onNavigate}
            className={({ isActive }) =>
              `sidebar-item ${isActive ? 'active' : 'text-blue-100/70'}`
            }
          >
            <span className="text-blue-400/50">{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ) : null
      })}
    </div>
  )
}

interface SidebarProps {
  mobileOpen: boolean
  onClose: () => void
}

export default function Sidebar({ mobileOpen, onClose }: SidebarProps) {
  return (
    <>
      {/* Overlay (só aparece no mobile quando aberta) */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed left-0 top-0 bottom-0 w-64 lg:w-56 flex flex-col z-40 overflow-y-auto transition-transform duration-300 ease-out lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
        style={{ background: 'linear-gradient(180deg, #0f172a 0%, #1a2238 60%, #1e2a45 100%)' }}
      >
        {/* Linha decorativa topo */}
        <div className="h-0.5 w-full" style={{ background: 'linear-gradient(90deg, #2563eb, #7c3aed, #2563eb)' }} />

        {/* Botão de fechar (só mobile) */}
        <button
          onClick={onClose}
          className="lg:hidden absolute top-3 right-3 p-1.5 text-white/70 hover:text-white hover:bg-white/10 rounded-md z-10"
          aria-label="Fechar menu"
        >
          <X size={18} />
        </button>

        {/* Logo */}
        <div className="px-3 py-3 border-b border-white/6">
          <div
            className="rounded-lg flex items-center justify-center px-2 py-2"
            style={{ background: 'rgba(255,255,255,0.96)', boxShadow: '0 2px 10px rgba(37,99,235,0.25)' }}
          >
            <img src="/brand/logo.png" alt="AD Piracanjuba" className="w-full h-auto object-contain" style={{ maxHeight: 56 }} />
          </div>
          <div className="text-center mt-2">
            <div className="text-blue-400/60 text-[9px] tracking-widest uppercase">Igreja Digital</div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 px-1.5 space-y-0.5">
          <NavGroup title="Secretaria" items={secretariaItems} onNavigate={onClose} />
          <NavGroup title="Acadêmico" items={academicoItems} onNavigate={onClose} />
          <NavGroup title="Documentos" items={documentosItems} onNavigate={onClose} />
          <NavGroup title="Controle" items={controleItems} onNavigate={onClose} />
        </nav>

        {/* Rodapé sidebar */}
        <div className="px-4 py-3 border-t border-white/6">
          <p className="text-[9px] text-blue-400/30 text-center tracking-wider">v1.0.0 · Igreja Digital</p>
        </div>
      </aside>
    </>
  )
}
