/**
 * Matriz de permissões por papel.
 *
 * Cada papel tem uma lista de "áreas" que pode acessar. As áreas batem
 * com prefixos de rota (ex: '/secretaria', '/seminarios').
 *
 * Master: tudo. Admin Secretaria: secretaria + acadêmico + documentos +
 * igrejas + meu-perfil + configurações da secretaria.
 * Admin Financeiro: só financeiro + meu-perfil.
 *
 * Pra checar se o usuário pode acessar uma rota, use canAccessRoute().
 * Pra checar se vê um item do menu, use canAccessArea().
 */

import type { UserRole } from '../types'

export type Area =
  | 'dashboard'
  | 'secretaria'         // membros, visitantes, criancas, adolescentes, jovens, novos-convertidos, graficos, configuracoes
  | 'seminarios'         // seminarios, seminarios/:id
  | 'certificados'
  | 'carteirinhas'       // credenciais
  | 'igrejas'
  | 'usuarios'           // gestão de usuários (master only)
  | 'backup'
  | 'meu-perfil'
  | 'financeiro'         // tesouraria, extrato, dashboard financeiro
  | 'financeiro-config'  // configurações financeiras (master only)

export const ROLE_AREAS: Record<UserRole, Set<Area>> = {
  master: new Set<Area>([
    'dashboard', 'secretaria', 'seminarios', 'certificados', 'carteirinhas',
    'igrejas', 'usuarios', 'backup', 'meu-perfil', 'financeiro', 'financeiro-config',
  ]),
  admin_secretaria: new Set<Area>([
    'dashboard', 'secretaria', 'seminarios', 'certificados', 'carteirinhas',
    'igrejas', 'meu-perfil',
  ]),
  admin_financeiro: new Set<Area>([
    'dashboard', 'financeiro', 'meu-perfil',
  ]),
  // Legados (papéis antigos) — mantidos por compatibilidade, equivalem a admin_secretaria
  admin: new Set<Area>([
    'dashboard', 'secretaria', 'seminarios', 'certificados', 'carteirinhas',
    'igrejas', 'meu-perfil',
  ]),
  secretaria: new Set<Area>([
    'dashboard', 'secretaria', 'seminarios', 'certificados', 'carteirinhas',
    'meu-perfil',
  ]),
  visualizador: new Set<Area>([
    'dashboard', 'secretaria', 'meu-perfil',
  ]),
}

export const ROLE_LABELS: Record<UserRole, string> = {
  master: 'Master',
  admin_secretaria: 'Admin Secretaria',
  admin_financeiro: 'Admin Financeiro',
  admin: 'Admin (legado)',
  secretaria: 'Secretaria (legado)',
  visualizador: 'Visualizador (legado)',
}

/** Mapeia uma rota completa pra área correspondente. Retorna null se rota
 * desconhecida (libera por padrão — fail-open). */
export function routeToArea(pathname: string): Area | null {
  if (pathname.startsWith('/dashboard')) return 'dashboard'
  if (pathname === '/' || pathname === '') return 'dashboard'
  if (pathname.startsWith('/secretaria')) return 'secretaria'
  if (pathname.startsWith('/seminarios')) return 'seminarios'
  if (pathname.startsWith('/certificados')) return 'certificados'
  if (pathname.startsWith('/carteirinhas')) return 'carteirinhas'
  if (pathname.startsWith('/financeiro/configuracoes')) return 'financeiro-config'
  if (pathname.startsWith('/financeiro/extrato')) return 'financeiro'
  if (pathname.startsWith('/financeiro/tesouraria')) return 'financeiro'
  if (pathname.startsWith('/financeiro')) return 'financeiro'
  if (pathname.startsWith('/controle/igrejas')) return 'igrejas'
  if (pathname.startsWith('/controle/usuarios')) return 'usuarios'
  if (pathname.startsWith('/controle/backup')) return 'backup'
  if (pathname.startsWith('/controle/meu-perfil')) return 'meu-perfil'
  return null
}

export function canAccessArea(role: UserRole | undefined, area: Area): boolean {
  if (!role) return false
  const allowed = ROLE_AREAS[role]
  if (!allowed) return false
  return allowed.has(area)
}

export function canAccessRoute(role: UserRole | undefined, pathname: string): boolean {
  const area = routeToArea(pathname)
  if (!area) return true  // rota desconhecida — libera (fail-open pra não quebrar)
  return canAccessArea(role, area)
}

/** Atalho: o usuário pode gerenciar outros usuários? (master only) */
export function canManageUsers(role: UserRole | undefined): boolean {
  return role === 'master'
}
