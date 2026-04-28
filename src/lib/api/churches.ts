import { supabase } from '../supabase'
import type { Church } from '../../types'

const COLS = `
  id, group_id, name, type, address, phone, email, logo_url, pastor_id,
  pastor:members!churches_pastor_id_fkey ( id, name, apelido )
`

interface RawChurch extends Omit<Church, 'pastor'> {
  pastor?: Church['pastor'] | Church['pastor'][] | null
}

function normalize(raw: RawChurch): Church {
  const pastor = Array.isArray(raw.pastor) ? (raw.pastor[0] ?? null) : (raw.pastor ?? null)
  return { ...raw, pastor } as Church
}

// Strip campos read-only (joins) e converte string vazia em null pra UUIDs
function clean(c: Partial<Church>): Record<string, unknown> {
  const { pastor: _omit, ...rest } = c as Partial<Church> & { pastor?: unknown }
  void _omit
  const out: Record<string, unknown> = { ...rest }
  if (out.pastor_id === '' || out.pastor_id === undefined) out.pastor_id = null
  return out
}

export async function listChurches(): Promise<Church[]> {
  const { data, error } = await supabase
    .from('churches')
    .select(COLS)
    .order('name', { ascending: true })
  if (error) throw error
  const list = ((data ?? []) as unknown as RawChurch[]).map(normalize)
  // Sede sempre no topo, filiais ordenadas por nome
  return list.sort((a, b) => {
    if (a.type === b.type) return a.name.localeCompare(b.name)
    return a.type === 'sede' ? -1 : 1
  })
}

export async function createChurch(c: Omit<Church, 'id' | 'pastor'>): Promise<Church> {
  const { data, error } = await supabase
    .from('churches')
    .insert(clean(c))
    .select(COLS)
    .single()
  if (error) throw error
  return normalize(data as unknown as RawChurch)
}

export async function updateChurch(id: string, patch: Partial<Church>): Promise<Church> {
  const { data, error } = await supabase
    .from('churches')
    .update(clean(patch))
    .eq('id', id)
    .select(COLS)
    .single()
  if (error) throw error
  return normalize(data as unknown as RawChurch)
}

export async function deleteChurch(id: string): Promise<void> {
  const { error } = await supabase.from('churches').delete().eq('id', id)
  if (error) throw error
}
