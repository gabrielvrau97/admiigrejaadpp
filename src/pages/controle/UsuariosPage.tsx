import React, { useState } from 'react'
import { Plus, Edit2, Trash2, Shield, UserCog, Users } from 'lucide-react'
import type { AppUser, UserRole } from '../../types'

const mockUsers: AppUser[] = [
  { id: '1', email: 'secretaria@adp.com', role: 'admin', church_group_id: 'group-1', church_ids: [], name: 'Secretaria Admin' },
  { id: '2', email: 'pastor@adp.com', role: 'master', church_group_id: 'group-1', church_ids: [], name: 'Pastor João Silva' },
  { id: '3', email: 'secretaria2@adp.com', role: 'secretaria', church_group_id: 'group-1', church_ids: [], name: 'Maria Santos' },
  { id: '4', email: 'visitante@adp.com', role: 'visualizador', church_group_id: 'group-1', church_ids: [], name: 'Carlos Visitante' },
]

const roleConfig: Record<UserRole, { label: string; badge: string; dot: string; avatarBg: string }> = {
  master: {
    label: 'Master',
    badge: 'bg-purple-50 text-purple-700 border border-purple-200',
    dot: 'bg-purple-500',
    avatarBg: 'linear-gradient(135deg,#a855f7,#7c3aed)',
  },
  admin: {
    label: 'Admin',
    badge: 'bg-blue-50 text-blue-700 border border-blue-200',
    dot: 'bg-blue-500',
    avatarBg: 'linear-gradient(135deg,#3b82f6,#2563eb)',
  },
  secretaria: {
    label: 'Secretaria',
    badge: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    dot: 'bg-emerald-500',
    avatarBg: 'linear-gradient(135deg,#34d399,#059669)',
  },
  visualizador: {
    label: 'Visualizador',
    badge: 'bg-gray-50 text-gray-600 border border-gray-200',
    dot: 'bg-gray-400',
    avatarBg: 'linear-gradient(135deg,#9ca3af,#6b7280)',
  },
}

export default function UsuariosPage() {
  const [users] = useState<AppUser[]>(mockUsers)

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center">
            <UserCog size={18} className="text-blue-600" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-800">Usuários</h1>
            <p className="text-xs text-gray-400">Controle · Usuários</p>
          </div>
        </div>
        <button className="btn-primary">
          <Plus size={13} /> Convidar usuário
        </button>
      </div>

      {/* Resumo por perfil */}
      <div className="grid grid-cols-4 gap-3">
        {(Object.keys(roleConfig) as UserRole[]).map(role => {
          const cfg = roleConfig[role]
          const count = users.filter(u => u.role === role).length
          return (
            <div key={role} className="bg-white rounded-xl border border-gray-200/80 px-4 py-3 flex items-center gap-3" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <div className={`w-2 h-2 rounded-full shrink-0 ${cfg.dot}`} />
              <div>
                <div className="text-xl font-bold text-gray-800">{count}</div>
                <div className="text-xs text-gray-500">{cfg.label}</div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-xl border border-gray-200/80 overflow-hidden" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
        <div className="px-5 py-3.5 border-b border-gray-100 flex items-center gap-2">
          <Users size={14} className="text-gray-400" />
          <span className="text-sm font-semibold text-gray-700">{users.length} usuários cadastrados</span>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left px-5 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-wider">Nome</th>
              <th className="text-left px-5 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-wider">E-mail</th>
              <th className="text-left px-5 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-wider">Perfil</th>
              <th className="text-left px-5 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-wider">Acesso</th>
              <th className="text-right px-5 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-wider">Ações</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u, idx) => {
              const cfg = roleConfig[u.role]
              return (
                <tr
                  key={u.id}
                  className="border-b border-gray-50 last:border-0 transition-colors duration-100 hover:bg-blue-50/40 group"
                  style={{ boxShadow: 'none' }}
                >
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                        style={{ background: cfg.avatarBg }}
                      >
                        {u.name?.[0]}
                      </div>
                      <span className="font-semibold text-gray-800 text-sm">{u.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-gray-500 text-sm">{u.email}</td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${cfg.badge}`}>
                      <Shield size={9} />
                      {cfg.label}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-gray-400 text-xs">Todas as igrejas</td>
                  <td className="px-5 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                      <button className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-150">
                        <Edit2 size={12} />
                      </button>
                      <button className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all duration-150">
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
