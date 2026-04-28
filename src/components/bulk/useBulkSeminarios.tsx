/**
 * Hook de bulk actions para seminários.
 * Suporta: alterar status, duplicar (cria cópia com sufixo "(cópia)"), excluir.
 */

import { useState, useCallback } from 'react'
import { useData } from '../../contexts/DataContext'
import { useToast } from '../ui/UIProvider'
import { runBulkAction } from '../../lib/bulk/runBulkAction'
import BulkConfirmDialog from './BulkConfirmDialog'
import BulkGenericStatusModal from './BulkGenericStatusModal'
import type { Seminario, SeminarioStatus } from '../../types'

interface Props {
  selectedIds: string[]
  seminarios: Seminario[]
  onClear: () => void
  onDone?: () => void
}

const STATUS_OPTIONS: { value: SeminarioStatus; label: string; color: string }[] = [
  { value: 'planejado', label: 'Planejado', color: 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100' },
  { value: 'em_andamento', label: 'Em andamento', color: 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100' },
  { value: 'concluido', label: 'Concluído', color: 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100' },
  { value: 'cancelado', label: 'Cancelado', color: 'bg-red-50 border-red-200 text-red-700 hover:bg-red-100' },
]

export function useBulkSeminarios({ selectedIds, seminarios, onClear, onDone }: Props) {
  const { saveSeminario, removeSeminario } = useData()
  const toast = useToast()

  const [openModal, setOpenModal] = useState<null | 'status' | 'duplicar' | 'excluir'>(null)
  const [pendingStatus, setPendingStatus] = useState<SeminarioStatus | null>(null)

  const count = selectedIds.length
  const close = () => setOpenModal(null)

  const executeStatus = useCallback(async () => {
    if (!pendingStatus) return
    const result = await runBulkAction(selectedIds, async id => {
      await saveSeminario({ id, status: pendingStatus })
    })
    if (result.errors.length === 0) {
      toast.success(`${result.ok} seminário${result.ok === 1 ? '' : 's'} atualizado${result.ok === 1 ? '' : 's'}.`)
    } else {
      toast.warning(`${result.ok} OK · ${result.errors.length} com erro.`)
    }
    setPendingStatus(null)
    onClear()
    onDone?.()
  }, [selectedIds, saveSeminario, pendingStatus, toast, onClear, onDone])

  const executeDuplicar = useCallback(async () => {
    const result = await runBulkAction(selectedIds, async id => {
      const orig = seminarios.find(s => s.id === id)
      if (!orig) throw new Error('Seminário não encontrado')
      await saveSeminario({
        nome: `${orig.nome} (cópia)`,
        descricao: orig.descricao,
        instrutor: orig.instrutor,
        data_inicio: orig.data_inicio,
        data_fim: orig.data_fim,
        carga_horaria: orig.carga_horaria,
        local: orig.local,
        church_id: orig.church_id,
        status: 'planejado',  // cópia sempre começa planejada
      })
    })
    if (result.errors.length === 0) {
      toast.success(`${result.ok} seminário${result.ok === 1 ? '' : 's'} duplicado${result.ok === 1 ? '' : 's'}.`)
    } else {
      toast.warning(`${result.ok} OK · ${result.errors.length} com erro.`)
    }
    onClear()
    onDone?.()
  }, [selectedIds, seminarios, saveSeminario, toast, onClear, onDone])

  const executeDelete = useCallback(async () => {
    const result = await runBulkAction(selectedIds, id => removeSeminario(id))
    if (result.errors.length === 0) {
      toast.success(`${result.ok} seminário${result.ok === 1 ? '' : 's'} excluído${result.ok === 1 ? '' : 's'}.`)
    } else {
      toast.warning(`${result.ok} excluídos · ${result.errors.length} com erro.`)
    }
    onClear()
    onDone?.()
  }, [selectedIds, removeSeminario, toast, onClear, onDone])

  const modals = (
    <>
      {openModal === 'status' && (
        <BulkGenericStatusModal<SeminarioStatus>
          title="Alterar status"
          description="Escolha o novo status para os {N} seminários selecionados."
          options={STATUS_OPTIONS}
          count={count}
          onClose={close}
          onPick={(s) => { setPendingStatus(s); close() }}
        />
      )}
      {openModal === 'duplicar' && (
        <BulkConfirmDialog
          title="Duplicar seminários"
          description={`Será criada uma cópia de cada seminário selecionado, com status "Planejado" e sufixo "(cópia)" no nome. Matrículas e certificados não são copiados.`}
          count={count}
          confirmLabel={`Duplicar (${count})`}
          onConfirm={executeDuplicar}
          onCancel={close}
        />
      )}
      {openModal === 'excluir' && (
        <BulkConfirmDialog
          title="Excluir seminários"
          description={`${count} seminário(s) serão excluídos. Matrículas vinculadas a eles também são afetadas.`}
          count={count}
          danger
          confirmLabel={`Excluir (${count})`}
          onConfirm={executeDelete}
          onCancel={close}
        />
      )}
      {pendingStatus && (
        <BulkConfirmDialog
          title="Alterar status"
          description={`${count} seminário(s) terão o status alterado para "${pendingStatus}".`}
          count={count}
          onConfirm={executeStatus}
          onCancel={() => setPendingStatus(null)}
        />
      )}
    </>
  )

  return {
    modals,
    open: (which: 'status' | 'duplicar' | 'excluir') => setOpenModal(which),
  }
}
