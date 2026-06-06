import { supabase } from '../supabase'
import { APP_GROUP_ID } from '../supabase'

export interface FinRecibo {
  id: string
  numero: string
  lancamento_id: string
  church_group_id: string
  emitido_por?: string
  emitido_em: string
  anulado: boolean
  created_at: string
}

const COLS = `
  id, numero, lancamento_id, church_group_id, emitido_por, emitido_em, anulado, created_at,
  lancamento:fin_lancamentos!lancamento_id (
    id, tipo, valor, forma_pagamento, parcelas, descricao, referencia_culto,
    data_lancamento, observacao, member_nome_manual,
    categoria:fin_categorias!categoria_id ( id, nome, cor ),
    member:members!member_id ( id, name, apelido ),
    church:churches!church_id ( id, name, address, phone ),
    created_by_user:app_users!created_by ( id, name )
  )
`

export interface FinReciboComLancamento extends FinRecibo {
  lancamento: {
    id: string
    tipo: string
    valor: number
    forma_pagamento?: string
    parcelas?: number
    descricao?: string
    referencia_culto?: string
    data_lancamento: string
    observacao?: string
    member_nome_manual?: string
    categoria?: { id: string; nome: string; cor: string } | null
    member?: { id: string; name: string; apelido?: string } | null
    church?: { id: string; name: string; address?: string; phone?: string } | null
    created_by_user?: { id: string; name: string } | null
  }
}

export async function createFinRecibo(lancamentoId: string, emitidoPor: string): Promise<FinRecibo> {
  // gera número sequencial via função do banco
  const { data: numData, error: numErr } = await supabase
    .rpc('gen_fin_recibo_numero', { p_group_id: APP_GROUP_ID })
  if (numErr) throw numErr

  const { data, error } = await supabase
    .from('fin_recibos')
    .insert({
      numero: numData as string,
      lancamento_id: lancamentoId,
      church_group_id: APP_GROUP_ID,
      emitido_por: emitidoPor,
    })
    .select('id, numero, lancamento_id, church_group_id, emitido_por, emitido_em, anulado, created_at')
    .single()
  if (error) throw error
  return data as FinRecibo
}

export async function getFinReciboByLancamento(lancamentoId: string): Promise<FinReciboComLancamento | null> {
  const { data, error } = await supabase
    .from('fin_recibos')
    .select(COLS)
    .eq('lancamento_id', lancamentoId)
    .eq('anulado', false)
    .maybeSingle()
  if (error) throw error
  return data as FinReciboComLancamento | null
}

export interface ListReciboFilters {
  groupId: string
  dataInicio?: string
  dataFim?: string
  anulado?: boolean
  page?: number
  pageSize?: number
}

export async function listFinRecibos(filters: ListReciboFilters): Promise<{ data: FinReciboComLancamento[]; count: number }> {
  const page = filters.page ?? 1
  const size = filters.pageSize ?? 50
  const from = (page - 1) * size
  const to = from + size - 1

  let q = supabase
    .from('fin_recibos')
    .select(COLS, { count: 'exact' })
    .eq('church_group_id', filters.groupId)
    .order('emitido_em', { ascending: false })
    .range(from, to)

  if (filters.anulado !== undefined) q = q.eq('anulado', filters.anulado)
  if (filters.dataInicio) q = q.gte('emitido_em', filters.dataInicio)
  if (filters.dataFim) q = q.lte('emitido_em', filters.dataFim + 'T23:59:59')

  const { data, error, count } = await q
  if (error) throw error
  return { data: (data ?? []) as unknown as FinReciboComLancamento[], count: count ?? 0 }
}

export async function anularFinRecibo(id: string): Promise<void> {
  const { error } = await supabase
    .from('fin_recibos')
    .update({ anulado: true })
    .eq('id', id)
  if (error) throw error
}
