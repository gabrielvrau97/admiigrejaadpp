import React, { useState, useEffect } from 'react'
import { X, User, Phone, Users, Link, Church as ChurchIcon, Settings, Loader2 } from 'lucide-react'
import type { Member, MemberFamily } from '../../types'
import { useChurch } from '../../contexts/ChurchContext'
import { DEFAULT_CHURCH_ID } from '../../lib/supabase'
import TabPerfil from './tabs/TabPerfil'
import TabContatos from './tabs/TabContatos'
import TabFamilia from './tabs/TabFamilia'
import TabConexao from './tabs/TabConexao'
import TabMinisterio from './tabs/TabMinisterio'
import TabAdministrativo from './tabs/TabAdministrativo'
import { useConfirm, useToast } from '../ui/UIProvider'
import { useModalUX } from '../../hooks/useModalUX'

interface Props {
  member: Member | null
  onClose: () => void
  onSave: (data: Partial<Member>) => void | Promise<void>
}

const tabs = [
  { id: 'perfil', label: 'Perfil', icon: <User size={13} /> },
  { id: 'contatos', label: 'Contatos', icon: <Phone size={13} /> },
  { id: 'familia', label: 'Família', icon: <Users size={13} /> },
  { id: 'conexao', label: 'Conexão', icon: <Link size={13} /> },
  { id: 'ministerio', label: 'Ministério', icon: <ChurchIcon size={13} /> },
  { id: 'administrativo', label: 'Administrativo', icon: <Settings size={13} /> },
]

const defaultForm: Partial<Member> = {
  status: 'ativo',
  sex: 'masculino',
  nationality: 'Brasil',
}

const defaultFamily: Partial<MemberFamily> = {
  children: [],
}

export default function MemberModal({ member, onClose, onSave }: Props) {
  const confirm = useConfirm()
  const toast = useToast()
  const { selectedChurch, churches } = useChurch()
  const containerRef = useModalUX({ onClose })
  const [activeTab, setActiveTab] = useState('perfil')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const initialChurchId = member?.church_id
    ?? selectedChurch?.id
    ?? churches[0]?.id
    ?? DEFAULT_CHURCH_ID
  const [form, setForm] = useState<Partial<Member>>(member ?? { ...defaultForm, church_id: initialChurchId })
  const [contacts, setContacts] = useState<Partial<import('../../types').MemberContact>>(member?.contacts ?? { emails: [''], phones: [''] })
  const [ministry, setMinistry] = useState<Partial<import('../../types').MemberMinistry>>(member?.ministry ?? { titles: [], ministries: [], departments: [], functions: [] })
  const [family, setFamily] = useState<Partial<MemberFamily>>(member?.family ?? defaultFamily)

  useEffect(() => {
    setForm(member ?? { ...defaultForm, church_id: initialChurchId })
    setContacts(member?.contacts ?? { emails: [''], phones: [''] })
    setMinistry(member?.ministry ?? { titles: [], ministries: [], departments: [], functions: [] })
    setFamily(member?.family ?? defaultFamily)
    setActiveTab('perfil')
  }, [member, initialChurchId])

  const isEditing = !!member

  const validate = (): { ok: boolean; errs: Record<string, string>; firstTab?: string } => {
    const errs: Record<string, string> = {}
    let firstTab: string | undefined

    // Aba Perfil
    if (!form.name?.trim()) {
      errs.name = 'Nome completo é obrigatório.'
      firstTab ??= 'perfil'
    }
    if (!form.status) {
      errs.status = 'Selecione o status.'
      firstTab ??= 'perfil'
    }
    if (!form.sex) {
      errs.sex = 'Selecione o sexo.'
      firstTab ??= 'perfil'
    }
    if (!form.birth_date) {
      errs.birth_date = 'Data de nascimento é obrigatória.'
      firstTab ??= 'perfil'
    }
    if (!form.civil_status) {
      errs.civil_status = 'Selecione o estado civil.'
      firstTab ??= 'perfil'
    }

    // Aba Contatos
    if (!contacts.city?.trim()) {
      errs.city = 'Cidade é obrigatória.'
      firstTab ??= 'contatos'
    }

    // Aba Administrativo
    if (!form.church_id?.trim()) {
      errs.church_id = 'Selecione a igreja.'
      firstTab ??= 'administrativo'
    }
    if (!form.entry_date) {
      errs.entry_date = 'Data de entrada é obrigatória.'
      firstTab ??= 'administrativo'
    }

    return { ok: Object.keys(errs).length === 0, errs, firstTab }
  }

  const handleSave = async () => {
    if (saving || deleting) return  // bloqueia duplo-clique
    const { ok, errs, firstTab } = validate()
    setErrors(errs)
    if (!ok) {
      if (firstTab) setActiveTab(firstTab)
      const lista = Object.values(errs).join(' ')
      toast.warning(`Preencha os campos obrigatórios: ${lista}`)
      return
    }
    setSaving(true)
    try {
      await onSave({ ...form, contacts, ministry, family })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center sm:p-4 bg-black/50" role="dialog" aria-modal="true" aria-labelledby="member-modal-title">
      <div ref={containerRef} className="bg-white sm:rounded-xl shadow-2xl w-full max-w-4xl h-full sm:h-auto sm:max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 border-b border-gray-200 bg-gray-50 sm:rounded-t-xl">
          <div>
            <h2 id="member-modal-title" className="font-semibold text-gray-800">
              {isEditing ? `Editar membro: ${member.name}` : 'Adicionar membro'}
            </h2>
            <p className="text-xs text-gray-500">Secretaria / Membros</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-200 rounded-lg transition-colors" aria-label="Fechar modal">
            <X size={16} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 overflow-x-auto px-4 pt-2 gap-0.5">
          {tabs.map(t => {
            const perfilErr = errors.name || errors.status || errors.sex || errors.birth_date || errors.civil_status
            const contatosErr = errors.city
            const administrativoErr = errors.church_id || errors.entry_date
            const tabErr = (t.id === 'perfil' && perfilErr)
              || (t.id === 'contatos' && contatosErr)
              || (t.id === 'administrativo' && administrativoErr)
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-t-md transition-colors whitespace-nowrap relative ${
                  activeTab === t.id
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                {t.icon}
                {t.label}
                {tabErr && <span className="ml-1 w-1.5 h-1.5 rounded-full bg-red-500" aria-label="Pendência nesta aba" />}
              </button>
            )
          })}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-5">
          {activeTab === 'perfil' && (
            <TabPerfil form={form} onChange={setForm} editingId={member?.id} errors={errors} />
          )}
          {activeTab === 'contatos' && (
            <TabContatos contacts={contacts} onChange={setContacts} errors={errors} />
          )}
          {activeTab === 'familia' && (
            <TabFamilia family={family} onChange={setFamily} editingId={member?.id} />
          )}
          {activeTab === 'conexao' && (
            <TabConexao family={family} />
          )}
          {activeTab === 'ministerio' && (
            <TabMinisterio ministry={ministry} onChange={setMinistry} form={form} onChangeForm={setForm} />
          )}
          {activeTab === 'administrativo' && (
            <TabAdministrativo form={form} onChange={setForm} errors={errors} />
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-2 px-4 sm:px-5 py-3 border-t border-gray-200 bg-gray-50 sm:rounded-b-xl flex-wrap">
          <button onClick={onClose} className="btn-secondary" disabled={saving || deleting}>Fechar</button>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => { setForm(member ?? defaultForm); setFamily(defaultFamily) }}
              className="btn-outline hidden sm:inline-flex"
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
                    title: 'Excluir membro',
                    message: 'Deseja realmente excluir este membro?',
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
