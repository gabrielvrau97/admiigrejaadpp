import { format, differenceInYears } from 'date-fns'
import { ptBR } from 'date-fns/locale'

/**
 * Converte uma string de data ("YYYY-MM-DD" ou ISO completo)
 * em Date local, evitando o bug de GMT-3 onde `new Date('2026-01-15')`
 * vira 14/01 porque é interpretado como UTC.
 */
export function parseISODate(s: string | null | undefined): Date | null {
  if (!s) return null
  try {
    const normalized = s.length === 10 ? `${s}T00:00:00` : s
    const d = new Date(normalized)
    if (isNaN(d.getTime())) return null
    return d
  } catch {
    return null
  }
}

/**
 * Formata uma data em pt-BR. Default: "dd/MM/yyyy".
 * Retorna '—' se data for vazia/inválida.
 */
export function fmtDate(s: string | null | undefined, pattern = 'dd/MM/yyyy'): string {
  const d = parseISODate(s)
  if (!d) return '—'
  try {
    return format(d, pattern, { locale: ptBR })
  } catch {
    return s ?? '—'
  }
}

/**
 * Formata data por extenso: "01 de janeiro de 2026"
 */
export function fmtDateLongo(s: string | null | undefined): string {
  return fmtDate(s, "dd 'de' MMMM 'de' yyyy")
}

/**
 * Calcula idade em anos a partir de uma data de nascimento.
 * Retorna null se data for vazia/inválida.
 */
export function getAge(s: string | null | undefined): number | null {
  const d = parseISODate(s)
  if (!d) return null
  try {
    return differenceInYears(new Date(), d)
  } catch {
    return null
  }
}

/**
 * "X anos" ou '—' se sem data.
 */
export function fmtIdade(s: string | null | undefined): string {
  const age = getAge(s)
  return age === null ? '—' : `${age} anos`
}

/**
 * Converte um Date para "YYYY-MM-DD" no fuso LOCAL.
 * Evita o bug de `date.toISOString()` que devolve UTC — em GMT-3, após
 * as ~21h a data UTC já é o dia seguinte, fazendo o registro "pular" de dia.
 */
export function toISODateLocal(d: Date): string {
  return format(d, 'yyyy-MM-dd')
}

/**
 * Data de HOJE no fuso local em formato "YYYY-MM-DD".
 * Use no lugar de `new Date().toISOString().slice(0, 10)`.
 */
export function hojeISO(): string {
  return toISODateLocal(new Date())
}
