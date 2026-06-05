import React, { useEffect, useState, useCallback } from 'react'
import { Settings, Tag, Truck, Plus, Edit2, Power, Search, X, Check, Loader2 } from 'lucide-react'
import { APP_GROUP_ID } from '../../lib/supabase'
import { useToast, useConfirm } from '../../components/ui/UIProvider'
import {
  listFinCategorias, createFinCategoria, updateFinCategoria, deleteFinCategoria, seedFinCategorias
} from '../../lib/api/fin_categorias'
import {
  listFinFornecedores, createFinFornecedor, updateFinFornecedor, deleteFinFornecedor
} from '../../lib/api/fin_fornecedores'
import type { FinCategoria, FinFornecedor, FinTipo } from '../../types'

type Tab = 'entradas' | 'saidas' | 'fornecedores'

const CORES_PRESET = [
  '#22c55e', '#16a34a', '#3b82f6', '#6366f1', '#f97316',
  '#eab308', '#ef4444', '#8b5cf6', '#ec4899', '#6b7280',
]

// ── Modal de Categoria ────────────────────────────────────────────────────────

interface CatModalProps {
  tipo: FinTipo
  editing: FinCategoria | null
  onClose: () => void
  onSave: (data: Partial<FinCategoria>) => Promise<void>
}

function CategoriaModal({ tipo, editing, onClose, onSave }: CatModalProps) {
  const [nome, setNome] = useState(editing?.nome ?? '')
  const [cor, setCor] = useState(editing?.cor ?? CORES_PRESET[0])
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!nome.trim()) return
    setSaving(true)
    try {
      await onSave({ nome: nome.trim(), cor, tipo, church_group_id: APP_GROUP_ID, ativo: true })
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-bold text-gray-800">
            {editing ? 'Editar categoria' : 'Nova categoria'}
          </h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100 text-gray-400">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Nome *</label>
            <input
              className="form-input w-full"
              value={nome}
              onChange={e => setNome(e.target.value)}
              placeholder="Ex: Dízimo"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-2">Cor</label>
            <div className="flex flex-wrap gap-2">
              {CORES_PRESET.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCor(c)}
                  className="w-7 h-7 rounded-full border-2 flex items-center justify-center transition-transform hover:scale-110"
                  style={{ backgroundColor: c, borderColor: cor === c ? '#1f2937' : 'transparent' }}
                >
                  {cor === c && <Check size={12} className="text-white drop-shadow" />}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving || !nome.trim()}
              className="flex-1 px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving && <Loader2 size={14} className="animate-spin" />}
              Salvar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Modal de Fornecedor ───────────────────────────────────────────────────────

interface FornModalProps {
  editing: FinFornecedor | null
  onClose: () => void
  onSave: (data: Partial<FinFornecedor>) => Promise<void>
}

function FornecedorModal({ editing, onClose, onSave }: FornModalProps) {
  const [nome, setNome] = useState(editing?.nome ?? '')
  const [documento, setDocumento] = useState(editing?.documento ?? '')
  const [contato, setContato] = useState(editing?.contato ?? '')
  const [observacao, setObservacao] = useState(editing?.observacao ?? '')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!nome.trim()) return
    setSaving(true)
    try {
      await onSave({
        nome: nome.trim(),
        documento: documento.trim() || undefined,
        contato: contato.trim() || undefined,
        observacao: observacao.trim() || undefined,
        church_group_id: APP_GROUP_ID,
        ativo: true,
      })
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-bold text-gray-800">
            {editing ? 'Editar fornecedor' : 'Novo fornecedor'}
          </h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100 text-gray-400">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Nome *</label>
            <input className="form-input w-full" value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex: Posto Shell" autoFocus />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">CPF / CNPJ</label>
            <input className="form-input w-full" value={documento} onChange={e => setDocumento(e.target.value)} placeholder="Opcional" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Contato</label>
            <input className="form-input w-full" value={contato} onChange={e => setContato(e.target.value)} placeholder="Telefone ou email" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Observação</label>
            <textarea className="form-input w-full resize-none" rows={2} value={observacao} onChange={e => setObservacao(e.target.value)} placeholder="Opcional" />
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200">Cancelar</button>
            <button
              type="submit"
              disabled={saving || !nome.trim()}
              className="flex-1 px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving && <Loader2 size={14} className="animate-spin" />}
              Salvar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Página principal ──────────────────────────────────────────────────────────

export default function FinanceiroConfigPage() {
  const toast = useToast()
  const confirm = useConfirm()
  const [tab, setTab] = useState<Tab>('entradas')
  const [categorias, setCategorias] = useState<FinCategoria[]>([])
  const [fornecedores, setFornecedores] = useState<FinFornecedor[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [catModal, setCatModal] = useState<{ open: boolean; editing: FinCategoria | null }>({ open: false, editing: null })
  const [fornModal, setFornModal] = useState<{ open: boolean; editing: FinFornecedor | null }>({ open: false, editing: null })

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [cats, forns] = await Promise.all([
        listFinCategorias(APP_GROUP_ID),
        listFinFornecedores(APP_GROUP_ID),
      ])
      // Se não há categorias, popula os defaults
      if (cats.length === 0) {
        await seedFinCategorias(APP_GROUP_ID)
        const seeded = await listFinCategorias(APP_GROUP_ID)
        setCategorias(seeded)
      } else {
        setCategorias(cats)
      }
      setFornecedores(forns)
    } catch (err) {
      console.error(err)
      toast.error('Erro ao carregar configurações financeiras.')
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => { loadData() }, [loadData])

  // ── Categorias ──

  const catsDoTipo = categorias.filter(c => c.tipo === (tab === 'entradas' ? 'entrada' : 'saida'))

  async function handleSaveCategoria(data: Partial<FinCategoria>) {
    if (catModal.editing) {
      const updated = await updateFinCategoria(catModal.editing.id, data)
      setCategorias(prev => prev.map(c => c.id === updated.id ? updated : c))
      toast.success('Categoria atualizada.')
    } else {
      const created = await createFinCategoria(data as Omit<FinCategoria, 'id' | 'created_at' | 'updated_at'>)
      setCategorias(prev => [...prev, created])
      toast.success('Categoria criada.')
    }
  }

  async function handleToggleCategoria(cat: FinCategoria) {
    const acao = cat.ativo ? 'desativar' : 'ativar'
    const ok = await confirm({ title: `${acao.charAt(0).toUpperCase() + acao.slice(1)} categoria`, message: `Deseja ${acao} "${cat.nome}"?`, danger: !cat.ativo })
    if (!ok) return
    try {
      await updateFinCategoria(cat.id, { ativo: !cat.ativo })
      setCategorias(prev => prev.map(c => c.id === cat.id ? { ...c, ativo: !cat.ativo } : c))
      toast.success(`Categoria ${cat.ativo ? 'desativada' : 'ativada'}.`)
    } catch {
      toast.error('Erro ao atualizar categoria.')
    }
  }

  // ── Fornecedores ──

  const fornsFiltrados = fornecedores.filter(f =>
    !search || f.nome.toLowerCase().includes(search.toLowerCase())
  )

  async function handleSaveFornecedor(data: Partial<FinFornecedor>) {
    if (fornModal.editing) {
      const updated = await updateFinFornecedor(fornModal.editing.id, data)
      setFornecedores(prev => prev.map(f => f.id === updated.id ? updated : f))
      toast.success('Fornecedor atualizado.')
    } else {
      const created = await createFinFornecedor(data as Omit<FinFornecedor, 'id' | 'created_at' | 'updated_at'>)
      setFornecedores(prev => [...prev, created])
      toast.success('Fornecedor criado.')
    }
  }

  async function handleToggleFornecedor(forn: FinFornecedor) {
    const acao = forn.ativo ? 'desativar' : 'ativar'
    const ok = await confirm({ title: `${acao.charAt(0).toUpperCase() + acao.slice(1)} fornecedor`, message: `Deseja ${acao} "${forn.nome}"?`, danger: !forn.ativo })
    if (!ok) return
    try {
      await updateFinFornecedor(forn.id, { ativo: !forn.ativo })
      setFornecedores(prev => prev.map(f => f.id === forn.id ? { ...f, ativo: !forn.ativo } : f))
      toast.success(`Fornecedor ${forn.ativo ? 'desativado' : 'ativado'}.`)
    } catch {
      toast.error('Erro ao atualizar fornecedor.')
    }
  }

  async function handleDeleteFornecedor(forn: FinFornecedor) {
    const ok = await confirm({ title: 'Excluir fornecedor', message: `Deseja excluir "${forn.nome}" permanentemente?`, danger: true })
    if (!ok) return
    try {
      await deleteFinFornecedor(forn.id)
      setFornecedores(prev => prev.filter(f => f.id !== forn.id))
      toast.success('Fornecedor excluído.')
    } catch {
      toast.error('Erro ao excluir fornecedor.')
    }
  }

  // ── Render ──

  const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'entradas', label: 'Categorias de Entrada', icon: <Tag size={15} /> },
    { key: 'saidas', label: 'Categorias de Saída', icon: <Tag size={15} /> },
    { key: 'fornecedores', label: 'Fornecedores', icon: <Truck size={15} /> },
  ]

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center">
          <Settings size={20} className="text-emerald-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-800">Configurações Financeiras</h1>
          <p className="text-sm text-gray-500">Categorias, fornecedores e padrões do módulo financeiro</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="flex border-b border-gray-200 overflow-x-auto">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => { setTab(t.key); setSearch('') }}
              className={`flex items-center gap-2 px-5 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                tab === t.key
                  ? 'border-emerald-500 text-emerald-700 bg-emerald-50'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>

        <div className="p-5">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-gray-400">
              <Loader2 size={24} className="animate-spin mr-2" /> Carregando...
            </div>
          ) : (
            <>
              {/* ── Categorias ── */}
              {(tab === 'entradas' || tab === 'saidas') && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-sm text-gray-500">
                      {catsDoTipo.filter(c => c.ativo).length} ativas · {catsDoTipo.filter(c => !c.ativo).length} inativas
                    </p>
                    <button
                      onClick={() => setCatModal({ open: true, editing: null })}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700"
                    >
                      <Plus size={14} /> Nova categoria
                    </button>
                  </div>

                  {catsDoTipo.length === 0 ? (
                    <div className="text-center py-10 text-gray-400 text-sm">Nenhuma categoria cadastrada.</div>
                  ) : (
                    <div className="space-y-2">
                      {catsDoTipo.map(cat => (
                        <div
                          key={cat.id}
                          className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${cat.ativo ? 'border-gray-200 bg-white' : 'border-gray-100 bg-gray-50 opacity-60'}`}
                        >
                          <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: cat.cor }} />
                          <span className={`flex-1 text-sm font-medium ${cat.ativo ? 'text-gray-800' : 'text-gray-400 line-through'}`}>
                            {cat.nome}
                          </span>
                          {!cat.ativo && (
                            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">Inativa</span>
                          )}
                          <button
                            onClick={() => setCatModal({ open: true, editing: cat })}
                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                            title="Editar"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={() => handleToggleCategoria(cat)}
                            className={`p-1.5 rounded-lg ${cat.ativo ? 'text-gray-400 hover:text-red-500 hover:bg-red-50' : 'text-gray-400 hover:text-emerald-600 hover:bg-emerald-50'}`}
                            title={cat.ativo ? 'Desativar' : 'Ativar'}
                          >
                            <Power size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ── Fornecedores ── */}
              {tab === 'fornecedores' && (
                <div>
                  <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
                    <div className="relative flex-1 min-w-[200px]">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        className="form-input pl-8 w-full"
                        placeholder="Buscar fornecedor..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                      />
                      {search && (
                        <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                          <X size={14} />
                        </button>
                      )}
                    </div>
                    <button
                      onClick={() => setFornModal({ open: true, editing: null })}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 whitespace-nowrap"
                    >
                      <Plus size={14} /> Novo fornecedor
                    </button>
                  </div>

                  {fornsFiltrados.length === 0 ? (
                    <div className="text-center py-10 text-gray-400 text-sm">
                      {search ? 'Nenhum resultado.' : 'Nenhum fornecedor cadastrado.'}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {fornsFiltrados.map(forn => (
                        <div
                          key={forn.id}
                          className={`flex items-center gap-3 p-3 rounded-xl border ${forn.ativo ? 'border-gray-200 bg-white' : 'border-gray-100 bg-gray-50 opacity-60'}`}
                        >
                          <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 flex-shrink-0">
                            <Truck size={14} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-medium truncate ${forn.ativo ? 'text-gray-800' : 'text-gray-400 line-through'}`}>
                              {forn.nome}
                            </p>
                            {(forn.documento || forn.contato) && (
                              <p className="text-xs text-gray-400 truncate">
                                {[forn.documento, forn.contato].filter(Boolean).join(' · ')}
                              </p>
                            )}
                          </div>
                          {!forn.ativo && (
                            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full flex-shrink-0">Inativo</span>
                          )}
                          <button
                            onClick={() => setFornModal({ open: true, editing: forn })}
                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                            title="Editar"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={() => handleToggleFornecedor(forn)}
                            className={`p-1.5 rounded-lg ${forn.ativo ? 'text-gray-400 hover:text-amber-500 hover:bg-amber-50' : 'text-gray-400 hover:text-emerald-600 hover:bg-emerald-50'}`}
                            title={forn.ativo ? 'Desativar' : 'Ativar'}
                          >
                            <Power size={14} />
                          </button>
                          <button
                            onClick={() => handleDeleteFornecedor(forn)}
                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg"
                            title="Excluir"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Modais */}
      {catModal.open && (
        <CategoriaModal
          tipo={tab === 'entradas' ? 'entrada' : 'saida'}
          editing={catModal.editing}
          onClose={() => setCatModal({ open: false, editing: null })}
          onSave={handleSaveCategoria}
        />
      )}
      {fornModal.open && (
        <FornecedorModal
          editing={fornModal.editing}
          onClose={() => setFornModal({ open: false, editing: null })}
          onSave={handleSaveFornecedor}
        />
      )}
    </div>
  )
}
