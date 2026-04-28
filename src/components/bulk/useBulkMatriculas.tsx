/**
 * Hook de bulk actions para matrículas de um seminário.
 * Suporta: alterar situação, lançar notas/frequência, lançar data de conclusão,
 * gerar certificados em lote (concluídos sem cert), excluir.
 */

import React, { useState, useCallback } from 'react'
import { useData } from '../../contexts/DataContext'
import { useToast } from '../ui/UIProvider'
import { runBulkAction } from '../../lib/bulk/runBulkAction'
import BulkConfirmDialog from './BulkConfirmDialog'
import {
  BulkSituacaoModal,
  BulkNotasModal,
  BulkDataConclusaoModal,
} from './BulkMatriculaModals'
import type { Matricula, MatriculaSituacao, Seminario } from '../../types'

interface PendingAction {
  title: string
  description: string
  preview?: React.ReactNode
  danger?: boolean
  buildPatch: (m: Matricula) => Partial<Matricula>
}

interface UseBulkMatriculasProps {
  selectedIds: string[]
  matriculas: Matricula[]
  seminario: Seminario | null
  onClear: () => void
  onDone?: () => void
}

export function useBulkMatriculas({
  selectedIds,
  matriculas,
  seminario,
  onClear,
  onDone,
}: UseBulkMatriculasProps) {
  const { saveMatricula, removeMatricula, certificados, saveCertificado } = useData()
  const toast = useToast()

  const [openModal, setOpenModal] = useState<
    | null
    | 'situacao'
    | 'notas'
    | 'data_conclusao'
    | 'gerar_certificados'
    | 'excluir'
  >(null)

  const [pending, setPending] = useState<PendingAction | null>(null)

  const count = selectedIds.length
  const close = () => setOpenModal(null)

  const execute = useCallback(async (action: PendingAction) => {
    const ids = [...selectedIds]
    if (ids.length === 0) return

    const result = await runBulkAction(ids, async id => {
      const m = matriculas.find(x => x.id === id)
      if (!m) throw new Error('Matrícula não encontrada')
      const patch = action.buildPatch(m)
      await saveMatricula({ id, ...patch })
    })

    if (result.errors.length === 0) {
      toast.success(`${result.ok} ${result.ok === 1 ? 'matrícula atualizada' : 'matrículas atualizadas'}.`)
    } else {
      toast.warning(`${result.ok} OK · ${result.errors.length} com erro.`)
      console.warn('[bulk-matricula] erros:', result.errors)
    }
    setPending(null)
    onClear()
    onDone?.()
  }, [selectedIds, matriculas, saveMatricula, toast, onClear, onDone])

  const executeDelete = useCallback(async () => {
    const ids = [...selectedIds]
    const result = await runBulkAction(ids, id => removeMatricula(id))
    if (result.errors.length === 0) {
      toast.success(`${result.ok} matrícula${result.ok === 1 ? '' : 's'} excluída${result.ok === 1 ? '' : 's'}.`)
    } else {
      toast.warning(`${result.ok} excluídas · ${result.errors.length} com erro.`)
    }
    setPending(null)
    onClear()
    onDone?.()
  }, [selectedIds, removeMatricula, toast, onClear, onDone])

  const executeGerarCertificados = useCallback(async () => {
    if (!seminario) return
    const elegiveis = matriculas.filter(m =>
      selectedIds.includes(m.id) && m.situacao === 'concluido'
    )
    const semCert = elegiveis.filter(m =>
      !certificados.some(c => c.matricula_id === m.id && c.status !== 'cancelado')
    )

    if (semCert.length === 0) {
      toast.warning('Nenhum candidato elegível: todos já têm certificado ou não estão concluídos.')
      setPending(null)
      onClear()
      return
    }

    let counter = certificados.length + 1
    const result = await runBulkAction(semCert.map(m => m.id), async id => {
      const m = matriculas.find(x => x.id === id)!
      const numero = `CERT-${new Date().getFullYear()}-${String(counter++).padStart(4, '0')}`
      await saveCertificado({
        matricula_id: m.id,
        seminario_id: seminario.id,
        numero,
        nome_aluno: m.nome,
        nome_seminario: seminario.nome,
        carga_horaria: seminario.carga_horaria,
        data_conclusao: m.data_conclusao ?? new Date().toISOString().split('T')[0],
        emitido_em: new Date().toISOString().split('T')[0],
        emitido_por: 'Secretaria Admin',
        status: 'emitido',
      })
    })

    if (result.errors.length === 0) {
      toast.success(`${result.ok} certificado${result.ok === 1 ? '' : 's'} emitido${result.ok === 1 ? '' : 's'}.`)
    } else {
      toast.warning(`${result.ok} OK · ${result.errors.length} com erro.`)
    }
    setPending(null)
    onClear()
    onDone?.()
  }, [selectedIds, matriculas, certificados, saveCertificado, seminario, toast, onClear, onDone])

  // ── Handlers ────────────────────────────────────────────────────────────────
  const handleSituacaoPick = (situacao: MatriculaSituacao) => {
    close()
    setPending({
      title: 'Alterar situação',
      description: `${count} matrícula(s) terão a situação alterada para "${situacao}".`,
      buildPatch: () => ({ situacao }),
    })
  }

  const handleNotasPick = (payload: { nota?: number; frequencia?: number }) => {
    close()
    const parts: string[] = []
    if (payload.nota !== undefined) parts.push(`nota ${payload.nota.toFixed(1)}`)
    if (payload.frequencia !== undefined) parts.push(`frequência ${payload.frequencia}%`)
    setPending({
      title: 'Lançar notas e frequência',
      description: `${count} matrícula(s) receberão: ${parts.join(' e ')}.`,
      buildPatch: () => ({
        ...(payload.nota !== undefined ? { nota_final: payload.nota } : {}),
        ...(payload.frequencia !== undefined ? { frequencia: payload.frequencia } : {}),
      }),
    })
  }

  const handleDataConclusaoPick = (date: string) => {
    close()
    setPending({
      title: 'Data de conclusão',
      description: `${count} matrícula(s) terão data de conclusão ${date}.`,
      buildPatch: () => ({ data_conclusao: date }),
    })
  }

  const modals = (
    <>
      {openModal === 'situacao' && (
        <BulkSituacaoModal count={count} onClose={close} onPick={handleSituacaoPick} />
      )}
      {openModal === 'notas' && (
        <BulkNotasModal count={count} onClose={close} onPick={handleNotasPick} />
      )}
      {openModal === 'data_conclusao' && (
        <BulkDataConclusaoModal count={count} onClose={close} onPick={handleDataConclusaoPick} />
      )}
      {openModal === 'gerar_certificados' && (
        <BulkConfirmDialog
          title="Gerar certificados em lote"
          description={`Será emitido um certificado para cada matrícula selecionada que esteja com situação "Concluído" e ainda não tenha certificado ativo. Matrículas em outras situações ou que já têm certificado serão ignoradas.`}
          count={count}
          confirmLabel="Emitir certificados"
          onConfirm={executeGerarCertificados}
          onCancel={close}
        />
      )}
      {openModal === 'excluir' && (
        <BulkConfirmDialog
          title="Excluir matrículas"
          description={`${count} matrícula(s) serão excluídas. Certificados vinculados podem ser afetados.`}
          count={count}
          danger
          confirmLabel={`Excluir (${count})`}
          onConfirm={executeDelete}
          onCancel={close}
        />
      )}

      {pending && (
        <BulkConfirmDialog
          title={pending.title}
          description={pending.description}
          count={count}
          preview={pending.preview}
          danger={pending.danger}
          onConfirm={() => execute(pending)}
          onCancel={() => setPending(null)}
        />
      )}
    </>
  )

  return {
    modals,
    open: (which: 'situacao' | 'notas' | 'data_conclusao' | 'gerar_certificados' | 'excluir') => {
      setOpenModal(which)
    },
  }
}
