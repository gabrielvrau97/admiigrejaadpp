import React, { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { User, Mail, Shield, Lock, Eye, EyeOff, Church, Save, CheckCircle2 } from 'lucide-react'

const roleLabels: Record<string, string> = {
  master: 'Master',
  admin: 'Administrador',
  secretaria: 'Secretaria',
  visualizador: 'Visualizador',
}

const roleBadge: Record<string, string> = {
  master: 'bg-purple-100 text-purple-700 border-purple-200',
  admin: 'bg-blue-100 text-blue-700 border-blue-200',
  secretaria: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  visualizador: 'bg-gray-100 text-gray-600 border-gray-200',
}

const roleGradient: Record<string, string> = {
  master: 'linear-gradient(135deg,#a855f7,#7c3aed)',
  admin: 'linear-gradient(135deg,#3b82f6,#2563eb)',
  secretaria: 'linear-gradient(135deg,#34d399,#059669)',
  visualizador: 'linear-gradient(135deg,#9ca3af,#6b7280)',
}

function PasswordField({ label, placeholder }: { label: string; placeholder?: string }) {
  const [show, setShow] = useState(false)
  return (
    <div>
      <label className="form-label">{label}</label>
      <div className="relative">
        <input
          type={show ? 'text' : 'password'}
          className="form-input pr-10"
          placeholder={placeholder ?? '••••••••'}
        />
        <button
          type="button"
          onClick={() => setShow(s => !s)}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
        >
          {show ? <EyeOff size={14} /> : <Eye size={14} />}
        </button>
      </div>
    </div>
  )
}

export default function MeuPerfilPage() {
  const { user } = useAuth()
  const [saved, setSaved] = useState(false)
  const role = user?.role ?? 'visualizador'

  const handleSave = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  return (
    <div className="space-y-5 max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center">
          <User size={18} className="text-blue-600" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-gray-800">Meu Perfil</h1>
          <p className="text-xs text-gray-400">Controle · Meu perfil</p>
        </div>
      </div>

      {/* Card principal - identidade */}
      <div className="bg-white rounded-xl border border-gray-200/80 overflow-hidden" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
        {/* Faixa topo colorida */}
        <div className="h-20 relative" style={{ background: roleGradient[role] ?? roleGradient.visualizador }}>
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 80% 50%, white 0%, transparent 60%)' }} />
        </div>

        <div className="px-6 pb-6">
          {/* Avatar sobre a faixa */}
          <div className="-mt-10 mb-4 flex items-end justify-between">
            <div
              className="w-20 h-20 rounded-2xl flex items-center justify-center text-white text-3xl font-bold border-4 border-white shadow-md"
              style={{ background: roleGradient[role] ?? roleGradient.visualizador }}
            >
              {user?.name?.[0] ?? 'A'}
            </div>
            <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border ${roleBadge[role] ?? roleBadge.visualizador}`}>
              <Shield size={10} />
              {roleLabels[role] ?? role}
            </span>
          </div>

          <h2 className="text-lg font-bold text-gray-800">{user?.name ?? 'Administrador'}</h2>
          <p className="text-sm text-gray-400 mt-0.5">Membro da equipe administrativa</p>

          {/* Detalhes */}
          <div className="mt-5 space-y-3">
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
              <div className="w-7 h-7 bg-blue-50 border border-blue-100 rounded-lg flex items-center justify-center shrink-0">
                <Mail size={13} className="text-blue-500" />
              </div>
              <div>
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">E-mail</div>
                <div className="text-sm font-medium text-gray-700">{user?.email ?? '—'}</div>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
              <div className="w-7 h-7 bg-purple-50 border border-purple-100 rounded-lg flex items-center justify-center shrink-0">
                <Shield size={13} className="text-purple-500" />
              </div>
              <div>
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Nível de acesso</div>
                <div className="text-sm font-medium text-gray-700">{roleLabels[role] ?? role}</div>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
              <div className="w-7 h-7 bg-indigo-50 border border-indigo-100 rounded-lg flex items-center justify-center shrink-0">
                <Church size={13} className="text-indigo-500" />
              </div>
              <div>
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Igreja</div>
                <div className="text-sm font-medium text-gray-700">ADP Piracanjuba</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Card - alterar senha */}
      <div className="bg-white rounded-xl border border-gray-200/80 overflow-hidden" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
        <div className="px-5 py-3.5 border-b border-gray-100 flex items-center gap-2">
          <Lock size={14} className="text-gray-400" />
          <span className="text-sm font-semibold text-gray-700">Alterar senha</span>
        </div>
        <div className="p-5 space-y-4">
          <PasswordField label="Senha atual" placeholder="Sua senha atual" />
          <PasswordField label="Nova senha" placeholder="Mínimo 8 caracteres" />
          <PasswordField label="Confirmar nova senha" placeholder="Repita a nova senha" />
          <div className="pt-1">
            <button
              onClick={handleSave}
              className={`btn-primary flex items-center gap-2 transition-all ${saved ? '!bg-green-600 !shadow-green-200' : ''}`}
            >
              {saved ? <CheckCircle2 size={14} /> : <Save size={14} />}
              {saved ? 'Senha alterada!' : 'Salvar alterações'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
