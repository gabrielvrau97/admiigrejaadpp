// Máscaras de input brasileiras — aplicam formatação progressiva conforme o usuário digita.
// Todas trabalham só com dígitos, descartando o que não é número.

export function maskCPF(value: string): string {
  const d = value.replace(/\D/g, '').slice(0, 11)
  if (d.length <= 3) return d
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`
}

export function maskCEP(value: string): string {
  const d = value.replace(/\D/g, '').slice(0, 8)
  if (d.length <= 5) return d
  return `${d.slice(0, 5)}-${d.slice(5)}`
}

/**
 * Telefone brasileiro: aceita fixo (10 dígitos) ou celular (11 dígitos).
 * (DD) NNNN-NNNN  ou  (DD) 9NNNN-NNNN
 */
export function maskPhone(value: string): string {
  const d = value.replace(/\D/g, '').slice(0, 11)
  if (d.length === 0) return ''
  if (d.length <= 2) return `(${d}`
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}

/**
 * RG: formato comum SP/MG é NN.NNN.NNN-X (até 9 dígitos + dígito verificador alfanumérico).
 * Aceita 7-9 caracteres alfanuméricos no final.
 */
export function maskRG(value: string): string {
  // Permite o último char ser X/letra
  const clean = value.replace(/[^0-9Xx]/g, '').toUpperCase().slice(0, 9)
  if (clean.length <= 2) return clean
  if (clean.length <= 5) return `${clean.slice(0, 2)}.${clean.slice(2)}`
  if (clean.length <= 8) return `${clean.slice(0, 2)}.${clean.slice(2, 5)}.${clean.slice(5)}`
  return `${clean.slice(0, 2)}.${clean.slice(2, 5)}.${clean.slice(5, 8)}-${clean.slice(8)}`
}

// Helpers para extrair só dígitos quando precisar comparar/persistir
export const onlyDigits = (s: string) => s.replace(/\D/g, '')
