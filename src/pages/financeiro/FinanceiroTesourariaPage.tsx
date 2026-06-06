import React, { useCallback, useEffect, useState } from 'react'
import {
  Wallet, TrendingDown, Plus, Edit2, Trash2,
  Loader2, ArrowUpRight, ArrowDownRight,
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { APP_GROUP_ID } from '../../lib/supabase'
import {
  listFinLancamentosHoje,
  deleteFinLancamento,
} from '../../lib/api/fin_lancamentos'
import { listFinCategoriasByTipo } from '../../lib/api/fin_categorias'
import { useToast, useConfirm } from '../../components/ui/UIProvider'
import LancamentoModal from './LancamentoModal'
import type { FinCategoria, FinLancamento, FinTipo } from '../../types'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

function fmtMoeda(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function fmtData(iso: string) {
  try { return format(parseISO(iso), "dd/MM/yyyy", { locale: ptBR }) } catch { return iso }
}

interface ModalState {
  open: boolean
  tipo: FinTipo
  editing: FinLancamento | null
  categoriaPreSelecionada?: string
}

export default function FinanceiroTesourariaPage() {
  const { user } = useAuth()
  const toast = useToast()
  const confirm = useConfirm()

  const [lancamentosHoje, setLancamentosHoje] = useState<FinLancamento[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<ModalState>({ open: false, tipo: 'entrada', editing: null })
  const [categoriasRapidas, setCategoriasRapidas] = useState<FinCategoria[]>([])

const loadHoje = useCallback(async () => {
    if (!user) return
    const lanc = await listFinLancamentosHoje(user.id, APP_GROUP_ID)
    setLancamentosHoje(lanc)
  }, [user])

  const loadAll = useCallback(async () => {
    setLoading(true)
    try {
      const [, cats] = await Promise.all([
        loadHoje(),
        listFinCategoriasByTipo(APP_GROUP_ID, 'entrada'),
      ])
      setCategoriasRapidas(cats.filter(c => c.acesso_rapido && c.ativo))
    } catch (err) {
      console.error(err)
      toast.error('Erro ao carregar lançamentos.')
    } finally {
      setLoading(false)
    }
  }, [loadHoje, toast])

  useEffect(() => { loadAll() }, [loadAll])

  function handleNovoLancamento(tipo: FinTipo, categoriaId?: string) {
    setModal({ open: true, tipo, editing: null, categoriaPreSelecionada: categoriaId })
  }

  function handleEdit(l: FinLancamento) {
    setModal({ open: true, tipo: l.tipo, editing: l })
  }

  async function handleDelete(l: FinLancamento) {
    const ok = await confirm({
      title: 'Excluir lançamento',
      message: `Deseja excluir este lançamento de ${fmtMoeda(l.valor)}? Essa ação não pode ser desfeita.`,
      danger: true,
    })
    if (!ok) return
    try {
      await deleteFinLancamento(l.id)
      toast.success('Lançamento excluído.')
      await loadAll()
    } catch {
      toast.error('Erro ao excluir lançamento.')
    }
  }

  async function handleSaved(l: FinLancamento) {
    toast.success(modal.editing ? 'Lançamento atualizado.' : `${l.tipo === 'entrada' ? 'Entrada' : 'Saída'} registrada.`)
    setModal(m => ({ ...m, open: false }))
    await loadAll()
  }

  const entradasHoje = lancamentosHoje.filter(l => l.tipo === 'entrada').reduce((s, l) => s + Number(l.valor), 0)
  const saidasHoje = lancamentosHoje.filter(l => l.tipo === 'saida').reduce((s, l) => s + Number(l.valor), 0)
  const saldo = entradasHoje - saidasHoje

  // ── Linha de lançamento ──
  function LancamentoRow({ l, compact = false }: { l: FinLancamento; compact?: boolean }) {
    const isEntrada = l.tipo === 'entrada'
    return (
      <div className={`flex items-center gap-3 p-3 rounded-xl border transition-colors hover:bg-gray-50 ${compact ? 'border-gray-100' : 'border-gray-200'}`}>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${isEntrada ? 'bg-emerald-50' : 'bg-red-50'}`}>
          {isEntrada
            ? <ArrowUpRight size={15} className="text-emerald-600" />
            : <ArrowDownRight size={15} className="text-red-500" />
          }
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {l.categoria && (
              <span
                className="text-xs font-medium px-2 py-0.5 rounded-full"
                style={{ backgroundColor: l.categoria.cor + '22', color: l.categoria.cor }}
              >
                {l.categoria.nome}
              </span>
            )}
            {(l.member?.name || l.member_nome_manual) && (
              <span className="text-xs text-gray-500 truncate max-w-[120px]">
                {l.member?.name ?? l.member_nome_manual}
              </span>
            )}
            {l.fornecedor && (
              <span className="text-xs text-gray-500 truncate max-w-[120px]">{l.fornecedor.nome}</span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            {l.descricao && <p className="text-xs text-gray-400 truncate">{l.descricao}</p>}
            {l.referencia_culto && <p className="text-xs text-gray-400 truncate">{l.referencia_culto}</p>}
            {l.forma_pagamento && (
              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-gray-100 text-gray-500">
                {l.forma_pagamento === 'dinheiro' ? 'Dinheiro'
                  : l.forma_pagamento === 'pix' ? 'Pix'
                  : l.forma_pagamento === 'cartao_debito' ? 'Débito'
                  : `Crédito${l.parcelas && l.parcelas > 1 ? ` ${l.parcelas}x` : ''}`}
              </span>
            )}
            {!compact && (
              <span className="text-xs text-gray-400 ml-auto flex-shrink-0">{fmtData(l.data_lancamento)}</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className={`text-sm font-bold ${isEntrada ? 'text-emerald-600' : 'text-red-500'}`}>
            {isEntrada ? '+' : '-'}{fmtMoeda(l.valor)}
          </span>
          <button
            onClick={() => handleEdit(l)}
            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
            title="Editar"
          >
            <Edit2 size={13} />
          </button>
          <button
            onClick={() => handleDelete(l)}
            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg"
            title="Excluir"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center">
            <Wallet size={20} className="text-emerald-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-800">Tesouraria</h1>
            <p className="text-sm text-gray-500">Lançamentos do dia</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {/* Botões de acesso rápido por categoria de entrada */}
          {categoriasRapidas.map(cat => (
            <button
              key={cat.id}
              onClick={() => handleNovoLancamento('entrada', cat.id)}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white rounded-xl hover:opacity-90 transition-opacity"
              style={{ backgroundColor: cat.cor }}
            >
              <ArrowUpRight size={15} /> {cat.nome}
            </button>
          ))}
          {/* Fallback: botão genérico de entrada se não houver acesso rápido */}
          {categoriasRapidas.length === 0 && (
            <button
              onClick={() => handleNovoLancamento('entrada')}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-emerald-600 rounded-xl hover:bg-emerald-700"
            >
              <Plus size={15} /> Entrada
            </button>
          )}
          <button
            onClick={() => handleNovoLancamento('saida')}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-red-500 rounded-xl hover:bg-red-600"
          >
            <TrendingDown size={15} /> Saída
          </button>
        </div>
      </div>

      {/* Cards de caixa */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-emerald-100 p-4">
          <p className="text-xs text-gray-500 mb-1">Entradas hoje</p>
          <p className="text-2xl font-bold text-emerald-600">{fmtMoeda(entradasHoje)}</p>
        </div>
        <div className="bg-white rounded-xl border border-red-100 p-4">
          <p className="text-xs text-gray-500 mb-1">Saídas hoje</p>
          <p className="text-2xl font-bold text-red-500">{fmtMoeda(saidasHoje)}</p>
        </div>
        <div className={`bg-white rounded-xl border p-4 ${saldo >= 0 ? 'border-blue-100' : 'border-orange-100'}`}>
          <p className="text-xs text-gray-500 mb-1">Saldo do dia</p>
          <p className={`text-2xl font-bold ${saldo >= 0 ? 'text-blue-600' : 'text-orange-500'}`}>
            {fmtMoeda(saldo)}
          </p>
        </div>
      </div>

      {/* Lista do dia */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <span className="text-sm font-semibold text-gray-700">Lançamentos de hoje</span>
          {lancamentosHoje.length > 0 && (
            <span className="bg-emerald-100 text-emerald-700 text-xs font-semibold px-2 py-0.5 rounded-full">
              {lancamentosHoje.length}
            </span>
          )}
        </div>
        <div className="p-4">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-gray-400">
              <Loader2 size={22} className="animate-spin mr-2" /> Carregando...
            </div>
          ) : lancamentosHoje.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-gray-400 text-sm">Nenhum lançamento hoje.</p>
              <div className="flex gap-2 justify-center mt-3">
                <button
                  onClick={() => handleNovoLancamento('entrada')}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 rounded-lg hover:bg-emerald-100"
                >
                  <Plus size={12} /> Registrar entrada
                </button>
                <button
                  onClick={() => handleNovoLancamento('saida')}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100"
                >
                  <Plus size={12} /> Registrar saída
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {lancamentosHoje.map(l => <LancamentoRow key={l.id} l={l} compact />)}
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {modal.open && (
        <LancamentoModal
          tipo={modal.tipo}
          editing={modal.editing}
          categoriaPreSelecionada={modal.categoriaPreSelecionada}
          onClose={() => setModal(m => ({ ...m, open: false }))}
          onSaved={handleSaved}
        />
      )}
    </div>
  )
}
