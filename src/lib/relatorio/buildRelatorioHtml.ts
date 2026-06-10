export interface RelatorioInfo {
  titulo: string
  subtitulo?: string
  filtros?: string[]
  corpo: string
}

const LOGO_URL   = '/brand/logo.png'
const NOME_CURTO = 'Assembleia de Deus'
const NOME_CAMPO = 'Campo de Piracanjuba — GO'
const CNPJ       = '37.261.666/0001-03'
const PASTOR     = 'Pastor Presidente: Gilson Marcos S. da Silva'
const ENDERECO   = 'Av. Noêmia Honorato, nº 161 — Setor Oeste — Piracanjuba/GO'

function fmtDataHoje(): string {
  return new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
}
function fmtDataHoraAgora(): string {
  return new Date().toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export function buildRelatorioHtml(info: RelatorioInfo): string {
  const filtrosHtml = info.filtros && info.filtros.length > 0
    ? `<div class="filtros-bar">
        <span class="filtros-label">Filtros aplicados:</span>
        ${info.filtros.map(f => `<span class="filtro-pill">${f}</span>`).join('')}
       </div>`
    : ''

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8"/>
  <title>${info.titulo} — ${NOME_CURTO}</title>
  <style>
    /* ── Reset ────────────────────────────────────────── */
    *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }

    /* ── Base ─────────────────────────────────────────── */
    html { font-size: 9.5px; }
    body {
      font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
      color: #1c2b3a;
      background: #fff;
      line-height: 1.45;
    }

    /* ── Página: A4 portrait, margens internas via padding ── */
    .page {
      width: 210mm;
      min-height: 297mm;
      margin: 0 auto;
      padding: 10mm 12mm 0;
      display: flex;
      flex-direction: column;
    }

    /* ── Cabeçalho ────────────────────────────────────── */
    .cabecalho {
      display: flex;
      align-items: stretch;
      gap: 0;
      border: 1.5px solid #1c3d5c;
      border-radius: 4px;
      overflow: hidden;
      margin-bottom: 5px;
    }

    .cab-logo-col {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 10px 12px;
      border-right: 1px solid #d0dde8;
      background: #f8fafc;
      flex-shrink: 0;
    }
    .cab-logo {
      width: 48px;
      height: 48px;
      object-fit: contain;
    }

    .cab-info-col {
      flex: 1;
      padding: 10px 14px;
      display: flex;
      flex-direction: column;
      justify-content: center;
    }
    .cab-nome {
      font-size: 1.3rem;
      font-weight: 800;
      color: #1c3d5c;
      letter-spacing: 0.3px;
      line-height: 1.15;
    }
    .cab-campo {
      font-size: 0.95rem;
      font-weight: 600;
      color: #3a6a96;
      margin-top: 1px;
    }
    .cab-meta {
      font-size: 0.82rem;
      color: #5a7a96;
      margin-top: 5px;
      line-height: 1.6;
    }

    .cab-doc-col {
      border-left: 1px solid #d0dde8;
      padding: 10px 14px;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: flex-end;
      background: #f8fafc;
      min-width: 148px;
    }
    .cab-doc-tipo {
      font-size: 0.75rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1.2px;
      color: #8aabca;
    }
    .cab-doc-titulo {
      font-size: 1.25rem;
      font-weight: 900;
      color: #1c3d5c;
      text-align: right;
      line-height: 1.1;
      margin-top: 2px;
    }
    .cab-doc-sub {
      font-size: 0.8rem;
      color: #6a94b8;
      font-style: italic;
      margin-top: 2px;
      text-align: right;
    }
    .cab-doc-emissao {
      font-size: 0.75rem;
      color: #9ab4cc;
      margin-top: 6px;
      text-align: right;
      padding-top: 5px;
      border-top: 1px solid #e0eaf3;
    }

    /* ── Faixa de filtros ─────────────────────────────── */
    .filtros-bar {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 4px;
      padding: 4px 10px;
      background: #f4f8fc;
      border: 1px solid #d8e6f0;
      border-radius: 3px;
      font-size: 0.8rem;
      margin-bottom: 8px;
    }
    .filtros-label {
      font-weight: 700;
      color: #3a6a96;
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.4px;
      margin-right: 3px;
    }
    .filtro-pill {
      background: #fff;
      border: 1px solid #c2d8eb;
      border-radius: 10px;
      padding: 0 7px;
      color: #3a6a96;
      font-size: 0.78rem;
      line-height: 1.6;
    }

    /* ── Corpo ────────────────────────────────────────── */
    .corpo {
      flex: 1;
    }

    /* ── Tabelas ──────────────────────────────────────── */
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.88rem;
    }

    thead th {
      background: #1c3d5c;
      color: #e8f0f8;
      padding: 5px 8px;
      text-align: left;
      font-weight: 700;
      font-size: 0.78rem;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      border-bottom: 2px solid #0f2940;
    }
    thead th.right  { text-align: right; }
    thead th.center { text-align: center; }

    tbody tr { border-bottom: 1px solid #e8f0f7; }
    tbody tr:last-child { border-bottom: none; }
    tbody tr:nth-child(even) { background: #f7fafd; }

    tbody td {
      padding: 4px 8px;
      vertical-align: middle;
      font-size: 0.86rem;
      color: #2a3f52;
    }
    tbody td.right  { text-align: right; }
    tbody td.center { text-align: center; }
    tbody td.entrada { color: #14532d; font-weight: 600; }
    tbody td.saida   { color: #7f1d1d; font-weight: 600; }

    tfoot tr { border-top: 1.5px solid #1c3d5c; }
    tfoot td {
      padding: 5px 8px;
      font-weight: 800;
      font-size: 0.88rem;
      color: #1c3d5c;
      background: #eef4fa;
    }
    tfoot td.right { text-align: right; }

    /* ── Rodapé da página — visível em tela ──────────── */
    .rodape-tela {
      margin-top: auto;
      padding: 5px 0 8px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-top: 1px solid #c8daea;
      font-size: 0.78rem;
      color: #7a9ab8;
    }
    .rodape-nome { font-weight: 700; color: #3a6a96; }
    .rodape-pagina {
      font-weight: 700;
      color: #3a6a96;
    }

    /* ── Impressão ────────────────────────────────────── */
    @media print {
      html, body { background: #fff; }
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }

      @page {
        size: A4 portrait;
        margin: 10mm 12mm 18mm;

        @bottom-left {
          content: "${NOME_CURTO} — ${NOME_CAMPO}";
          font-family: Helvetica, Arial, sans-serif;
          font-size: 7.5pt;
          color: #7a9ab8;
          vertical-align: middle;
        }
        @bottom-center {
          content: "Emitido em ${fmtDataHoje()}";
          font-family: Helvetica, Arial, sans-serif;
          font-size: 7.5pt;
          color: #9ab0c8;
          vertical-align: middle;
        }
        @bottom-right {
          content: "Página " counter(page) " de " counter(pages);
          font-family: Helvetica, Arial, sans-serif;
          font-size: 7.5pt;
          font-weight: bold;
          color: #3a6a96;
          vertical-align: middle;
        }
      }

      /* remove margens do .page porque o @page já cuida */
      .page {
        width: 100%;
        padding: 0;
        min-height: auto;
      }

      /* esconde rodapé de tela — o @page renderiza o real */
      .rodape-tela { display: none; }

      /* evita quebra de linha dentro de uma linha de tabela */
      tbody tr { page-break-inside: avoid; }

      /* cabeçalho se repete em cada página impressa */
      thead { display: table-header-group; }
      tfoot { display: table-footer-group; }
    }
  </style>
</head>
<body>
<div class="page">

  <!-- CABEÇALHO -->
  <div class="cabecalho">
    <div class="cab-logo-col">
      <img class="cab-logo" src="${LOGO_URL}" alt="Logo" crossorigin="anonymous"/>
    </div>
    <div class="cab-info-col">
      <div class="cab-nome">${NOME_CURTO}</div>
      <div class="cab-campo">${NOME_CAMPO}</div>
      <div class="cab-meta">
        CNPJ ${CNPJ} &nbsp;·&nbsp; ${PASTOR}<br/>
        ${ENDERECO}
      </div>
    </div>
    <div class="cab-doc-col">
      <div class="cab-doc-tipo">Relatório</div>
      <div class="cab-doc-titulo">${info.titulo}</div>
      ${info.subtitulo ? `<div class="cab-doc-sub">${info.subtitulo}</div>` : ''}
      <div class="cab-doc-emissao">Emitido em ${fmtDataHoraAgora()}</div>
    </div>
  </div>

  <!-- FILTROS -->
  ${filtrosHtml}

  <!-- CORPO -->
  <div class="corpo">
    ${info.corpo}
  </div>

  <!-- RODAPÉ TELA (some na impressão) -->
  <div class="rodape-tela">
    <span class="rodape-nome">${NOME_CURTO} — ${NOME_CAMPO}</span>
    <span>${fmtDataHoje()}</span>
    <span class="rodape-pagina">Página 1</span>
  </div>

</div>
</body>
</html>`
}
