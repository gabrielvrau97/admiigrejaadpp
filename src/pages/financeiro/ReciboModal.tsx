import React, { useRef } from 'react'
import { X, Printer, MessageCircle, CheckCircle } from 'lucide-react'
import type { FinReciboComLancamento } from '../../lib/api/fin_recibos'

interface Props {
  recibo: FinReciboComLancamento
  onClose: () => void
}

function fmt(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function fmtDate(s: string) {
  const [y, m, d] = s.slice(0, 10).split('-')
  return `${d}/${m}/${y}`
}

function formaPagLabel(f?: string, parcelas?: number) {
  if (!f) return ''
  if (f === 'dinheiro') return 'Dinheiro'
  if (f === 'pix') return 'Pix'
  if (f === 'cartao_debito') return 'Cartão de Débito'
  if (f === 'cartao_credito') return `Cartão de Crédito${parcelas && parcelas > 1 ? ` (${parcelas}x)` : ''}`
  return f
}

function buildReciboHtml(recibo: FinReciboComLancamento): string {
  const l = recibo.lancamento
  const isEntrada = l.tipo === 'entrada'
  const nomeContribuinte = l.member?.name ?? l.member_nome_manual ?? '—'
  const forma = formaPagLabel(l.forma_pagamento, l.parcelas)

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8"/>
  <title>Recibo ${recibo.numero}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; font-size: 13px; color: #111; background: #fff; }
    .page { width: 100%; max-width: 600px; margin: 0 auto; padding: 32px 28px; }
    .header { display: flex; align-items: flex-start; justify-content: space-between; border-bottom: 2px solid #111; padding-bottom: 14px; margin-bottom: 18px; }
    .church-name { font-size: 16px; font-weight: 700; }
    .church-sub { font-size: 11px; color: #555; margin-top: 3px; }
    .recibo-title { text-align: right; }
    .recibo-title h1 { font-size: 20px; font-weight: 800; letter-spacing: 1px; color: ${isEntrada ? '#15803d' : '#dc2626'}; }
    .recibo-title .numero { font-size: 12px; color: #555; margin-top: 2px; }
    .valor-box { border: 2px solid ${isEntrada ? '#16a34a' : '#dc2626'}; border-radius: 8px; padding: 14px 20px; margin-bottom: 18px; display: flex; align-items: center; justify-content: space-between; background: ${isEntrada ? '#f0fdf4' : '#fff1f2'}; }
    .valor-label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: .5px; color: #555; }
    .valor-num { font-size: 26px; font-weight: 800; color: ${isEntrada ? '#15803d' : '#dc2626'}; }
    .tipo-badge { font-size: 11px; font-weight: 700; text-transform: uppercase; padding: 3px 10px; border-radius: 99px; background: ${isEntrada ? '#dcfce7' : '#fee2e2'}; color: ${isEntrada ? '#15803d' : '#dc2626'}; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 18px; }
    td { padding: 7px 0; vertical-align: top; }
    td:first-child { width: 38%; color: #555; font-size: 12px; }
    td:last-child { font-weight: 600; font-size: 13px; }
    tr { border-bottom: 1px solid #f0f0f0; }
    .footer { border-top: 1px dashed #aaa; padding-top: 14px; display: flex; justify-content: space-between; align-items: flex-end; margin-top: 10px; }
    .assinatura { text-align: center; }
    .assinatura-linha { border-top: 1px solid #555; width: 180px; margin: 0 auto 5px; }
    .assinatura-label { font-size: 11px; color: #555; }
    .nota { font-size: 10px; color: #999; text-align: right; max-width: 200px; line-height: 1.4; }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      @page { size: A5 landscape; margin: 10mm; }
    }
  </style>
</head>
<body>
  <div class="page">
    <div class="header">
      <div>
        <div class="church-name">${l.church?.name ?? 'Igreja'}</div>
        ${l.church?.address ? `<div class="church-sub">${l.church.address}</div>` : ''}
        ${l.church?.phone ? `<div class="church-sub">Tel: ${l.church.phone}</div>` : ''}
      </div>
      <div class="recibo-title">
        <h1>RECIBO</h1>
        <div class="numero">${recibo.numero}</div>
        <div class="numero">${fmtDate(recibo.emitido_em.slice(0, 10))}</div>
      </div>
    </div>

    <div class="valor-box">
      <div>
        <div class="valor-label">${isEntrada ? 'Recebemos de' : 'Pagamos a'}</div>
        <div style="font-size:15px;font-weight:700;margin-top:4px">${nomeContribuinte}</div>
      </div>
      <div style="text-align:right">
        <span class="tipo-badge">${isEntrada ? 'Entrada' : 'Saída'}</span>
        <div class="valor-num" style="margin-top:6px">${fmt(l.valor)}</div>
      </div>
    </div>

    <table>
      ${l.categoria ? `<tr><td>Categoria</td><td>${l.categoria.nome}</td></tr>` : ''}
      ${l.descricao ? `<tr><td>Descrição</td><td>${l.descricao}</td></tr>` : ''}
      ${l.referencia_culto ? `<tr><td>Referência / Culto</td><td>${l.referencia_culto}</td></tr>` : ''}
      ${forma ? `<tr><td>Forma de pagamento</td><td>${forma}</td></tr>` : ''}
      <tr><td>Data</td><td>${fmtDate(l.data_lancamento)}</td></tr>
      ${l.observacao ? `<tr><td>Observação</td><td>${l.observacao}</td></tr>` : ''}
      ${l.created_by_user ? `<tr><td>Lançado por</td><td>${l.created_by_user.name}</td></tr>` : ''}
    </table>

    <div class="footer">
      <div class="assinatura">
        <div class="assinatura-linha"></div>
        <div class="assinatura-label">Assinatura do Tesoureiro</div>
      </div>
      <div class="nota">
        Documento emitido eletronicamente pelo sistema de gestão da igreja.
        ${recibo.numero}
      </div>
    </div>
  </div>
</body>
</html>`
}

export default function ReciboModal({ recibo, onClose }: Props) {
  const l = recibo.lancamento
  const isEntrada = l.tipo === 'entrada'
  const nomeContribuinte = l.member?.name ?? l.member_nome_manual ?? ''
  const phone = l.member // phone do membro (via contatos — aqui não temos, usamos phone da church como fallback)
  const churchPhone = l.church?.phone ?? ''

  function handleImprimir() {
    const html = buildReciboHtml(recibo)
    const win = window.open('', '_blank', 'width=700,height=520')
    if (!win) return
    win.document.write(html)
    win.document.close()
    win.focus()
    setTimeout(() => { win.print() }, 400)
  }

  function handleWhatsApp() {
    const raw = churchPhone.replace(/\D/g, '')
    const phone = raw.startsWith('55') ? raw : '55' + raw

    const forma = formaPagLabel(l.forma_pagamento, l.parcelas)
    const lines = [
      `*Recibo ${recibo.numero}*`,
      `Igreja: ${l.church?.name ?? ''}`,
      ``,
      `${isEntrada ? 'Contribuição' : 'Pagamento'}: *${fmt(l.valor)}*`,
      nomeContribuinte ? `Contribuinte: ${nomeContribuinte}` : '',
      l.categoria ? `Categoria: ${l.categoria.nome}` : '',
      forma ? `Forma: ${forma}` : '',
      `Data: ${fmtDate(l.data_lancamento)}`,
      l.descricao ? `Descrição: ${l.descricao}` : '',
      l.referencia_culto ? `Ref.: ${l.referencia_culto}` : '',
    ].filter(Boolean).join('\n')

    const url = `https://wa.me/${phone}?text=${encodeURIComponent(lines)}`
    window.open(url, '_blank')
  }

  const hasPhone = !!churchPhone.replace(/\D/g, '')

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-sm overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <CheckCircle size={18} className="text-emerald-500" />
            <span className="text-sm font-bold text-gray-800">Lançamento registrado!</span>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
            <X size={16} />
          </button>
        </div>

        {/* Preview resumido */}
        <div className="px-5 py-4 border-b border-gray-100 bg-gray-50">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-500">Recibo</span>
            <span className="text-xs font-bold text-gray-700">{recibo.numero}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-700 truncate">
              {l.categoria?.nome ?? (isEntrada ? 'Entrada' : 'Saída')}
              {(l.member?.name || l.member_nome_manual) && (
                <span className="text-gray-400"> · {l.member?.name ?? l.member_nome_manual}</span>
              )}
            </span>
            <span className={`text-base font-black ml-3 flex-shrink-0 ${isEntrada ? 'text-emerald-600' : 'text-red-500'}`}>
              {isEntrada ? '+' : '-'}{fmt(l.valor)}
            </span>
          </div>
          {l.forma_pagamento && (
            <div className="mt-1 text-xs text-gray-400">
              {formaPagLabel(l.forma_pagamento, l.parcelas)}
            </div>
          )}
        </div>

        {/* Ações */}
        <div className="px-5 py-4 space-y-2">
          <p className="text-xs text-gray-500 mb-3 text-center">O que deseja fazer com o recibo?</p>

          <button
            onClick={handleImprimir}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all text-sm font-medium text-gray-700"
          >
            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
              <Printer size={15} className="text-blue-600" />
            </div>
            <div className="text-left">
              <div className="font-semibold text-gray-800">Imprimir / Salvar PDF</div>
              <div className="text-xs text-gray-400">Abre o recibo formatado para impressão</div>
            </div>
          </button>

          <button
            onClick={handleWhatsApp}
            disabled={!hasPhone}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-gray-200 hover:border-green-300 hover:bg-green-50 transition-all text-sm font-medium text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
              <MessageCircle size={15} className="text-green-600" />
            </div>
            <div className="text-left">
              <div className="font-semibold text-gray-800">Enviar pelo WhatsApp</div>
              <div className="text-xs text-gray-400">
                {hasPhone ? `Encaminhar para ${churchPhone}` : 'Telefone da filial não cadastrado'}
              </div>
            </div>
          </button>

          <button
            onClick={onClose}
            className="w-full px-4 py-2.5 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors"
          >
            Continuar sem recibo
          </button>
        </div>
      </div>
    </div>
  )
}
