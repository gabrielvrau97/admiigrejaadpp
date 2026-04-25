import React, { useState, useMemo, useCallback } from 'react'
import { format } from 'date-fns'
import * as XLSX from 'xlsx'
import {
  Plus, Search, Printer, Settings2, ChevronDown, Download,
  MessageCircle, Trash2, Edit2, MapPin, Filter, X, ChevronLeft, ChevronRight,
  Eye, MoreHorizontal
} from 'lucide-react'
import { DEFAULT_CHURCH_ID } from '../../lib/supabase'
import type { Member } from '../../types'
import MemberModal from '../../components/members/MemberModal'
import MemberViewModal from '../../components/members/MemberViewModal'
import VisitanteModal from '../../components/members/VisitanteModal'
import { useData, filterByType } from '../../contexts/DataContext'
import { useChurch } from '../../contexts/ChurchContext'
import AdvancedSearch, {
  type SelectionFilters, type SimilarityFilters,
  EMPTY_SELECTION, EMPTY_SIMILARITY,
  applySelectionFilters, applySimilarityFilters,
} from '../../components/members/AdvancedSearch'
import { useToast, useConfirm } from '../../components/ui/UIProvider'
import { printMembrosList, buildFilterSummary } from '../../lib/print/membros/printMembrosList'
import { printFichaFisica } from '../../lib/print/membros/printFichaFisica'
import { printMembroIndividual } from '../../lib/print/membros/printMembroIndividual'
import ColConfigPanel from './ColConfigPanel'
import { ALL_COLUMNS, DEFAULT_COLS, type ColKey } from './membros-columns'


const quickFilters = [
  { key: 'ativos', label: 'Ativos' },
  { key: 'inativos', label: 'Inativos' },
  { key: 'indisponiveis', label: 'Indisponíveis' },
  { key: 'batizados', label: 'Batizados nas águas' },
  { key: 'batizados_espirito', label: 'Batizados no Espírito' },
  { key: 'convertidos', label: 'Convertidos' },
  { key: 'acompanhados', label: 'Com acompanhante' },
  { key: 'sem_acompanhamento', label: 'Sem acompanhante' },
  { key: 'discipulados', label: 'Com discipulador' },
  { key: 'sem_discipulado', label: 'Sem discipulador' },
  { key: 'aniversariantes_hoje', label: 'Aniversariantes hoje' },
  { key: 'aniversariantes_mes', label: 'Aniversariantes do mês' },
  { key: 'casados_hoje', label: 'Casados hoje' },
]

const PAGE_SIZES = [5, 10, 15, 20]

type SortField = 'name' | 'birth_date' | 'civil_status' | 'status'

function statusBadge(status: Member['status']) {
  const map = { ativo: 'badge-green', inativo: 'badge-red', indisponivel: 'badge-yellow', deleted: 'badge-gray' }
  const labels = { ativo: 'Ativo', inativo: 'Inativo', indisponivel: 'Indisponível', deleted: 'Excluído' }
  return <span className={map[status] ?? 'badge-gray'}>{labels[status] ?? status}</span>
}

const titleMap: Record<string, string> = {
  membros: 'Membros',
  visitantes: 'Visitantes',
  congregados: 'Congregados',
  criancas: 'Crianças',
  adolescentes: 'Adolescentes',
  jovens: 'Jovens',
  'novos-convertidos': 'Novos Convertidos',
}

const subMap: Record<string, string> = {
  criancas: 'Membros ativos de 8 a 12 anos',
  adolescentes: 'Membros ativos de 13 a 17 anos',
  jovens: 'Membros ativos, 18+, solteiros',
  'novos-convertidos': 'Membros com conversão registrada',
}

export default function MembrosPage({ type = 'membros' }: { type?: string }) {
  const { members, visitantes, saveMember, removeMember } = useData()
  const { selectedChurch } = useChurch()
  const toast = useToast()
  const confirm = useConfirm()

  const [search, setSearch] = useState('')
  const [activeFilter, setActiveFilter] = useState<string | null>(null)
  const [showQuickFilter, setShowQuickFilter] = useState(false)
  const [pageSize, setPageSize] = useState(10)
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [sortField, setSortField] = useState<SortField>('name')
  const [sortAsc, setSortAsc] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingMember, setEditingMember] = useState<Member | null>(null)
  const [viewingMember, setViewingMember] = useState<Member | null>(null)
  const [advOpen, setAdvOpen] = useState(false)
  const [advSel, setAdvSel] = useState<SelectionFilters>(EMPTY_SELECTION)
  const [advSim, setAdvSim] = useState<SimilarityFilters>(EMPTY_SIMILARITY)
  const [exportMenuOpen, setExportMenuOpen] = useState(false)
  const [moreMenuOpen, setMoreMenuOpen] = useState(false)
  const [colConfigOpen, setColConfigOpen] = useState(false)
  const [activeCols, setActiveCols] = useState<ColKey[]>(() => {
    try {
      const saved = localStorage.getItem(`membros-cols-${type}`)
      if (saved) {
        const parsed = JSON.parse(saved) as ColKey[]
        if (Array.isArray(parsed) && parsed.length > 0) return parsed
      }
    } catch {}
    return DEFAULT_COLS
  })

  const handleSetActiveCols = (cols: ColKey[]) => {
    setActiveCols(cols)
    try { localStorage.setItem(`membros-cols-${type}`, JSON.stringify(cols)) } catch {}
  }

  const pageTitle = titleMap[type] ?? 'Membros'
  const pageSub = subMap[type]

  // Pool de dados filtrado pela igreja selecionada no topbar
  const allData = useMemo(() => {
    const pool = [...members, ...visitantes]
    return selectedChurch ? pool.filter(m => m.church_id === selectedChurch.id) : pool
  }, [members, visitantes, selectedChurch])

  // Base filtrada por type (faixa etária ou tipo)
  const baseData = useMemo(() => filterByType(allData, type), [allData, type])

  const advActive = useMemo(() =>
    Object.values(advSel).some(v => v !== '') || Object.values(advSim).some(v => v !== ''),
  [advSel, advSim])

  const filtered = useMemo(() => {
    let data = [...baseData]

    if (search.trim()) {
      const q = search.toLowerCase()
      data = data.filter(m => m.name.toLowerCase().includes(q) || (m.cpf ?? '').includes(q))
    }

    if (advActive) {
      data = applySelectionFilters(data, advSel)
      data = applySimilarityFilters(data, advSim)
    }
    if (activeFilter) {
      const today = new Date()
      if (activeFilter === 'ativos') data = data.filter(m => m.status === 'ativo')
      else if (activeFilter === 'inativos') data = data.filter(m => m.status === 'inativo')
      else if (activeFilter === 'indisponiveis') data = data.filter(m => m.status === 'indisponivel')
      else if (activeFilter === 'batizados') data = data.filter(m => m.baptism)
      else if (activeFilter === 'batizados_espirito') data = data.filter(m => m.baptism_spirit)
      else if (activeFilter === 'convertidos') data = data.filter(m => m.conversion)
      else if (activeFilter === 'acompanhados') data = data.filter(m => !!m.ministry?.companion_id)
      else if (activeFilter === 'sem_acompanhamento') data = data.filter(m => !m.ministry?.companion_id)
      else if (activeFilter === 'discipulados') data = data.filter(m => !!m.ministry?.discipler_id)
      else if (activeFilter === 'sem_discipulado') data = data.filter(m => !m.ministry?.discipler_id)
      else if (activeFilter === 'aniversariantes_hoje') {
        const mmdd = format(today, 'MM-dd')
        data = data.filter(m => m.birth_date?.slice(5) === mmdd)
      } else if (activeFilter === 'aniversariantes_mes') {
        const mm = format(today, 'MM')
        data = data.filter(m => m.birth_date?.slice(5, 7) === mm)
      } else if (activeFilter === 'casados_hoje') {
        data = data.filter(m => m.civil_status === 'casado')
      }
    }

    data.sort((a, b) => {
      let va = '', vb = ''
      if (sortField === 'name') { va = a.name; vb = b.name }
      else if (sortField === 'birth_date') { va = a.birth_date ?? ''; vb = b.birth_date ?? '' }
      else if (sortField === 'status') { va = a.status; vb = b.status }
      return sortAsc ? va.localeCompare(vb) : vb.localeCompare(va)
    })
    return data
  }, [baseData, search, activeFilter, sortField, sortAsc, advActive, advSel, advSim])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize)

  // ── Exportação / Impressão ──────────────────────────────────────────────

  // Labels pra gerar resumo legível dos filtros ativos
  const quickFiltersLabels = useMemo(
    () => Object.fromEntries(quickFilters.map(f => [f.key, f.label])),
    []
  )

  // Monta resumo legível dos filtros ativos (delegado pra lib)
  const filterSummary = (): string[] =>
    buildFilterSummary(
      search,
      activeFilter,
      quickFiltersLabels,
      advSel as unknown as Record<string, string>,
      advSim as unknown as Record<string, string>,
    )

  const buildRows = (data: Member[]) =>
    data.map(m => {
      const row: Record<string, string> = {}
      activeCols.forEach(key => {
        const col = ALL_COLUMNS.find(c => c.key === key)!
        const val = col.render(m)
        row[col.label] = typeof val === 'string' ? val : String(val ?? '—')
      })
      return row
    })

  const handleExportXlsx = () => {
    const rows = buildRows(filtered)
    const wb = XLSX.utils.book_new()

    // Aba de dados
    const ws = XLSX.utils.json_to_sheet(rows)
    ws['!cols'] = activeCols.map(key => ({ wch: Math.max(ALL_COLUMNS.find(c => c.key === key)!.label.length + 2, 18) }))
    XLSX.utils.book_append_sheet(wb, ws, pageTitle)

    // Aba de filtros aplicados
    const summary = filterSummary()
    if (summary.length > 0) {
      const wsF = XLSX.utils.aoa_to_sheet([
        ['Filtros aplicados na exportação'],
        [`Gerado em: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`],
        [`Total de registros: ${filtered.length}`],
        [],
        ...summary.map(l => [l]),
      ])
      wsF['!cols'] = [{ wch: 50 }]
      XLSX.utils.book_append_sheet(wb, wsF, 'Filtros')
    }

    XLSX.writeFile(wb, `${pageTitle}_${format(new Date(), 'yyyy-MM-dd')}.xlsx`)
    setExportMenuOpen(false)
  }

  const handleExportCsv = () => {
    const rows = buildRows(filtered)
    if (rows.length === 0) return
    const summary = filterSummary()
    const headers = Object.keys(rows[0])
    const lines: string[] = []

    // Cabeçalho de metadados
    if (summary.length > 0) {
      lines.push(`"Filtros aplicados:"`)
      summary.forEach(l => lines.push(`"${l}"`))
      lines.push(`"Total de registros: ${filtered.length}"`)
      lines.push(`"Gerado em: ${format(new Date(), 'dd/MM/yyyy HH:mm')}"`)
      lines.push('')
    }

    lines.push(headers.join(';'))
    rows.forEach(row => lines.push(headers.map(h => `"${(row[h] ?? '').replace(/"/g, '""')}"`).join(';')))

    const blob = new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${pageTitle}_${format(new Date(), 'yyyy-MM-dd')}.csv`
    a.click()
    URL.revokeObjectURL(url)
    setExportMenuOpen(false)
  }

  const handlePrint = () => {
    const rows = buildRows(filtered)
    const headers = activeCols.map(key => ALL_COLUMNS.find(c => c.key === key)!.label)
    printMembrosList({
      pageTitle,
      pageSub,
      rows,
      headers,
      filtersSummary: filterSummary(),
    })
    setExportMenuOpen(false)
  }

  const handleEmailExport = () => {
    const summary = filterSummary()
    const filterText = summary.length > 0
      ? `\n\nFiltros aplicados:\n${summary.map(l => `• ${l}`).join('\n')}`
      : ''
    const subject = encodeURIComponent(`Lista de ${pageTitle}`)
    const body = encodeURIComponent(
      `Segue a lista de ${pageTitle} gerada em ${format(new Date(), 'dd/MM/yyyy HH:mm')}.\nTotal: ${filtered.length} registro(s).${filterText}`
    )
    window.location.href = `mailto:?subject=${subject}&body=${body}`
    setExportMenuOpen(false)
  }

  const handlePrintBlankForm = () => {
    printFichaFisica()
  }

  const handlePrintIndividual = (m: Member) => {
    printMembroIndividual(m)
  }

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortAsc(a => !a)
    else { setSortField(field); setSortAsc(true) }
    setPage(1)
  }

  const toggleSelect = (id: string) => {
    setSelected(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })
  }
  const toggleAll = () => {
    if (selected.size === paginated.length) setSelected(new Set())
    else setSelected(new Set(paginated.map(m => m.id)))
  }

  const handleDelete = useCallback(async (id: string) => {
    const ok = await confirm({
      title: 'Excluir registro',
      message: 'Tem certeza que deseja excluir este registro?',
      danger: true,
    })
    if (!ok) return
    try {
      await removeMember(id)
      toast.success('Registro excluído.')
    } catch (err) {
      console.error(err)
      toast.error('Erro ao excluir. Tente novamente.')
    }
  }, [removeMember, confirm, toast])

  const handleOpenAdd = () => { setEditingMember(null); setModalOpen(true) }
  const handleOpenEdit = (m: Member) => { setEditingMember(m); setModalOpen(true) }

  const handleSave = async (data: Partial<Member>) => {
    try {
      if (editingMember) {
        await saveMember({ id: editingMember.id, ...data })
        toast.success('Cadastro atualizado.')
      } else {
        const isVisitante = type === 'visitantes'
        const fallbackChurch = selectedChurch?.id ?? DEFAULT_CHURCH_ID
        await saveMember({
          church_id: data.church_id ?? fallbackChurch,
          member_type: isVisitante ? 'visitante' : 'membro',
          status: data.status ?? 'ativo',
          name: data.name ?? '',
          ...data,
        })
        toast.success(isVisitante ? 'Visitante cadastrado.' : 'Membro cadastrado.')
      }
      setModalOpen(false)
    } catch (err) {
      console.error('[MembrosPage] erro ao salvar:', err)
      const msg = (err as { message?: string })?.message ?? ''
      toast.error(msg ? `Erro ao salvar: ${msg}` : 'Erro ao salvar. Verifique o console (F12).')
    }
  }

  const SortIcon = ({ field }: { field: SortField }) => (
    <span className="ml-0.5 text-gray-400">{sortField === field ? (sortAsc ? '↑' : '↓') : '↕'}</span>
  )

  const summaryCards = [
    { label: 'Ativos', value: baseData.filter(m => m.status === 'ativo').length, color: 'bg-blue-500', filter: 'ativos' },
    { label: 'Batizados', value: baseData.filter(m => m.baptism).length, color: 'bg-indigo-500', filter: 'batizados' },
    { label: 'Convertidos', value: baseData.filter(m => m.conversion).length, color: 'bg-emerald-500', filter: 'convertidos' },
    { label: 'Total', value: baseData.length, color: 'bg-gray-500', filter: null },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-800">{pageTitle}</h1>
          <p className="text-sm text-gray-500">
            Secretaria · {pageTitle}
            {pageSub && <span className="ml-1 text-gray-400">— {pageSub}</span>}
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {summaryCards.map(c => (
          <button
            key={c.label}
            onClick={() => c.filter && setActiveFilter(activeFilter === c.filter ? null : c.filter)}
            className={`${c.color} rounded-xl p-3 text-white shadow-sm text-left transition-transform hover:scale-105 ${activeFilter === c.filter ? 'ring-2 ring-offset-2 ring-white' : ''} ${!c.filter ? 'cursor-default' : ''}`}
          >
            <div className="text-2xl font-bold">{c.value}</div>
            <div className="text-xs opacity-90 mt-0.5">{c.label}</div>
          </button>
        ))}
      </div>

      {(search.trim() || activeFilter || advActive) && (
        <div className="flex items-center flex-wrap gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          <span className="text-xs font-medium text-amber-700 shrink-0">Filtros ativos:</span>

          {search.trim() && (
            <span className="inline-flex items-center gap-1 bg-white border border-amber-300 text-amber-800 px-2 py-0.5 rounded-full text-xs font-medium">
              Busca: "{search}"
              <button onClick={() => { setSearch(''); setPage(1) }} className="hover:text-red-500"><X size={11} /></button>
            </span>
          )}

          {activeFilter && (
            <span className="inline-flex items-center gap-1 bg-white border border-amber-300 text-amber-800 px-2 py-0.5 rounded-full text-xs font-medium">
              {quickFilters.find(f => f.key === activeFilter)?.label ?? activeFilter}
              <button onClick={() => setActiveFilter(null)} className="hover:text-red-500"><X size={11} /></button>
            </span>
          )}

          {advActive && (
            <button
              onClick={() => setAdvOpen(true)}
              className="inline-flex items-center gap-1 bg-blue-600 text-white px-2 py-0.5 rounded-full text-xs font-medium hover:bg-blue-700"
            >
              {Object.values(advSel).filter(v => v !== '').length + Object.values(advSim).filter(v => v !== '').length} filtro(s) avançado(s) — editar
            </button>
          )}

          <div className="flex-1" />

          <button
            onClick={() => {
              setSearch('')
              setActiveFilter(null)
              setAdvSel(EMPTY_SELECTION)
              setAdvSim(EMPTY_SIMILARITY)
              setPage(1)
            }}
            className="inline-flex items-center gap-1 text-xs font-medium text-red-600 hover:text-red-700 hover:bg-red-50 px-2 py-0.5 rounded-full border border-red-200 transition-colors"
          >
            <X size={11} /> Limpar todos os filtros
          </button>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        {/* Toolbar */}
        <div className="p-3 border-b border-gray-100 flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-0 sm:min-w-48 w-full sm:w-auto order-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
              placeholder="Buscar por nome ou CPF..."
              className="form-input pl-8 w-full"
            />
          </div>

          <div className="relative order-3 sm:order-2">
            <button onClick={() => setShowQuickFilter(p => !p)} className="btn-outline flex items-center gap-1">
              <Filter size={13} />
              <span className="hidden sm:inline">Filtros rápidos</span>
              <span className="sm:hidden">Filtros</span>
              <ChevronDown size={12} />
            </button>
            {showQuickFilter && (
              <div className="absolute top-full left-0 mt-1 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-30 py-1 max-h-64 overflow-y-auto">
                {quickFilters.map(f => (
                  <button
                    key={f.key}
                    onClick={() => { setActiveFilter(f.key); setShowQuickFilter(false); setPage(1) }}
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 ${activeFilter === f.key ? 'text-blue-600 font-medium' : 'text-gray-700'}`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={() => setAdvOpen(true)}
            className={`btn-outline items-center gap-1.5 hidden md:flex ${advActive ? 'border-blue-500 text-blue-600 bg-blue-50' : ''}`}
          >
            <Search size={13} />
            <span>Pesquisa avançada</span>
            {advActive && (
              <span className="bg-blue-600 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                {Object.values(advSel).filter(v => v !== '').length + Object.values(advSim).filter(v => v !== '').length}
              </span>
            )}
          </button>

          <div className="hidden sm:block flex-1" />

          <button onClick={handleOpenAdd} className="btn-primary order-2 sm:order-3">
            <Plus size={14} />
            <span>Adicionar</span>
          </button>
          <button onClick={handlePrint} className="btn-outline hidden md:inline-flex" title="Imprimir lista">
            <Printer size={14} />
          </button>
          <button onClick={handlePrintBlankForm} className="btn-outline items-center gap-1.5 hidden lg:flex" title="Gerar ficha de cadastro física para impressão">
            <Printer size={14} />
            <span>Ficha física</span>
          </button>
          <button onClick={() => setColConfigOpen(true)} className="btn-outline hidden md:inline-flex" title="Configurar colunas">
            <Settings2 size={14} />
          </button>

          {/* "Mais" (só mobile): agrupa pesquisa avançada + ficha física + config colunas + imprimir lista */}
          <div className="relative order-4 md:hidden">
            <button
              onClick={() => setMoreMenuOpen(p => !p)}
              className={`btn-outline flex items-center gap-1 ${moreMenuOpen ? 'bg-gray-100' : ''}`}
              title="Mais ações"
            >
              <MoreHorizontal size={16} />
            </button>
            {moreMenuOpen && (
              <>
                <div className="fixed inset-0 z-20" onClick={() => setMoreMenuOpen(false)} />
                <div className="absolute right-0 top-full mt-1 w-60 bg-white border border-gray-200 rounded-lg shadow-xl z-30 py-1.5">
                  <button
                    onClick={() => { setMoreMenuOpen(false); setAdvOpen(true) }}
                    className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2.5"
                  >
                    <Search size={14} className="text-blue-600" />
                    <span>Pesquisa avançada{advActive ? ' •' : ''}</span>
                  </button>
                  <button
                    onClick={() => { setMoreMenuOpen(false); setColConfigOpen(true) }}
                    className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2.5"
                  >
                    <Settings2 size={14} className="text-gray-500" />
                    <span>Configurar colunas</span>
                  </button>
                  <div className="border-t border-gray-100 my-1" />
                  <button
                    onClick={() => { setMoreMenuOpen(false); handlePrint() }}
                    className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2.5"
                  >
                    <Printer size={14} className="text-gray-500" />
                    <span>Imprimir lista</span>
                  </button>
                  <button
                    onClick={() => { setMoreMenuOpen(false); handlePrintBlankForm() }}
                    className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2.5"
                  >
                    <Printer size={14} className="text-gray-500" />
                    <span>Ficha física</span>
                  </button>
                </div>
              </>
            )}
          </div>

          <div className="relative order-5">
            <button
              onClick={() => setExportMenuOpen(p => !p)}
              className={`btn-outline flex items-center gap-1 ${exportMenuOpen ? 'bg-gray-100' : ''}`}
            >
              <Download size={14} />
              <span className="hidden sm:inline">Exportar</span>
              <ChevronDown size={12} className={`transition-transform ${exportMenuOpen ? 'rotate-180' : ''}`} />
            </button>
            {exportMenuOpen && (
              <>
                <div className="fixed inset-0 z-20" onClick={() => setExportMenuOpen(false)} />
                <div className="absolute right-0 top-full mt-1 w-52 bg-white border border-gray-200 rounded-lg shadow-xl z-30 py-1.5">
                  {filtered.length > 0 && (
                    <div className="px-3 py-1.5 border-b border-gray-100 mb-1">
                      <p className="text-[10px] text-gray-400">{filtered.length} registro(s) a exportar</p>
                      {(search.trim() || activeFilter || advActive) && (
                        <p className="text-[10px] text-blue-600 font-medium mt-0.5">Com filtros aplicados</p>
                      )}
                    </div>
                  )}
                  <button onClick={handleExportXlsx} className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2.5">
                    <span className="text-base">📊</span>
                    <div>
                      <p className="font-medium">Exportar .xlsx</p>
                      <p className="text-[10px] text-gray-400">Excel com aba de filtros</p>
                    </div>
                  </button>
                  <button onClick={handleExportCsv} className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2.5">
                    <span className="text-base">📄</span>
                    <div>
                      <p className="font-medium">Exportar .csv</p>
                      <p className="text-[10px] text-gray-400">Compatível com qualquer sistema</p>
                    </div>
                  </button>
                  <div className="border-t border-gray-100 my-1" />
                  <button onClick={handlePrint} className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2.5">
                    <span className="text-base">🖨️</span>
                    <div>
                      <p className="font-medium">Imprimir lista</p>
                      <p className="text-[10px] text-gray-400">Pré-visualização antes de imprimir</p>
                    </div>
                  </button>
                  <button onClick={handleEmailExport} className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2.5">
                    <span className="text-base">✉️</span>
                    <div>
                      <p className="font-medium">Enviar por e-mail</p>
                      <p className="text-[10px] text-gray-400">Abre cliente de e-mail</p>
                    </div>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Table (desktop/tablet) */}
        <div className="overflow-x-auto hidden md:block">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="w-8 px-3 py-2.5">
                  <input type="checkbox" checked={selected.size === paginated.length && paginated.length > 0} onChange={toggleAll} className="rounded" />
                </th>
                <th className="w-10 px-2 py-2.5 text-xs font-semibold text-gray-500 text-left">Foto</th>
                {activeCols.map(key => {
                  const col = ALL_COLUMNS.find(c => c.key === key)!
                  const sortable = key === 'nome' || key === 'nascimento' || key === 'status'
                  const sortField: SortField | null = key === 'nome' ? 'name' : key === 'nascimento' ? 'birth_date' : key === 'status' ? 'status' : null
                  return (
                    <th
                      key={key}
                      className={`px-3 py-2.5 text-xs font-semibold text-gray-500 text-left ${sortable ? 'cursor-pointer hover:text-gray-700' : ''}`}
                      onClick={() => sortField && toggleSort(sortField)}
                    >
                      {col.label} {sortField && <SortIcon field={sortField} />}
                    </th>
                  )
                })}
                <th className="w-24 px-3 py-2.5 text-xs font-semibold text-gray-500 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={activeCols.length + 3} className="text-center py-12 text-gray-400 text-sm">
                    Nenhum registro encontrado
                  </td>
                </tr>
              ) : paginated.map((m, i) => (
                <tr key={m.id} className={`hover:bg-blue-50/30 transition-colors ${i % 2 === 1 ? 'bg-gray-50/50' : ''}`}>
                  <td className="px-3 py-2">
                    <input type="checkbox" checked={selected.has(m.id)} onChange={() => toggleSelect(m.id)} className="rounded" />
                  </td>
                  <td className="px-2 py-2">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center text-white text-xs font-bold">
                      {m.name[0]}
                    </div>
                  </td>
                  {activeCols.map(key => {
                    const col = ALL_COLUMNS.find(c => c.key === key)!
                    const isNome = key === 'nome'
                    const isStatus = key === 'status'
                    return (
                      <td key={key} className="px-3 py-2 text-gray-600 text-xs whitespace-nowrap">
                        {isNome ? (
                          <button onClick={() => handleOpenEdit(m)} className="font-medium text-blue-600 hover:text-blue-800 hover:underline text-left text-sm">
                            {m.name}
                          </button>
                        ) : isStatus ? statusBadge(m.status) : col.render(m)}
                      </td>
                    )
                  })}
                  <td className="px-3 py-2">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => setViewingMember(m)} className="p-1 text-blue-600 hover:bg-blue-50 rounded" title="Visualizar cadastro">
                        <Eye size={14} />
                      </button>
                      <button onClick={() => handleOpenEdit(m)} className="p-1 text-gray-500 hover:bg-gray-100 rounded" title="Editar">
                        <Edit2 size={14} />
                      </button>
                      <button onClick={() => handlePrintIndividual(m)} className="p-1 text-indigo-600 hover:bg-indigo-50 rounded" title="Imprimir cadastro">
                        <Printer size={14} />
                      </button>
                      {m.contacts?.phones?.[0] && (
                        <a
                          href={`https://wa.me/55${m.contacts.phones[0].replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1 text-green-600 hover:bg-green-50 rounded"
                          title="WhatsApp"
                        >
                          <MessageCircle size={14} />
                        </a>
                      )}
                      <a
                        href={`https://maps.google.com?q=${encodeURIComponent(m.contacts?.address ?? m.church?.address ?? '')}`}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1 text-gray-500 hover:bg-gray-100 rounded"
                        title="Google Maps"
                      >
                        <MapPin size={14} />
                      </a>
                      <button onClick={() => handleDelete(m.id)} className="p-1 text-red-500 hover:bg-red-50 rounded" title="Excluir">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Cards (mobile) */}
        <div className="md:hidden divide-y divide-gray-100">
          {paginated.length === 0 ? (
            <div className="text-center py-12 text-gray-400 text-sm">Nenhum registro encontrado</div>
          ) : paginated.map(m => {
            const extra = activeCols
              .filter(k => k !== 'nome' && k !== 'status')
              .slice(0, 3)
              .map(k => {
                const col = ALL_COLUMNS.find(c => c.key === k)!
                const val = col.render(m)
                return { label: col.label, value: typeof val === 'string' ? val : String(val ?? '—') }
              })
            return (
              <div key={m.id} className="p-3">
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={selected.has(m.id)}
                    onChange={() => toggleSelect(m.id)}
                    className="rounded mt-1 shrink-0"
                  />
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center text-white text-sm font-bold shrink-0">
                    {m.name[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <button onClick={() => handleOpenEdit(m)} className="font-semibold text-blue-600 text-sm text-left leading-tight truncate">
                        {m.name}
                      </button>
                      {statusBadge(m.status)}
                    </div>
                    {extra.length > 0 && (
                      <div className="mt-1.5 space-y-0.5">
                        {extra.map(e => (
                          <div key={e.label} className="text-xs text-gray-500 flex gap-1.5">
                            <span className="text-gray-400 shrink-0">{e.label}:</span>
                            <span className="text-gray-700 truncate">{e.value}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="mt-2 flex items-center gap-1 flex-wrap">
                      <button onClick={() => setViewingMember(m)} className="inline-flex items-center gap-1 px-2 py-1 text-xs text-blue-600 bg-blue-50 rounded hover:bg-blue-100" title="Visualizar">
                        <Eye size={12} /> Ver
                      </button>
                      <button onClick={() => handleOpenEdit(m)} className="inline-flex items-center gap-1 px-2 py-1 text-xs text-gray-700 bg-gray-100 rounded hover:bg-gray-200" title="Editar">
                        <Edit2 size={12} /> Editar
                      </button>
                      <button onClick={() => handlePrintIndividual(m)} className="inline-flex items-center gap-1 px-2 py-1 text-xs text-indigo-600 bg-indigo-50 rounded hover:bg-indigo-100" title="Imprimir">
                        <Printer size={12} /> Imprimir
                      </button>
                      {m.contacts?.phones?.[0] && (
                        <a
                          href={`https://wa.me/55${m.contacts.phones[0].replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 px-2 py-1 text-xs text-green-700 bg-green-50 rounded hover:bg-green-100"
                          title="WhatsApp"
                        >
                          <MessageCircle size={12} /> WhatsApp
                        </a>
                      )}
                      <button onClick={() => handleDelete(m.id)} className="inline-flex items-center gap-1 px-2 py-1 text-xs text-red-600 bg-red-50 rounded hover:bg-red-100 ml-auto" title="Excluir">
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Pagination */}
        <div className="px-3 sm:px-4 py-3 border-t border-gray-100 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2 text-xs text-gray-500 flex-wrap">
            <span className="hidden sm:inline">Exibindo {filtered.length === 0 ? 0 : (page - 1) * pageSize + 1} a {Math.min(page * pageSize, filtered.length)} de {filtered.length} registros</span>
            <span className="sm:hidden">{filtered.length} registros</span>
            <span className="hidden sm:inline">|</span>
            <span className="hidden sm:inline">Por página:</span>
            <select
              value={pageSize}
              onChange={e => { setPageSize(+e.target.value); setPage(1) }}
              className="border border-gray-200 rounded px-1.5 py-0.5 text-xs"
            >
              {PAGE_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
              <option value={9999}>Todos</option>
            </select>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-40">
              <ChevronLeft size={14} />
            </button>
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
              const p = i + 1
              return (
                <button key={p} onClick={() => setPage(p)} className={`w-7 h-7 text-xs rounded ${page === p ? 'bg-blue-600 text-white' : 'hover:bg-gray-100 text-gray-600'}`}>
                  {p}
                </button>
              )
            })}
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-40">
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {advOpen && (
        <AdvancedSearch
          initialSel={advSel}
          initialSim={advSim}
          onApply={(sel, sim) => { setAdvSel(sel); setAdvSim(sim); setPage(1) }}
          onClose={() => setAdvOpen(false)}
        />
      )}

      {colConfigOpen && (
        <ColConfigPanel
          selected={activeCols}
          onChange={handleSetActiveCols}
          onClose={() => setColConfigOpen(false)}
        />
      )}

      {viewingMember && (
        <MemberViewModal
          member={viewingMember}
          onClose={() => setViewingMember(null)}
          onEdit={() => { const mm = viewingMember; setViewingMember(null); handleOpenEdit(mm) }}
          onPrint={() => handlePrintIndividual(viewingMember)}
        />
      )}

      {modalOpen && type === 'visitantes' && (
        <VisitanteModal
          visitante={editingMember}
          onClose={() => setModalOpen(false)}
          onSave={handleSave}
        />
      )}
      {modalOpen && type !== 'visitantes' && (
        <MemberModal
          member={editingMember}
          onClose={() => setModalOpen(false)}
          onSave={handleSave}
        />
      )}
    </div>
  )
}
