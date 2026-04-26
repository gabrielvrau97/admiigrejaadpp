/**
 * Tema visual por tipo de lista de pessoas.
 * Aplicado no header da MembrosPage pra dar identidade visual diferente
 * pra cada categoria, sem mexer na tabela/dados.
 */

export interface ListTheme {
  /** Cor de destaque (texto + ícone do header) */
  accent: string
  /** Classe Tailwind do gradiente do header */
  headerGradient: string
  /** Classe Tailwind da borda inferior decorativa */
  border: string
  /** Cor do ícone container (bg + border) */
  iconBox: string
  /** Cor do badge tipo (top do header) */
  typeBadge: string
  /** Texto descritivo curto do tipo */
  label: string
}

export const LIST_THEMES: Record<string, ListTheme> = {
  membros: {
    accent: 'text-blue-700',
    headerGradient: 'from-blue-50 via-white to-indigo-50/50',
    border: 'border-blue-300',
    iconBox: 'bg-blue-100 border-blue-200 text-blue-700',
    typeBadge: 'bg-blue-100 text-blue-700',
    label: 'Membros oficiais',
  },
  visitantes: {
    accent: 'text-red-700',
    headerGradient: 'from-red-50 via-white to-rose-50/50',
    border: 'border-red-300',
    iconBox: 'bg-red-100 border-red-200 text-red-600',
    typeBadge: 'bg-red-100 text-red-700',
    label: 'Visitantes da igreja',
  },
  criancas: {
    accent: 'text-amber-700',
    headerGradient: 'from-amber-50 via-white to-yellow-50/50',
    border: 'border-amber-300',
    iconBox: 'bg-amber-100 border-amber-200 text-amber-700',
    typeBadge: 'bg-amber-100 text-amber-800',
    label: 'Crianças (8 a 12 anos)',
  },
  adolescentes: {
    accent: 'text-orange-700',
    headerGradient: 'from-orange-50 via-white to-amber-50/50',
    border: 'border-orange-300',
    iconBox: 'bg-orange-100 border-orange-200 text-orange-700',
    typeBadge: 'bg-orange-100 text-orange-700',
    label: 'Adolescentes (13 a 17)',
  },
  jovens: {
    accent: 'text-emerald-700',
    headerGradient: 'from-emerald-50 via-white to-green-50/50',
    border: 'border-emerald-300',
    iconBox: 'bg-emerald-100 border-emerald-200 text-emerald-700',
    typeBadge: 'bg-emerald-100 text-emerald-700',
    label: 'Jovens (18+, solteiros)',
  },
  'novos-convertidos': {
    accent: 'text-purple-700',
    headerGradient: 'from-purple-50 via-white to-violet-50/50',
    border: 'border-purple-300',
    iconBox: 'bg-purple-100 border-purple-200 text-purple-700',
    typeBadge: 'bg-purple-100 text-purple-700',
    label: 'Novos convertidos',
  },
}

export function getListTheme(type: string): ListTheme {
  return LIST_THEMES[type] ?? LIST_THEMES.membros
}
