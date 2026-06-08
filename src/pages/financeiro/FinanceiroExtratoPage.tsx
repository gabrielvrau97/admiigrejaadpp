import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Search, Download, ChevronLeft, ChevronRight,
  TrendingUp, TrendingDown, Wallet, Filter, X, Pencil, Trash2,
  ChevronsUpDown, ChevronUp, ChevronDown as ChevronDownIcon,
} from 'lucide-react'
import * as XLSX from 'xlsx'
import { useAuth } from '../../contexts/AuthContext'
import { useChurch } from '../../contexts/ChurchContext'
import { useData } from '../../contexts/DataContext'
import { useConfirm, useToast } from '../../components/ui/UIProvider'
import { APP_GROUP_ID } from '../../lib/supabase'
import { listFinLancamentos, deleteFinLancamento, getSaldoAcumuladoAte, type FinLancamentoFilters } from '../../lib/api/fin_lancamentos'
import { listFinCategorias } from '../../lib/api/fin_categorias'
import type { FinCategoria, FinLancamento } from '../../types'
import LancamentoModal from './LancamentoModal'

const PAGE_SIZE = 50

type SortCol = 'data' | 'tipo' | 'categoria' | 'descricao' | 'filial' | 'membro' | 'valor' | 'lancadoPor'
type SortDir = 'asc' | 'desc'

function fmt(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function fmtDate(s: string) {
  if (!s) return ''
  const [y, m, d] = s.slice(0, 10).split('-')
  return `${d}/${m}/${y}`
}

// primeiro dia do mês atual
function firstDayOfMonth() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}

// hoje
function today() {
  return new Date().toISOString().slice(0, 10)
}

export default function FinanceiroExtratoPage() {
  const { user } = useAuth()
  const { churches } = useChurch()
  const { members, visitantes } = useData()
  const confirm = useConfirm()
  const toast = useToast()

  const isMaster = user?.role === 'master'

  // ── filtros ──────────────────────────────────────────────────────────────
  const [dataInicio, setDataInicio] = useState(firstDayOfMonth())
  const [dataFim, setDataFim] = useState(today())
  const [churchId, setChurchId] = useState('')
  const [tipo, setTipo] = useState<'entrada' | 'saida' | ''>('')
  const [categoriaId, setCategoriaId] = useState('')
  const [membroQuery, setMembroQuery] = useState('')
  const [membroId, setMembroId] = useState('')
  const [showMembroDrop, setShowMembroDrop] = useState(false)
  const [textoBusca, setTextoBusca] = useState('')

  // ── dados ─────────────────────────────────────────────────────────────────
  const [lancamentos, setLancamentos] = useState<FinLancamento[]>([])
  const [categorias, setCategorias] = useState<FinCategoria[]>([])
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [editingLancamento, setEditingLancamento] = useState<FinLancamento | null>(null)
  const [sortCol, setSortCol] = useState<SortCol>('data')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [saldoAnterior, setSaldoAnterior] = useState<number | null>(null)

  const membroResults = useMemo(() => {
    if (!membroQuery || membroId) return []
    const pool = [...members, ...visitantes]
    const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    const q = norm(membroQuery)
    return pool.filter(m => norm(m.name).includes(q)).slice(0, 8)
  }, [membroQuery, membroId, members, visitantes])

  // carrega categorias uma vez
  useEffect(() => {
    listFinCategorias(APP_GROUP_ID).then(setCategorias).catch(console.error)
  }, [])

  const fetchLancamentos = useCallback(async () => {
    setLoading(true)
    try {
      const filters: FinLancamentoFilters = {
        groupId: APP_GROUP_ID,
        dataInicio: dataInicio || undefined,
        dataFim: dataFim || undefined,
        churchId: churchId || undefined,
        tipo: tipo || undefined,
        categoriaId: categoriaId || undefined,
        memberId: membroId || undefined,
      }
      // Busca lançamentos e saldo anterior em paralelo.
      // Saldo anterior só faz sentido quando há data início e não há filtro de tipo
      // (filtrar só entradas ou só saídas distorce o acumulado).
      const [data, anterior] = await Promise.all([
        listFinLancamentos(filters),
        dataInicio && !tipo && !categoriaId && !membroId && !churchId
          ? getSaldoAcumuladoAte(APP_GROUP_ID, dataInicio)
          : Promise.resolve(null),
      ])
      setLancamentos(data)
      setSaldoAnterior(anterior)
      setPage(1)
    } finally {
      setLoading(false)
    }
  }, [dataInicio, dataFim, churchId, tipo, categoriaId, membroId])

  useEffect(() => { fetchLancamentos() }, [fetchLancamentos])

  // ── filtro local por texto (sem acento) + ordenação ─────────────────────
  const filtered = useMemo(() => {
    const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

    let list = lancamentos
    if (textoBusca.trim()) {
      const q = norm(textoBusca)
      list = list.filter(l =>
        norm(l.descricao ?? '').includes(q) ||
        norm(l.categoria?.nome ?? '').includes(q) ||
        norm(l.member?.name ?? '').includes(q) ||
        norm(l.member_nome_manual ?? '').includes(q) ||
        norm(l.fornecedor?.nome ?? '').includes(q) ||
        norm(l.church?.name ?? '').includes(q) ||
        norm(l.created_by_user?.name ?? '').includes(q) ||
        norm(l.referencia_culto ?? '').includes(q)
      )
    }

    const dir = sortDir === 'asc' ? 1 : -1
    return [...list].sort((a, b) => {
      switch (sortCol) {
        case 'data':
          return dir * a.data_lancamento.localeCompare(b.data_lancamento)
        case 'tipo':
          return dir * a.tipo.localeCompare(b.tipo)
        case 'categoria':
          return dir * (a.categoria?.nome ?? '').localeCompare(b.categoria?.nome ?? '')
        case 'descricao':
          return dir * (a.descricao ?? a.referencia_culto ?? '').localeCompare(b.descricao ?? b.referencia_culto ?? '')
        case 'filial':
          return dir * (a.church?.name ?? '').localeCompare(b.church?.name ?? '')
        case 'membro': {
          const ma = a.member?.name ?? a.member_nome_manual ?? a.fornecedor?.nome ?? ''
          const mb = b.member?.name ?? b.member_nome_manual ?? b.fornecedor?.nome ?? ''
          return dir * ma.localeCompare(mb)
        }
        case 'valor':
          return dir * (Number(a.valor) - Number(b.valor))
        case 'lancadoPor':
          return dir * (a.tesoureiro?.nome ?? a.created_by_user?.name ?? '').localeCompare(
            b.tesoureiro?.nome ?? b.created_by_user?.name ?? ''
          )
        default:
          return 0
      }
    })
  }, [lancamentos, textoBusca, sortCol, sortDir])

  // ── totais ────────────────────────────────────────────────────────────────
  const totais = useMemo(() => {
    const entradas = filtered.filter(l => l.tipo === 'entrada').reduce((s, l) => s + Number(l.valor), 0)
    const saidas = filtered.filter(l => l.tipo === 'saida').reduce((s, l) => s + Number(l.valor), 0)
    return { entradas, saidas, saldo: entradas - saidas }
  }, [filtered])

  // ── paginação ─────────────────────────────────────────────────────────────
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  function handleSelectMembro(m: { id: string; name: string }) {
    setMembroId(m.id)
    setMembroQuery(m.name)
    setShowMembroDrop(false)
  }

  function clearFiltros() {
    setDataInicio(firstDayOfMonth())
    setDataFim(today())
    setChurchId('')
    setTipo('')
    setCategoriaId('')
    setMembroId('')
    setMembroQuery('')
    setTextoBusca('')
  }

  const hasExtraFilters = churchId || tipo || categoriaId || membroId

  // ── export Excel ──────────────────────────────────────────────────────────
  function handleExport() {
    const rows = filtered.map(l => ({
      Data: fmtDate(l.data_lancamento),
      Tipo: l.tipo === 'entrada' ? 'Entrada' : 'Saída',
      Categoria: l.categoria?.nome ?? '',
      Descrição: l.descricao ?? '',
      Filial: l.church?.name ?? '',
      Membro: l.member?.name ?? l.member_nome_manual ?? '',
      Fornecedor: l.fornecedor?.nome ?? '',
      'Referência culto': l.referencia_culto ?? '',
      'Valor (R$)': Number(l.valor),
      Origem: l.origem,
      'Lançado por': l.tesoureiro?.nome ?? l.created_by_user?.name ?? '',
      Observação: l.observacao ?? '',
    }))

    const summary = [
      {},
      { Data: 'Total Entradas', 'Valor (R$)': totais.entradas },
      { Data: 'Total Saídas', 'Valor (R$)': totais.saidas },
      { Data: 'Saldo', 'Valor (R$)': totais.saldo },
    ]

    const ws = XLSX.utils.json_to_sheet([...rows, ...summary])
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Extrato')
    XLSX.writeFile(wb, `extrato_${dataInicio}_${dataFim}.xlsx`)
  }

  async function handleDeleteLancamento(l: FinLancamento) {
    const ok = await confirm({ message: 'Excluir este lançamento permanentemente?', danger: true })
    if (!ok) return
    try {
      await deleteFinLancamento(l.id)
      toast.success('Lançamento excluído com sucesso.')
      await fetchLancamentos()
    } catch (e) {
      console.error(e)
      toast.error('Erro ao excluir lançamento.')
    }
  }

  const categoriasFiltered = tipo
    ? categorias.filter(c => c.tipo === tipo)
    : categorias

  function handleSort(col: SortCol) {
    if (sortCol === col) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortCol(col)
      setSortDir(col === 'data' ? 'desc' : 'asc')
    }
    setPage(1)
  }

  function SortIcon({ col }: { col: SortCol }) {
    if (sortCol !== col) return <ChevronsUpDown size={11} className="ml-1 opacity-30" />
    return sortDir === 'asc'
      ? <ChevronUp size={11} className="ml-1 text-blue-600" />
      : <ChevronDownIcon size={11} className="ml-1 text-blue-600" />
  }

  function SortTh({ col, children, className = '' }: { col: SortCol; children: React.ReactNode; className?: string }) {
    const active = sortCol === col
    return (
      <th
        className={`px-3 py-2.5 text-xs font-semibold whitespace-nowrap border-b border-gray-200 cursor-pointer select-none hover:bg-gray-100 transition-colors ${active ? 'text-blue-600' : 'text-gray-500'} ${className}`}
        onClick={() => handleSort(col)}
      >
        <span className="inline-flex items-center">
          {children}
          <SortIcon col={col} />
        </span>
      </th>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Cabeçalho */}
      <div className="px-4 sm:px-6 pt-5 pb-3 border-b border-gray-100 bg-white">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Extrato Financeiro</h1>
            <p className="text-xs text-gray-500 mt-0.5">Histórico completo de entradas e saídas</p>
          </div>
          <button
            onClick={handleExport}
            disabled={filtered.length === 0}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Download size={15} />
            Exportar Excel
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="px-4 sm:px-6 py-3 bg-white border-b border-gray-100 space-y-2">
        {/* Linha 1: período + busca texto */}
        <div className="flex flex-wrap gap-2 items-end">
          <div>
            <label className="block text-[10px] font-medium text-gray-500 mb-0.5">De</label>
            <input
              type="date"
              value={dataInicio}
              onChange={e => setDataInicio(e.target.value)}
              className="form-input text-sm py-1.5 px-2"
            />
          </div>
          <div>
            <label className="block text-[10px] font-medium text-gray-500 mb-0.5">Até</label>
            <input
              type="date"
              value={dataFim}
              onChange={e => setDataFim(e.target.value)}
              className="form-input text-sm py-1.5 px-2"
            />
          </div>
          <div className="relative flex-1 min-w-[180px]">
            <label className="block text-[10px] font-medium text-gray-500 mb-0.5">Busca rápida</label>
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Descrição, categoria, membro..."
                value={textoBusca}
                onChange={e => setTextoBusca(e.target.value)}
                className="form-input text-sm py-1.5 pl-8 pr-3 w-full"
              />
            </div>
          </div>
        </div>

        {/* Linha 2: filtros avançados */}
        <div className="flex flex-wrap gap-2 items-end">
          {churches.length > 1 && (
            <div>
              <label className="block text-[10px] font-medium text-gray-500 mb-0.5">Filial</label>
              <select
                value={churchId}
                onChange={e => setChurchId(e.target.value)}
                className="form-input text-sm py-1.5 px-2"
              >
                <option value="">Todas</option>
                {churches.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          )}
          <div>
            <label className="block text-[10px] font-medium text-gray-500 mb-0.5">Tipo</label>
            <select
              value={tipo}
              onChange={e => { setTipo(e.target.value as 'entrada' | 'saida' | ''); setCategoriaId('') }}
              className="form-input text-sm py-1.5 px-2"
            >
              <option value="">Todos</option>
              <option value="entrada">Entradas</option>
              <option value="saida">Saídas</option>
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-medium text-gray-500 mb-0.5">Categoria</label>
            <select
              value={categoriaId}
              onChange={e => setCategoriaId(e.target.value)}
              className="form-input text-sm py-1.5 px-2"
            >
              <option value="">Todas</option>
              {categoriasFiltered.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </div>

          {/* Membro */}
          <div className="relative">
            <label className="block text-[10px] font-medium text-gray-500 mb-0.5">Membro</label>
            <div className="relative">
              <input
                type="text"
                placeholder="Buscar membro..."
                value={membroQuery}
                onChange={e => { setMembroQuery(e.target.value); setMembroId(''); setShowMembroDrop(true) }}
                onFocus={() => setShowMembroDrop(true)}
                onBlur={() => setTimeout(() => setShowMembroDrop(false), 150)}
                autoComplete="off"
                className="form-input text-sm py-1.5 px-2 pr-6 w-44"
              />
              {membroQuery && (
                <button
                  type="button"
                  onClick={() => { setMembroId(''); setMembroQuery('') }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X size={11} />
                </button>
              )}
              {showMembroDrop && membroResults.length > 0 && (
                <div className="absolute z-20 top-full left-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg min-w-[200px] max-h-48 overflow-y-auto">
                  {membroResults.map(m => (
                    <button
                      key={m.id}
                      type="button"
                      onMouseDown={() => handleSelectMembro(m)}
                      className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm"
                    >
                      <span className="font-medium text-gray-800">{m.name}</span>
                      {m.apelido && <span className="text-gray-400 ml-1 text-xs">({m.apelido})</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {hasExtraFilters && (
            <button
              onClick={clearFiltros}
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 mt-auto pb-1.5"
            >
              <X size={11} /> Limpar filtros
            </button>
          )}
        </div>
      </div>

      {/* Cards totalizadores */}
      <div className="px-4 sm:px-6 py-3 bg-gray-50 border-b border-gray-100">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-white rounded-xl border border-emerald-100 px-3 py-2.5 flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0">
              <TrendingUp size={14} className="text-emerald-600" />
            </div>
            <div>
              <div className="text-[10px] text-gray-500">Entradas</div>
              <div className="text-sm font-bold text-emerald-600">{fmt(totais.entradas)}</div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-red-100 px-3 py-2.5 flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-red-50 flex items-center justify-center flex-shrink-0">
              <TrendingDown size={14} className="text-red-500" />
            </div>
            <div>
              <div className="text-[10px] text-gray-500">Saídas</div>
              <div className="text-sm font-bold text-red-500">{fmt(totais.saidas)}</div>
            </div>
          </div>
          {/* Card de saldo: mostra período + anterior + acumulado quando disponível */}
          <div className={`bg-white rounded-xl border px-3 py-2.5 flex items-center gap-2.5 ${
            totais.saldo >= 0 ? 'border-blue-100' : 'border-orange-100'
          }`}>
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
              totais.saldo >= 0 ? 'bg-blue-50' : 'bg-orange-50'
            }`}>
              <Wallet size={14} className={totais.saldo >= 0 ? 'text-blue-600' : 'text-orange-500'} />
            </div>
            <div
              className="flex-1 min-w-0"
              title={saldoAnterior !== null ? `Saldo anterior: ${fmt(saldoAnterior)}` : undefined}
            >
              <div className="text-[10px] text-gray-500">Saldo</div>
              <div className={`text-sm font-bold ${totais.saldo >= 0 ? 'text-blue-600' : 'text-orange-500'}`}>
                {fmt(totais.saldo)}
              </div>
              {saldoAnterior !== null && (
                <div className="text-[10px] text-gray-400 mt-0.5">
                  Acumulado: <span className="text-gray-600 font-semibold">{fmt(saldoAnterior + totais.saldo)}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tabela */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-gray-400 text-sm">Carregando...</div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <Filter size={28} className="mb-2 opacity-40" />
            <p className="text-sm">Nenhum lançamento encontrado</p>
            <p className="text-xs mt-1">Ajuste os filtros ou o período</p>
          </div>
        ) : (
          <table className="w-full text-sm border-collapse">
            <thead className="sticky top-0 bg-gray-50 z-10">
              <tr className="text-left">
                <SortTh col="data" className="px-4">Data</SortTh>
                <SortTh col="tipo">Tipo</SortTh>
                <SortTh col="categoria">Categoria</SortTh>
                <SortTh col="descricao">Descrição / Referência</SortTh>
                <SortTh col="filial">Filial</SortTh>
                <SortTh col="membro">Membro / Fornecedor</SortTh>
                <SortTh col="valor" className="text-right">Valor</SortTh>
                <SortTh col="lancadoPor">Lançado por</SortTh>
                {isMaster && (
                  <th className="px-3 py-2.5 text-xs font-semibold text-gray-500 whitespace-nowrap border-b border-gray-200">Ações</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paginated.map(l => {
                const isEntrada = l.tipo === 'entrada'
                const memberStr = l.member?.name ?? l.member_nome_manual ?? ''
                const secondaryStr = isEntrada ? memberStr : (l.fornecedor?.nome ?? memberStr)
                return (
                  <tr key={l.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-2.5 whitespace-nowrap text-gray-600">{fmtDate(l.data_lancamento)}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${
                        isEntrada ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'
                      }`}>
                        {isEntrada ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                        {isEntrada ? 'Entrada' : 'Saída'}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      {l.categoria ? (
                        <span className="inline-flex items-center gap-1.5">
                          <span
                            className="w-2 h-2 rounded-full flex-shrink-0"
                            style={{ background: l.categoria.cor }}
                          />
                          <span className="text-gray-700 text-xs">{l.categoria.nome}</span>
                        </span>
                      ) : (
                        <span className="text-gray-400 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 max-w-[200px]">
                      <div className="text-gray-800 truncate">{l.descricao ?? l.referencia_culto ?? <span className="text-gray-400">—</span>}</div>
                      {l.descricao && l.referencia_culto && (
                        <div className="text-xs text-gray-400 truncate">{l.referencia_culto}</div>
                      )}
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-gray-600 text-xs">{l.church?.name ?? '—'}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-gray-600 text-xs">{secondaryStr || <span className="text-gray-400">—</span>}</td>
                    <td className={`px-3 py-2.5 whitespace-nowrap font-semibold text-right ${
                      isEntrada ? 'text-emerald-600' : 'text-red-500'
                    }`}>
                      {isEntrada ? '+' : '-'}{fmt(Number(l.valor))}
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-gray-500 text-xs">
                      {l.tesoureiro?.nome ?? l.created_by_user?.name ?? '—'}
                    </td>
                    {isMaster && (
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setEditingLancamento(l)}
                            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600"
                            title="Editar"
                          >
                            <Pencil size={13} />
                          </button>
                          <button
                            onClick={() => handleDeleteLancamento(l)}
                            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600"
                            title="Excluir"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal de edição */}
      {editingLancamento && (
        <LancamentoModal
          tipo={editingLancamento.tipo}
          editing={editingLancamento}
          onClose={() => setEditingLancamento(null)}
          onSaved={() => { setEditingLancamento(null); fetchLancamentos() }}
        />
      )}

      {/* Rodapé: paginação + contador */}
      {!loading && filtered.length > 0 && (
        <div className="px-4 sm:px-6 py-3 border-t border-gray-200 bg-white flex items-center justify-between flex-wrap gap-2">
          <span className="text-xs text-gray-500">
            {filtered.length} lançamento{filtered.length !== 1 ? 's' : ''} · página {page} de {totalPages}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft size={14} />
            </button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const start = Math.max(1, Math.min(page - 2, totalPages - 4))
              const p = start + i
              if (p > totalPages) return null
              return (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`w-7 h-7 text-xs rounded-lg border ${
                    p === page
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'border-gray-200 hover:bg-gray-50 text-gray-600'
                  }`}
                >
                  {p}
                </button>
              )
            })}
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
