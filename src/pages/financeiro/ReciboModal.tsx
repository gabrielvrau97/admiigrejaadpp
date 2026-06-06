import React from 'react'
import { X, Printer, MessageCircle, CheckCircle } from 'lucide-react'
import type { FinReciboComLancamento } from '../../lib/api/fin_recibos'
import { useAuth } from '../../contexts/AuthContext'
import { ROLE_LABELS } from '../../lib/permissions'

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

const MESES = [
  'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro',
]

function fmtDateExtenso(s: string) {
  const [y, m, d] = s.slice(0, 10).split('-')
  return `${parseInt(d)} de ${MESES[parseInt(m) - 1]} de ${y}`
}

function formaPagLabel(f?: string, parcelas?: number) {
  if (!f) return ''
  if (f === 'dinheiro') return 'Dinheiro'
  if (f === 'pix') return 'Pix'
  if (f === 'cartao_debito') return 'Cartão de Débito'
  if (f === 'cartao_credito') return `Cartão de Crédito${parcelas && parcelas > 1 ? ` (${parcelas}x)` : ''}`
  return f
}

function fmtCpf(cpf?: string) {
  if (!cpf) return ''
  const d = cpf.replace(/\D/g, '')
  if (d.length === 11) return `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6,9)}-${d.slice(9)}`
  return cpf
}

function getMemberPhone(recibo: FinReciboComLancamento): string {
  const raw = recibo.lancamento.member?.contacts
  if (!raw) return ''
  // Supabase pode retornar objeto único ou array em joins 1-para-1
  const contacts = Array.isArray(raw) ? raw[0] : raw
  if (!contacts) return ''
  if (contacts.cellphone1) return contacts.cellphone1
  if (contacts.phones && contacts.phones.length > 0) return contacts.phones[0]
  return ''
}

function buildReciboHtml(
  recibo: FinReciboComLancamento,
  emitidoPorNome: string,
  emitidoPorEmail: string,
  emitidoPorRole: string,
): string {
  const l = recibo.lancamento
  const isEntrada = l.tipo === 'entrada'
  const nomeContribuinte = l.member?.name ?? l.member_nome_manual ?? '—'
  const cpfContribuinte = fmtCpf(l.member?.cpf)
  const forma = formaPagLabel(l.forma_pagamento, l.parcelas)
  const agora = new Date()
  const dataImpressao = `${String(agora.getDate()).padStart(2,'0')}/${String(agora.getMonth()+1).padStart(2,'0')}/${agora.getFullYear()} às ${String(agora.getHours()).padStart(2,'0')}:${String(agora.getMinutes()).padStart(2,'0')}`

  // Monta texto do motivo/descrição
  const descPartes: string[] = []
  if (l.categoria?.nome) descPartes.push(l.categoria.nome)
  if (l.referencia_culto) descPartes.push(l.referencia_culto)
  if (l.descricao) descPartes.push(l.descricao)
  const motivoTexto = descPartes.join(' — ') || (isEntrada ? 'contribuição voluntária' : 'pagamento')

  // Localidade da filial para linha de assinatura
  const churchAddress = l.church?.address ?? ''
  const cidadeMatch = churchAddress.match(/([A-Za-zÀ-ÿ\s]+)\/([A-Z]{2})/i)
  const localidade = cidadeMatch ? `${cidadeMatch[1].trim()}, ${cidadeMatch[2].toUpperCase()}` : ''

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8"/>
  <title>Recibo ${recibo.numero}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; font-size: 12px; color: #111; background: #fff; }
    .page {
      width: 148mm;
      min-height: 100mm;
      margin: 0 auto;
      padding: 12mm 14mm 10mm;
    }
    .org-name { font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: .5px; }
    .org-info { font-size: 10px; color: #444; margin-top: 2px; line-height: 1.5; }
    .titulo {
      text-align: center;
      font-size: 13px;
      font-weight: 800;
      letter-spacing: 1.5px;
      text-transform: uppercase;
      margin: 10px 0 8px;
      padding: 5px 0;
      border-top: 1.5px solid #111;
      border-bottom: 1.5px solid #111;
    }
    .corpo {
      font-size: 12px;
      line-height: 1.8;
      margin-bottom: 12px;
      text-align: justify;
    }
    .destaque { font-weight: 700; }
    .localidade {
      font-size: 11px;
      margin-bottom: 18px;
      color: #333;
    }
    .assinaturas {
      display: flex;
      justify-content: space-between;
      gap: 24px;
      margin-top: 8px;
    }
    .ass-bloco {
      flex: 1;
      text-align: center;
    }
    .ass-linha {
      border-top: 1px solid #555;
      margin-bottom: 4px;
    }
    .ass-nome { font-size: 11px; font-weight: 700; text-transform: uppercase; }
    .ass-cargo { font-size: 10px; color: #555; }
    .rodape {
      margin-top: 14px;
      padding-top: 6px;
      border-top: 1px dashed #aaa;
      font-size: 9px;
      color: #888;
      line-height: 1.4;
    }
    .numero-badge {
      float: right;
      font-size: 10px;
      font-weight: 700;
      color: #444;
      border: 1px solid #ccc;
      padding: 2px 7px;
      border-radius: 4px;
    }
    @media print {
      html, body { width: 148mm; }
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      @page { size: A5; margin: 0; }
    }
  </style>
</head>
<body>
<div class="page">
  <div style="display:flex;justify-content:space-between;align-items:flex-start;">
    <div>
      <div class="org-name">${l.church?.name ?? 'Igreja'}</div>
      ${l.church?.address ? `<div class="org-info">${l.church.address}</div>` : ''}
      ${l.church?.phone ? `<div class="org-info">Tel: ${l.church.phone}</div>` : ''}
    </div>
    <span class="numero-badge">${recibo.numero}</span>
  </div>

  <div class="titulo">RECIBO DE ${isEntrada ? 'CONTRIBUIÇÃO' : 'PAGAMENTO'}</div>

  <div class="corpo">
    ${isEntrada ? 'Recebemos de' : 'Pagamos a'} <span class="destaque">${nomeContribuinte}</span>${cpfContribuinte ? `, CPF nº <span class="destaque">${cpfContribuinte}</span>,` : ','} o valor de <span class="destaque">${fmt(l.valor)}</span>, referente a${isEntrada ? ' contribuição voluntária' : ''}${motivoTexto ? `: <span class="destaque">${motivoTexto}</span>` : ''}, realizada em <span class="destaque">${fmtDate(l.data_lancamento)}</span>.${forma ? ` Forma de pagamento: ${forma}.` : ''}${l.observacao ? ` ${l.observacao}.` : ''}
  </div>

  ${localidade ? `<div class="localidade">${localidade}, ${fmtDateExtenso(l.data_lancamento)}.</div>` : `<div class="localidade">${fmtDateExtenso(l.data_lancamento)}.</div>`}

  <div class="assinaturas">
    <div class="ass-bloco">
      <div class="ass-linha"></div>
      <div class="ass-nome">${l.created_by_user?.name ?? ''}</div>
      <div class="ass-cargo">Tesoureiro(a)</div>
    </div>
    <div class="ass-bloco">
      <div class="ass-linha"></div>
      <div class="ass-nome">${nomeContribuinte}</div>
      <div class="ass-cargo">&nbsp;</div>
    </div>
  </div>

  <div class="rodape">
    Impresso em ${dataImpressao} por ${emitidoPorEmail} (${emitidoPorRole})
  </div>
</div>
</body>
</html>`
}

export default function ReciboModal({ recibo, onClose }: Props) {
  const { user } = useAuth()
  const l = recibo.lancamento
  const isEntrada = l.tipo === 'entrada'
  const nomeContribuinte = l.member?.name ?? l.member_nome_manual ?? ''

  // Telefone: primeiro tenta o do membro, depois da filial como fallback
  const memberPhone = getMemberPhone(recibo)
  const whatsPhone = memberPhone || l.church?.phone || ''
  const hasPhone = !!whatsPhone.replace(/\D/g, '')

  const emitidoPorNome = user?.name ?? ''
  const emitidoPorEmail = user?.email ?? ''
  const emitidoPorRole = user?.role ? (ROLE_LABELS[user.role] ?? user.role) : ''

  function handleImprimir() {
    const html = buildReciboHtml(recibo, emitidoPorNome, emitidoPorEmail, emitidoPorRole)
    const win = window.open('', '_blank', 'width=640,height=520')
    if (!win) return
    win.document.write(html)
    win.document.close()
    win.focus()
    setTimeout(() => { win.print() }, 400)
  }

  function handleWhatsApp() {
    const raw = whatsPhone.replace(/\D/g, '')
    const phone = raw.startsWith('55') ? raw : '55' + raw

    const forma = formaPagLabel(l.forma_pagamento, l.parcelas)
    const cpf = fmtCpf(l.member?.cpf)
    const lines = [
      `*Recibo ${recibo.numero}*`,
      `${l.church?.name ?? ''}`,
      ``,
      `${isEntrada ? 'Contribuição' : 'Pagamento'}: *${fmt(l.valor)}*`,
      nomeContribuinte ? `Contribuinte: ${nomeContribuinte}` : '',
      cpf ? `CPF: ${cpf}` : '',
      l.categoria ? `Categoria: ${l.categoria.nome}` : '',
      forma ? `Forma: ${forma}` : '',
      `Data: ${fmtDate(l.data_lancamento)}`,
      l.descricao ? `Descrição: ${l.descricao}` : '',
      l.referencia_culto ? `Ref.: ${l.referencia_culto}` : '',
    ].filter(Boolean).join('\n')

    const url = `https://wa.me/${phone}?text=${encodeURIComponent(lines)}`
    window.open(url, '_blank')
  }

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
              <div className="text-xs text-gray-400">Abre o recibo formatado (meia folha A4)</div>
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
                {hasPhone
                  ? `Encaminhar para ${memberPhone ? `${nomeContribuinte} (${whatsPhone})` : whatsPhone}`
                  : 'Telefone do contribuinte não cadastrado'}
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
