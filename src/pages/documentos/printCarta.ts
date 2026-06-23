import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { openPrintWindow } from '../../lib/print'

export type TipoCarta = 'recomendacao' | 'mudanca'

// ── Templates editáveis ──────────────────────────────────────────────────────
// O texto usa variáveis no formato {chave} que são substituídas pelos dados da
// secretaria na hora de gerar. Para alterar o texto padrão, edite aqui — ou
// edite direto na tela de Cartas (a edição fica salva no navegador).

export const CARTA_TEMPLATES: Record<TipoCarta, { titulo: string; texto: string }> = {
  recomendacao: {
    titulo: 'CARTA DE RECOMENDAÇÃO',
    texto:
`Saudações em Cristo Jesus.

Temos a satisfação de apresentar à Igreja Evangélica Assembleia de Deus na cidade de {cidade} — {uf}, {nome}, que exerce a função de {funcao}, e que faz parte deste campo, encontrando-se em plena comunhão, servindo a Deus em nosso Templo Sede há tempos.

Portanto, recomendamos que seja {tratamento} no Senhor, como costumam fazer os santos.

Com os votos de elevada estima e consideração.

Fraternalmente,`,
  },
  mudanca: {
    titulo: 'CARTA DE MUDANÇA',
    texto:
`Saudações em Cristo Jesus.

Temos a satisfação de apresentar à {igreja}, ministério {ministerio}, o membro {nome}, que se encontra em plena comunhão, servindo a Deus em nosso Templo Sede há tempos.

Portanto, recomendamos que seja {tratamento} no Senhor, como costumam fazer os santos.

Com os votos de elevada estima e consideração.

Fraternalmente,`,
  },
}

// Variáveis disponíveis por tipo (para a legenda/chips na tela)
// Dados do membro (puxados da secretaria, iguais aos da credencial) + dados de destino.
const VARS_MEMBRO = [
  { token: '{nome}', desc: 'Nome do membro' },
  { token: '{funcao}', desc: 'Função / título' },
  { token: '{filiacao}', desc: 'Filiação (mãe e pai)' },
  { token: '{nascimento}', desc: 'Data de nascimento' },
  { token: '{cpf}', desc: 'CPF' },
  { token: '{igreja_membro}', desc: 'Igreja cadastrada do membro' },
  { token: '{tratamento}', desc: 'recebido / recebida' },
]

export const CARTA_VARIAVEIS: Record<TipoCarta, { token: string; desc: string }[]> = {
  recomendacao: [
    ...VARS_MEMBRO,
    { token: '{cidade}', desc: 'Cidade de destino' },
    { token: '{uf}', desc: 'UF de destino' },
  ],
  mudanca: [
    ...VARS_MEMBRO,
    { token: '{igreja}', desc: 'Igreja de destino' },
    { token: '{ministerio}', desc: 'Ministério de destino' },
  ],
}

// Substitui {chave} pelos valores. Chaves conhecidas (mesmo vazias) viram o
// valor; chaves desconhecidas permanecem como estão para sinalizar erro de digitação.
export function aplicarVariaveis(texto: string, vars: Record<string, string>): string {
  return texto.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m))
}

export interface CartaPrint {
  titulo: string
  nomeMembro: string       // usado no título da janela/aba
  corpoParagrafos: string[] // já com as variáveis substituídas
  data: string             // ISO yyyy-mm-dd (para "Piracanjuba, {data}.")
}

// Dados fixos da igreja (cabeçalho/rodapé)
const IGREJA = {
  nome: 'IGREJA EVANGÉLICA ASSEMBLEIA DE DEUS',
  ministerio: 'MINISTÉRIO MADUREIRA — CAMPO DE PIRACANJUBA',
  slogan: 'Lugar de Famílias Abençoadas',
  cnpj: '37.261.666/0001-03',
  pastor: 'Gilson Marcos Soares da Silva',
  endereco: 'Av. Noêmia Honorato, 161 — Setor Oeste, Piracanjuba — GO',
}

function dataPorExtenso(iso: string): string {
  const d = new Date(iso + 'T00:00:00')
  const s = format(d, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
  const partes = s.split(' ')
  if (partes[2]) partes[2] = partes[2][0].toUpperCase() + partes[2].slice(1) // capitaliza o mês
  return partes.join(' ')
}

export function printCarta(p: CartaPrint) {
  const origin = window.location.origin
  const { titulo, corpoParagrafos: paragrafos } = p
  const dataExt = dataPorExtenso(p.data)

  const paragrafosHtml = paragrafos.map((par, i) => {
    // 1º parágrafo (saudação) e "Fraternalmente," sem recuo; demais justificados com recuo
    const semRecuo = i === 0 || /^fraternalmente/i.test(par.trim())
    return `<p class="par${semRecuo ? ' sem-recuo' : ''}">${par}</p>`
  }).join('')

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8"/>
<title>${titulo} — ${p.nomeMembro}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  body{font-family:'Times New Roman',Georgia,serif;background:#e8e8e8;color:#1a1a1a}

  .page{
    position:relative;
    width:210mm;min-height:297mm;
    background:#fff;
    margin:0 auto;
    padding:22mm 24mm 20mm;
    display:flex;flex-direction:column;
    overflow:hidden;
  }

  /* Marca d'água central */
  .watermark{
    position:absolute;top:50%;left:50%;
    transform:translate(-50%,-50%);
    width:150mm;height:150mm;object-fit:contain;
    opacity:0.05;filter:grayscale(100%);
    pointer-events:none;z-index:0;
  }

  .content{position:relative;z-index:1;flex:1;display:flex;flex-direction:column}

  /* Cabeçalho timbrado */
  .cab{display:flex;align-items:center;gap:6mm;border-bottom:2px solid #1a3a6b;padding-bottom:5mm;margin-bottom:2mm}
  .cab img{height:24mm;width:auto;object-fit:contain;flex-shrink:0}
  .cab .txt{flex:1;text-align:center}
  .cab .nome{font-size:13pt;font-weight:bold;color:#1a3a6b;letter-spacing:.3pt;line-height:1.2}
  .cab .min{font-size:9.5pt;font-weight:bold;color:#333;margin-top:1mm}
  .cab .slogan{font-size:9pt;font-style:italic;color:#c9a84c;margin-top:1mm}
  .cab .meta{font-size:8pt;color:#555;margin-top:1.5mm;line-height:1.4}

  /* Corpo */
  .titulo{text-align:center;font-size:15pt;font-weight:bold;color:#1a3a6b;letter-spacing:1pt;text-transform:uppercase;margin:14mm 0 10mm}
  .titulo::after{content:"";display:block;width:36mm;height:.6mm;background:#c9a84c;margin:3mm auto 0}
  .par{font-size:12.5pt;line-height:1.9;text-align:justify;text-indent:12mm;margin-bottom:5mm}
  .par.sem-recuo{text-indent:0}

  .local-data{font-size:12.5pt;margin:6mm 0 18mm;text-align:left}

  /* Assinatura */
  .assinatura{text-align:center;margin-top:auto;position:relative}
  .assinatura .linha{width:80mm;margin:14mm auto 0;border-bottom:1px solid #1a1a1a}
  .assinatura .nome{font-size:11.5pt;font-weight:bold;color:#111;margin-top:1.5mm}
  .assinatura .cargo{font-size:10pt;color:#444}

  /* Rodapé */
  .rodape{position:relative;z-index:1;text-align:center;border-top:1.5px solid #1a3a6b;margin-top:10mm;padding-top:3mm;font-size:8.5pt;color:#555}

  .no-print{max-width:210mm;margin:0 auto 12px;display:flex;gap:8px}
  .no-print button{border:none;padding:7px 16px;border-radius:6px;cursor:pointer;font-size:12px}
  .no-print .imp{background:#1a3a6b;color:#fff}
  .no-print .fec{background:#f3f4f6;border:1px solid #d1d5db;color:#111}

  @media screen{.page{box-shadow:0 6px 24px rgba(0,0,0,.18);margin-top:8px;margin-bottom:24px}}
  @media print{
    body{background:#fff}
    .no-print{display:none!important}
    .page{box-shadow:none;margin:0}
    @page{size:A4 portrait;margin:0}
  }
</style>
</head>
<body>

<div class="no-print">
  <button class="imp" onclick="window.print()">🖨️ Imprimir</button>
  <button class="fec" onclick="window.close()">✕ Fechar</button>
</div>

<div class="page">
  <img class="watermark" src="${origin}/brand/logo.png" alt=""/>

  <div class="content">
    <!-- Cabeçalho -->
    <div class="cab">
      <img src="${origin}/brand/logo.png" alt="ADP" onerror="this.style.display='none'"/>
      <div class="txt">
        <div class="nome">${IGREJA.nome}</div>
        <div class="min">${IGREJA.ministerio}</div>
        <div class="slogan">${IGREJA.slogan}</div>
        <div class="meta">CNPJ: ${IGREJA.cnpj}<br/>Pastor Presidente: ${IGREJA.pastor}</div>
      </div>
    </div>

    <!-- Corpo -->
    <div class="titulo">${titulo}</div>
    ${paragrafosHtml}

    <div class="local-data">Piracanjuba, ${dataExt}.</div>

    <!-- Assinatura (espaço para assinatura física) -->
    <div class="assinatura">
      <div class="linha"></div>
      <div class="nome">Pr. ${IGREJA.pastor}</div>
      <div class="cargo">Presidente da AD Piracanjuba</div>
    </div>
  </div>

  <!-- Rodapé -->
  <div class="rodape">${IGREJA.endereco}</div>
</div>

</body>
</html>`

  openPrintWindow(html, `${titulo} — ${p.nomeMembro}`)
}
