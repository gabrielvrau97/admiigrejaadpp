import { supabase, APP_GROUP_ID } from '../supabase'

export type ConfigCategory =
  | 'titulo' | 'ministerio' | 'departamento' | 'funcao' | 'motivo_entrada' | 'motivo_saida'

export interface ConfigData {
  titulos: string[]
  ministerios: string[]
  departamentos: string[]
  funcoes: string[]
  motivosEntrada: string[]
  motivosSaida: string[]
}

interface Row { category: ConfigCategory; value: string; display_order: number; active: boolean }

export async function loadConfig(groupId: string = APP_GROUP_ID): Promise<ConfigData> {
  const { data, error } = await supabase
    .from('config_options')
    .select('category, value, display_order, active')
    .eq('church_group_id', groupId)
    .eq('active', true)
    .order('display_order', { ascending: true })
  if (error) throw error

  const rows = (data ?? []) as Row[]
  const pick = (cat: ConfigCategory) => rows.filter(r => r.category === cat).map(r => r.value)
  return {
    titulos: pick('titulo'),
    ministerios: pick('ministerio'),
    departamentos: pick('departamento'),
    funcoes: pick('funcao'),
    motivosEntrada: pick('motivo_entrada'),
    motivosSaida: pick('motivo_saida'),
  }
}

export async function addOption(category: ConfigCategory, value: string, groupId: string = APP_GROUP_ID) {
  const { error } = await supabase.from('config_options').insert({
    church_group_id: groupId,
    category,
    value,
  })
  if (error) throw error
}

export async function removeOption(category: ConfigCategory, value: string, groupId: string = APP_GROUP_ID) {
  const { error } = await supabase
    .from('config_options')
    .delete()
    .eq('church_group_id', groupId)
    .eq('category', category)
    .eq('value', value)
  if (error) throw error
}
