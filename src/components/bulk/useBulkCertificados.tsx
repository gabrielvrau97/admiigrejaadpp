/**
 * Hook de bulk actions para certificados.
 * Suporta: alterar status (emitido/cancelado/reemitido), reemitir (cria nova versão).
 */

import { useState, useCallback } from 'react'
import { useData } from '../../contexts/DataContext'
import { useToast } from '../ui/UIProvider'
import { runBulkAction } from '../../lib/bulk/runBulkAction'
import BulkConfirmDialog from './BulkConfirmDialog'
import BulkGenericStatusModal from './BulkGenericStatusModal'
import type { Certificado, CertificadoStatus } from '../../types'

interface Props {
  selectedIds: string[]
  certificados: Certificado[]
  onClear: () => void
  onDone?: () => void
}

const STATUS_OPTIONS: { value: CertificadoStatus; label: string; color: string }[] = [
  { value: 'emitido', label: 'Emitido', color: 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100' },
  { value: 'cancelado', label: 'Cancelado', color: 'bg-red-50 border-red-200 text-red-700 hover:bg-red-100' },
  { value: 'reemitido', label: 'Reemitido', color: 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100' },
]

export function useBulkCertificados({ selectedIds, certificados, onClear, onDone }: Props) {
  const { saveCertificado } = useData()
  const toast = useToast()

  const [openModal, setOpenModal] = useState<null | 'status' | 'reemitir' | 'cancelar'>(null)
  const [pendingStatus, setPendingStatus] = useState<CertificadoStatus | null>(null)

  const count = selectedIds.length
  const close = () => setOpenModal(null)

  const executeStatus = useCallback(async () => {
    if (!pendingStatus) return
    const result = await runBulkAction(selectedIds, async id => {
      await saveCertificado({ id, status: pendingStatus })
    })
    if (result.errors.length === 0) {
      toast.success(`${result.ok} certificado${result.ok === 1 ? '' : 's'} atualizado${result.ok === 1 ? '' : 's'}.`)
    } else {
      toast.warning(`${result.ok} OK · ${result.errors.length} com erro.`)
    }
    setPendingStatus(null)
    onClear()
    onDone?.()
  }, [selectedIds, pendingStatus, saveCertificado, toast, onClear, onDone])

  const executeReemitir = useCallback(async () => {
    let counter = certificados.length + 1
    const ano = new Date().getFullYear()
    const result = await runBulkAction(selectedIds, async id => {
      const orig = certificados.find(c => c.id === id)
      if (!orig) throw new Error('Certificado original não encontrado')
      const numero = `CERT-${ano}-${String(counter++).padStart(4, '0')}`
      // Marca o antigo como reemitido
      await saveCertificado({ id: orig.id, status: 'reemitido' })
      // Cria a nova versão (snapshot dos dados originais)
      await saveCertificado({
        matricula_id: orig.matricula_id,
        seminario_id: orig.seminario_id,
        numero,
        nome_aluno: orig.nome_aluno,
        nome_seminario: orig.nome_seminario,
        carga_horaria: orig.carga_horaria,
        data_conclusao: orig.data_conclusao,
        emitido_em: new Date().toISOString().split('T')[0],
        emitido_por: orig.emitido_por,
        status: 'emitido',
      })
    })
    if (result.errors.length === 0) {
      toast.success(`${result.ok} certificado${result.ok === 1 ? '' : 's'} reemitido${result.ok === 1 ? '' : 's'}.`)
    } else {
      toast.warning(`${result.ok} OK · ${result.errors.length} com erro.`)
    }
    onClear()
    onDone?.()
  }, [selectedIds, certificados, saveCertificado, toast, onClear, onDone])

  const executeCancelar = useCallback(async () => {
    const result = await runBulkAction(selectedIds, async id => {
      await saveCertificado({ id, status: 'cancelado' })
    })
    if (result.errors.length === 0) {
      toast.success(`${result.ok} certificado${result.ok === 1 ? '' : 's'} cancelado${result.ok === 1 ? '' : 's'}.`)
    } else {
      toast.warning(`${result.ok} OK · ${result.errors.length} com erro.`)
    }
    onClear()
    onDone?.()
  }, [selectedIds, saveCertificado, toast, onClear, onDone])

  const modals = (
    <>
      {openModal === 'status' && (
        <BulkGenericStatusModal<CertificadoStatus>
          title="Alterar status"
          description="Escolha o novo status para os {N} certificados selecionados."
          options={STATUS_OPTIONS}
          count={count}
          onClose={close}
          onPick={s => { setPendingStatus(s); close() }}
        />
      )}
      {openModal === 'reemitir' && (
        <BulkConfirmDialog
          title="Reemitir certificados"
          description={`Cada certificado selecionado será marcado como "reemitido" e uma nova versão será criada com a data de hoje, mantendo nome, seminário e carga horária originais.`}
          count={count}
          confirmLabel={`Reemitir (${count})`}
          onConfirm={executeReemitir}
          onCancel={close}
        />
      )}
      {openModal === 'cancelar' && (
        <BulkConfirmDialog
          title="Cancelar certificados"
          description={`${count} certificado(s) terão o status alterado para "cancelado". O registro continua existindo, mas o certificado fica inválido.`}
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
          description={`${count} certificado(s) terão o status alterado para "${pendingStatus}".`}
          count={count}
          onConfirm={executeStatus}
          onCancel={() => setPendingStatus(null)}
        />
      )}
    </>
  )

  return {
    modals,
    open: (which: 'status' | 'reemitir' | 'cancelar') => setOpenModal(which),
  }
}
