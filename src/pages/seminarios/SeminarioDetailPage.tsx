import { useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, GraduationCap, UserPlus, Calendar, Clock, MapPin, Users,
  Eye, Pencil, Trash2, Search, Award, CheckCircle2, Percent, Settings2,
  Printer, X, Check, ChevronUp, ChevronDown, ChevronsUpDown,
} from 'lucide-react'
import { useData } from '../../contexts/DataContext'
import type { Matricula, MatriculaSituacao } from '../../types'
import MatriculaModal from './MatriculaModal'
import { fmtDate, fmtIdade, hojeISO } from '../../lib/format'
import { useToast, useConfirm } from '../../components/ui/UIProvider'
import { useMemberQuickView } from '../../contexts/MemberQuickViewContext'
import BulkActionBar, { type BulkAction } from '../../components/bulk/BulkActionBar'
import { useBulkMatriculas } from '../../components/bulk/useBulkMatriculas'
import { openPrintWindow } from '../../lib/print'

// ── Definição de colunas ────────────────────────────────────────────────────

type ColKey = 'nome' | 'idade' | 'contato' | 'situacao' | 'frequencia' | 'nota' | 'data_matricula' | 'data_conclusao' | 'cpf' | 'cidade'

interface ColDef {
  key: ColKey
  label: string
  group: string
  sortable?: boolean
}

const ALL_COLS: ColDef[] = [
  // Identificação
  { key: 'nome',           label: 'Aluno',           group: 'Identificação', sortable: true },
  { key: 'idade',          label: 'Idade',           group: 'Identificação', sortable: true },
  { key: 'cpf',            label: 'CPF',             group: 'Identificação' },
  { key: 'cidade',         label: 'Cidade',          group: 'Identificação' },
  // Contato
  { key: 'contato',        label: 'Contato',         group: 'Contato' },
  // Acadêmico
  { key: 'situacao',       label: 'Situação',        group: 'Acadêmico', sortable: true },
  { key: 'frequencia',     label: 'Frequência',      group: 'Acadêmico', sortable: true },
  { key: 'nota',           label: 'Nota',            group: 'Acadêmico', sortable: true },
  { key: 'data_matricula', label: 'Data matrícula',  group: 'Acadêmico', sortable: true },
  { key: 'data_conclusao', label: 'Data conclusão',  group: 'Acadêmico', sortable: true },
]

const DEFAULT_COLS: ColKey[] = ['nome', 'idade', 'contato', 'situacao', 'frequencia', 'nota']
const MAX_COLS = 8
const LS_KEY = 'seminario-detail-cols'

function loadCols(): ColKey[] {
  try {
    const s = localStorage.getItem(LS_KEY)
    if (s) { const p = JSON.parse(s) as ColKey[]; if (Array.isArray(p) && p.length > 0) return p }
  } catch {}
  return DEFAULT_COLS
}

// ── Situação ────────────────────────────────────────────────────────────────

const SITUACAO_CONFIG: Record<MatriculaSituacao, { label: string; badge: string }> = {
  cursando:   { label: 'Cursando',   badge: 'badge-blue'   },
  concluido:  { label: 'Concluído',  badge: 'badge-green'  },
  desistente: { label: 'Desistente', badge: 'badge-red'    },
  reprovado:  { label: 'Reprovado',  badge: 'badge-red'    },
  trancado:   { label: 'Trancado',   badge: 'badge-yellow' },
}

const SITUACAO_ORDER: MatriculaSituacao[] = ['cursando', 'concluido', 'trancado', 'reprovado', 'desistente']

// ── Renderização de célula ───────────────────────────────────────────────────

function renderCell(key: ColKey, m: Matricula): string {
  switch (key) {
    case 'nome':           return m.nome
    case 'idade':          return fmtIdade(m.birth_date) ?? '—'
    case 'cpf':            return m.cpf ?? '—'
    case 'cidade':         return m.cidade ? `${m.cidade}${m.estado ? `/${m.estado}` : ''}` : '—'
    case 'contato':        return [m.telefone, m.email].filter(Boolean).join(' · ') || '—'
    case 'situacao':       return SITUACAO_CONFIG[m.situacao].label
    case 'frequencia':     return m.frequencia != null ? `${m.frequencia}%` : '—'
    case 'nota':           return m.nota_final != null ? m.nota_final.toFixed(1) : '—'
    case 'data_matricula': return m.data_matricula ? fmtDate(m.data_matricula) : '—'
    case 'data_conclusao': return m.data_conclusao ? fmtDate(m.data_conclusao) : '—'
    default:               return '—'
  }
}

// ── Ícone de sort ─────────────────────────────────────────────────────────

type SortField = ColKey
function SortIcon({ field, sortField, sortAsc }: { field: SortField; sortField: SortField | null; sortAsc: boolean }) {
  if (sortField !== field) return <ChevronsUpDown size={11} className="inline ml-0.5 opacity-40" />
  return sortAsc
    ? <ChevronUp size={11} className="inline ml-0.5 text-blue-600" />
    : <ChevronDown size={11} className="inline ml-0.5 text-blue-600" />
}

// ── Painel de configuração de colunas ────────────────────────────────────────

function ColConfigPanel({ selected, onChange, onClose }: {
  selected: ColKey[]
  onChange: (cols: ColKey[]) => void
  onClose: () => void
}) {
  const [local, setLocal] = useState<ColKey[]>(selected)

  const groups = useMemo(() => {
    const map: Record<string, ColDef[]> = {}
    ALL_COLS.forEach(c => { if (!map[c.group]) map[c.group] = []; map[c.group].push(c) })
    return map
  }, [])

  const toggle = (key: ColKey) => {
    if (local.includes(key)) { setLocal(l => l.filter(k => k !== key)); return }
    if (local.length >= MAX_COLS) return
    setLocal(l => [...l, key])
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 sm:pt-12 sm:px-4">
      <div className="bg-white sm:rounded-xl shadow-2xl w-full max-w-lg h-full sm:h-auto sm:max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <div>
            <h2 className="font-semibold text-gray-800">Personalizar colunas</h2>
            <p className="text-xs text-gray-500 mt-0.5">Selecione até {MAX_COLS} colunas para exibir na tabela e na impressão.</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded text-gray-400"><X size={16} /></button>
        </div>

        <div className="px-5 py-2 bg-blue-50 border-b border-blue-100 flex items-center justify-between">
          <span className="text-xs text-blue-700"><span className="font-semibold">{local.length}</span> de {MAX_COLS} colunas selecionadas</span>
          <button onClick={() => setLocal(DEFAULT_COLS)} className="text-xs text-blue-600 hover:underline">Restaurar padrão</button>
        </div>

        <div className="overflow-y-auto flex-1 p-5 space-y-5">
          {Object.entries(groups).map(([group, cols]) => (
            <div key={group}>
              <h3 className="text-xs font-semibold text-blue-600 uppercase tracking-wider mb-2">{group}</h3>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                {cols.map(col => {
                  const checked = local.includes(col.key)
                  const disabled = !checked && local.length >= MAX_COLS
                  return (
                    <label key={col.key} className={`flex items-center gap-2 text-sm cursor-pointer select-none ${disabled ? 'opacity-40 cursor-not-allowed' : 'hover:text-blue-700'}`}>
                      <div
                        onClick={() => !disabled && toggle(col.key)}
                        className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${checked ? 'bg-blue-600 border-blue-600' : 'border-gray-300 bg-white'}`}
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

        <div className="px-5 py-3 border-t border-gray-200 flex justify-end gap-2">
          <button onClick={onClose} className="btn-outline">Cancelar</button>
          <button onClick={() => { onChange(local); onClose() }} className="btn-primary">Aplicar</button>
        </div>
      </div>
    </div>
  )
}

// ── Componente principal ─────────────────────────────────────────────────────

export default function SeminarioDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const {
    seminarios, matriculas, saveMatricula, removeMatricula,
    certificados, saveCertificado,
  } = useData()
  const toast = useToast()
  const confirm = useConfirm()
  const { openMember } = useMemberQuickView()

  const [search, setSearch] = useState('')
  const [situacaoFilter, setSituacaoFilter] = useState<MatriculaSituacao | ''>('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Matricula | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())

  // Colunas configuráveis
  const [activeCols, setActiveCols] = useState<ColKey[]>(loadCols)
  const [colPanelOpen, setColPanelOpen] = useState(false)

  // Ordenação
  const [sortField, setSortField] = useState<ColKey | null>(null)
  const [sortAsc, setSortAsc] = useState(true)

  const handleSetCols = (cols: ColKey[]) => {
    setActiveCols(cols)
    try { localStorage.setItem(LS_KEY, JSON.stringify(cols)) } catch {}
  }

  const toggleSort = (field: ColKey) => {
    if (sortField === field) setSortAsc(a => !a)
    else { setSortField(field); setSortAsc(true) }
  }

  const seminario = useMemo(() => seminarios.find(s => s.id === id), [seminarios, id])

  const matriculasDoSeminario = useMemo(
    () => matriculas.filter(m => m.seminario_id === id),
    [matriculas, id]
  )

  const filtered = useMemo(() => {
    let list = matriculasDoSeminario.filter(m => {
      if (situacaoFilter && m.situacao !== situacaoFilter) return false
      if (search.trim()) {
        const q = search.toLowerCase()
        return m.nome.toLowerCase().includes(q) || (m.cpf ?? '').includes(q)
      }
      return true
    })

    if (sortField) {
      list = [...list].sort((a, b) => {
        let va: string | number = ''
        let vb: string | number = ''
        switch (sortField) {
          case 'nome':           va = a.nome.toLowerCase();  vb = b.nome.toLowerCase(); break
          case 'idade':          va = a.birth_date ?? '';    vb = b.birth_date ?? ''; break
          case 'situacao':       va = SITUACAO_ORDER.indexOf(a.situacao); vb = SITUACAO_ORDER.indexOf(b.situacao); break
          case 'frequencia':     va = a.frequencia ?? -1;   vb = b.frequencia ?? -1; break
          case 'nota':           va = a.nota_final ?? -1;   vb = b.nota_final ?? -1; break
          case 'data_matricula': va = a.data_matricula ?? ''; vb = b.data_matricula ?? ''; break
          case 'data_conclusao': va = a.data_conclusao ?? ''; vb = b.data_conclusao ?? ''; break
        }
        if (va < vb) return sortAsc ? -1 : 1
        if (va > vb) return sortAsc ? 1 : -1
        return 0
      })
    }
    return list
  }, [matriculasDoSeminario, search, situacaoFilter, sortField, sortAsc])

  const counts = useMemo(() => {
    let cursando = 0, concluido = 0, desistente = 0
    for (const m of matriculasDoSeminario) {
      if (m.situacao === 'cursando') cursando++
      else if (m.situacao === 'concluido') concluido++
      else if (m.situacao === 'desistente') desistente++
    }
    return { total: matriculasDoSeminario.length, cursando, concluido, desistente }
  }, [matriculasDoSeminario])

  const toggleSelect = (rowId: string) =>
    setSelected(s => { const n = new Set(s); n.has(rowId) ? n.delete(rowId) : n.add(rowId); return n })
  const toggleAll = () => {
    if (selected.size === filtered.length && filtered.length > 0) setSelected(new Set())
    else setSelected(new Set(filtered.map(m => m.id)))
  }
  const clearSelection = () => setSelected(new Set())

  const selectedIds = Array.from(selected)
  const bulk = useBulkMatriculas({
    selectedIds,
    matriculas: matriculasDoSeminario,
    seminario: seminario ?? null,
    onClear: clearSelection,
  })

  const bulkActions: BulkAction[] = [
    { key: 'situacao',          label: 'Situação',        icon: <CheckCircle2 size={13} />, onClick: () => bulk.open('situacao') },
    { key: 'notas',             label: 'Notas/Freq.',     icon: <Percent size={13} />,      onClick: () => bulk.open('notas') },
    { key: 'data_conclusao',    label: 'Data conclusão',  icon: <Calendar size={13} />,     onClick: () => bulk.open('data_conclusao'), group: 'more' },
    { key: 'gerar_certificados',label: 'Gerar certificados', icon: <Award size={13} />,     onClick: () => bulk.open('gerar_certificados'), group: 'more' },
    { key: 'excluir',           label: 'Excluir',         icon: <Trash2 size={13} />,       onClick: () => bulk.open('excluir'), danger: true, group: 'more' },
  ]

  if (!seminario) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Seminário não encontrado.</p>
        <button onClick={() => navigate('/seminarios')} className="btn-outline mt-4">Voltar aos seminários</button>
      </div>
    )
  }

  const handleAdd = () => { setEditing(null); setModalOpen(true) }
  const handleEdit = (m: Matricula) => { setEditing(m); setModalOpen(true) }

  const handleDelete = async (matId: string) => {
    const ok = await confirm({
      title: 'Excluir matrícula',
      message: 'Isso vai apagar permanentemente a matrícula e todos os certificados vinculados a ela. Essa ação não pode ser desfeita.',
      danger: true,
    })
    if (!ok) return
    try {
      await removeMatricula(matId)
      toast.success('Matrícula excluída.')
    } catch (err) {
      console.error(err)
      toast.error('Erro ao excluir matrícula.')
    }
  }

  const handleSave = async (data: Partial<Matricula>) => {
    try {
      if (editing) {
        await saveMatricula({ id: editing.id, ...data })
        toast.success('Matrícula atualizada.')
      } else {
        await saveMatricula({
          seminario_id: seminario.id,
          nome: data.nome ?? '',
          apelido: data.apelido,
          cpf: data.cpf,
          birth_date: data.birth_date,
          sex: data.sex,
          email: data.email,
          telefone: data.telefone,
          cidade: data.cidade,
          estado: data.estado,
          church_id: data.church_id,
          member_id: data.member_id,
          situacao: data.situacao ?? 'cursando',
          nota_final: data.nota_final,
          frequencia: data.frequencia,
          data_matricula: data.data_matricula ?? hojeISO(),
          data_conclusao: data.data_conclusao,
          observacoes: data.observacoes,
        })
        toast.success('Aluno matriculado.')
      }
      setModalOpen(false)
    } catch (err) {
      console.error(err)
      toast.error('Erro ao salvar matrícula.')
    }
  }

  const jaTemCertificado = (matId: string) => certificados.some(c => c.matricula_id === matId)

  const handleGerarCertificado = async (m: Matricula) => {
    if (m.situacao !== 'concluido') {
      toast.warning('Só é possível emitir certificado para alunos com situação "Concluído".')
      return
    }
    if (jaTemCertificado(m.id)) {
      const ok = await confirm({
        title: 'Reemitir certificado',
        message: 'Este aluno já possui certificado. Deseja gerar uma reimpressão?',
        confirmLabel: 'Reemitir',
      })
      if (!ok) return
    }
    try {
      const saved = await saveCertificado({
        matricula_id: m.id,
        seminario_id: seminario.id,
        numero: `CERT-${new Date().getFullYear()}-${String(certificados.length + 1).padStart(4, '0')}`,
        nome_aluno: m.nome,
        nome_seminario: seminario.nome,
        carga_horaria: seminario.carga_horaria,
        data_conclusao: m.data_conclusao ?? hojeISO(),
        emitido_em: hojeISO(),
        emitido_por: 'Secretaria Admin',
        status: 'emitido',
      })
      navigate(`/certificados?highlight=${saved.id}`)
    } catch (err) {
      console.error(err)
      toast.error('Erro ao gerar certificado.')
    }
  }

  // ── Impressão ──────────────────────────────────────────────────────────────

  const handlePrint = () => {
    const colDefs = ALL_COLS.filter(c => activeCols.includes(c.key))
    const headerRow = colDefs.map(c => `<th style="padding:6px 10px;text-align:left;border-bottom:2px solid #1a3a6b;font-size:11px;color:#1a3a6b;white-space:nowrap">${c.label}</th>`).join('')
    const bodyRows = filtered.map((m, i) => {
      const cells = colDefs.map(c => {
        const val = renderCell(c.key, m)
        return `<td style="padding:5px 10px;font-size:11px;color:#374151;border-bottom:1px solid #f3f4f6">${val}</td>`
      }).join('')
      const bg = i % 2 === 0 ? '#fff' : '#f9fafb'
      return `<tr style="background:${bg}">${cells}</tr>`
    }).join('')

    const filtroDesc = situacaoFilter ? ` · Filtro: ${SITUACAO_CONFIG[situacaoFilter].label}` : ''
    const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"/>
      <title>Matriculados — ${seminario.nome}</title>
      <style>
        body{font-family:Arial,sans-serif;padding:20px;color:#111}
        @media print{@page{margin:15mm} .no-print{display:none}}
        table{width:100%;border-collapse:collapse}
        .no-print{margin-bottom:14px}
        .no-print button{background:#1a3a6b;color:white;border:none;padding:6px 14px;border-radius:4px;cursor:pointer;font-size:12px;margin-right:6px}
      </style>
    </head><body>
      <div class="no-print">
        <button onclick="window.print()">Imprimir</button>
        <button onclick="window.close()" style="background:#f3f4f6;color:#111;border:1px solid #d1d5db">Fechar</button>
      </div>
      <div style="margin-bottom:14px;padding-bottom:10px;border-bottom:2px solid #1a3a6b">
        <div style="font-size:10px;color:#6b7280;text-transform:uppercase;letter-spacing:1px">Seminário Bíblico</div>
        <div style="font-size:16px;font-weight:bold;color:#1a3a6b;margin-top:2px">${seminario.nome}</div>
        <div style="font-size:11px;color:#6b7280;margin-top:4px">
          ${seminario.instrutor ? `Instrutor: ${seminario.instrutor} · ` : ''}
          ${seminario.carga_horaria}h ·
          ${filtered.length} aluno${filtered.length !== 1 ? 's' : ''}${filtroDesc}
        </div>
      </div>
      <table>
        <thead><tr style="background:#f0f4ff">${headerRow}</tr></thead>
        <tbody>${bodyRows}</tbody>
      </table>
      <div style="margin-top:16px;font-size:9px;color:#9ca3af;text-align:right">
        Emitido em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
      </div>
    </body></html>`

    openPrintWindow(html, `Matriculados — ${seminario.nome}`)
  }

  // ── JSX ────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      <button
        onClick={() => navigate('/seminarios')}
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-blue-600"
      >
        <ArrowLeft size={14} /> Voltar aos seminários
      </button>

      {/* Header do seminário */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
            <GraduationCap size={22} className="text-blue-600" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-gray-800 leading-tight">{seminario.nome}</h1>
            {seminario.descricao && <p className="text-sm text-gray-600 mt-1">{seminario.descricao}</p>}
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
              {seminario.instrutor && (
                <span className="inline-flex items-center gap-1"><Users size={12} className="text-blue-500" /> {seminario.instrutor}</span>
              )}
              <span className="inline-flex items-center gap-1">
                <Calendar size={12} className="text-blue-500" /> {fmtDate(seminario.data_inicio)}
                {seminario.data_fim && ` → ${fmtDate(seminario.data_fim)}`}
              </span>
              <span className="inline-flex items-center gap-1"><Clock size={12} className="text-blue-500" /> {seminario.carga_horaria}h</span>
              {seminario.local && (
                <span className="inline-flex items-center gap-1"><MapPin size={12} className="text-blue-500" /> {seminario.local}</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Matriculados', value: counts.total,      color: 'bg-gray-500',    filter: '' as const },
          { label: 'Cursando',     value: counts.cursando,   color: 'bg-blue-500',    filter: 'cursando' as const },
          { label: 'Concluídos',   value: counts.concluido,  color: 'bg-emerald-500', filter: 'concluido' as const },
          { label: 'Desistentes',  value: counts.desistente, color: 'bg-red-500',     filter: 'desistente' as const },
        ].map(c => (
          <button
            key={c.label}
            onClick={() => setSituacaoFilter(prev => prev === c.filter ? '' : c.filter)}
            className={`${c.color} rounded-xl p-3 text-white shadow-sm text-left transition-transform hover:scale-105 ${situacaoFilter === c.filter && c.filter !== '' ? 'ring-2 ring-offset-2 ring-white' : ''}`}
          >
            <div className="text-2xl font-bold">{c.value}</div>
            <div className="text-xs opacity-90 mt-0.5">{c.label}</div>
          </button>
        ))}
      </div>

      {/* Tabela de matriculados */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        {/* Toolbar */}
        <div className="p-3 border-b border-gray-100 flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-48">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar aluno por nome ou CPF..."
              className="form-input pl-8 w-full"
            />
          </div>
          <select
            value={situacaoFilter}
            onChange={e => setSituacaoFilter(e.target.value as MatriculaSituacao | '')}
            className="form-input"
          >
            <option value="">Todas situações</option>
            <option value="cursando">Cursando</option>
            <option value="concluido">Concluído</option>
            <option value="desistente">Desistente</option>
            <option value="reprovado">Reprovado</option>
            <option value="trancado">Trancado</option>
          </select>

          {/* Botão colunas */}
          <button
            onClick={() => setColPanelOpen(true)}
            className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg border border-gray-200"
            title="Personalizar colunas"
          >
            <Settings2 size={15} />
          </button>

          {/* Botão imprimir */}
          <button
            onClick={handlePrint}
            className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg border border-gray-200"
            title="Imprimir lista"
          >
            <Printer size={15} />
          </button>

          <button onClick={handleAdd} className="btn-primary">
            <UserPlus size={14} /> Matricular aluno
          </button>
        </div>

        {/* Tabela (desktop) */}
        <div className="overflow-x-auto hidden md:block">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-3 py-2.5 w-8">
                  <input
                    type="checkbox"
                    checked={filtered.length > 0 && selected.size === filtered.length}
                    onChange={toggleAll}
                    className="rounded"
                  />
                </th>
                {activeCols.map(key => {
                  const col = ALL_COLS.find(c => c.key === key)!
                  return (
                    <th
                      key={key}
                      className={`px-3 py-2.5 text-xs font-semibold text-gray-500 text-left ${col.sortable ? 'cursor-pointer select-none hover:text-gray-700' : ''}`}
                      onClick={() => col.sortable && toggleSort(key)}
                    >
                      {col.label}
                      {col.sortable && <SortIcon field={key} sortField={sortField} sortAsc={sortAsc} />}
                    </th>
                  )
                })}
                <th className="px-3 py-2.5 text-xs font-semibold text-gray-500 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 ? (
                <tr><td colSpan={activeCols.length + 2} className="text-center py-8 text-gray-400 text-sm">Nenhum matriculado encontrado</td></tr>
              ) : filtered.map(m => {
                const cfg = SITUACAO_CONFIG[m.situacao]
                const temCert = jaTemCertificado(m.id)
                return (
                  <tr key={m.id} className={`hover:bg-blue-50/30 ${selected.has(m.id) ? 'bg-blue-50/50' : ''}`}>
                    <td className="px-3 py-2">
                      <input type="checkbox" checked={selected.has(m.id)} onChange={() => toggleSelect(m.id)} className="rounded" />
                    </td>
                    {activeCols.map(key => {
                      // Coluna "nome" tem layout especial com avatar + link membro
                      if (key === 'nome') return (
                        <td key={key} className="px-3 py-2">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center text-white text-xs font-bold">
                              {m.nome[0]}
                            </div>
                            <div className="min-w-0">
                              <div className="font-medium text-gray-800 truncate">{m.nome}</div>
                              {m.member_id && (
                                <button
                                  onClick={() => openMember(m.member_id!)}
                                  className="text-[10px] text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-0.5"
                                >
                                  <Eye size={9} /> Vinculado a membro
                                </button>
                              )}
                            </div>
                          </div>
                        </td>
                      )
                      // Coluna "situacao" usa badge
                      if (key === 'situacao') return (
                        <td key={key} className="px-3 py-2">
                          <span className={cfg.badge}>{cfg.label}</span>
                        </td>
                      )
                      // Coluna "contato" com duas linhas
                      if (key === 'contato') return (
                        <td key={key} className="px-3 py-2 text-gray-600 text-xs">
                          <div>{m.telefone ?? '—'}</div>
                          {m.email && <div className="text-gray-400">{m.email}</div>}
                        </td>
                      )
                      return (
                        <td key={key} className="px-3 py-2 text-gray-600 text-xs">
                          {renderCell(key, m)}
                        </td>
                      )
                    })}
                    <td className="px-3 py-2">
                      <div className="flex items-center justify-end gap-1">
                        {m.situacao === 'concluido' && (
                          <button
                            onClick={() => handleGerarCertificado(m)}
                            className={`p-1 rounded ${temCert ? 'text-amber-600 hover:bg-amber-50' : 'text-emerald-600 hover:bg-emerald-50'}`}
                            title={temCert ? 'Reemitir certificado' : 'Emitir certificado'}
                          >
                            <Award size={14} />
                          </button>
                        )}
                        <button onClick={() => handleEdit(m)} className="p-1 text-gray-500 hover:bg-gray-100 rounded" title="Editar">
                          <Pencil size={14} />
                        </button>
                        <button onClick={() => handleDelete(m.id)} className="p-1 text-red-500 hover:bg-red-50 rounded" title="Excluir">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Cards (mobile) */}
        <div className="md:hidden divide-y divide-gray-100">
          {filtered.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">Nenhum matriculado encontrado</div>
          ) : filtered.map(m => {
            const cfg = SITUACAO_CONFIG[m.situacao]
            const temCert = jaTemCertificado(m.id)
            return (
              <div key={m.id} className={`p-3 flex items-start gap-3 ${selected.has(m.id) ? 'bg-blue-50/40' : ''}`}>
                <input
                  type="checkbox"
                  checked={selected.has(m.id)}
                  onChange={() => toggleSelect(m.id)}
                  className="rounded mt-2 shrink-0"
                />
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center text-white text-sm font-bold shrink-0">
                  {m.nome[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="font-semibold text-gray-800 text-sm truncate">{m.nome}</div>
                    <span className={cfg.badge}>{cfg.label}</span>
                  </div>
                  {m.member_id && (
                    <button
                      onClick={() => openMember(m.member_id!)}
                      className="text-[10px] text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-0.5"
                    >
                      <Eye size={9} /> Vinculado a membro
                    </button>
                  )}
                  <div className="text-xs text-gray-500 mt-1 space-y-0.5">
                    <div>{fmtIdade(m.birth_date)} · {m.telefone ?? '—'}</div>
                    <div>Freq: {m.frequencia != null ? `${m.frequencia}%` : '—'} · Nota: {m.nota_final != null ? m.nota_final.toFixed(1) : '—'}</div>
                  </div>
                  <div className="mt-2 flex items-center gap-1 flex-wrap">
                    {m.situacao === 'concluido' && (
                      <button
                        onClick={() => handleGerarCertificado(m)}
                        className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded ${temCert ? 'text-amber-700 bg-amber-50' : 'text-emerald-700 bg-emerald-50'}`}
                      >
                        <Award size={12} /> {temCert ? 'Reemitir' : 'Certificado'}
                      </button>
                    )}
                    <button onClick={() => handleEdit(m)} className="inline-flex items-center gap-1 px-2 py-1 text-xs text-gray-700 bg-gray-100 rounded">
                      <Pencil size={12} /> Editar
                    </button>
                    <button onClick={() => handleDelete(m.id)} className="inline-flex items-center gap-1 px-2 py-1 text-xs text-red-600 bg-red-50 rounded ml-auto">
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Modal de matrícula */}
      {modalOpen && (
        <MatriculaModal
          matricula={editing}
          onClose={() => setModalOpen(false)}
          onSave={handleSave}
        />
      )}

      {/* Painel de colunas */}
      {colPanelOpen && (
        <ColConfigPanel
          selected={activeCols}
          onChange={handleSetCols}
          onClose={() => setColPanelOpen(false)}
        />
      )}

      {/* Bulk actions */}
      <BulkActionBar
        count={selected.size}
        total={filtered.length}
        entityLabel="matrículas"
        actions={bulkActions}
        onClear={clearSelection}
      />
      {bulk.modals}
    </div>
  )
}
