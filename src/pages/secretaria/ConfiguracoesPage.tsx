import React, { useState } from 'react'
import { Plus, X, GripVertical, Settings, Users, Church, LogIn, LogOut, Tag, Briefcase, Shield } from 'lucide-react'
import { useConfig } from '../../contexts/ConfigContext'

type Section = 'titulos' | 'ministerios' | 'departamentos' | 'funcoes' | 'motivos-entrada' | 'motivos-saida' | 'status'

const sections: { id: Section; label: string; icon: React.ReactNode }[] = [
  { id: 'titulos', label: 'Títulos', icon: <Tag size={15} /> },
  { id: 'ministerios', label: 'Ministérios', icon: <Church size={15} /> },
  { id: 'departamentos', label: 'Departamentos', icon: <Briefcase size={15} /> },
  { id: 'funcoes', label: 'Funções', icon: <Users size={15} /> },
  { id: 'motivos-entrada', label: 'Motivos de entrada', icon: <LogIn size={15} /> },
  { id: 'motivos-saida', label: 'Motivos de saída', icon: <LogOut size={15} /> },
  { id: 'status', label: 'Status de membro', icon: <Shield size={15} /> },
]

const STATUS_LOCKED = ['Ativo', 'Inativo', 'Indisponível']

const descriptions: Record<Section, string> = {
  titulos: 'Designações concedidas a uma pessoa por cargo ministerial ou reconhecimento. Usados no cadastro de membros.',
  ministerios: 'Ministérios disponíveis para vinculação no cadastro de membros.',
  departamentos: 'Departamentos da igreja disponíveis para vinculação no cadastro de membros.',
  funcoes: 'Funções exercidas pelos membros dentro dos ministérios e departamentos.',
  'motivos-entrada': 'Motivos de entrada disponíveis na aba Administrativo do cadastro de membro.',
  'motivos-saida': 'Motivos de saída disponíveis na aba Administrativo do cadastro de membro.',
  status: 'Status disponíveis no cadastro de membros. Os padrão do sistema não podem ser removidos.',
}

const systemItems: Record<Section, string[]> = {
  status: STATUS_LOCKED,
  titulos: [],
  ministerios: [],
  departamentos: [],
  funcoes: [],
  'motivos-entrada': [],
  'motivos-saida': [],
}

function ListEditor({
  items,
  onChange,
  systemLocked,
  readonly = false,
}: {
  items: string[]
  onChange: (v: string[]) => void
  systemLocked: string[]
  readonly?: boolean
}) {
  const [input, setInput] = useState('')
  const [error, setError] = useState('')

  const add = () => {
    const val = input.trim()
    if (!val) return
    if (items.map(i => i.toLowerCase()).includes(val.toLowerCase())) {
      setError('Este item já existe na lista.')
      return
    }
    onChange([...items, val])
    setInput('')
    setError('')
  }

  const remove = (item: string) => {
    onChange(items.filter(i => i !== item))
  }

  return (
    <div className="space-y-3">
      {!readonly && (
        <>
          <div className="flex gap-2">
            <input
              className="form-input flex-1"
              value={input}
              onChange={e => { setInput(e.target.value); setError('') }}
              onKeyDown={e => e.key === 'Enter' && add()}
              placeholder="Digite e pressione Enter ou clique em Adicionar"
            />
            <button type="button" onClick={add} className="btn-primary flex items-center gap-1.5 whitespace-nowrap">
              <Plus size={13} /> Adicionar
            </button>
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
        </>
      )}
      {readonly && (
        <p className="text-xs text-gray-400 italic">Estes status são definidos pelo sistema e não podem ser alterados.</p>
      )}

      <div className="border border-gray-200 rounded-lg divide-y divide-gray-100">
        {items.length === 0 && (
          <div className="py-6 text-center text-sm text-gray-400">Nenhum item cadastrado.</div>
        )}
        {items.map((item, i) => {
          const locked = systemLocked.includes(item)
          return (
            <div
              key={i}
              className={`flex items-center gap-2 px-3 py-2.5 group ${locked ? 'bg-gray-50' : 'hover:bg-blue-50/40'}`}
            >
              <GripVertical size={13} className="text-gray-300 shrink-0" />
              <span className={`flex-1 text-sm ${locked ? 'text-gray-400' : 'text-gray-700'}`}>
                {item}
              </span>
              {locked ? (
                <span className="text-[10px] text-gray-400 bg-gray-200 px-1.5 py-0.5 rounded">padrão</span>
              ) : (
                <button
                  type="button"
                  onClick={() => remove(item)}
                  className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 transition-all"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          )
        })}
      </div>
      <p className="text-xs text-gray-400">{items.length} {items.length === 1 ? 'item' : 'itens'}</p>
    </div>
  )
}

type ConfigKey = 'titulos' | 'ministerios' | 'departamentos' | 'funcoes' | 'motivosEntrada' | 'motivosSaida'

const sectionToKey: Record<Section, ConfigKey | null> = {
  titulos: 'titulos',
  ministerios: 'ministerios',
  departamentos: 'departamentos',
  funcoes: 'funcoes',
  'motivos-entrada': 'motivosEntrada',
  'motivos-saida': 'motivosSaida',
  status: null,
}

const keyToCategory: Record<ConfigKey, 'titulo' | 'ministerio' | 'departamento' | 'funcao' | 'motivo_entrada' | 'motivo_saida'> = {
  titulos: 'titulo',
  ministerios: 'ministerio',
  departamentos: 'departamento',
  funcoes: 'funcao',
  motivosEntrada: 'motivo_entrada',
  motivosSaida: 'motivo_saida',
}

export default function ConfiguracoesPage() {
  const [active, setActive] = useState<Section>('titulos')
  const { config, addItem, removeItem } = useConfig()
  const [saved, setSaved] = useState(false)

  const currentSection = sections.find(s => s.id === active)!
  const configKey = sectionToKey[active]

  const currentItems: string[] = active === 'status'
    ? STATUS_LOCKED
    : configKey ? config[configKey] : []

  const handleChange = async (v: string[]) => {
    if (!configKey) return
    const cat = keyToCategory[configKey]
    const before = currentItems
    const added = v.filter(x => !before.includes(x))
    const removed = before.filter(x => !v.includes(x))
    try {
      for (const a of added) await addItem(cat, a)
      for (const r of removed) await removeItem(cat, r)
    } catch (err) {
      console.error('[Configuracoes] erro ao salvar:', err)
    }
  }

  const handleSave = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="p-2 sm:p-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-3 mb-4 sm:mb-6">
        <Settings size={20} className="text-blue-600" />
        <div>
          <h1 className="text-lg font-semibold text-gray-800">Configurações</h1>
          <p className="text-xs text-gray-500">Secretaria / Configurações</p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-4 lg:gap-5">
        <aside className="w-full lg:w-52 lg:shrink-0">
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-3 py-2 bg-gray-50 border-b border-gray-200">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Seções</p>
            </div>
            <nav className="p-1.5 space-y-0.5">
              {sections.map(s => (
                <button
                  key={s.id}
                  onClick={() => setActive(s.id)}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors text-left ${
                    active === s.id
                      ? 'bg-blue-600 text-white font-medium'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <span className={active === s.id ? 'text-blue-200' : 'text-gray-400'}>{s.icon}</span>
                  {s.label}
                </button>
              ))}
            </nav>
          </div>
        </aside>

        <div className="flex-1">
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="flex items-center justify-between gap-2 px-4 sm:px-5 py-3 sm:py-4 border-b border-gray-200 flex-wrap">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-blue-600 shrink-0">{currentSection.icon}</span>
                <div className="min-w-0">
                  <h2 className="font-semibold text-gray-800 truncate">{currentSection.label}</h2>
                  <p className="text-xs text-gray-500 mt-0.5 truncate">{descriptions[active]}</p>
                </div>
              </div>
              {active !== 'status' && (
                <button
                  onClick={handleSave}
                  className={`btn-primary flex items-center gap-1.5 transition-all shrink-0 ${saved ? '!bg-green-600' : ''}`}
                >
                  {saved ? 'Salvo!' : 'Salvar'}
                </button>
              )}
            </div>
            <div className="p-3 sm:p-5">
              <ListEditor
                items={currentItems}
                onChange={handleChange}
                systemLocked={systemItems[active]}
                readonly={active === 'status'}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
