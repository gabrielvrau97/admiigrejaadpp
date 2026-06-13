export function fmt(v: number): string {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function fmtDate(s: string): string {
  if (!s) return ''
  const [y, m, d] = s.slice(0, 10).split('-')
  return `${d}/${m}/${y}`
}

export function formaPagLabel(f?: string, parcelas?: number): string {
  if (!f) return '—'
  if (f === 'dinheiro') return 'Dinheiro'
  if (f === 'pix') return 'Pix'
  if (f === 'cartao_debito') return 'Débito'
  if (f === 'cartao_credito') return `Crédito${parcelas && parcelas > 1 ? ` ${parcelas}x` : ''}`
  return f
}
