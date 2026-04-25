import React, { useState, useEffect } from 'react'
import { X, User, Phone, Link, Loader2, Plus, X as XIcon } from 'lucide-react'
import { differenceInYears } from 'date-fns'
import type { Member, MemberContact } from '../../types'
import { useData } from '../../contexts/DataContext'
import { useChurch } from '../../contexts/ChurchContext'
import { DEFAULT_CHURCH_ID } from '../../lib/supabase'
import { useConfirm, useToast } from '../ui/UIProvider'
import { useModalUX } from '../../hooks/useModalUX'

// ─── helpers ──────────────────────────────────────────────────────────────────

function Field({ label, required, error, children }: { label: string; required?: boolean; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="form-label">{label}{required && <span className="text-red-500 ml-0.5">*</span>}</label>
      {children}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  )
}

const brStates = ['AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT','PA','PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO']

const howArrivedOptions = [
  'Convite de um membro',
  'Redes sociais',
  'Panfleto / material impresso',
  'Passando em frente à igreja',
  'Transmissão online',
  'Evento / culto especial',
  'Familiar já frequenta',
  'Outro',
]

// ─── Aba Perfil ───────────────────────────────────────────────────────────────

function TabPerfilVisitante({ form, onChange, errors }: { form: Partial<Member>; onChange: (f: Partial<Member>) => void; errors?: Record<string, string> }) {
  const { churches } = useChurch()
  const set = (key: keyof Member) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    onChange({ ...form, [key]: e.target.value })

  const age = form.birth_date
    ? differenceInYears(new Date(), new Date(form.birth_date + 'T00:00:00'))
    : null

  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="col-span-2 flex items-center gap-4 pb-3 border-b border-gray-100">
        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-rose-400 to-pink-600 flex items-center justify-center text-white text-2xl font-bold shadow shrink-0">
          {form.name?.[0] ?? '?'}
        </div>
        <div className="flex-1">
          <Field label="Nome completo" required error={errors?.name}>
            <input
              className={`form-input ${errors?.name ? 'border-red-500 ring-2 ring-red-100' : ''}`}
              value={form.name ?? ''}
              onChange={set('name')}
              placeholder="Nome completo"
              aria-invalid={!!errors?.name}
            />
          </Field>
        </div>
      </div>

      <Field label="Sexo">
        <select className="form-select" value={form.sex ?? 'masculino'} onChange={set('sex')}>
          <option value="masculino">Masculino</option>
          <option value="feminino">Feminino</option>
        </select>
      </Field>

      <Field label="Data de nascimento">
        <div className="flex items-center gap-2">
          <input type="date" className="form-input flex-1" value={form.birth_date ?? ''} onChange={set('birth_date')} />
          {age !== null && <span className="text-xs text-gray-500 whitespace-nowrap">{age} anos</span>}
        </div>
      </Field>

      <Field label="Estado civil">
        <select className="form-select" value={form.civil_status ?? ''} onChange={set('civil_status')}>
          <option value="">Selecione</option>
          <option value="solteiro">Solteiro(a)</option>
          <option value="casado">Casado(a)</option>
          <option value="uniao_estavel">União estável</option>
          <option value="divorciado">Divorciado(a)</option>
          <option value="viuvo">Viúvo(a)</option>
        </select>
      </Field>

      <Field label="Profissão">
        <input className="form-input" value={form.occupation ?? ''} onChange={set('occupation')} placeholder="Ex: Professor" />
      </Field>

      <Field label="Igreja" required error={errors?.church_id}>
        <select
          className={`form-select ${errors?.church_id ? 'border-red-500 ring-2 ring-red-100' : ''}`}
          value={form.church_id ?? ''}
          onChange={set('church_id')}
          aria-invalid={!!errors?.church_id}
        >
          <option value="">Selecione...</option>
          {churches.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </Field>

      <Field label="Status">
        <select className="form-select" value={form.status ?? 'ativo'} onChange={set('status')}>
          <option value="ativo">Ativo</option>
          <option value="inativo">Inativo</option>
        </select>
      </Field>

      <div className="col-span-2">
        <Field label="Observações">
          <textarea
            className="form-input resize-none"
            rows={2}
            placeholder="Anotações sobre o visitante..."
            value={form.notes ?? ''}
            onChange={e => onChange({ ...form, notes: e.target.value })}
          />
        </Field>
      </div>
    </div>
  )
}

// ─── Aba Contatos ─────────────────────────────────────────────────────────────

function TabContatosVisitante({ contacts, onChange }: { contacts: Partial<MemberContact>; onChange: (c: Partial<MemberContact>) => void }) {
  const [cepLoading, setCepLoading] = useState(false)

  const emails = contacts.emails ?? ['']
  const phones = contacts.phones ?? ['']

  const setEmails = (list: string[]) => onChange({ ...contacts, emails: list })
  const setPhones = (list: string[]) => onChange({ ...contacts, phones: list })

  const updateEmail = (i: number, val: string) => { const n = [...emails]; n[i] = val; setEmails(n) }
  const removeEmail = (i: number) => setEmails(emails.filter((_, idx) => idx !== i))
  const updatePhone = (i: number, val: string) => { const n = [...phones]; n[i] = val; setPhones(n) }
  const removePhone = (i: number) => setPhones(phones.filter((_, idx) => idx !== i))

  const set = (key: keyof MemberContact) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    onChange({ ...contacts, [key]: e.target.value })

  const handleCep = async (cep: string) => {
    onChange({ ...contacts, cep })
    const clean = cep.replace(/\D/g, '')
    if (clean.length !== 8) return
    setCepLoading(true)
    try {
      const res = await fetch(`https://viacep.com.br/ws/${clean}/json/`)
      const data = await res.json()
      if (!data.erro) {
        onChange({ ...contacts, cep, address: data.logradouro, neighborhood: data.bairro, city: data.localidade, state: data.uf, country: 'Brasil' })
      }
    } catch { /* silently fail */ } finally { setCepLoading(false) }
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="form-label">Telefone(s) / Celular(es)</label>
        <div className="space-y-2">
          {phones.map((phone, i) => (
            <div key={i} className="flex gap-2 items-center">
              <input className="form-input flex-1" value={phone} onChange={e => updatePhone(i, e.target.value)} placeholder="(64) 99999-0000" />
              {phones.length > 1 && (
                <button type="button" onClick={() => removePhone(i)} className="text-gray-400 hover:text-red-500 transition-colors">
                  <XIcon size={14} />
                </button>
              )}
            </div>
          ))}
          <button type="button" onClick={() => setPhones([...phones, ''])} className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium">
            <Plus size={12} /> Adicionar telefone
          </button>
        </div>
      </div>

      <div>
        <label className="form-label">E-mail(s)</label>
        <div className="space-y-2">
          {emails.map((email, i) => (
            <div key={i} className="flex gap-2 items-center">
              <input type="email" className="form-input flex-1" value={email} onChange={e => updateEmail(i, e.target.value)} placeholder="email@exemplo.com" />
              {emails.length > 1 && (
                <button type="button" onClick={() => removeEmail(i)} className="text-gray-400 hover:text-red-500 transition-colors">
                  <XIcon size={14} />
                </button>
              )}
            </div>
          ))}
          <button type="button" onClick={() => setEmails([...emails, ''])} className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium">
            <Plus size={12} /> Adicionar e-mail
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="CEP">
          <div className="flex gap-1">
            <input className="form-input flex-1" value={contacts.cep ?? ''} onChange={e => handleCep(e.target.value)} placeholder="00000-000" maxLength={9} />
            {cepLoading && <Loader2 size={14} className="animate-spin self-center text-gray-400" />}
          </div>
        </Field>
        <Field label="País">
          <input className="form-input" value={contacts.country ?? 'Brasil'} onChange={set('country')} />
        </Field>
        <div className="col-span-2">
          <Field label="Endereço">
            <input className="form-input" value={contacts.address ?? ''} onChange={set('address')} placeholder="Rua, Av..." />
          </Field>
        </div>
        <Field label="Número">
          <input className="form-input" value={contacts.number ?? ''} onChange={set('number')} placeholder="123" />
        </Field>
        <Field label="Bairro">
          <input className="form-input" value={contacts.neighborhood ?? ''} onChange={set('neighborhood')} placeholder="Bairro" />
        </Field>
        <Field label="Cidade">
          <input className="form-input" value={contacts.city ?? ''} onChange={set('city')} placeholder="Cidade" />
        </Field>
        <Field label="Estado">
          <select className="form-select" value={contacts.state ?? ''} onChange={set('state')}>
            <option value="">UF</option>
            {brStates.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </Field>
      </div>
    </div>
  )
}

// ─── Aba Conexão ──────────────────────────────────────────────────────────────

function TabConexaoVisitante({ form, onChange }: { form: Partial<Member>; onChange: (f: Partial<Member>) => void }) {
  const { members } = useData()
  const [memberSearch, setMemberSearch] = useState('')
  const [memberResults, setMemberResults] = useState<typeof members>([])
  const [linkedMember, setLinkedMember] = useState<typeof members[0] | null>(null)

  const handleMemberSearch = (q: string) => {
    setMemberSearch(q)
    if (q.length >= 2) {
      setMemberResults(members.filter(m => m.name.toLowerCase().includes(q.toLowerCase())).slice(0, 5))
    } else {
      setMemberResults([])
    }
  }

  const pickMember = (m: typeof members[0]) => {
    setLinkedMember(m)
    setMemberSearch(m.name)
    setMemberResults([])
    onChange({ ...form, how_arrived: 'Convite de um membro' })
  }

  const clearMember = () => {
    setLinkedMember(null)
    setMemberSearch('')
  }

  return (
    <div className="space-y-5">
      {/* Como chegou */}
      <div className="p-4 bg-gray-50 rounded-lg space-y-3">
        <p className="text-sm font-semibold text-gray-700">Como chegou à igreja?</p>
        <div className="grid grid-cols-2 gap-2">
          {howArrivedOptions.map(opt => (
            <label
              key={opt}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border cursor-pointer text-sm transition-colors ${
                form.how_arrived === opt
                  ? 'border-blue-500 bg-blue-50 text-blue-700 font-medium'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-blue-300'
              }`}
            >
              <input
                type="radio"
                name="how_arrived"
                value={opt}
                checked={form.how_arrived === opt}
                onChange={() => onChange({ ...form, how_arrived: opt })}
                className="hidden"
              />
              <div className={`w-3.5 h-3.5 rounded-full border-2 shrink-0 ${form.how_arrived === opt ? 'border-blue-500 bg-blue-500' : 'border-gray-300'}`} />
              {opt}
            </label>
          ))}
        </div>

        {form.how_arrived === 'Outro' && (
          <div>
            <label className="form-label">Descreva como chegou</label>
            <input
              className="form-input"
              value={form.how_arrived_other ?? ''}
              onChange={e => onChange({ ...form, how_arrived_other: e.target.value })}
              placeholder="Descreva..."
            />
          </div>
        )}

        {form.how_arrived === 'Convite de um membro' && (
          <div className="relative">
            <label className="form-label">Qual membro convidou?</label>
            {linkedMember ? (
              <div className="flex items-center gap-2 p-2 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="w-7 h-7 rounded-full bg-blue-200 flex items-center justify-center text-blue-700 font-bold text-xs">
                  {linkedMember.name[0]}
                </div>
                <span className="flex-1 text-sm font-medium text-blue-800">{linkedMember.name}</span>
                <button type="button" onClick={clearMember} className="text-gray-400 hover:text-red-500">
                  <XIcon size={13} />
                </button>
              </div>
            ) : (
              <>
                <input
                  className="form-input"
                  value={memberSearch}
                  onChange={e => handleMemberSearch(e.target.value)}
                  placeholder="Buscar membro..."
                />
                {memberResults.length > 0 && (
                  <div className="absolute z-10 w-full bg-white border border-gray-200 rounded-lg shadow-lg mt-1">
                    {memberResults.map(m => (
                      <button key={m.id} type="button" onClick={() => pickMember(m)} className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-xs font-bold">{m.name[0]}</div>
                        {m.name}
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Novo convertido */}
      <div className="p-4 bg-gray-50 rounded-lg space-y-3">
        <p className="text-sm font-semibold text-gray-700">Situação espiritual</p>
        <div className="space-y-2">
          <label className={`flex items-center gap-3 px-4 py-3 rounded-lg border cursor-pointer transition-colors ${
            form.novo_convertido === true
              ? 'border-green-500 bg-green-50'
              : 'border-gray-200 bg-white hover:border-green-300'
          }`}>
            <input
              type="radio"
              name="novo_convertido"
              checked={form.novo_convertido === true}
              onChange={() => onChange({ ...form, novo_convertido: true })}
              className="hidden"
            />
            <div className={`w-4 h-4 rounded-full border-2 shrink-0 ${form.novo_convertido === true ? 'border-green-500 bg-green-500' : 'border-gray-300'}`} />
            <div>
              <div className="text-sm font-medium text-gray-800">Novo convertido</div>
              <div className="text-xs text-gray-400">Aceitou Cristo recentemente</div>
            </div>
          </label>

          <label className={`flex items-center gap-3 px-4 py-3 rounded-lg border cursor-pointer transition-colors ${
            form.novo_convertido === false
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-200 bg-white hover:border-blue-300'
          }`}>
            <input
              type="radio"
              name="novo_convertido"
              checked={form.novo_convertido === false}
              onChange={() => onChange({ ...form, novo_convertido: false })}
              className="hidden"
            />
            <div className={`w-4 h-4 rounded-full border-2 shrink-0 ${form.novo_convertido === false ? 'border-blue-500 bg-blue-500' : 'border-gray-300'}`} />
            <div>
              <div className="text-sm font-medium text-gray-800">Já é cristão</div>
              <div className="text-xs text-gray-400">Já tem experiência de fé</div>
            </div>
          </label>

          <label className={`flex items-center gap-3 px-4 py-3 rounded-lg border cursor-pointer transition-colors ${
            form.novo_convertido === undefined
              ? 'border-gray-400 bg-gray-50'
              : 'border-gray-200 bg-white hover:border-gray-300'
          }`}>
            <input
              type="radio"
              name="novo_convertido"
              checked={form.novo_convertido === undefined}
              onChange={() => onChange({ ...form, novo_convertido: undefined })}
              className="hidden"
            />
            <div className={`w-4 h-4 rounded-full border-2 shrink-0 ${form.novo_convertido === undefined ? 'border-gray-500 bg-gray-500' : 'border-gray-300'}`} />
            <div>
              <div className="text-sm font-medium text-gray-800">Não informado</div>
              <div className="text-xs text-gray-400">Deixar em aberto por ora</div>
            </div>
          </label>
        </div>
      </div>
    </div>
  )
}

// ─── Modal principal ──────────────────────────────────────────────────────────

interface Props {
  visitante: Member | null
  onClose: () => void
  onSave: (data: Partial<Member>) => void | Promise<void>
}

const tabs = [
  { id: 'perfil', label: 'Perfil', icon: <User size={13} /> },
  { id: 'contatos', label: 'Contatos', icon: <Phone size={13} /> },
  { id: 'conexao', label: 'Conexão', icon: <Link size={13} /> },
]

const defaultForm: Partial<Member> = {
  status: 'ativo',
  sex: 'masculino',
  member_type: 'visitante',
}

export default function VisitanteModal({ visitante, onClose, onSave }: Props) {
  const confirm = useConfirm()
  const toast = useToast()
  const { selectedChurch, churches } = useChurch()
  const containerRef = useModalUX({ onClose })
  const [activeTab, setActiveTab] = useState('perfil')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const initialChurchId = visitante?.church_id
    ?? selectedChurch?.id
    ?? churches[0]?.id
    ?? DEFAULT_CHURCH_ID
  const [form, setForm] = useState<Partial<Member>>(visitante ?? { ...defaultForm, church_id: initialChurchId })
  const [contacts, setContacts] = useState<Partial<MemberContact>>(
    visitante?.contacts ?? { emails: [''], phones: [''] }
  )

  useEffect(() => {
    setForm(visitante ?? { ...defaultForm, church_id: initialChurchId })
    setContacts(visitante?.contacts ?? { emails: [''], phones: [''] })
    setActiveTab('perfil')
  }, [visitante, initialChurchId])

  const isEditing = !!visitante

  const handleSave = async () => {
    if (saving || deleting) return
    const errs: Record<string, string> = {}
    if (!form.name?.trim()) errs.name = 'Nome completo é obrigatório.'
    if (!form.church_id?.trim()) errs.church_id = 'Selecione a igreja.'
    setErrors(errs)
    if (Object.keys(errs).length) {
      setActiveTab('perfil')
      toast.warning(`Preencha os campos obrigatórios: ${Object.values(errs).join(' ')}`)
      return
    }
    setSaving(true)
    try {
      await onSave({ ...form, contacts, member_type: 'visitante' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center sm:p-4 bg-black/50">
      <div ref={containerRef} className="bg-white sm:rounded-xl shadow-2xl w-full max-w-2xl h-full sm:h-auto sm:max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-200 bg-gray-50 rounded-t-xl">
          <div>
            <h2 className="font-semibold text-gray-800">
              {isEditing ? `Editar visitante: ${visitante.name}` : 'Adicionar visitante'}
            </h2>
            <p className="text-xs text-gray-500">Secretaria / Visitantes</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-200 rounded-lg transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 px-4 pt-2 gap-0.5">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-t-md transition-colors whitespace-nowrap ${
                activeTab === t.id
                  ? 'bg-rose-500 text-white'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {activeTab === 'perfil' && (
            <TabPerfilVisitante form={form} onChange={setForm} errors={errors} />
          )}
          {activeTab === 'contatos' && (
            <TabContatosVisitante contacts={contacts} onChange={setContacts} />
          )}
          {activeTab === 'conexao' && (
            <TabConexaoVisitante form={form} onChange={setForm} />
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-gray-200 bg-gray-50 rounded-b-xl">
          <button onClick={onClose} className="btn-secondary" disabled={saving || deleting}>Fechar</button>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setForm(visitante ?? defaultForm); setContacts({ emails: [''], phones: [''] }) }}
              className="btn-outline"
              disabled={saving || deleting}
            >
              Limpar
            </button>
            {isEditing && (
              <button
                className="btn-danger inline-flex items-center gap-1.5"
                disabled={saving || deleting}
                onClick={async () => {
                  if (saving || deleting) return
                  const ok = await confirm({
                    title: 'Excluir visitante',
                    message: 'Deseja realmente excluir este visitante?',
                    danger: true,
                  })
                  if (!ok) return
                  setDeleting(true)
                  try {
                    await onSave({ ...form, status: 'deleted' })
                    onClose()
                  } finally {
                    setDeleting(false)
                  }
                }}
              >
                {deleting && <Loader2 size={13} className="animate-spin" />}
                {deleting ? 'Excluindo...' : 'Excluir'}
              </button>
            )}
            <button
              onClick={handleSave}
              className="btn-primary inline-flex items-center gap-1.5 disabled:opacity-60"
              disabled={saving || deleting}
            >
              {saving && <Loader2 size={13} className="animate-spin" />}
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
