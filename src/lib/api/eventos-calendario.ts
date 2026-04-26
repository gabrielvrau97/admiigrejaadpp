import { supabase } from '../supabase'
import type { EventoCalendario } from '../../types'

const COLS = 'id, church_group_id, church_id, titulo, descricao, data, hora, cor, created_by, created_at, updated_at'

export async function listEventosCalendario(): Promise<EventoCalendario[]> {
  const { data, error } = await supabase
    .from('eventos_calendario')
    .select(COLS)
    .order('data', { ascending: true })
  if (error) throw error
  return (data ?? []) as EventoCalendario[]
}

function clean(e: Partial<EventoCalendario>) {
  const out: Record<string, unknown> = { ...e }
  if (out.hora === '') out.hora = null
  if (out.descricao === '') out.descricao = null
  if (out.church_id === '') out.church_id = null
  return out
}

export async function createEventoCalendario(
  e: Omit<EventoCalendario, 'id' | 'created_at' | 'updated_at'>,
): Promise<EventoCalendario> {
  const { data, error } = await supabase
    .from('eventos_calendario')
    .insert(clean(e))
    .select(COLS)
    .single()
  if (error) throw error
  return data as EventoCalendario
}

export async function createEventosCalendarioBulk(
  list: Omit<EventoCalendario, 'id' | 'created_at' | 'updated_at'>[],
): Promise<EventoCalendario[]> {
  if (list.length === 0) return []
  const { data, error } = await supabase
    .from('eventos_calendario')
    .insert(list.map(clean))
    .select(COLS)
  if (error) throw error
  return (data ?? []) as EventoCalendario[]
}

export async function updateEventoCalendario(
  id: string,
  patch: Partial<EventoCalendario>,
): Promise<EventoCalendario> {
  const { id: _ignore, ...rest } = patch
  const { data, error } = await supabase
    .from('eventos_calendario')
    .update(clean(rest))
    .eq('id', id)
    .select(COLS)
    .single()
  if (error) throw error
  return data as EventoCalendario
}

export async function deleteEventoCalendario(id: string): Promise<void> {
  const { error } = await supabase.from('eventos_calendario').delete().eq('id', id)
  if (error) throw error
}
