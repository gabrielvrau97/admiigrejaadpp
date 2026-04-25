import { supabase } from '../supabase'
import type { Church } from '../../types'

export async function listChurches(): Promise<Church[]> {
  const { data, error } = await supabase
    .from('churches')
    .select('id, group_id, name, type, address, phone, email, logo_url')
    .order('type', { ascending: true })
    .order('name', { ascending: true })
  if (error) throw error
  return (data ?? []) as Church[]
}

export async function createChurch(c: Omit<Church, 'id'>): Promise<Church> {
  const { data, error } = await supabase
    .from('churches')
    .insert({ ...c })
    .select('id, group_id, name, type, address, phone, email, logo_url')
    .single()
  if (error) throw error
  return data as Church
}

export async function updateChurch(id: string, patch: Partial<Church>): Promise<Church> {
  const { data, error } = await supabase
    .from('churches')
    .update(patch)
    .eq('id', id)
    .select('id, group_id, name, type, address, phone, email, logo_url')
    .single()
  if (error) throw error
  return data as Church
}

export async function deleteChurch(id: string): Promise<void> {
  const { error } = await supabase.from('churches').delete().eq('id', id)
  if (error) throw error
}
