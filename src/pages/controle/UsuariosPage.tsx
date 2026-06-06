import { useEffect, useState } from 'react'
import { Plus, Edit2, Power, Shield, UserCog, Users, Loader2, X, Info, ExternalLink, Check } from 'lucide-react'
import type { AppUser, UserRole } from '../../types'
import { listUsers, updateUser, setUserChurches, ensureAppUser } from '../../lib/api/users'
import { useAuth } from '../../contexts/AuthContext'
import { useChurch } from '../../contexts/ChurchContext'
import { useToast, useConfirm } from '../../components/ui/UIProvider'
import { useModalUX } from '../../hooks/useModalUX'
import { ROLE_LABELS } from '../../lib/permissions'
import { APP_GROUP_ID } from '../../lib/supabase'

type UserRow = AppUser & { active: boolean }

const roleConfig: Record<UserRole, { badge: string; dot: string; avatarBg: string }> = {
  master: {
    badge: 'bg-purple-50 text-purple-700 border border-purple-200',
    dot: 'bg-purple-500',
    avatarBg: 'linear-gradient(135deg,#a855f7,#7c3aed)',
  },
  admin_secretaria: {
    badge: 'bg-blue-50 text-blue-700 border border-blue-200',
    dot: 'bg-blue-500',
    avatarBg: 'linear-gradient(135deg,#3b82f6,#2563eb)',
  },
  admin_financeiro: {
    badge: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    dot: 'bg-emerald-500',
    avatarBg: 'linear-gradient(135deg,#10b981,#059669)',
  },
  tesoureiro: {
    badge: 'bg-amber-50 text-amber-700 border border-amber-200',
    dot: 'bg-amber-500',
    avatarBg: 'linear-gradient(135deg,#f59e0b,#d97706)',
  },
  admin: {
    badge: 'bg-gray-50 text-gray-600 border border-gray-200',
    dot: 'bg-gray-400',
    avatarBg: 'linear-gradient(135deg,#9ca3af,#6b7280)',
  },
  secretaria: {
    badge: 'bg-gray-50 text-gray-600 border border-gray-200',
    dot: 'bg-gray-400',
    avatarBg: 'linear-gradient(135deg,#9ca3af,#6b7280)',
  },
  visualizador: {
    badge: 'bg-gray-50 text-gray-600 border border-gray-200',
    dot: 'bg-gray-400',
    avatarBg: 'linear-gradient(135deg,#9ca3af,#6b7280)',
  },
}

export default function UsuariosPage() {
  const { user: currentUser } = useAuth()
  const toast = useToast()
  const confirm = useConfirm()
  const [users, setUsers] = useState<UserRow[]>([])
  const [loading, setLoading] = useState(true)
  const [showHelp, setShowHelp] = useState(false)
  const [editing, setEditing] = useState<UserRow | null>(null)
  const [creating, setCreating] = useState(false)

  const isMaster = currentUser?.role === 'master'

  const reload = async () => {
    setLoading(true)
    try {
      const list = await listUsers()
      setUsers(list)
    } catch (err) {
      console.error(err)
      toast.error('Erro ao carregar usuários.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void reload() }, [])

  const handleToggleActive = async (u: UserRow) => {
    if (u.id === currentUser?.id) {
      toast.warning('Você não pode desativar o próprio usuário.')
      return
    }
    const ok = await confirm({
      title: u.active ? 'Desativar usuário' : 'Ativar usuário',
      message: u.active
        ? `Desativar "${u.name ?? u.email}"? Ele não conseguirá mais acessar o sistema até ser reativado.`
        : `Reativar acesso de "${u.name ?? u.email}"?`,
      danger: u.active,
    })
    if (!ok) return
    try {
      await updateUser(u.id, { active: !u.active })
      toast.success(u.active ? 'Usuário desativado.' : 'Usuário ativado.')
      void reload()
    } catch (err) {
      console.error(err)
      toast.error('Erro ao alterar status.')
    }
  }

  const counts = {
    total: users.length,
    ativos: users.filter(u => u.active).length,
    masters: users.filter(u => u.role === 'master').length,
    secretaria: users.filter(u => u.role === 'admin_secretaria').length,
    financeiro: users.filter(u => u.role === 'admin_financeiro').length,
  }

  if (!isMaster) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
        <Shield size={32} className="mx-auto text-gray-300 mb-2" />
        <p className="text-sm text-gray-500">Apenas usuários Master podem acessar o gerenciamento de usuários.</p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center">
            <UserCog size={18} className="text-blue-600" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-800">Usuários</h1>
            <p className="text-xs text-gray-400">Controle · Usuários</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowHelp(true)} className="btn-outline flex items-center gap-1.5">
            <Info size={13} />
            <span className="hidden sm:inline">Como criar</span>
          </button>
          <button onClick={() => setCreating(true)} className="btn-primary flex items-center gap-1.5">
            <Plus size={13} />
            Vincular usuário
          </button>
        </div>
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total', value: counts.total, color: 'bg-gray-500' },
          { label: 'Ativos', value: counts.ativos, color: 'bg-emerald-500' },
          { label: 'Master', value: counts.masters, color: 'bg-purple-500' },
          { label: 'Admins', value: counts.secretaria + counts.financeiro, color: 'bg-blue-500' },
        ].map(c => (
          <div key={c.label} className={`${c.color} rounded-xl p-3 text-white`}>
            <div className="text-2xl font-bold">{c.value}</div>
            <div className="text-xs opacity-90 mt-0.5">{c.label}</div>
          </div>
        ))}
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-xl border border-gray-200/80 overflow-hidden">
        <div className="px-4 sm:px-5 py-3.5 border-b border-gray-100 flex items-center gap-2">
          <Users size={14} className="text-gray-400" />
          <span className="text-sm font-semibold text-gray-700">{users.length} usuário(s) cadastrado(s)</span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-gray-400">
            <Loader2 size={24} className="mx-auto animate-spin mb-2" />
            Carregando usuários...
          </div>
        ) : users.length === 0 ? (
          <div className="p-12 text-center text-gray-400 text-sm">
            <Users size={32} className="mx-auto opacity-30 mb-2" />
            <p>Nenhum usuário vinculado ainda.</p>
            <button onClick={() => setShowHelp(true)} className="text-blue-600 hover:underline mt-2 text-xs">
              Ver instruções de cadastro
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {users.map(u => {
              const cfg = roleConfig[u.role]
              const isMe = u.id === currentUser?.id
              return (
                <div key={u.id} className={`p-4 flex items-center gap-3 ${!u.active ? 'opacity-50' : ''}`}>
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
                    style={{ background: cfg.avatarBg }}
                  >
                    {(u.name ?? u.email)[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-gray-800 text-sm">{u.name ?? '(sem nome)'}</span>
                      {isMe && <span className="text-[10px] bg-blue-50 text-blue-700 border border-blue-200 px-1.5 py-0.5 rounded-full font-medium">você</span>}
                      {!u.active && <span className="text-[10px] bg-red-50 text-red-700 border border-red-200 px-1.5 py-0.5 rounded-full font-medium">inativo</span>}
                    </div>
                    <div className="text-xs text-gray-500 truncate">{u.email}</div>
                    <div className="mt-1 flex items-center gap-2 flex-wrap">
                      <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${cfg.badge}`}>
                        <Shield size={9} />
                        {ROLE_LABELS[u.role]}
                      </span>
                      <span className="text-[10px] text-gray-400">
                        {u.church_ids.length === 0 ? 'Nenhuma igreja' : `${u.church_ids.length} igreja(s)`}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => setEditing(u)}
                      className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                      title="Editar"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      onClick={() => handleToggleActive(u)}
                      disabled={isMe}
                      className={`p-1.5 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed ${
                        u.active ? 'text-gray-400 hover:text-red-500 hover:bg-red-50' : 'text-emerald-500 hover:bg-emerald-50'
                      }`}
                      title={u.active ? 'Desativar' : 'Ativar'}
                    >
                      <Power size={14} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Modais */}
      {showHelp && <HelpModal onClose={() => setShowHelp(false)} />}
      {creating && (
        <UserFormModal
          onClose={() => setCreating(false)}
          onSaved={() => { setCreating(false); void reload() }}
        />
      )}
      {editing && (
        <UserFormModal
          user={editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); void reload() }}
        />
      )}
    </div>
  )
}

// ─── Modal: Como criar ────────────────────────────────────────────────────────

function HelpModal({ onClose }: { onClose: () => void }) {
  const containerRef = useModalUX({ onClose })
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center sm:p-4 bg-black/50">
      <div ref={containerRef} className="bg-white sm:rounded-xl shadow-2xl w-full max-w-lg sm:max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-200 bg-blue-50/50">
          <div>
            <h2 className="font-semibold text-gray-800">Como criar um novo usuário</h2>
            <p className="text-xs text-gray-500">Passo-a-passo</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg"><X size={16} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-4 text-sm text-gray-700">
          <p>
            A criação de usuários é feita em <strong>2 passos</strong>:
          </p>

          <div className="space-y-3">
            <div className="flex gap-3 p-3 bg-blue-50 border border-blue-100 rounded-lg">
              <div className="w-7 h-7 rounded-full bg-blue-600 text-white text-sm font-bold flex items-center justify-center shrink-0">1</div>
              <div className="flex-1">
                <p className="font-semibold mb-1">No painel do Supabase</p>
                <p className="text-xs text-gray-600 mb-2">
                  Crie a conta de autenticação (email + senha):
                </p>
                <ol className="text-xs text-gray-600 list-decimal list-inside space-y-0.5">
                  <li>Abra <a href="https://supabase.com/dashboard/project/joafmaxsavufixvsqrzd/auth/users" target="_blank" rel="noreferrer" className="text-blue-600 hover:underline inline-flex items-center gap-0.5">Authentication → Users <ExternalLink size={9} /></a></li>
                  <li>Clique em <strong>Add user → Create new user</strong></li>
                  <li>Preencha email + senha + marque <strong>"Auto Confirm User"</strong></li>
                  <li>Copie o <strong>UUID</strong> do usuário criado</li>
                </ol>
              </div>
            </div>

            <div className="flex gap-3 p-3 bg-emerald-50 border border-emerald-100 rounded-lg">
              <div className="w-7 h-7 rounded-full bg-emerald-600 text-white text-sm font-bold flex items-center justify-center shrink-0">2</div>
              <div className="flex-1">
                <p className="font-semibold mb-1">Aqui no app</p>
                <p className="text-xs text-gray-600">
                  Clique em <strong>"Vincular usuário"</strong>, cole o UUID + email do passo 1,
                  defina papel (Master / Admin Secretaria / Admin Financeiro), nome e igrejas.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-100 rounded-lg p-3 text-xs text-amber-800">
            <strong>⚠ Importante:</strong> a senha é definida no Supabase no passo 1. Compartilhe com
            o usuário pra ele fazer login pela primeira vez. Ele pode trocar depois em "Meu Perfil".
          </div>
        </div>
        <div className="flex justify-end px-5 py-3 border-t border-gray-200 bg-gray-50">
          <button onClick={onClose} className="btn-primary">Entendi</button>
        </div>
      </div>
    </div>
  )
}

// ─── Modal: Form de usuário (criar via vincular ou editar) ────────────────────

interface UserFormProps {
  user?: UserRow
  onClose: () => void
  onSaved: () => void
}

function UserFormModal({ user, onClose, onSaved }: UserFormProps) {
  const containerRef = useModalUX({ onClose })
  const toast = useToast()
  const { churches } = useChurch()
  const isEditing = !!user

  const [form, setForm] = useState({
    id: user?.id ?? '',
    email: user?.email ?? '',
    name: user?.name ?? '',
    role: user?.role ?? 'admin_secretaria' as UserRole,
    active: user?.active ?? true,
  })
  const [churchIds, setChurchIds] = useState<Set<string>>(new Set(user?.church_ids ?? []))
  const [saving, setSaving] = useState(false)

  const toggleChurch = (id: string) => {
    setChurchIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  const handleSubmit = async () => {
    if (saving) return

    if (!isEditing) {
      if (!form.id.trim() || !form.email.trim()) {
        toast.warning('UUID e email são obrigatórios.')
        return
      }
      const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      if (!uuidRe.test(form.id.trim())) {
        toast.warning('UUID inválido. Copie do painel Supabase exatamente.')
        return
      }
    }

    setSaving(true)
    try {
      if (isEditing) {
        await updateUser(form.id, {
          name: form.name || undefined,
          role: form.role,
          active: form.active,
        })
      } else {
        await ensureAppUser(form.id.trim(), {
          email: form.email.trim(),
          name: form.name || undefined,
          role: form.role,
          church_group_id: APP_GROUP_ID,
          active: form.active,
        })
      }
      await setUserChurches(form.id, [...churchIds])
      toast.success(isEditing ? 'Usuário atualizado.' : 'Usuário vinculado.')
      onSaved()
    } catch (err) {
      console.error(err)
      const msg = (err as { message?: string })?.message ?? 'Erro ao salvar.'
      toast.error(`Erro: ${msg}`)
    } finally {
      setSaving(false)
    }
  }

  const ROLES: { value: UserRole; label: string; sub: string }[] = [
    { value: 'master', label: 'Master', sub: 'Acesso total. Único que gerencia usuários.' },
    { value: 'admin_secretaria', label: 'Admin Secretaria', sub: 'Acesso à secretaria, seminários, igrejas, credenciais e certificados.' },
    { value: 'admin_financeiro', label: 'Admin Financeiro', sub: 'Acesso completo ao módulo financeiro (dashboard, extrato, tesouraria).' },
    { value: 'tesoureiro', label: 'Tesoureiro', sub: 'Acesso somente à tesouraria — lança entradas e saídas e emite recibos.' },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center sm:p-4 bg-black/50">
      <div ref={containerRef} className="bg-white sm:rounded-xl shadow-2xl w-full max-w-lg sm:max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-200 bg-gray-50">
          <h2 className="font-semibold text-gray-800">
            {isEditing ? 'Editar usuário' : 'Vincular novo usuário'}
          </h2>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg"><X size={16} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {!isEditing && (
            <>
              <div>
                <label className="form-label">UUID do usuário (do painel Supabase) *</label>
                <input
                  className="form-input font-mono text-xs"
                  value={form.id}
                  onChange={e => setForm({ ...form, id: e.target.value })}
                  placeholder="00000000-0000-0000-0000-000000000000"
                />
                <p className="text-[10px] text-gray-400 mt-1">
                  Authentication → Users → copie o UID após criar.
                </p>
              </div>
              <div>
                <label className="form-label">E-mail *</label>
                <input
                  type="email"
                  className="form-input"
                  value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                  placeholder="usuario@exemplo.com"
                />
              </div>
            </>
          )}

          {isEditing && (
            <div className="text-xs text-gray-500 bg-gray-50 rounded p-3 border border-gray-100">
              <strong>{form.email}</strong>
            </div>
          )}

          <div>
            <label className="form-label">Nome</label>
            <input
              className="form-input"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              placeholder="Nome do usuário"
            />
          </div>

          <div>
            <label className="form-label">Papel *</label>
            <div className="space-y-1.5">
              {ROLES.map(r => (
                <label
                  key={r.value}
                  className={`flex items-start gap-2 p-3 rounded-lg border cursor-pointer transition-colors ${
                    form.role === r.value ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="role"
                    checked={form.role === r.value}
                    onChange={() => setForm({ ...form, role: r.value })}
                    className="mt-0.5 shrink-0"
                  />
                  <div>
                    <div className="text-sm font-semibold text-gray-800">{r.label}</div>
                    <div className="text-xs text-gray-500">{r.sub}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="form-label">Igrejas que pode acessar</label>
            <p className="text-[10px] text-gray-400 mb-2">
              Master normalmente acessa todas. Outros papéis podem ser limitados.
            </p>
            <div className="space-y-1 max-h-40 overflow-y-auto border border-gray-200 rounded-lg p-1">
              {churches.map(c => {
                const checked = churchIds.has(c.id)
                return (
                  <label
                    key={c.id}
                    className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer text-sm ${
                      checked ? 'bg-blue-50 text-blue-800' : 'hover:bg-gray-50 text-gray-700'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleChurch(c.id)}
                      className="rounded"
                    />
                    <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded shrink-0 bg-white border border-gray-200 text-gray-500">
                      {c.type === 'sede' ? 'Sede' : 'Filial'}
                    </span>
                    {c.name}
                    {checked && <Check size={11} className="ml-auto text-blue-600" />}
                  </label>
                )
              })}
            </div>
            <button
              type="button"
              onClick={() => setChurchIds(new Set(churches.map(c => c.id)))}
              className="text-xs text-blue-600 hover:underline mt-1"
            >
              Selecionar todas
            </button>
          </div>

          {isEditing && (
            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={e => setForm({ ...form, active: e.target.checked })}
                  className="rounded"
                />
                <span className="text-sm font-medium">Usuário ativo</span>
              </label>
              <p className="text-[10px] text-gray-400 ml-6">
                Desmarcar bloqueia o login mas mantém o histórico.
              </p>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 px-5 py-3 border-t border-gray-200 bg-gray-50">
          <button onClick={onClose} className="btn-secondary" disabled={saving}>Cancelar</button>
          <button onClick={handleSubmit} className="btn-primary inline-flex items-center gap-1.5 disabled:opacity-60" disabled={saving}>
            {saving && <Loader2 size={13} className="animate-spin" />}
            {saving ? 'Salvando...' : (isEditing ? 'Salvar' : 'Vincular')}
          </button>
        </div>
      </div>
    </div>
  )
}
