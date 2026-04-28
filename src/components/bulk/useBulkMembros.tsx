/**
 * Hook que centraliza a lógica de bulk actions para membros/visitantes.
 * Encapsula todos os modais (status, tipo, igreja, espiritual, arrays) e
 * a ponte com runBulkAction + saveMember.
 *
 * A página chama:
 *   const bulk = useBulkMembros({ selectedIds, onClear })
 *   <bulk.actions /> // renderiza modais ativos
 *   bulk.openStatus() // abre cada modal
 */

import React, { useState, useCallback } from 'react'
import { useData } from '../../contexts/DataContext'
import { useConfig } from '../../contexts/ConfigContext'
import { useToast } from '../ui/UIProvider'
import { runBulkAction } from '../../lib/bulk/runBulkAction'
import BulkConfirmDialog from './BulkConfirmDialog'
import BulkArrayFieldModal, { type ArrayBulkPayload } from './BulkArrayFieldModal'
import {
  BulkStatusModal,
  BulkTipoModal,
  BulkTransferChurchModal,
  BulkSpiritualModal,
} from './BulkSimpleModals'
import type { Member, MemberStatus, MemberMinistry } from '../../types'

type ArrayField = 'titles' | 'ministries' | 'departments' | 'functions'

interface PendingAction {
  title: string
  description: string
  preview?: React.ReactNode
  danger?: boolean
  /** Função recebe id e devolve patch a aplicar via saveMember. */
  buildPatch: (m: Member) => Partial<Member>
}

interface UseBulkMembrosProps {
  selectedIds: string[]
  members: Member[]  // pool completo pra resolver IDs em objetos
  onClear: () => void
  onDone?: () => void
}

export function useBulkMembros({ selectedIds, members, onClear, onDone }: UseBulkMembrosProps) {
  const { saveMember, removeMember } = useData()
  const { config } = useConfig()
  const toast = useToast()

  const [openModal, setOpenModal] = useState<
    | null
    | 'status'
    | 'tipo'
    | 'igreja'
    | 'espiritual'
    | 'titulos'
    | 'ministerios'
    | 'departamentos'
    | 'funcoes'
    | 'excluir'
  >(null)

  const [pending, setPending] = useState<PendingAction | null>(null)

  const count = selectedIds.length
  const close = () => setOpenModal(null)

  // ── Execução genérica via runBulkAction ─────────────────────────────────────
  const execute = useCallback(async (action: PendingAction) => {
    const ids = [...selectedIds]
    if (ids.length === 0) return

    const result = await runBulkAction(ids, async id => {
      const m = members.find(x => x.id === id)
      if (!m) throw new Error('Membro não encontrado no cache')
      const patch = action.buildPatch(m)
      await saveMember({ id, ...patch })
    })

    if (result.errors.length === 0) {
      toast.success(`${result.ok} ${result.ok === 1 ? 'registro atualizado' : 'registros atualizados'}.`)
    } else {
      toast.warning(`${result.ok} OK · ${result.errors.length} com erro.`)
      console.warn('[bulk] erros:', result.errors)
    }
    setPending(null)
    onClear()
    onDone?.()
  }, [selectedIds, members, saveMember, toast, onClear, onDone])

  const executeDelete = useCallback(async () => {
    const ids = [...selectedIds]
    const result = await runBulkAction(ids, async id => removeMember(id))
    if (result.errors.length === 0) {
      toast.success(`${result.ok} ${result.ok === 1 ? 'registro excluído' : 'registros excluídos'}.`)
    } else {
      toast.warning(`${result.ok} excluídos · ${result.errors.length} com erro.`)
      console.warn('[bulk-delete] erros:', result.errors)
    }
    setPending(null)
    onClear()
    onDone?.()
  }, [selectedIds, removeMember, toast, onClear, onDone])

  // ── Helpers para arrays JSONB ───────────────────────────────────────────────
  const applyArrayOp = (current: string[] | undefined, payload: ArrayBulkPayload): string[] => {
    const cur = new Set(current ?? [])
    if (payload.operation === 'add') {
      payload.add?.forEach(v => cur.add(v))
      return [...cur]
    }
    if (payload.operation === 'remove') {
      payload.remove?.forEach(v => cur.delete(v))
      return [...cur]
    }
    if (payload.operation === 'swap') {
      payload.remove?.forEach(v => cur.delete(v))
      payload.add?.forEach(v => cur.add(v))
      return [...cur]
    }
    if (payload.operation === 'replace') {
      return payload.add ?? []
    }
    return [...cur]
  }

  // ── Handlers de cada modal ──────────────────────────────────────────────────
  const handleStatusPick = (status: MemberStatus) => {
    close()
    setPending({
      title: 'Alterar status',
      description: `Os ${count} registros selecionados terão o status alterado para "${status}".`,
      buildPatch: () => ({ status }),
    })
  }

  const handleTipoPick = (tipo: 'membro' | 'visitante' | 'seminarista') => {
    close()
    setPending({
      title: 'Alterar tipo',
      description: `Os ${count} registros selecionados serão movidos para o tipo "${tipo}".`,
      buildPatch: () => ({ member_type: tipo }),
    })
  }

  const handleIgrejaPick = (churchId: string, churchName: string) => {
    close()
    setPending({
      title: 'Transferir de igreja',
      description: `Os ${count} registros selecionados serão movidos para a igreja "${churchName}".`,
      buildPatch: () => ({ church_id: churchId }),
    })
  }

  const handleSpiritualPick = (payload: {
    field: 'baptism' | 'baptism_spirit' | 'conversion'
    value: boolean
    date?: string
  }) => {
    close()
    const labels = {
      baptism: 'Batismo nas águas',
      baptism_spirit: 'Batismo no Espírito',
      conversion: 'Conversão',
    }
    const dateField = (payload.field + '_date') as 'baptism_date' | 'baptism_spirit_date' | 'conversion_date'
    setPending({
      title: payload.value ? `Marcar ${labels[payload.field]}` : `Desmarcar ${labels[payload.field]}`,
      description: payload.value
        ? `${count} registro(s) serão marcados como ${labels[payload.field].toLowerCase()}${payload.date ? ` na data ${payload.date}` : ''}.`
        : `${count} registro(s) terão ${labels[payload.field].toLowerCase()} desmarcado.`,
      buildPatch: () => ({
        [payload.field]: payload.value,
        [dateField]: payload.value ? payload.date : undefined,
      }),
    })
  }

  const handleArrayPick = (field: ArrayField, fieldLabel: string, payload: ArrayBulkPayload) => {
    close()
    const opLabels = {
      add: 'Adicionar',
      remove: 'Remover',
      swap: 'Trocar',
      replace: 'Substituir',
    }
    setPending({
      title: `${opLabels[payload.operation]} ${fieldLabel}`,
      description: `${count} registro(s) terão seus ${fieldLabel} alterados.`,
      preview: (
        <div className="space-y-1">
          {payload.remove && payload.remove.length > 0 && (
            <div>Remover: <span className="font-semibold">{payload.remove.join(', ')}</span></div>
          )}
          {payload.add && payload.add.length > 0 && (
            <div>{payload.operation === 'replace' ? 'Definir como' : 'Adicionar'}: <span className="font-semibold">{payload.add.join(', ')}</span></div>
          )}
        </div>
      ),
      buildPatch: (m) => {
        const ministry: Partial<MemberMinistry> = { ...(m.ministry ?? {}) }
        ministry[field] = applyArrayOp(ministry[field] as string[] | undefined, payload)
        return { ministry: ministry as MemberMinistry }
      },
    })
  }

  const handleDeleteRequest = () => {
    close()
    setPending({
      title: 'Excluir registros',
      description: `${count} registro(s) serão excluídos. Eles ficarão marcados como deletados, mas a auditoria preserva os dados.`,
      danger: true,
      buildPatch: () => ({}), // não usado — usamos executeDelete
    })
  }

  // ── Renderização condicional dos modais ─────────────────────────────────────
  const modals = (
    <>
      {openModal === 'status' && (
        <BulkStatusModal count={count} onClose={close} onPick={handleStatusPick} />
      )}
      {openModal === 'tipo' && (
        <BulkTipoModal count={count} onClose={close} onPick={handleTipoPick} />
      )}
      {openModal === 'igreja' && (
        <BulkTransferChurchModal count={count} onClose={close} onPick={handleIgrejaPick} />
      )}
      {openModal === 'espiritual' && (
        <BulkSpiritualModal count={count} onClose={close} onPick={handleSpiritualPick} />
      )}
      {openModal === 'titulos' && (
        <BulkArrayFieldModal
          title="Alterar títulos"
          fieldLabel="títulos"
          options={config.titulos}
          count={count}
          onClose={close}
          onPick={p => handleArrayPick('titles', 'títulos', p)}
        />
      )}
      {openModal === 'ministerios' && (
        <BulkArrayFieldModal
          title="Alterar ministérios"
          fieldLabel="ministérios"
          options={config.ministerios}
          count={count}
          onClose={close}
          onPick={p => handleArrayPick('ministries', 'ministérios', p)}
        />
      )}
      {openModal === 'departamentos' && (
        <BulkArrayFieldModal
          title="Alterar departamentos"
          fieldLabel="departamentos"
          options={config.departamentos}
          count={count}
          onClose={close}
          onPick={p => handleArrayPick('departments', 'departamentos', p)}
        />
      )}
      {openModal === 'funcoes' && (
        <BulkArrayFieldModal
          title="Alterar funções"
          fieldLabel="funções"
          options={config.funcoes}
          count={count}
          onClose={close}
          onPick={p => handleArrayPick('functions', 'funções', p)}
        />
      )}
      {openModal === 'excluir' && (
        <BulkConfirmDialog
          title="Excluir registros"
          description={`${count} registro(s) serão excluídos. Eles ficarão marcados como deletados, mas a auditoria preserva os dados.`}
          count={count}
          danger
          confirmLabel={`Excluir (${count})`}
          onConfirm={executeDelete}
          onCancel={close}
        />
      )}

      {pending && openModal !== 'excluir' && (
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

  void handleDeleteRequest  // mantido caso futuro precise montar pending custom

  return {
    modals,
    open: (which: 'status' | 'tipo' | 'igreja' | 'espiritual' | 'titulos' | 'ministerios' | 'departamentos' | 'funcoes' | 'excluir') => {
      setOpenModal(which)
    },
  }
}
