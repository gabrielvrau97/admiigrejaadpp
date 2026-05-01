/**
 * API de gestão de usuários do sistema (app_users + app_user_churches).
 *
 * Limitação intencional: NÃO cria/exclui usuários no auth do Supabase.
 * Esses registros são criados pelo Master diretamente no painel do Supabase
 * (Authentication → Users) e depois aparecem aqui pra serem completados
 * (papel, nome, igrejas).
 *
 * Quem pode usar: apenas Master (RLS protege).
 */

import { supabase } from '../supabase'
import type { AppUser, UserRole } from '../../types'

interface RawAppUser {
  id: string
  email: string
  name: string | null
  role: UserRole
  church_group_id: string
  active: boolean
  app_user_churches?: { church_id: string }[] | null
}

function normalize(raw: RawAppUser): AppUser & { active: boolean } {
  return {
    id: raw.id,
    email: raw.email,
    name: raw.name ?? undefined,
    role: raw.role,
    church_group_id: raw.church_group_id,
    church_ids: (raw.app_user_churches ?? []).map(c => c.church_id),
    active: raw.active,
  }
}

export async function listUsers(): Promise<(AppUser & { active: boolean })[]> {
  const { data, error } = await supabase
    .from('app_users')
    .select(`
      id, email, name, role, church_group_id, active,
      app_user_churches ( church_id )
    `)
    .order('name', { ascending: true })
  if (error) throw error
  return (data ?? []).map(r => normalize(r as unknown as RawAppUser))
}

/** Atualiza nome, papel ou status ativo. */
export async function updateUser(
  id: string,
  patch: { name?: string; role?: UserRole; active?: boolean },
): Promise<void> {
  const { error } = await supabase.from('app_users').update(patch).eq('id', id)
  if (error) throw error
}

/** Sincroniza igrejas: apaga vínculos antigos e cria os novos. */
export async function setUserChurches(userId: string, churchIds: string[]): Promise<void> {
  // Delete tudo
  const { error: e1 } = await supabase.from('app_user_churches').delete().eq('user_id', userId)
  if (e1) throw e1
  if (churchIds.length === 0) return
  // Insere novos
  const rows = churchIds.map(church_id => ({ user_id: userId, church_id }))
  const { error: e2 } = await supabase.from('app_user_churches').insert(rows)
  if (e2) throw e2
}

/** Inicializa uma linha em app_users após o usuário ter sido criado no auth.
 *  Útil quando o Master criou pelo painel Supabase mas a linha em app_users
 *  ainda não existe. */
export async function ensureAppUser(
  authUserId: string,
  data: {
    email: string
    name?: string
    role: UserRole
    church_group_id: string
    active?: boolean
  },
): Promise<void> {
  const { error } = await supabase.from('app_users').upsert({
    id: authUserId,
    email: data.email,
    name: data.name ?? null,
    role: data.role,
    church_group_id: data.church_group_id,
    active: data.active ?? true,
  })
  if (error) throw error
}

/** Lista usuários do auth que ainda não têm linha em app_users.
 *  Como anon não acessa auth.users, isto não funciona com chave pública.
 *  Solução: o Master usa a página de Usuários pra inserir manualmente (com email
 *  e id que ele copia do painel Supabase). */
