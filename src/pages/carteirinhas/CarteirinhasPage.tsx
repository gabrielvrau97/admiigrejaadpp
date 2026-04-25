import { useMemo, useState } from 'react'
import { differenceInDays } from 'date-fns'
import { fmtDate } from '../../lib/format'
import { IdCard, Plus, Search, Printer, Trash2, Clock, AlertCircle, CheckCircle, Layers } from 'lucide-react'
import { useData } from '../../contexts/DataContext'
import type { Carteirinha, CarteirinhaMotivo, Member } from '../../types'
import CarteirinhaGerarModal from './CarteirinhaGerarModal'
import CarteirinhaLoteModal from './CarteirinhaLoteModal'
import { printCarteirinha, printCarteirinhasLote } from './printCarteirinha'
import { useToast, useConfirm } from '../../components/ui/UIProvider'

const MOTIVO_LABEL: Record<CarteirinhaMotivo, string> = {
  primeira_via: 'Primeira via',
  renovacao: 'Renovação',
  segunda_via: 'Segunda via',
  atualizacao_dados: 'Atualização de dados',
}

function statusInfo(c: Carteirinha): { label: string; badge: string; icon: React.ReactNode } {
  if (c.status === 'cancelada') return { label: 'Cancelada', badge: 'badge-gray', icon: <AlertCircle size={12} /> }
  if (c.status === 'substituida') return { label: 'Substituída', badge: 'badge-gray', icon: <AlertCircle size={12} /> }
  const hoje = new Date()
  const validaAte = new Date(c.valida_ate + 'T00:00:00')
  const diasRestantes = differenceInDays(validaAte, hoje)
  if (diasRestantes < 0) return { label: 'Vencida', badge: 'badge-red', icon: <AlertCircle size={12} /> }
  if (diasRestantes <= 30) return { label: `Vence em ${diasRestantes}d`, badge: 'badge-yellow', icon: <Clock size={12} /> }
  return { label: 'Ativa', badge: 'badge-green', icon: <CheckCircle size={12} /> }
}

export default function CarteirinhasPage() {
  const { carteirinhas, members, saveCarteirinha, saveMember } = useData()
  const toast = useToast()
  const confirm = useConfirm()
  const [tab, setTab] = useState<'historico' | 'fila'>('historico')
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'todas' | 'ativas' | 'vencidas' | 'vencendo'>('todas')
  const [modalOpen, setModalOpen] = useState(false)
  const [loteModalOpen, setLoteModalOpen] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [filaSelected, setFilaSelected] = useState<Set<string>>(new Set())
  const [filaProcessing, setFilaProcessing] = useState(false)

  const getMember = (id: string): Member | undefined => members.find(m => m.id === id)

  // Membros marcados pra imprimir credencial (a fila)
  const filaMembros = useMemo(() =>
    members
      .filter(m => m.imprimir_credencial && m.status !== 'deleted')
      .sort((a, b) => a.name.localeCompare(b.name))
  , [members])

  const filtered = useMemo(() => {
    return carteirinhas
      .map(c => {
        const info = statusInfo(c)
        return { c, info, member: getMember(c.member_id) }
      })
      .filter(({ c, info, member }) => {
        if (filter === 'ativas' && !info.label.startsWith('Ativa')) return false
        if (filter === 'vencidas' && info.label !== 'Vencida') return false
        if (filter === 'vencendo' && !info.label.startsWith('Vence em')) return false
        if (search.trim()) {
          const q = search.toLowerCase()
          return (
            c.numero.toLowerCase().includes(q) ||
            (member?.name ?? '').toLowerCase().includes(q) ||
            (member?.cpf ?? '').includes(q)
          )
        }
        return true
      })
      .sort((a, b) => b.c.emitida_em.localeCompare(a.c.emitida_em))
  }, [carteirinhas, members, search, filter])

  const counts = useMemo(() => {
    // Passada única classificando cada carteirinha
    let ativas = 0, vencendo = 0, vencidas = 0
    for (const c of carteirinhas) {
      const label = statusInfo(c).label
      if (label.startsWith('Ativa')) ativas++
      else if (label.startsWith('Vence em')) vencendo++
      else if (label === 'Vencida') vencidas++
    }
    return { total: carteirinhas.length, ativas, vencendo, vencidas }
  }, [carteirinhas])

  const handleDelete = async (id: string) => {
    const ok = await confirm({
      title: 'Cancelar credencial',
      message: 'Deseja realmente cancelar esta credencial? A ação não pode ser desfeita.',
      confirmLabel: 'Cancelar credencial',
      danger: true,
    })
    if (!ok) return
    try {
      await saveCarteirinha({ id, status: 'cancelada' })
      toast.success('Credencial cancelada.')
    } catch (err) {
      console.error(err)
      toast.error('Erro ao cancelar credencial.')
    }
  }

  const handlePrint = (c: Carteirinha) => {
    const m = getMember(c.member_id)
    if (!m) {
      toast.error('Membro vinculado não encontrado.')
      return
    }
    printCarteirinha(c, m)
  }

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  const toggleSelectAllVisible = () => {
    const visibleIds = filtered.map(x => x.c.id)
    const allSelected = visibleIds.every(id => selected.has(id))
    setSelected(prev => {
      const next = new Set(prev)
      if (allSelected) visibleIds.forEach(id => next.delete(id))
      else visibleIds.forEach(id => next.add(id))
      return next
    })
  }

  const handlePrintLote = () => {
    const items = filtered
      .filter(x => selected.has(x.c.id) && x.member)
      .map(x => ({ c: x.c, m: x.member! }))
    if (items.length === 0) {
      toast.warning('Selecione pelo menos uma credencial para imprimir.')
      return
    }
    printCarteirinhasLote(items)
  }

  const handleGenerate = async (memberId: string, motivo: CarteirinhaMotivo, validadeAnos: number) => {
    const m = getMember(memberId)
    if (!m) return
    const hoje = new Date()
    const validaAte = new Date(hoje)
    validaAte.setFullYear(validaAte.getFullYear() + validadeAnos)
    try {
      // Substitui carteirinhas ativas anteriores deste membro
      const anteriores = carteirinhas.filter(c => c.member_id === memberId && c.status === 'ativa')
      for (const c of anteriores) await saveCarteirinha({ id: c.id, status: 'substituida' })

      const novoNumero = `ADP-${hoje.getFullYear()}-${String(carteirinhas.length + 1).padStart(4, '0')}`
      const nova = await saveCarteirinha({
        member_id: memberId,
        numero: novoNumero,
        motivo,
        emitida_em: hoje.toISOString().split('T')[0],
        valida_ate: validaAte.toISOString().split('T')[0],
        emitida_por: 'Secretaria Admin',
        status: 'ativa',
      })
      setModalOpen(false)
      toast.success('Credencial gerada.')
      setTimeout(() => printCarteirinha(nova, m), 200)
    } catch (err) {
      console.error(err)
      toast.error('Erro ao gerar credencial.')
    }
  }

  const handleGenerateLote = async (
    memberIds: string[],
    motivo: CarteirinhaMotivo,
    validadeAnos: number,
  ) => {
    const membros = memberIds.map(id => getMember(id)).filter((m): m is Member => !!m)
    if (membros.length === 0) return

    const hoje = new Date()
    const validaAte = new Date(hoje)
    validaAte.setFullYear(validaAte.getFullYear() + validadeAnos)
    const hojeISO = hoje.toISOString().split('T')[0]
    const validaAteISO = validaAte.toISOString().split('T')[0]
    const baseSeq = carteirinhas.length

    try {
      // Substitui ativas anteriores
      const idsQueReceberam = new Set(memberIds)
      const anteriores = carteirinhas.filter(c => idsQueReceberam.has(c.member_id) && c.status === 'ativa')
      for (const c of anteriores) await saveCarteirinha({ id: c.id, status: 'substituida' })

      // Cria novas em sequência
      const novas: Carteirinha[] = []
      for (let idx = 0; idx < membros.length; idx++) {
        const m = membros[idx]
        const nova = await saveCarteirinha({
          member_id: m.id,
          numero: `ADP-${hoje.getFullYear()}-${String(baseSeq + idx + 1).padStart(4, '0')}`,
          motivo,
          emitida_em: hojeISO,
          valida_ate: validaAteISO,
          emitida_por: 'Secretaria Admin',
          status: 'ativa',
        })
        novas.push(nova)
      }

      setLoteModalOpen(false)
      toast.success(`${novas.length} credenciais geradas.`)
      setTimeout(() => {
        const items = novas.map((c, idx) => ({ c, m: membros[idx] }))
        printCarteirinhasLote(items)
      }, 200)
    } catch (err) {
      console.error(err)
      toast.error('Erro ao gerar credenciais em lote.')
    }
  }

  // ── Fila de impressão ──────────────────────────────────────────────────────
  const toggleFilaSelect = (id: string) => {
    setFilaSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }
  const toggleFilaSelectAll = () => {
    if (filaSelected.size === filaMembros.length) setFilaSelected(new Set())
    else setFilaSelected(new Set(filaMembros.map(m => m.id)))
  }

  const handleImprimirFila = async (motivo: CarteirinhaMotivo = 'primeira_via', validadeAnos = 2) => {
    if (filaProcessing) return
    const ids = filaSelected.size > 0
      ? filaMembros.filter(m => filaSelected.has(m.id))
      : filaMembros
    if (ids.length === 0) {
      toast.warning('Nenhum membro na fila.')
      return
    }
    const ok = await confirm({
      title: 'Imprimir fila',
      message: `Confirma a geração e impressão de ${ids.length} credencial(is)? O checkbox "Imprimir credencial" será desmarcado após a impressão.`,
      confirmLabel: 'Imprimir',
    })
    if (!ok) return

    setFilaProcessing(true)
    try {
      const hoje = new Date()
      const validaAte = new Date(hoje)
      validaAte.setFullYear(validaAte.getFullYear() + validadeAnos)
      const hojeISO = hoje.toISOString().split('T')[0]
      const validaAteISO = validaAte.toISOString().split('T')[0]
      const baseSeq = carteirinhas.length

      // Substitui credenciais ativas anteriores
      const idsSet = new Set(ids.map(m => m.id))
      const anteriores = carteirinhas.filter(c => idsSet.has(c.member_id) && c.status === 'ativa')
      for (const c of anteriores) await saveCarteirinha({ id: c.id, status: 'substituida' })

      // Gera novas
      const novas: Carteirinha[] = []
      for (let idx = 0; idx < ids.length; idx++) {
        const m = ids[idx]
        const nova = await saveCarteirinha({
          member_id: m.id,
          numero: `ADP-${hoje.getFullYear()}-${String(baseSeq + idx + 1).padStart(4, '0')}`,
          motivo,
          emitida_em: hojeISO,
          valida_ate: validaAteISO,
          emitida_por: 'Secretaria Admin',
          status: 'ativa',
        })
        novas.push(nova)
      }

      // Desmarca o flag em cada membro
      for (const m of ids) {
        await saveMember({ id: m.id, imprimir_credencial: false })
      }

      setFilaSelected(new Set())
      toast.success(`${novas.length} credencial(is) processada(s) e fila atualizada.`)
      setTimeout(() => {
        const items = novas.map((c, idx) => ({ c, m: ids[idx] }))
        printCarteirinhasLote(items)
      }, 200)
    } catch (err) {
      console.error(err)
      toast.error('Erro ao processar fila.')
    } finally {
      setFilaProcessing(false)
    }
  }

  const removerDaFila = async (memberId: string) => {
    try {
      await saveMember({ id: memberId, imprimir_credencial: false })
      setFilaSelected(prev => {
        const next = new Set(prev)
        next.delete(memberId)
        return next
      })
      toast.success('Removido da fila.')
    } catch (err) {
      console.error(err)
      toast.error('Erro ao remover da fila.')
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center">
            <IdCard size={20} className="text-blue-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-800">Credenciais de Membro</h1>
            <p className="text-sm text-gray-500">Gestão, histórico e impressão</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {selected.size > 0 && (
            <button onClick={handlePrintLote} className="btn-outline flex items-center gap-1.5 border-indigo-400 text-indigo-700 bg-indigo-50">
              <Layers size={14} /> Imprimir {selected.size} <span className="hidden sm:inline">selecionada{selected.size > 1 ? 's' : ''}</span>
            </button>
          )}
          <button onClick={() => setLoteModalOpen(true)} className="btn-outline flex items-center gap-1.5 border-blue-400 text-blue-700 bg-blue-50">
            <Layers size={14} /> Gerar em lote
          </button>
          <button onClick={() => setModalOpen(true)} className="btn-primary">
            <Plus size={14} /> Gerar nova
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        <button
          onClick={() => setTab('historico')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            tab === 'historico'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Histórico
        </button>
        <button
          onClick={() => setTab('fila')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
            tab === 'fila'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Fila de impressão
          {filaMembros.length > 0 && (
            <span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
              {filaMembros.length}
            </span>
          )}
        </button>
      </div>

      {tab === 'historico' && (
      <>
      {/* Resumo */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Total emitidas', value: counts.total, color: 'bg-gray-500', filter: 'todas' as const },
          { label: 'Ativas', value: counts.ativas, color: 'bg-emerald-500', filter: 'ativas' as const },
          { label: 'Vencendo (30d)', value: counts.vencendo, color: 'bg-yellow-500', filter: 'vencendo' as const },
          { label: 'Vencidas', value: counts.vencidas, color: 'bg-red-500', filter: 'vencidas' as const },
        ].map(c => (
          <button
            key={c.label}
            onClick={() => setFilter(prev => prev === c.filter ? 'todas' : c.filter)}
            className={`${c.color} rounded-xl p-3 text-white shadow-sm text-left transition-transform hover:scale-105 ${filter === c.filter && c.filter !== 'todas' ? 'ring-2 ring-offset-2 ring-white' : ''}`}
          >
            <div className="text-2xl font-bold">{c.value}</div>
            <div className="text-xs opacity-90 mt-0.5">{c.label}</div>
          </button>
        ))}
      </div>

      {/* Lista */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-3 border-b border-gray-100">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por número, nome ou CPF..."
              className="form-input pl-8 w-full"
            />
          </div>
        </div>

        {/* Tabela desktop */}
        <div className="overflow-x-auto hidden md:block">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="w-8 px-3 py-2.5">
                  <input
                    type="checkbox"
                    className="rounded"
                    checked={filtered.length > 0 && filtered.every(x => selected.has(x.c.id))}
                    onChange={toggleSelectAllVisible}
                  />
                </th>
                <th className="px-3 py-2.5 text-xs font-semibold text-gray-500 text-left">Nº Credencial</th>
                <th className="px-3 py-2.5 text-xs font-semibold text-gray-500 text-left">Membro</th>
                <th className="px-3 py-2.5 text-xs font-semibold text-gray-500 text-left">Emitida em</th>
                <th className="px-3 py-2.5 text-xs font-semibold text-gray-500 text-left">Validade</th>
                <th className="px-3 py-2.5 text-xs font-semibold text-gray-500 text-left">Motivo</th>
                <th className="px-3 py-2.5 text-xs font-semibold text-gray-500 text-left">Status</th>
                <th className="px-3 py-2.5 text-xs font-semibold text-gray-500 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-8 text-gray-400">Nenhuma credencial encontrada</td></tr>
              ) : filtered.map(({ c, info, member }) => (
                <tr key={c.id} className={`hover:bg-blue-50/30 ${selected.has(c.id) ? 'bg-blue-50/50' : ''}`}>
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      className="rounded"
                      checked={selected.has(c.id)}
                      onChange={() => toggleSelect(c.id)}
                    />
                  </td>
                  <td className="px-3 py-2 font-mono text-xs text-blue-700">{c.numero}</td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center text-white text-xs font-bold">
                        {(member?.name ?? '?')[0]}
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium text-gray-800 truncate">{member?.name ?? 'Membro excluído'}</div>
                        <div className="text-[10px] text-gray-400">{member?.cpf ?? ''}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-gray-600 text-xs">{fmtDate(c.emitida_em)}</td>
                  <td className="px-3 py-2 text-gray-600 text-xs">{fmtDate(c.valida_ate)}</td>
                  <td className="px-3 py-2 text-gray-600 text-xs">{MOTIVO_LABEL[c.motivo]}</td>
                  <td className="px-3 py-2">
                    <span className={`${info.badge} inline-flex items-center gap-1`}>{info.icon} {info.label}</span>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => handlePrint(c)} className="p-1 text-indigo-600 hover:bg-indigo-50 rounded" title="Imprimir">
                        <Printer size={14} />
                      </button>
                      {c.status === 'ativa' && (
                        <button onClick={() => handleDelete(c.id)} className="p-1 text-red-500 hover:bg-red-50 rounded" title="Cancelar">
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Cards mobile */}
        <div className="md:hidden divide-y divide-gray-100">
          {filtered.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">Nenhuma credencial encontrada</div>
          ) : filtered.map(({ c, info, member }) => (
            <div key={c.id} className={`p-3 flex items-start gap-3 ${selected.has(c.id) ? 'bg-blue-50/50' : ''}`}>
              <input
                type="checkbox"
                className="rounded mt-3 shrink-0"
                checked={selected.has(c.id)}
                onChange={() => toggleSelect(c.id)}
              />
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center text-white text-sm font-bold shrink-0">
                {(member?.name ?? '?')[0]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="font-semibold text-gray-800 text-sm truncate">{member?.name ?? 'Membro excluído'}</div>
                  <span className={`${info.badge} inline-flex items-center gap-1 shrink-0`}>{info.icon} {info.label}</span>
                </div>
                <div className="text-[11px] text-blue-600 font-mono mt-0.5">{c.numero}</div>
                <div className="text-xs text-gray-500 mt-1">
                  Emitida {fmtDate(c.emitida_em)} · Validade {fmtDate(c.valida_ate)}
                </div>
                <div className="text-[11px] text-gray-400">{MOTIVO_LABEL[c.motivo]}</div>
                <div className="mt-2 flex items-center gap-1 flex-wrap">
                  <button onClick={() => handlePrint(c)} className="inline-flex items-center gap-1 px-2 py-1 text-xs text-indigo-600 bg-indigo-50 rounded">
                    <Printer size={12} /> Imprimir
                  </button>
                  {c.status === 'ativa' && (
                    <button onClick={() => handleDelete(c.id)} className="inline-flex items-center gap-1 px-2 py-1 text-xs text-red-600 bg-red-50 rounded ml-auto">
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      </>
      )}

      {tab === 'fila' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between flex-wrap gap-3">
            <div>
              <h2 className="font-semibold text-gray-800 text-sm flex items-center gap-2">
                <Layers size={16} className="text-blue-600" />
                Fila de impressão
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                {filaMembros.length === 0
                  ? 'Nenhum membro marcado para imprimir credencial.'
                  : `${filaMembros.length} membro(s) marcado(s). Marque "Imprimir credencial" no cadastro do membro para adicionar.`
                }
              </p>
            </div>
            {filaMembros.length > 0 && (
              <button
                onClick={() => handleImprimirFila('primeira_via', 2)}
                disabled={filaProcessing}
                className="btn-primary inline-flex items-center gap-1.5 disabled:opacity-60"
              >
                <Printer size={14} />
                {filaProcessing
                  ? 'Processando...'
                  : filaSelected.size > 0
                    ? `Imprimir ${filaSelected.size} selecionado(s)`
                    : `Imprimir todos (${filaMembros.length})`
                }
              </button>
            )}
          </div>

          {filaMembros.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <IdCard size={36} className="mx-auto opacity-20 mb-2" />
              <p className="text-sm">Fila vazia.</p>
              <p className="text-xs mt-1">Marque "Imprimir credencial" no cadastro de um membro para adicioná-lo aqui.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              <div className="px-4 py-2 bg-gray-50 flex items-center gap-2 text-xs text-gray-500">
                <input
                  type="checkbox"
                  className="rounded"
                  checked={filaSelected.size === filaMembros.length && filaMembros.length > 0}
                  onChange={toggleFilaSelectAll}
                />
                <span>Selecionar todos</span>
                {filaSelected.size > 0 && (
                  <span className="ml-auto text-blue-600 font-medium">{filaSelected.size} selecionado(s)</span>
                )}
              </div>
              {filaMembros.map(m => {
                const churchName = (m as Member & { church?: { name?: string } }).church?.name
                return (
                  <div
                    key={m.id}
                    className={`px-4 py-3 flex items-center gap-3 hover:bg-blue-50/30 ${filaSelected.has(m.id) ? 'bg-blue-50/50' : ''}`}
                  >
                    <input
                      type="checkbox"
                      className="rounded shrink-0"
                      checked={filaSelected.has(m.id)}
                      onChange={() => toggleFilaSelect(m.id)}
                    />
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center text-white text-sm font-bold shrink-0">
                      {m.name[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-800 text-sm truncate">{m.name}</div>
                      <div className="text-xs text-gray-500 truncate">
                        {m.cpf ? `CPF ${m.cpf}` : ''}
                        {churchName ? ` · ${churchName}` : ''}
                      </div>
                    </div>
                    <button
                      onClick={() => removerDaFila(m.id)}
                      className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded shrink-0"
                      title="Remover da fila"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {modalOpen && (
        <CarteirinhaGerarModal
          onClose={() => setModalOpen(false)}
          onGenerate={handleGenerate}
        />
      )}

      {loteModalOpen && (
        <CarteirinhaLoteModal
          onClose={() => setLoteModalOpen(false)}
          onGenerate={handleGenerateLote}
        />
      )}
    </div>
  )
}
