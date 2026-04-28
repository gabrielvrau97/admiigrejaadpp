/**
 * Hook de bulk actions para carteirinhas (credenciais).
 * Suporta: alterar status, renovar (cria nova com 2 anos de validade), cancelar/excluir.
 */

import { useState, useCallback } from 'react'
import { addYears, format } from 'date-fns'
import { useData } from '../../contexts/DataContext'
import { useToast } from '../ui/UIProvider'
import { runBulkAction } from '../../lib/bulk/runBulkAction'
import BulkConfirmDialog from './BulkConfirmDialog'
import BulkGenericStatusModal from './BulkGenericStatusModal'
import type { Carteirinha, CarteirinhaStatus } from '../../types'

interface Props {
  selectedIds: string[]
  carteirinhas: Carteirinha[]
  onClear: () => void
  onDone?: () => void
}

const STATUS_OPTIONS: { value: CarteirinhaStatus; label: string; color: string }[] = [
  { value: 'ativa', label: 'Ativa', color: 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100' },
  { value: 'vencida', label: 'Vencida', color: 'bg-red-50 border-red-200 text-red-700 hover:bg-red-100' },
  { value: 'cancelada', label: 'Cancelada', color: 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100' },
  { value: 'substituida', label: 'Substituída', color: 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100' },
]

export function useBulkCarteirinhas({ selectedIds, carteirinhas, onClear, onDone }: Props) {
  const { saveCarteirinha } = useData()
  const toast = useToast()

  const [openModal, setOpenModal] = useState<null | 'status' | 'renovar' | 'cancelar'>(null)
  const [pendingStatus, setPendingStatus] = useState<CarteirinhaStatus | null>(null)

  const count = selectedIds.length
  const close = () => setOpenModal(null)

  const executeStatus = useCallback(async () => {
    if (!pendingStatus) return
    const result = await runBulkAction(selectedIds, async id => {
      await saveCarteirinha({ id, status: pendingStatus })
    })
    if (result.errors.length === 0) {
      toast.success(`${result.ok} credencial${result.ok === 1 ? '' : 'is'} atualizada${result.ok === 1 ? '' : 's'}.`)
    } else {
      toast.warning(`${result.ok} OK · ${result.errors.length} com erro.`)
    }
    setPendingStatus(null)
    onClear()
    onDone?.()
  }, [selectedIds, pendingStatus, saveCarteirinha, toast, onClear, onDone])

  const executeRenovar = useCallback(async () => {
    let counter = carteirinhas.length + 1
    const ano = new Date().getFullYear()
    const result = await runBulkAction(selectedIds, async id => {
      const orig = carteirinhas.find(c => c.id === id)
      if (!orig) throw new Error('Credencial original não encontrada')
      const numero = `ADP-${ano}-${String(counter++).padStart(4, '0')}`
      const emitida = format(new Date(), 'yyyy-MM-dd')
      const valida = format(addYears(new Date(), 2), 'yyyy-MM-dd')
      // Marca a antiga como substituída
      await saveCarteirinha({ id: orig.id, status: 'substituida' })
      // Cria a nova
      await saveCarteirinha({
        member_id: orig.member_id,
        numero,
        motivo: 'renovacao',
        emitida_em: emitida,
        valida_ate: valida,
        emitida_por: orig.emitida_por,
        status: 'ativa',
      })
    })
    if (result.errors.length === 0) {
      toast.success(`${result.ok} credencial${result.ok === 1 ? '' : 'is'} renovada${result.ok === 1 ? '' : 's'} (validade +2 anos).`)
    } else {
      toast.warning(`${result.ok} OK · ${result.errors.length} com erro.`)
    }
    onClear()
    onDone?.()
  }, [selectedIds, carteirinhas, saveCarteirinha, toast, onClear, onDone])

  const executeCancelar = useCallback(async () => {
    const result = await runBulkAction(selectedIds, async id => {
      await saveCarteirinha({ id, status: 'cancelada' })
    })
    if (result.errors.length === 0) {
      toast.success(`${result.ok} credencial${result.ok === 1 ? '' : 'is'} cancelada${result.ok === 1 ? '' : 's'}.`)
    } else {
      toast.warning(`${result.ok} OK · ${result.errors.length} com erro.`)
    }
    onClear()
    onDone?.()
  }, [selectedIds, saveCarteirinha, toast, onClear, onDone])

  const modals = (
    <>
      {openModal === 'status' && (
        <BulkGenericStatusModal<CarteirinhaStatus>
          title="Alterar status"
          description="Escolha o novo status para as {N} credenciais selecionadas."
          options={STATUS_OPTIONS}
          count={count}
          onClose={close}
          onPick={s => { setPendingStatus(s); close() }}
        />
      )}
      {openModal === 'renovar' && (
        <BulkConfirmDialog
          title="Renovar credenciais"
          description={`Cada credencial selecionada será marcada como "substituída" e uma nova será emitida em seu lugar, com validade de 2 anos a partir de hoje.`}
          count={count}
          confirmLabel={`Renovar (${count})`}
          onConfirm={executeRenovar}
          onCancel={close}
        />
      )}
      {openModal === 'cancelar' && (
        <BulkConfirmDialog
          title="Cancelar credenciais"
          description={`${count} credencial(is) terão o status alterado para "cancelada". Esta ação não exclui o registro mas inativa a credencial.`}
          count={count}
          danger
          confirmLabel={`Cancelar (${count})`}
          onConfirm={executeCancelar}
          onCancel={close}
        />
      )}
      {pendingStatus && (
        <BulkConfirmDialog
          title="Alterar status"
          description={`${count} credencial(is) terão o status alterado para "${pendingStatus}".`}
          count={count}
          onConfirm={executeStatus}
          onCancel={() => setPendingStatus(null)}
        />
      )}
    </>
  )

  return {
    modals,
    open: (which: 'status' | 'renovar' | 'cancelar') => setOpenModal(which),
  }
}
