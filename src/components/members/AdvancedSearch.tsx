import React, { useState } from 'react'
import { X, Search, RotateCcw } from 'lucide-react'
import { useConfig } from '../../contexts/ConfigContext'
import { mockChurches } from '../../lib/mockData'
import type { Member } from '../../types'

// ── Tipos ────────────────────────────────────────────────────────────────────

export interface SelectionFilters {
  status: string
  sexo: string
  estado_civil: string
  nacionalidade: string
  tem_filhos: string
  escolaridade: string
  titulo: string
  funcao: string
  motivo_saida: string
  motivo_entrada: string
  convertido: string
  batizado_aguas: string
  batizado_espirito: string
  igreja: string
  // períodos (strings 'YYYY-MM-DD')
  nascimento_de: string
  nascimento_ate: string
  registro_de: string
  registro_ate: string
  conversao_de: string
  conversao_ate: string
  casamento_de: string
  casamento_ate: string
  batismo_de: string
  batismo_ate: string
  entrada_de: string
  entrada_ate: string
  // faixa etária
  idade_min: string
  idade_max: string
}

export interface SimilarityFilters {
  nome: string
  apelido: string
  naturalidade: string
  cpf: string
  profissao: string
  origem_igreja: string
  email: string
  telefone: string
  celular: string
  nome_pai: string
  nome_mae: string
  nome_conjuge: string
  endereco: string
  bairro: string
  cidade: string
}

export const EMPTY_SELECTION: SelectionFilters = {
  status: '', sexo: '', estado_civil: '', nacionalidade: '', tem_filhos: '',
  escolaridade: '', titulo: '', funcao: '', motivo_saida: '', motivo_entrada: '',
  convertido: '', batizado_aguas: '', batizado_espirito: '', igreja: '',
  nascimento_de: '', nascimento_ate: '', registro_de: '', registro_ate: '',
  conversao_de: '', conversao_ate: '', casamento_de: '', casamento_ate: '',
  batismo_de: '', batismo_ate: '', entrada_de: '', entrada_ate: '',
  idade_min: '', idade_max: '',
}

export const EMPTY_SIMILARITY: SimilarityFilters = {
  nome: '', apelido: '', naturalidade: '', cpf: '', profissao: '',
  origem_igreja: '', email: '', telefone: '', celular: '',
  nome_pai: '', nome_mae: '', nome_conjuge: '', endereco: '', bairro: '', cidade: '',
}

// ── Helpers de filtro (aplicados externamente em MembrosPage) ─────────────

function getAge(birth_date?: string): number | null {
  if (!birth_date) return null
  const diff = Date.now() - new Date(birth_date + 'T00:00:00').getTime()
  return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25))
}

function inDateRange(dateStr: string | undefined, from: string, to: string): boolean {
  if (!dateStr) return false
  if (from && dateStr < from) return false
  if (to && dateStr > to) return false
  return true
}

export function applySelectionFilters(data: Member[], f: SelectionFilters): Member[] {
  return data.filter(m => {
    if (f.status && m.status !== f.status) return false
    if (f.sexo && m.sex !== f.sexo) return false
    if (f.estado_civil && m.civil_status !== f.estado_civil) return false
    if (f.nacionalidade && !(m.nationality ?? '').toLowerCase().includes(f.nacionalidade.toLowerCase())) return false
    if (f.tem_filhos === 'sim' && !(m.family?.children && m.family.children.length > 0)) return false
    if (f.tem_filhos === 'nao' && (m.family?.children && m.family.children.length > 0)) return false
    if (f.escolaridade && m.schooling !== f.escolaridade) return false
    if (f.titulo && !(m.ministry?.titles ?? []).includes(f.titulo)) return false
    if (f.funcao && !(m.ministry?.functions ?? []).includes(f.funcao)) return false
    if (f.motivo_saida && m.exit_reason !== f.motivo_saida) return false
    if (f.motivo_entrada && m.entry_reason !== f.motivo_entrada) return false
    if (f.convertido === 'sim' && !m.conversion) return false
    if (f.convertido === 'nao' && m.conversion) return false
    if (f.batizado_aguas === 'sim' && !m.baptism) return false
    if (f.batizado_aguas === 'nao' && m.baptism) return false
    if (f.batizado_espirito === 'sim' && !m.baptism_spirit) return false
    if (f.batizado_espirito === 'nao' && m.baptism_spirit) return false
    if (f.igreja && m.church_id !== f.igreja) return false

    // períodos
    if ((f.nascimento_de || f.nascimento_ate) && !inDateRange(m.birth_date, f.nascimento_de, f.nascimento_ate)) return false
    if ((f.registro_de || f.registro_ate) && !inDateRange(m.created_at?.slice(0, 10), f.registro_de, f.registro_ate)) return false
    if ((f.conversao_de || f.conversao_ate) && !inDateRange(m.conversion_date, f.conversao_de, f.conversao_ate)) return false
    if ((f.casamento_de || f.casamento_ate) && !inDateRange(m.family?.wedding_date, f.casamento_de, f.casamento_ate)) return false
    if ((f.batismo_de || f.batismo_ate) && !inDateRange(m.baptism_date, f.batismo_de, f.batismo_ate)) return false
    if ((f.entrada_de || f.entrada_ate) && !inDateRange(m.entry_date, f.entrada_de, f.entrada_ate)) return false

    // faixa etária
    if (f.idade_min || f.idade_max) {
      const age = getAge(m.birth_date)
      if (age === null) return false
      if (f.idade_min && age < parseInt(f.idade_min)) return false
      if (f.idade_max && age > parseInt(f.idade_max)) return false
    }

    return true
  })
}

export function applySimilarityFilters(data: Member[], f: SimilarityFilters): Member[] {
  // Só aplica filtro se o usuário digitou algo (trim !== '')
  // Se valor do cadastro é undefined/null, considera como não-match (exceto se query vazia)
  const matches = (val: string | undefined | null, q: string) => {
    if (q.trim() === '') return true
    if (val === undefined || val === null || val === '') return false
    return val.toString().toLowerCase().includes(q.toLowerCase().trim())
  }

  const matchesDigits = (val: string | undefined | null, q: string) => {
    const qd = q.replace(/\D/g, '')
    if (qd === '') return true
    if (val === undefined || val === null || val === '') return false
    return val.replace(/\D/g, '').includes(qd)
  }

  return data.filter(m => {
    if (!matches(m.name, f.nome)) return false
    if (!matches(m.apelido, f.apelido)) return false
    if (!matches(m.naturalidade, f.naturalidade)) return false
    if (!matchesDigits(m.cpf, f.cpf)) return false
    if (!matches(m.occupation, f.profissao)) return false
    if (!matches(m.origin_church, f.origem_igreja)) return false
    if (f.email.trim()) {
      const q = f.email.toLowerCase().trim()
      const emails = m.contacts?.emails ?? []
      if (!emails.some(e => (e ?? '').toLowerCase().includes(q))) return false
    }
    if (f.telefone.trim()) {
      const qd = f.telefone.replace(/\D/g, '')
      if (qd) {
        const phones = (m.contacts?.phones ?? []).map(p => (p ?? '').replace(/\D/g, ''))
        if (!phones.some(p => p.includes(qd))) return false
      }
    }
    if (f.celular.trim()) {
      const qd = f.celular.replace(/\D/g, '')
      if (qd) {
        const candidates = [
          (m.contacts?.cellphone1 ?? '').replace(/\D/g, ''),
          ...((m.contacts?.phones ?? []).map(p => (p ?? '').replace(/\D/g, ''))),
        ].filter(Boolean)
        if (!candidates.some(c => c.includes(qd))) return false
      }
    }
    if (!matches(m.family?.father_name, f.nome_pai)) return false
    if (!matches(m.family?.mother_name, f.nome_mae)) return false
    if (!matches(m.family?.spouse_name, f.nome_conjuge)) return false
    if (!matches(m.contacts?.address, f.endereco)) return false
    if (!matches(m.contacts?.neighborhood, f.bairro)) return false
    if (!matches(m.contacts?.city, f.cidade)) return false
    return true
  })
}

// ── Sub-componentes de formulário ────────────────────────────────────────────

function Select({ label, value, onChange, options }: {
  label: string
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">{label}</label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="form-input text-sm py-1.5"
      >
        <option value="">Todos</option>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  )
}

function TextInput({ label, value, onChange, placeholder }: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">{label}</label>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder ?? ''}
        className="form-input text-sm py-1.5"
      />
    </div>
  )
}

function DateRange({ label, from, to, onFrom, onTo }: {
  label: string
  from: string
  to: string
  onFrom: (v: string) => void
  onTo: (v: string) => void
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">{label}</label>
      <div className="flex items-center gap-1.5">
        <input type="date" value={from} onChange={e => onFrom(e.target.value)} className="form-input text-sm py-1.5 flex-1" />
        <span className="text-gray-400 text-xs shrink-0">até</span>
        <input type="date" value={to} onChange={e => onTo(e.target.value)} className="form-input text-sm py-1.5 flex-1" />
      </div>
    </div>
  )
}

// ── Painel principal ─────────────────────────────────────────────────────────

const ESCOLARIDADE_OPTIONS = [
  'Educação Infantil', 'Ensino Fundamental Incompleto', 'Ensino Fundamental Completo',
  'Ensino Médio Incompleto', 'Ensino Médio Completo', 'Ensino Superior Incompleto',
  'Ensino Superior Completo', 'Pós-graduação', 'Mestrado', 'Doutorado',
]

const SIM_NAO = [{ value: 'sim', label: 'Sim' }, { value: 'nao', label: 'Não' }]

interface AdvancedSearchProps {
  onApply: (sel: SelectionFilters, sim: SimilarityFilters) => void
  onClose: () => void
  initialSel?: SelectionFilters
  initialSim?: SimilarityFilters
}

export default function AdvancedSearch({ onApply, onClose, initialSel, initialSim }: AdvancedSearchProps) {
  const { config } = useConfig()
  const [tab, setTab] = useState<'selecao' | 'semelhanca'>('selecao')
  const [sel, setSel] = useState<SelectionFilters>(initialSel ?? EMPTY_SELECTION)
  const [sim, setSim] = useState<SimilarityFilters>(initialSim ?? EMPTY_SIMILARITY)

  const setS = <K extends keyof SelectionFilters>(k: K, v: SelectionFilters[K]) =>
    setSel(prev => ({ ...prev, [k]: v }))
  const setSim2 = <K extends keyof SimilarityFilters>(k: K, v: SimilarityFilters[K]) =>
    setSim(prev => ({ ...prev, [k]: v }))

  const countSel = Object.values(sel).filter(v => v !== '').length
  const countSim = Object.values(sim).filter(v => v !== '').length
  const total = countSel + countSim

  const handleApply = () => { onApply(sel, sim); onClose() }
  const handleReset = () => { setSel(EMPTY_SELECTION); setSim(EMPTY_SIMILARITY) }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 sm:pt-8 sm:px-4 sm:pb-4">
      <div className="bg-white sm:rounded-xl shadow-2xl w-full max-w-3xl h-full sm:h-auto sm:max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 shrink-0">
          <div>
            <h2 className="font-semibold text-gray-800 flex items-center gap-2">
              <Search size={16} className="text-blue-600" />
              Pesquisa avançada
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">Secretaria / Membros</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded text-gray-400">
            <X size={16} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 shrink-0">
          {[
            { id: 'selecao', label: 'Por Seleção' },
            { id: 'semelhanca', label: 'Por Semelhança' },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id as typeof tab)}
              className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                tab === t.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {t.label}
            </button>
          ))}
          {total > 0 && (
            <span className="ml-auto self-center mr-4 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
              {total} filtro{total > 1 ? 's' : ''} ativo{total > 1 ? 's' : ''}
            </span>
          )}
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 p-5">

          {/* ── TAB SELEÇÃO ── */}
          {tab === 'selecao' && (
            <div className="space-y-6">

              <div>
                <h3 className="text-xs font-semibold text-blue-600 uppercase tracking-wider mb-3">Perfil</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <Select label="Status" value={sel.status} onChange={v => setS('status', v)}
                    options={[
                      { value: 'ativo', label: 'Ativo' },
                      { value: 'inativo', label: 'Inativo' },
                      { value: 'indisponivel', label: 'Indisponível' },
                    ]} />
                  <Select label="Sexo" value={sel.sexo} onChange={v => setS('sexo', v)}
                    options={[
                      { value: 'masculino', label: 'Masculino' },
                      { value: 'feminino', label: 'Feminino' },
                    ]} />
                  <Select label="Estado civil" value={sel.estado_civil} onChange={v => setS('estado_civil', v)}
                    options={[
                      { value: 'solteiro', label: 'Solteiro(a)' },
                      { value: 'casado', label: 'Casado(a)' },
                      { value: 'uniao_estavel', label: 'União Estável' },
                      { value: 'divorciado', label: 'Divorciado(a)' },
                      { value: 'viuvo', label: 'Viúvo(a)' },
                    ]} />
                  <Select label="Tem filhos" value={sel.tem_filhos} onChange={v => setS('tem_filhos', v)} options={SIM_NAO} />
                  <Select label="Escolaridade" value={sel.escolaridade} onChange={v => setS('escolaridade', v)}
                    options={ESCOLARIDADE_OPTIONS.map(e => ({ value: e, label: e }))} />
                  <Select label="Igreja" value={sel.igreja} onChange={v => setS('igreja', v)}
                    options={mockChurches.map(c => ({ value: c.id, label: c.name }))} />
                </div>
              </div>

              <div>
                <h3 className="text-xs font-semibold text-blue-600 uppercase tracking-wider mb-3">Ministério</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <Select label="Título" value={sel.titulo} onChange={v => setS('titulo', v)}
                    options={config.titulos.map(t => ({ value: t, label: t }))} />
                  <Select label="Função" value={sel.funcao} onChange={v => setS('funcao', v)}
                    options={config.funcoes.map(f => ({ value: f, label: f }))} />
                  <Select label="Motivo de entrada" value={sel.motivo_entrada} onChange={v => setS('motivo_entrada', v)}
                    options={config.motivosEntrada.map(m => ({ value: m, label: m }))} />
                  <Select label="Motivo de saída" value={sel.motivo_saida} onChange={v => setS('motivo_saida', v)}
                    options={config.motivosSaida.map(m => ({ value: m, label: m }))} />
                </div>
              </div>

              <div>
                <h3 className="text-xs font-semibold text-blue-600 uppercase tracking-wider mb-3">Espiritual</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <Select label="Convertido" value={sel.convertido} onChange={v => setS('convertido', v)} options={SIM_NAO} />
                  <Select label="Batizado nas águas" value={sel.batizado_aguas} onChange={v => setS('batizado_aguas', v)} options={SIM_NAO} />
                  <Select label="Batizado no Espírito" value={sel.batizado_espirito} onChange={v => setS('batizado_espirito', v)} options={SIM_NAO} />
                </div>
              </div>

              <div>
                <h3 className="text-xs font-semibold text-blue-600 uppercase tracking-wider mb-3">Períodos</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <DateRange label="Período de nascimento"
                    from={sel.nascimento_de} to={sel.nascimento_ate}
                    onFrom={v => setS('nascimento_de', v)} onTo={v => setS('nascimento_ate', v)} />
                  <DateRange label="Período de registro"
                    from={sel.registro_de} to={sel.registro_ate}
                    onFrom={v => setS('registro_de', v)} onTo={v => setS('registro_ate', v)} />
                  <DateRange label="Período de conversão"
                    from={sel.conversao_de} to={sel.conversao_ate}
                    onFrom={v => setS('conversao_de', v)} onTo={v => setS('conversao_ate', v)} />
                  <DateRange label="Período de casamento"
                    from={sel.casamento_de} to={sel.casamento_ate}
                    onFrom={v => setS('casamento_de', v)} onTo={v => setS('casamento_ate', v)} />
                  <DateRange label="Período de batismo nas águas"
                    from={sel.batismo_de} to={sel.batismo_ate}
                    onFrom={v => setS('batismo_de', v)} onTo={v => setS('batismo_ate', v)} />
                  <DateRange label="Período de entrada"
                    from={sel.entrada_de} to={sel.entrada_ate}
                    onFrom={v => setS('entrada_de', v)} onTo={v => setS('entrada_ate', v)} />
                </div>
              </div>

              <div>
                <h3 className="text-xs font-semibold text-blue-600 uppercase tracking-wider mb-3">Faixa etária</h3>
                <div className="flex items-center gap-3 max-w-xs">
                  <div className="flex flex-col gap-1 flex-1">
                    <label className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">Idade mínima</label>
                    <input type="number" min={0} max={120} value={sel.idade_min} onChange={e => setS('idade_min', e.target.value)}
                      placeholder="0" className="form-input text-sm py-1.5" />
                  </div>
                  <span className="text-gray-400 text-sm mt-4">até</span>
                  <div className="flex flex-col gap-1 flex-1">
                    <label className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">Idade máxima</label>
                    <input type="number" min={0} max={120} value={sel.idade_max} onChange={e => setS('idade_max', e.target.value)}
                      placeholder="120" className="form-input text-sm py-1.5" />
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* ── TAB SEMELHANÇA ── */}
          {tab === 'semelhanca' && (
            <div className="space-y-6">

              <div>
                <h3 className="text-xs font-semibold text-blue-600 uppercase tracking-wider mb-3">Identificação</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <TextInput label="Nome" value={sim.nome} onChange={v => setSim2('nome', v)} placeholder="Parte do nome..." />
                  <TextInput label="Apelido" value={sim.apelido} onChange={v => setSim2('apelido', v)} />
                  <TextInput label="Naturalidade" value={sim.naturalidade} onChange={v => setSim2('naturalidade', v)} />
                  <TextInput label="CPF (apenas números)" value={sim.cpf} onChange={v => setSim2('cpf', v)} placeholder="Apenas números" />
                  <TextInput label="Profissão" value={sim.profissao} onChange={v => setSim2('profissao', v)} />
                  <TextInput label="Igreja de origem" value={sim.origem_igreja} onChange={v => setSim2('origem_igreja', v)} />
                </div>
              </div>

              <div>
                <h3 className="text-xs font-semibold text-blue-600 uppercase tracking-wider mb-3">Contatos</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <TextInput label="E-mail" value={sim.email} onChange={v => setSim2('email', v)} placeholder="parte@email.com" />
                  <TextInput label="Telefone (apenas números)" value={sim.telefone} onChange={v => setSim2('telefone', v)} />
                  <TextInput label="Celular (apenas números)" value={sim.celular} onChange={v => setSim2('celular', v)} />
                  <TextInput label="Endereço" value={sim.endereco} onChange={v => setSim2('endereco', v)} />
                  <TextInput label="Bairro" value={sim.bairro} onChange={v => setSim2('bairro', v)} />
                  <TextInput label="Cidade" value={sim.cidade} onChange={v => setSim2('cidade', v)} />
                </div>
              </div>

              <div>
                <h3 className="text-xs font-semibold text-blue-600 uppercase tracking-wider mb-3">Família</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <TextInput label="Nome do pai" value={sim.nome_pai} onChange={v => setSim2('nome_pai', v)} />
                  <TextInput label="Nome da mãe" value={sim.nome_mae} onChange={v => setSim2('nome_mae', v)} />
                  <TextInput label="Nome do cônjuge" value={sim.nome_conjuge} onChange={v => setSim2('nome_conjuge', v)} />
                </div>
              </div>

            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-gray-200 flex items-center gap-2 shrink-0">
          <button onClick={handleReset} className="btn-outline flex items-center gap-1.5 text-gray-500">
            <RotateCcw size={13} />
            Limpar tudo
          </button>
          <div className="flex-1" />
          <button onClick={onClose} className="btn-outline">Cancelar</button>
          <button onClick={handleApply} className="btn-primary flex items-center gap-1.5">
            <Search size={13} />
            Pesquisar
          </button>
        </div>
      </div>
    </div>
  )
}
