import React, { useState, useMemo, useCallback } from 'react'
import { format, differenceInYears } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import * as XLSX from 'xlsx'
import {
  Plus, Search, Printer, Settings2, ChevronDown, Download,
  MessageCircle, Trash2, Edit2, MapPin, Filter, X, ChevronLeft, ChevronRight,
  Check, Eye, MoreHorizontal
} from 'lucide-react'
import { mockChurches } from '../../lib/mockData'
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
import { openPrintWindow } from '../../lib/print'

// ──────────────────────────────────────────────
// Definição de colunas disponíveis
// ──────────────────────────────────────────────
type ColKey =
  | 'nome' | 'apelido' | 'idade' | 'sexo' | 'estado_civil' | 'nascimento'
  | 'nacionalidade' | 'identidade' | 'cpf' | 'naturalidade' | 'escolaridade'
  | 'profissao' | 'codigo' | 'historico' | 'credencial'
  | 'email1' | 'email2' | 'telefone1' | 'telefone2' | 'celular1' | 'celular2'
  | 'cep' | 'endereco' | 'numero' | 'complemento' | 'sub_bairro' | 'bairro' | 'cidade' | 'estado' | 'pais'
  | 'titulo' | 'ministerio' | 'departamento' | 'funcao'
  | 'batismo_aguas' | 'batismo_espirito' | 'conversao'
  | 'igreja' | 'status'

interface ColDef {
  key: ColKey
  label: string
  group: string
  render: (m: Member) => React.ReactNode
}

function civilLabel(cs?: string) {
  const map: Record<string, string> = {
    solteiro: 'Solteiro(a)', casado: 'Casado(a)',
    viuvo: 'Viúvo(a)', divorciado: 'Divorciado(a)', uniao_estavel: 'União Estável',
  }
  return cs ? (map[cs] ?? cs) : '—'
}

const ALL_COLUMNS: ColDef[] = [
  // Perfil
  { key: 'nome', label: 'Nome', group: 'Perfil', render: m => m.name },
  { key: 'apelido', label: 'Apelido', group: 'Perfil', render: m => m.apelido ?? '—' },
  { key: 'idade', label: 'Idade', group: 'Perfil', render: m => m.birth_date ? `${differenceInYears(new Date(), new Date(m.birth_date + 'T00:00:00'))} anos` : '—' },
  { key: 'sexo', label: 'Sexo', group: 'Perfil', render: m => m.sex === 'masculino' ? 'Masculino' : m.sex === 'feminino' ? 'Feminino' : '—' },
  { key: 'estado_civil', label: 'Estado civil', group: 'Perfil', render: m => civilLabel(m.civil_status) },
  { key: 'nascimento', label: 'Data de nascimento', group: 'Perfil', render: m => m.birth_date ? format(new Date(m.birth_date + 'T00:00:00'), 'dd/MM/yyyy') : '—' },
  { key: 'nacionalidade', label: 'Nacionalidade', group: 'Perfil', render: m => m.nationality ?? '—' },
  { key: 'identidade', label: 'Identidade', group: 'Perfil', render: m => m.identity ?? '—' },
  { key: 'cpf', label: 'CPF', group: 'Perfil', render: m => m.cpf ?? '—' },
  { key: 'naturalidade', label: 'Naturalidade', group: 'Perfil', render: m => m.naturalidade ?? '—' },
  { key: 'escolaridade', label: 'Escolaridade', group: 'Perfil', render: m => m.schooling ?? '—' },
  { key: 'profissao', label: 'Profissão', group: 'Perfil', render: m => m.occupation ?? '—' },
  { key: 'codigo', label: 'Código auxiliar', group: 'Perfil', render: m => m.code ?? '—' },
  { key: 'credencial', label: 'Credencial', group: 'Perfil', render: _ => '—' },
  { key: 'historico', label: 'Histórico', group: 'Perfil', render: _ => '—' },
  // Contatos
  { key: 'email1', label: 'E-mail 1', group: 'Contatos', render: m => m.contacts?.emails?.[0] ?? '—' },
  { key: 'email2', label: 'E-mail 2', group: 'Contatos', render: m => m.contacts?.emails?.[1] ?? '—' },
  { key: 'telefone1', label: 'Telefone 1', group: 'Contatos', render: m => m.contacts?.phones?.[0] ?? '—' },
  { key: 'telefone2', label: 'Telefone 2', group: 'Contatos', render: m => m.contacts?.phones?.[1] ?? '—' },
  { key: 'celular1', label: 'Celular 1', group: 'Contatos', render: m => m.contacts?.cellphone1 ?? m.contacts?.phones?.[0] ?? '—' },
  { key: 'celular2', label: 'Celular 2', group: 'Contatos', render: m => m.contacts?.phones?.[1] ?? '—' },
  { key: 'cep', label: 'CEP', group: 'Contatos', render: m => m.contacts?.cep ?? '—' },
  { key: 'endereco', label: 'Endereço', group: 'Contatos', render: m => m.contacts?.address ?? '—' },
  { key: 'numero', label: 'Número', group: 'Contatos', render: m => m.contacts?.number ?? '—' },
  { key: 'complemento', label: 'Complemento', group: 'Contatos', render: m => m.contacts?.complement ?? '—' },
  { key: 'sub_bairro', label: 'Sub-bairro', group: 'Contatos', render: _ => '—' },
  { key: 'bairro', label: 'Bairro', group: 'Contatos', render: m => m.contacts?.neighborhood ?? '—' },
  { key: 'cidade', label: 'Cidade', group: 'Contatos', render: m => m.contacts?.city ?? '—' },
  { key: 'estado', label: 'Estado', group: 'Contatos', render: m => m.contacts?.state ?? '—' },
  { key: 'pais', label: 'País', group: 'Contatos', render: m => m.contacts?.country ?? 'Brasil' },
  // Ministério
  { key: 'titulo', label: 'Título', group: 'Ministério', render: m => m.ministry?.titles?.[0] ?? '—' },
  { key: 'ministerio', label: 'Ministério', group: 'Ministério', render: m => m.ministry?.ministries?.[0] ?? '—' },
  { key: 'departamento', label: 'Departamento', group: 'Ministério', render: m => m.ministry?.departments?.[0] ?? '—' },
  { key: 'funcao', label: 'Função', group: 'Ministério', render: m => m.ministry?.functions?.[0] ?? '—' },
  // Espiritual
  { key: 'batismo_aguas', label: 'Batismo nas águas', group: 'Espiritual', render: m => m.baptism ? (m.baptism_date ? format(new Date(m.baptism_date), 'dd/MM/yyyy') : 'Sim') : 'Não' },
  { key: 'batismo_espirito', label: 'Batismo no Espírito', group: 'Espiritual', render: m => m.baptism_spirit ? 'Sim' : 'Não' },
  { key: 'conversao', label: 'Conversão', group: 'Espiritual', render: m => m.conversion ? (m.conversion_date ? format(new Date(m.conversion_date), 'dd/MM/yyyy') : 'Sim') : 'Não' },
  // Admin
  { key: 'igreja', label: 'Igreja', group: 'Administrativo', render: m => m.church?.name ?? '—' },
  { key: 'status', label: 'Status', group: 'Administrativo', render: m => m.status },
]

const DEFAULT_COLS: ColKey[] = ['nome', 'nascimento', 'estado_civil', 'status', 'celular1', 'titulo', 'igreja']

const MAX_COLS = 10

function ColConfigPanel({
  selected,
  onChange,
  onClose,
}: {
  selected: ColKey[]
  onChange: (cols: ColKey[]) => void
  onClose: () => void
}) {
  const [local, setLocal] = useState<ColKey[]>(selected)

  const groups = useMemo(() => {
    const map: Record<string, ColDef[]> = {}
    ALL_COLUMNS.forEach(c => {
      if (!map[c.group]) map[c.group] = []
      map[c.group].push(c)
    })
    return map
  }, [])

  const toggle = (key: ColKey) => {
    if (local.includes(key)) {
      setLocal(l => l.filter(k => k !== key))
    } else {
      if (local.length >= MAX_COLS) return
      setLocal(l => [...l, key])
    }
  }

  const apply = () => { onChange(local); onClose() }
  const reset = () => setLocal(DEFAULT_COLS)

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 sm:pt-12 sm:px-4">
      <div className="bg-white sm:rounded-xl shadow-2xl w-full max-w-2xl h-full sm:h-auto sm:max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <div>
            <h2 className="font-semibold text-gray-800">Personalizar visualização</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Selecione até {MAX_COLS} itens para personalizar a visualização de dados no grid, na impressão e exportação.
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded text-gray-400">
            <X size={16} />
          </button>
        </div>

        {/* Info bar */}
        <div className="px-5 py-2 bg-blue-50 border-b border-blue-100 flex items-center justify-between">
          <span className="text-xs text-blue-700">
            <span className="font-semibold">{local.length}</span> de {MAX_COLS} colunas selecionadas
          </span>
          <button onClick={reset} className="text-xs text-blue-600 hover:underline">Restaurar padrão</button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 p-5 space-y-5">
          {Object.entries(groups).map(([group, cols]) => (
            <div key={group}>
              <h3 className="text-xs font-semibold text-blue-600 uppercase tracking-wider mb-2">{group}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-4 gap-y-1.5">
                {cols.map(col => {
                  const checked = local.includes(col.key)
                  const disabled = !checked && local.length >= MAX_COLS
                  return (
                    <label
                      key={col.key}
                      className={`flex items-center gap-2 text-sm cursor-pointer select-none ${disabled ? 'opacity-40 cursor-not-allowed' : 'hover:text-blue-700'}`}
                    >
                      <div
                        onClick={() => !disabled && toggle(col.key)}
                        className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                          checked ? 'bg-blue-600 border-blue-600' : 'border-gray-300 bg-white'
                        }`}
                      >
                        {checked && <Check size={10} className="text-white" strokeWidth={3} />}
                      </div>
                      <span className="text-gray-700">{col.label}</span>
                    </label>
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-gray-200 flex justify-end gap-2">
          <button onClick={onClose} className="btn-outline">Cancelar</button>
          <button onClick={apply} className="btn-primary">Aplicar</button>
        </div>
      </div>
    </div>
  )
}

const quickFilters = [
  { key: 'ativos', label: 'Ativos' },
  { key: 'inativos', label: 'Inativos' },
  { key: 'indisponiveis', label: 'Indisponíveis' },
  { key: 'batizados', label: 'Batizados nas águas' },
  { key: 'batizados_espirito', label: 'Batizados no Espírito' },
  { key: 'convertidos', label: 'Convertidos' },
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
  const { members, setMembers, visitantes, setVisitantes } = useData()
  const { selectedChurch } = useChurch()

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
  }, [baseData, search, activeFilter, sortField, sortAsc])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize)

  // ── Exportação / Impressão ──────────────────────────────────────────────

  // Monta resumo legível dos filtros ativos
  const filterSummary = (): string[] => {
    const lines: string[] = []
    if (search.trim()) lines.push(`Busca por texto: "${search}"`)
    if (activeFilter) lines.push(`Filtro rápido: ${quickFilters.find(f => f.key === activeFilter)?.label ?? activeFilter}`)
    const selLabels: Record<string, string> = {
      status: 'Status', sexo: 'Sexo', estado_civil: 'Estado Civil', tem_filhos: 'Tem filhos',
      escolaridade: 'Escolaridade', titulo: 'Título', funcao: 'Função',
      motivo_entrada: 'Motivo de entrada', motivo_saida: 'Motivo de saída',
      convertido: 'Convertido', batizado_aguas: 'Batizado nas águas', batizado_espirito: 'Batizado no Espírito',
      igreja: 'Igreja',
      nascimento_de: 'Nascimento de', nascimento_ate: 'Nascimento até',
      registro_de: 'Registro de', registro_ate: 'Registro até',
      conversao_de: 'Conversão de', conversao_ate: 'Conversão até',
      casamento_de: 'Casamento de', casamento_ate: 'Casamento até',
      batismo_de: 'Batismo de', batismo_ate: 'Batismo até',
      entrada_de: 'Entrada de', entrada_ate: 'Entrada até',
      idade_min: 'Idade mínima', idade_max: 'Idade máxima',
    }
    const simLabels: Record<string, string> = {
      nome: 'Nome', naturalidade: 'Naturalidade', cpf: 'CPF', profissao: 'Profissão',
      origem_igreja: 'Igreja de origem', email: 'E-mail', telefone: 'Telefone',
      celular: 'Celular', nome_pai: 'Nome do pai', nome_mae: 'Nome da mãe',
      nome_conjuge: 'Nome do cônjuge', endereco: 'Endereço', bairro: 'Bairro', cidade: 'Cidade',
    }
    Object.entries(advSel).forEach(([k, v]) => { if (v) lines.push(`${selLabels[k] ?? k}: ${v}`) })
    Object.entries(advSim).forEach(([k, v]) => { if (v) lines.push(`${simLabels[k] ?? k}: contém "${v}"`) })
    return lines
  }

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
    const dateStr = format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
    const summary = filterSummary()

    const filterBlock = summary.length > 0
      ? `<div class="filters">
          <p class="filter-title">Filtros aplicados:</p>
          ${summary.map(l => `<p class="filter-item">• ${l}</p>`).join('')}
         </div>`
      : ''

    const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"/><title>${pageTitle}</title>
      <style>
        *{box-sizing:border-box;margin:0;padding:0}
        body{font-family:Arial,sans-serif;font-size:11px;color:#111;padding:20px}
        .brand-header{width:100%;display:flex;justify-content:center;margin-bottom:8px}
        .brand-header img{max-width:100%;max-height:90px;object-fit:contain}
        .title-bar{border-top:2px solid #1d4ed8;border-bottom:2px solid #1d4ed8;padding:6px 4px;margin-bottom:12px}
        h1{font-size:15px;margin-bottom:2px;color:#1d4ed8}
        p.sub{font-size:10px;color:#666}
        .filters{background:#f0f4ff;border:1px solid #c7d7fb;border-radius:4px;padding:8px 10px;margin-bottom:12px}
        .filter-title{font-size:10px;font-weight:bold;color:#1d4ed8;margin-bottom:4px}
        .filter-item{font-size:10px;color:#374151;margin-bottom:1px}
        table{width:100%;border-collapse:collapse;margin-top:4px}
        th{background:#1d4ed8;color:white;padding:5px 8px;text-align:left;font-size:10px}
        td{padding:4px 8px;border-bottom:1px solid #e5e7eb;font-size:10px}
        tr:nth-child(even) td{background:#f9fafb}
        .footer{margin-top:10px;font-size:9px;color:#9ca3af;text-align:right}
        @media print{body{padding:8px}.no-print{display:none}}
      </style>
      </head><body>
      <div class="no-print" style="margin-bottom:12px;display:flex;gap:8px">
        <button onclick="window.print()" style="background:#1d4ed8;color:white;border:none;padding:6px 16px;border-radius:6px;cursor:pointer;font-size:12px">🖨️ Imprimir</button>
        <button onclick="window.close()" style="background:#f3f4f6;border:1px solid #d1d5db;padding:6px 16px;border-radius:6px;cursor:pointer;font-size:12px">✕ Fechar</button>
      </div>
      <div class="brand-header"><img src="${window.location.origin}/brand/cabecalho.png" alt="AD Piracanjuba" onerror="this.style.display='none'"/></div>
      <div class="title-bar">
        <h1>${pageTitle}</h1>
        <p class="sub">Gerado em ${dateStr} · <strong>${filtered.length}</strong> registro(s)${pageSub ? ' · ' + pageSub : ''}</p>
      </div>
      ${filterBlock}
      <table>
        <thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead>
        <tbody>${rows.map(row => `<tr>${headers.map(h => `<td>${row[h] ?? '—'}</td>`).join('')}</tr>`).join('')}</tbody>
      </table>
      <p class="footer">Igreja Digital · ${format(new Date(), 'dd/MM/yyyy HH:mm')}</p>
      </body></html>`

    openPrintWindow(html, `${pageTitle} — Lista`)
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
    const line = (w = '100%') => `<div style="border-bottom:1px solid #aaa;width:${w};min-height:14px;display:inline-block;vertical-align:bottom"></div>`
    const box = (label: string) => `<span style="display:inline-flex;align-items:center;gap:4px;margin-right:10px;font-size:9px"><span style="width:10px;height:10px;border:1px solid #555;display:inline-block;vertical-align:middle;border-radius:2px"></span>${label}</span>`

    const ficha = () => `
      <div class="ficha">
        <!-- Cabeçalho -->
        <div style="width:100%;display:flex;justify-content:center;margin-bottom:4px">
          <img src="${window.location.origin}/brand/cabecalho.png" alt="AD Piracanjuba" style="max-width:100%;max-height:60px;object-fit:contain" onerror="this.style.display='none'"/>
        </div>
        <div class="header">
          <div class="header-title">
            <div style="font-size:13px;font-weight:bold;color:#1d4ed8">FICHA DE CADASTRO</div>
            <div style="font-size:9px;color:#555">Secretaria</div>
          </div>
          <div class="header-right">
            <div class="field-row"><span class="lbl">Igreja:</span>${line('120px')}</div>
            <div class="field-row" style="margin-top:4px"><span class="lbl">Data:</span>${line('80px')}&nbsp;&nbsp;<span class="lbl">Cód.:</span>${line('60px')}</div>
          </div>
        </div>

        <div class="section-title">IDENTIFICAÇÃO</div>
        <div class="row">
          <div class="col-8"><span class="lbl">Nome completo:</span>${line()}</div>
          <div class="col-4"><span class="lbl">Apelido:</span>${line()}</div>
        </div>
        <div class="row">
          <div class="col-3"><span class="lbl">Sexo:</span>&nbsp;${box('Masc.')}${box('Fem.')}</div>
          <div class="col-3"><span class="lbl">Nascimento:</span>${line()}</div>
          <div class="col-3"><span class="lbl">Naturalidade:</span>${line()}</div>
          <div class="col-3"><span class="lbl">Nacionalidade:</span>${line()}</div>
        </div>
        <div class="row">
          <div class="col-4"><span class="lbl">Estado civil:</span>&nbsp;${box('Solteiro(a)')}${box('Casado(a)')}${box('Viúvo(a)')}${box('Divorciado(a)')}</div>
          <div class="col-4"><span class="lbl">Escolaridade:</span>${line()}</div>
          <div class="col-4"><span class="lbl">Profissão:</span>${line()}</div>
        </div>
        <div class="row">
          <div class="col-4"><span class="lbl">CPF:</span>${line()}</div>
          <div class="col-4"><span class="lbl">RG / Identidade:</span>${line()}</div>
          <div class="col-4"><span class="lbl">Data de entrada:</span>${line()}</div>
        </div>

        <div class="section-title">CONTATOS</div>
        <div class="row">
          <div class="col-6"><span class="lbl">Celular 1:</span>${line()}</div>
          <div class="col-6"><span class="lbl">Celular 2 / Telefone:</span>${line()}</div>
        </div>
        <div class="row">
          <div class="col-6"><span class="lbl">E-mail 1:</span>${line()}</div>
          <div class="col-6"><span class="lbl">E-mail 2:</span>${line()}</div>
        </div>

        <div class="section-title">ENDEREÇO</div>
        <div class="row">
          <div class="col-6"><span class="lbl">Logradouro / Endereço:</span>${line()}</div>
          <div class="col-2"><span class="lbl">Número:</span>${line()}</div>
          <div class="col-4"><span class="lbl">Complemento:</span>${line()}</div>
        </div>
        <div class="row">
          <div class="col-4"><span class="lbl">Bairro:</span>${line()}</div>
          <div class="col-4"><span class="lbl">Cidade:</span>${line()}</div>
          <div class="col-2"><span class="lbl">Estado:</span>${line()}</div>
          <div class="col-2"><span class="lbl">CEP:</span>${line()}</div>
        </div>

        <div class="section-title">FAMÍLIA</div>
        <div class="row">
          <div class="col-6"><span class="lbl">Nome do cônjuge:</span>${line()}</div>
          <div class="col-3"><span class="lbl">Nascimento cônjuge:</span>${line()}</div>
          <div class="col-3"><span class="lbl">Data do casamento:</span>${line()}</div>
        </div>
        <div class="row">
          <div class="col-6"><span class="lbl">Nome do pai:</span>${line()}</div>
          <div class="col-6"><span class="lbl">Nome da mãe:</span>${line()}</div>
        </div>
        <div style="margin:4px 0 2px"><span class="lbl">Filhos:</span></div>
        <div class="row">
          <div class="col-6" style="display:flex;align-items:center;gap:6px"><span class="lbl" style="white-space:nowrap">1.</span>${line('70%')}<span class="lbl" style="white-space:nowrap">Nasc.:</span>${line('28%')}</div>
          <div class="col-6" style="display:flex;align-items:center;gap:6px"><span class="lbl" style="white-space:nowrap">2.</span>${line('70%')}<span class="lbl" style="white-space:nowrap">Nasc.:</span>${line('28%')}</div>
        </div>
        <div class="row">
          <div class="col-6" style="display:flex;align-items:center;gap:6px"><span class="lbl" style="white-space:nowrap">3.</span>${line('70%')}<span class="lbl" style="white-space:nowrap">Nasc.:</span>${line('28%')}</div>
          <div class="col-6" style="display:flex;align-items:center;gap:6px"><span class="lbl" style="white-space:nowrap">4.</span>${line('70%')}<span class="lbl" style="white-space:nowrap">Nasc.:</span>${line('28%')}</div>
        </div>

        <div class="section-title">VIDA ESPIRITUAL</div>
        <div class="row">
          <div class="col-4"><span class="lbl">Convertido:</span>&nbsp;${box('Sim')}${box('Não')}&nbsp;<span class="lbl">Data:</span>${line('50px')}</div>
          <div class="col-4"><span class="lbl">Batismo nas águas:</span>&nbsp;${box('Sim')}${box('Não')}&nbsp;<span class="lbl">Data:</span>${line('50px')}</div>
          <div class="col-4"><span class="lbl">Batismo no Espírito:</span>&nbsp;${box('Sim')}${box('Não')}&nbsp;<span class="lbl">Data:</span>${line('50px')}</div>
        </div>
        <div class="row">
          <div class="col-6"><span class="lbl">Igreja de origem:</span>${line()}</div>
          <div class="col-6"><span class="lbl">Motivo de entrada:</span>${line()}</div>
        </div>

        <!-- Assinatura -->
        <div style="display:flex;gap:16px;margin-top:6px">
          <div style="flex:1"><span class="lbl">Assinatura do membro:</span>${line()}</div>
          <div style="flex:1"><span class="lbl">Assinatura do secretário(a):</span>${line()}</div>
        </div>
      </div>
    `

    const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"/>
    <title>Ficha de Cadastro</title>
    <style>
      *{box-sizing:border-box;margin:0;padding:0}
      body{font-family:Arial,sans-serif;font-size:9px;color:#111;background:#fff;padding:8mm}
      .ficha{border:1px solid #bbb;border-radius:4px;padding:6px 8px;margin-bottom:4mm;page-break-inside:avoid}
      .header{display:flex;align-items:center;gap:8px;border-bottom:1.5px solid #1d4ed8;padding-bottom:5px;margin-bottom:5px}
      .header-logo{flex-shrink:0}
      .header-title{flex-shrink:0}
      .header-right{flex:1;display:flex;flex-direction:column;align-items:flex-end}
      .section-title{background:#1d4ed8;color:white;font-size:8px;font-weight:bold;letter-spacing:.5px;padding:2px 6px;margin:5px -8px 4px;text-transform:uppercase}
      .row{display:flex;gap:8px;margin-bottom:4px;align-items:flex-end}
      .col-2{flex:2;min-width:0}.col-3{flex:3;min-width:0}.col-4{flex:4;min-width:0}.col-6{flex:6;min-width:0}.col-8{flex:8;min-width:0}
      .lbl{font-size:8px;color:#374151;font-weight:600;white-space:nowrap;margin-right:2px}
      .field-row{display:flex;align-items:center;gap:4px;font-size:8px}
      @media print{
        body{padding:4mm}
        .no-print{display:none!important}
        .ficha{margin-bottom:3mm}
        @page{size:A4;margin:6mm}
      }
    </style>
    </head><body>
    <div class="no-print" style="margin-bottom:10px;display:flex;align-items:center;gap:8px;background:#f0f4ff;border:1px solid #c7d7fb;border-radius:6px;padding:8px 12px">
      <span style="font-size:11px;color:#1d4ed8;font-weight:600">📋 Ficha de Cadastro Física — 2 por folha A4</span>
      <button onclick="window.print()" style="background:#1d4ed8;color:white;border:none;padding:5px 14px;border-radius:5px;cursor:pointer;font-size:11px;margin-left:auto">🖨️ Imprimir</button>
      <button onclick="window.close()" style="background:#f3f4f6;border:1px solid #d1d5db;padding:5px 14px;border-radius:5px;cursor:pointer;font-size:11px">✕ Fechar</button>
    </div>
    ${ficha()}
    ${ficha()}
    </body></html>`

    openPrintWindow(html, 'Ficha de Cadastro')
  }

  const handlePrintIndividual = (m: Member) => {
    const dateStr = format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
    const age = m.birth_date ? differenceInYears(new Date(), new Date(m.birth_date + 'T00:00:00')) : null
    const d = (dt?: string) => {
      if (!dt) return '—'
      try { return format(new Date(dt + (dt.length === 10 ? 'T00:00:00' : '')), 'dd/MM/yyyy') } catch { return dt }
    }
    const statusTxt = m.status === 'ativo' ? 'Ativo' : m.status === 'inativo' ? 'Inativo' : m.status === 'indisponivel' ? 'Indisponível' : m.status === 'deleted' ? 'Excluído' : '—'
    const sexoTxt = m.sex === 'masculino' ? 'Masculino' : m.sex === 'feminino' ? 'Feminino' : '—'
    const filhos = m.family?.children?.length
      ? m.family.children.map(c => `${c.name}${c.birth_date ? ` (${d(c.birth_date)})` : ''}`).join(', ')
      : '—'

    const field = (label: string, value?: React.ReactNode) =>
      `<div class="field"><div class="lbl">${label}</div><div class="val">${value && value !== '' ? value : '—'}</div></div>`

    const section = (title: string, body: string) =>
      `<div class="section"><div class="section-title">${title}</div><div class="grid">${body}</div></div>`

    const ident = [
      field('Nome completo', m.name),
      field('Data de nascimento', d(m.birth_date)),
      field('Idade', age !== null ? `${age} anos` : '—'),
      field('Sexo', sexoTxt),
      field('Estado civil', civilLabel(m.civil_status)),
      field('Nacionalidade', m.nationality),
      field('Naturalidade', m.naturalidade),
      field('CPF', m.cpf),
      field('Identidade', m.identity),
      field('Escolaridade', m.schooling),
      field('Profissão', m.occupation),
      field('Código', m.code),
    ].join('')

    const contatos = [
      field('Celular 1', m.contacts?.cellphone1 ?? m.contacts?.phones?.[0]),
      field('Telefone / Celular 2', m.contacts?.phones?.[1]),
      field('E-mail 1', m.contacts?.emails?.[0]),
      field('E-mail 2', m.contacts?.emails?.[1]),
      field('CEP', m.contacts?.cep),
      field('Endereço', m.contacts?.address),
      field('Número', m.contacts?.number),
      field('Complemento', m.contacts?.complement),
      field('Bairro', m.contacts?.neighborhood),
      field('Cidade', m.contacts?.city),
      field('Estado', m.contacts?.state),
      field('País', m.contacts?.country ?? 'Brasil'),
    ].join('')

    const familia = [
      field('Cônjuge', m.family?.spouse_name),
      field('Nasc. cônjuge', d(m.family?.spouse_birth_date)),
      field('Data do casamento', d(m.family?.wedding_date)),
      field('Nome do pai', m.family?.father_name),
      field('Nome da mãe', m.family?.mother_name),
      `<div class="field col-span-3"><div class="lbl">Filhos (${m.family?.children?.length ?? 0})</div><div class="val">${filhos}</div></div>`,
    ].join('')

    const espiritual = [
      field('Convertido', m.conversion ? 'Sim' : 'Não'),
      field('Data da conversão', d(m.conversion_date)),
      field('Batismo nas águas', m.baptism ? 'Sim' : 'Não'),
      field('Data batismo águas', d(m.baptism_date)),
      field('Batismo no Espírito', m.baptism_spirit ? 'Sim' : 'Não'),
      field('Data batismo Espírito', d(m.baptism_spirit_date)),
    ].join('')

    const ministerio = [
      field('Títulos', m.ministry?.titles?.join(', ')),
      field('Ministérios', m.ministry?.ministries?.join(', ')),
      field('Departamentos', m.ministry?.departments?.join(', ')),
      field('Funções', m.ministry?.functions?.join(', ')),
      field('Companheiro(a)', m.ministry?.companion),
    ].join('')

    const admin = [
      field('Igreja', m.church?.name),
      field('Status', statusTxt),
      field('Data de entrada', d(m.entry_date)),
      field('Motivo de entrada', m.entry_reason),
      field('Igreja de origem', m.origin_church),
      field('Como chegou', m.how_arrived),
      field('Data de saída', d(m.exit_date)),
      field('Motivo de saída', m.exit_reason),
    ].join('')

    const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"/>
      <title>Cadastro — ${m.name}</title>
      <style>
        *{box-sizing:border-box;margin:0;padding:0}
        body{font-family:Arial,sans-serif;font-size:11px;color:#111;padding:18px;background:#fff}
        .brand-header{width:100%;display:flex;justify-content:center;margin-bottom:6px}
        .brand-header img{max-width:100%;max-height:100px;object-fit:contain}
        .title-bar{display:flex;align-items:center;justify-content:space-between;border-top:2px solid #1d4ed8;border-bottom:2px solid #1d4ed8;padding:8px 4px;margin-bottom:14px}
        .title-bar h1{font-size:15px;color:#1d4ed8;margin:0}
        .title-bar .meta{font-size:10px;color:#666;text-align:right}
        .title-bar .status{display:inline-block;margin-left:6px;padding:1px 8px;border-radius:10px;font-size:9px;font-weight:bold;background:#dbeafe;color:#1d4ed8;vertical-align:middle}
        .section{margin-bottom:12px;border:1px solid #e5e7eb;border-radius:4px;overflow:hidden}
        .section-title{background:#1d4ed8;color:#fff;font-size:10px;font-weight:bold;letter-spacing:.5px;padding:5px 10px;text-transform:uppercase}
        .grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px 14px;padding:10px}
        .field{min-width:0}
        .field.col-span-3{grid-column:span 3}
        .lbl{font-size:8.5px;color:#6b7280;font-weight:600;text-transform:uppercase;letter-spacing:.3px;margin-bottom:1px}
        .val{font-size:10.5px;color:#111;word-break:break-word}
        .footer{margin-top:14px;font-size:9px;color:#9ca3af;text-align:right;border-top:1px solid #e5e7eb;padding-top:6px}
        @media print{body{padding:10mm}.no-print{display:none!important}@page{size:A4;margin:8mm}}
      </style>
      </head><body>
      <div class="no-print" style="margin-bottom:12px;display:flex;gap:8px;align-items:center;background:#f0f4ff;border:1px solid #c7d7fb;border-radius:6px;padding:8px 12px">
        <span style="font-size:11px;color:#1d4ed8;font-weight:600">📄 Cadastro individual — ${m.name}</span>
        <button onclick="window.print()" style="background:#1d4ed8;color:white;border:none;padding:5px 14px;border-radius:5px;cursor:pointer;font-size:11px;margin-left:auto">🖨️ Imprimir</button>
        <button onclick="window.close()" style="background:#f3f4f6;border:1px solid #d1d5db;padding:5px 14px;border-radius:5px;cursor:pointer;font-size:11px">✕ Fechar</button>
      </div>
      <div class="brand-header"><img src="${window.location.origin}/brand/cabecalho.png" alt="AD Piracanjuba" onerror="this.style.display='none'"/></div>
      <div class="title-bar">
        <h1>${m.name ?? '—'}<span class="status">${statusTxt}</span></h1>
        <div class="meta">${m.church?.name ?? ''}${m.church?.name ? '<br/>' : ''}Gerado em ${dateStr}</div>
      </div>
      ${section('Identificação', ident)}
      ${section('Contatos', contatos)}
      ${section('Família', familia)}
      ${section('Vida Espiritual', espiritual)}
      ${section('Ministério', ministerio)}
      ${section('Administrativo', admin)}
      <div class="footer">Igreja Digital · ${format(new Date(), 'dd/MM/yyyy HH:mm')}</div>
      </body></html>`

    openPrintWindow(html, `Cadastro — ${m.name}`)
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

  const handleDelete = useCallback((id: string) => {
    if (!confirm('Tem certeza que deseja excluir este registro?')) return
    const del = (list: Member[]) => list.map(m => m.id === id ? { ...m, status: 'deleted' as const } : m)
    setMembers(del)
    setVisitantes(del)
  }, [setMembers, setVisitantes])

  const handleOpenAdd = () => { setEditingMember(null); setModalOpen(true) }
  const handleOpenEdit = (m: Member) => { setEditingMember(m); setModalOpen(true) }

  const handleSave = (data: Partial<Member>) => {
    if (editingMember) {
      const upd = (list: Member[]) => list.map(m => m.id === editingMember.id ? { ...m, ...data } : m)
      setMembers(upd)
      setVisitantes(upd)
    } else {
      const isVisitante = type === 'visitantes'
      const newM: Member = {
        id: `${isVisitante ? 'visitor' : 'member'}-${Date.now()}`,
        church_id: data.church_id ?? mockChurches[0].id,
        member_type: isVisitante ? 'visitante' : 'membro',
        status: data.status ?? 'ativo',
        name: data.name ?? '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        ...data,
        church: mockChurches.find(c => c.id === (data.church_id ?? mockChurches[0].id)),
      }
      if (isVisitante) setVisitantes(v => [newM, ...v])
      else setMembers(ms => [newM, ...ms])
    }
    setModalOpen(false)
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
