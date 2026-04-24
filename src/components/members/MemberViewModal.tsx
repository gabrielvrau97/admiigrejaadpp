import { X, User, Phone, Users, Church as ChurchIcon, Settings, Heart, Printer } from 'lucide-react'
import type { Member } from '../../types'
import { fmtDate, getAge } from '../../lib/format'
import { useModalUX } from '../../hooks/useModalUX'

interface Props {
  member: Member
  onClose: () => void
  onEdit?: () => void
  onPrint?: () => void
}

function civilLabel(cs?: string) {
  const map: Record<string, string> = {
    solteiro: 'Solteiro(a)', casado: 'Casado(a)',
    viuvo: 'Viúvo(a)', divorciado: 'Divorciado(a)', uniao_estavel: 'União Estável',
  }
  return cs ? (map[cs] ?? cs) : '—'
}

function statusLabel(s?: string) {
  const map: Record<string, string> = { ativo: 'Ativo', inativo: 'Inativo', indisponivel: 'Indisponível', deleted: 'Excluído' }
  return s ? (map[s] ?? s) : '—'
}

function statusBadgeClass(s?: string) {
  if (s === 'ativo') return 'badge-green'
  if (s === 'inativo') return 'badge-red'
  if (s === 'indisponivel') return 'badge-yellow'
  return 'badge-gray'
}

function Field({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-0.5">{label}</div>
      <div className="text-sm text-gray-800">{value && value !== '' ? value : <span className="text-gray-300">—</span>}</div>
    </div>
  )
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="card p-4">
      <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-100">
        <div className="w-7 h-7 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center">{icon}</div>
        <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-3">
        {children}
      </div>
    </div>
  )
}

export default function MemberViewModal({ member, onClose, onEdit, onPrint }: Props) {
  const containerRef = useModalUX({ onClose })
  const m = member
  const age = getAge(m.birth_date)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center sm:p-4 bg-black/50">
      <div ref={containerRef} className="bg-white sm:rounded-xl shadow-2xl w-full max-w-4xl h-full sm:h-auto sm:max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between gap-2 px-4 sm:px-5 py-3.5 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50 sm:rounded-t-xl">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-base sm:text-lg font-bold shadow-md shrink-0">
              {m.name?.[0] ?? '?'}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-semibold text-gray-800 text-sm sm:text-base truncate">{m.name}</h2>
                <span className={statusBadgeClass(m.status)}>{statusLabel(m.status)}</span>
              </div>
              <p className="text-xs text-gray-500 truncate">
                Visualização de cadastro
                {m.church?.name && <> · {m.church.name}</>}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {onPrint && (
              <button onClick={onPrint} className="btn-outline hidden sm:flex items-center gap-1.5" title="Imprimir cadastro">
                <Printer size={14} />
                <span>Imprimir</span>
              </button>
            )}
            {onEdit && (
              <button onClick={onEdit} className="btn-primary hidden sm:flex items-center gap-1.5" title="Editar cadastro">
                <span>Editar</span>
              </button>
            )}
            <button onClick={onClose} className="p-1.5 hover:bg-white/60 rounded-lg transition-colors" title="Fechar">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-4 bg-gray-50">
          <Section icon={<User size={14} />} title="Identificação">
            <Field label="Nome completo" value={m.name} />
            <Field label="Data de nascimento" value={fmtDate(m.birth_date)} />
            <Field label="Idade" value={age !== null ? `${age} anos` : '—'} />
            <Field label="Sexo" value={m.sex === 'masculino' ? 'Masculino' : m.sex === 'feminino' ? 'Feminino' : '—'} />
            <Field label="Estado civil" value={civilLabel(m.civil_status)} />
            <Field label="Nacionalidade" value={m.nationality} />
            <Field label="Naturalidade" value={m.naturalidade} />
            <Field label="CPF" value={m.cpf} />
            <Field label="Identidade" value={m.identity} />
            <Field label="Escolaridade" value={m.schooling} />
            <Field label="Profissão" value={m.occupation} />
            <Field label="Código auxiliar" value={m.code} />
          </Section>

          <Section icon={<Phone size={14} />} title="Contatos">
            <Field label="Celular 1" value={m.contacts?.cellphone1 ?? m.contacts?.phones?.[0]} />
            <Field label="Telefone / Celular 2" value={m.contacts?.phones?.[1]} />
            <Field label="E-mail 1" value={m.contacts?.emails?.[0]} />
            <Field label="E-mail 2" value={m.contacts?.emails?.[1]} />
            <Field label="CEP" value={m.contacts?.cep} />
            <Field label="Endereço" value={m.contacts?.address} />
            <Field label="Número" value={m.contacts?.number} />
            <Field label="Complemento" value={m.contacts?.complement} />
            <Field label="Bairro" value={m.contacts?.neighborhood} />
            <Field label="Cidade" value={m.contacts?.city} />
            <Field label="Estado" value={m.contacts?.state} />
            <Field label="País" value={m.contacts?.country ?? 'Brasil'} />
          </Section>

          <Section icon={<Users size={14} />} title="Família">
            <Field label="Cônjuge" value={m.family?.spouse_name} />
            <Field label="Nasc. cônjuge" value={fmtDate(m.family?.spouse_birth_date)} />
            <Field label="Data do casamento" value={fmtDate(m.family?.wedding_date)} />
            <Field label="Nome do pai" value={m.family?.father_name} />
            <Field label="Nome da mãe" value={m.family?.mother_name} />
            <Field
              label={`Filhos (${m.family?.children?.length ?? 0})`}
              value={
                m.family?.children && m.family.children.length > 0
                  ? m.family.children.map(c => c.name + (c.birth_date ? ` (${fmtDate(c.birth_date)})` : '')).join(', ')
                  : '—'
              }
            />
          </Section>

          <Section icon={<Heart size={14} />} title="Vida Espiritual">
            <Field label="Convertido" value={m.conversion ? 'Sim' : 'Não'} />
            <Field label="Data da conversão" value={fmtDate(m.conversion_date)} />
            <Field label="Batismo nas águas" value={m.baptism ? 'Sim' : 'Não'} />
            <Field label="Data batismo águas" value={fmtDate(m.baptism_date)} />
            <Field label="Batismo no Espírito" value={m.baptism_spirit ? 'Sim' : 'Não'} />
            <Field label="Data batismo Espírito" value={fmtDate(m.baptism_spirit_date)} />
          </Section>

          <Section icon={<ChurchIcon size={14} />} title="Ministério">
            <Field label="Títulos" value={m.ministry?.titles?.join(', ')} />
            <Field label="Ministérios" value={m.ministry?.ministries?.join(', ')} />
            <Field label="Departamentos" value={m.ministry?.departments?.join(', ')} />
            <Field label="Funções" value={m.ministry?.functions?.join(', ')} />
            <Field label="Companheiro(a)" value={m.ministry?.companion} />
          </Section>

          <Section icon={<Settings size={14} />} title="Administrativo">
            <Field label="Igreja" value={m.church?.name} />
            <Field label="Status" value={<span className={statusBadgeClass(m.status)}>{statusLabel(m.status)}</span>} />
            <Field label="Data de entrada" value={fmtDate(m.entry_date)} />
            <Field label="Motivo de entrada" value={m.entry_reason} />
            <Field label="Igreja de origem" value={m.origin_church} />
            <Field label="Como chegou" value={m.how_arrived} />
            <Field label="Data de saída" value={fmtDate(m.exit_date)} />
            <Field label="Motivo de saída" value={m.exit_reason} />
            <Field label="Cadastrado em" value={fmtDate(m.created_at?.slice(0, 10))} />
            <Field label="Atualizado em" value={fmtDate(m.updated_at?.slice(0, 10))} />
          </Section>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-4 sm:px-5 py-3 border-t border-gray-200 bg-white sm:rounded-b-xl flex-wrap">
          <button onClick={onClose} className="btn-secondary">Fechar</button>
          {onPrint && (
            <button onClick={onPrint} className="btn-outline flex items-center gap-1.5">
              <Printer size={14} />
              <span className="hidden sm:inline">Imprimir cadastro</span>
              <span className="sm:hidden">Imprimir</span>
            </button>
          )}
          {onEdit && (
            <button onClick={onEdit} className="btn-primary">Editar</button>
          )}
        </div>
      </div>
    </div>
  )
}
