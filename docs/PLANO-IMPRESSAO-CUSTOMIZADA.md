# Plano de impressão customizada — Carteirinhas + Certificados

> **Status:** ESBOÇO — aguardando dados completos do usuário
> **Gatilho:** quando o usuário disser **"vamos começar a impressão customizada"**
> **Criado em:** 2026-04-25

---

## 🎯 Objetivo

Tornar a impressão de carteirinhas e certificados **fiel ao modelo físico** que o usuário usa, permitindo:

- **Carteirinhas:** ajuste de medidas (mm) pra encaixar exato na folha de papel pré-cortada/cortável
- **Certificados:** arte de fundo upada pelo usuário (uma por seminário, com brasão/cabeçalho/cores conforme o tema), com texto sobreposto no layout definido

---

## 🪪 Parte 1 — Carteirinhas (medidas customizáveis)

### Estado atual
Hoje o sistema imprime **4 carteirinhas por A4** com layout fixo em `src/lib/print/printCarteirinha.ts` e `printCarteirinhasLote.ts`. As medidas estão **hardcoded em mm** dentro do CSS de print.

### O que precisa mudar
Transformar essas medidas em **variáveis configuráveis** na tela de Configurações (ou em uma tela específica `/configuracoes/impressao/carteirinha`).

### Variáveis a parametrizar
- `largura_carteirinha_mm`
- `altura_carteirinha_mm`
- `margem_topo_mm`
- `margem_esquerda_mm`
- `gap_horizontal_mm` (espaço entre 2 carteirinhas lado a lado)
- `gap_vertical_mm` (espaço entre 2 carteirinhas em linha)
- `qtd_por_pagina` (4? 6? 8?)
- `colunas` (2 normalmente)
- **Frente apenas** ou **frente + verso**? Se com verso → segundo conjunto de variáveis (ou usar mesmas medidas espelhadas)

### Onde armazenar as medidas
Tabela `print_settings` no Supabase:
```sql
create table print_settings (
  id uuid primary key default uuid_generate_v4(),
  church_group_id uuid not null references church_groups(id),
  type text not null check (type in ('carteirinha','certificado')),
  name text not null,           -- 'Padrão', 'Modelo Pimaco A4', etc
  is_default boolean default false,
  config jsonb not null,        -- { largura_mm: 85, altura_mm: 54, ... }
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

Permite múltiplos perfis: usuário escolhe qual usar antes de imprimir.

### Tela de configuração
- Lista de perfis cadastrados
- Botão "Novo perfil"
- Form com campos numéricos pras medidas (com preview visual ao lado)
- Botão "Imprimir página de teste" (1 página com todas as bordas marcadas pra você ver se bate com a folha)
- Botão "Definir como padrão"

### Fluxo de impressão
1. Usuário clica "Imprimir carteirinha"
2. Modal pergunta: "Qual perfil de impressão?" (com default selecionado)
3. Gera HTML usando as medidas do perfil
4. Abre janela de impressão

### Página de teste de calibração
Imprime um A4 com:
- Régua de mm nas bordas
- Retângulos exatos do tamanho das carteirinhas, nas posições configuradas
- Linhas de corte pontilhadas
- Texto "TESTE — Perfil X" em cada posição

Usuário imprime, sobrepõe na folha real, ajusta medidas até bater.

---

## 📜 Parte 2 — Certificados (arte upada por seminário)

### Estado atual
Hoje o certificado é gerado com HTML/CSS puro em `src/pages/certificados/printCertificado.ts`, com layout fixo. Sem imagem de fundo, só texto.

### O que precisa mudar
- Cada **seminário** pode ter uma **arte de fundo customizada** (PNG/JPG do certificado completo: bordas decorativas, brasão, fundo colorido, cabeçalho, etc)
- O sistema **escreve por cima** da arte: nome do aluno, nome do curso, data, carga horária, número, assinatura

### Onde armazenar a arte
**Supabase Storage**, bucket `certificate-templates`:
- Path: `church_group_id/seminario_id.png`
- Acesso público (URL imprevisível pelo seminario_id ser UUID)
- Limite de tamanho: 5 MB por imagem
- Formato: PNG ou JPG
- Resolução recomendada: A4 paisagem em 300 DPI (3508 × 2480 px) ou A4 retrato

Adicionar coluna em `seminarios`:
```sql
alter table seminarios
  add column certificate_template_url text,
  add column certificate_template_orientation text default 'landscape'
    check (certificate_template_orientation in ('landscape','portrait'));
```

### Posicionamento dos textos
Cada campo (nome, curso, data, etc) tem:
- `top` (% ou mm do topo)
- `left` (% ou mm da esquerda)
- `width` (largura do bloco)
- `font_size` (tamanho)
- `font_family` (Arial, serif, etc)
- `font_weight` (normal, bold)
- `color` (cor do texto)
- `text_align` (left, center, right)

### Estratégia de presets (recomendado)
Em vez de fazer o usuário ajustar cada coordenada (complexo), oferecer **3-4 templates de layout**:

1. **"Centralizado clássico"** — nome no centro, curso embaixo, data no rodapé
2. **"Esquerda formal"** — alinhado à esquerda com padding de 30mm
3. **"Com brasão grande"** — espaço pra logo grande na esquerda, texto na direita
4. **"Personalizado"** — usuário escolhe coordenada de cada campo (avançado)

Salvar template escolhido em `seminarios.certificate_layout` (jsonb).

### Fluxo de upload e configuração
**Na tela de edição do seminário** (`SeminarioModal`), nova aba/seção "Certificado":
1. Upload de imagem (drag & drop)
2. Preview da arte com texto fictício sobreposto ("Nome do Aluno")
3. Selector de orientação (paisagem/retrato — auto-detectado pela imagem)
4. Selector de layout (presets 1-4)
5. Botão "Visualizar exemplo" — gera certificado de teste com nome "EXEMPLO"

### Fluxo de impressão
1. Usuário clica "Gerar certificado" pra um aluno
2. Sistema busca:
   - Arte (`seminario.certificate_template_url`)
   - Layout (`seminario.certificate_layout`)
   - Dados do aluno (matricula + member)
3. Renderiza HTML:
   - `<img>` da arte como fundo absoluto
   - `<div>` posicionados absolutamente sobre a arte com os textos
4. Abre janela de impressão (igual ao atual)

### Lote
Geração em lote (`printCertificadosLote`) já existe — vai funcionar igual, só passando a arte de cada certificado.

---

## 🏗️ Componentes/arquivos a criar

### Carteirinhas
- `src/pages/secretaria/PrintConfigPage.tsx` — gerencia perfis de impressão
- `src/components/print/PrintProfileEditor.tsx` — form de medidas
- `src/components/print/CalibrationSheet.tsx` — gera página de teste
- `src/lib/api/printSettings.ts` — CRUD dos perfis
- Refatorar `src/lib/print/printCarteirinha.ts` pra aceitar `config` como parâmetro

### Certificados
- `src/components/certificates/CertificateTemplateUploader.tsx` — upload + preview
- `src/components/certificates/CertificateLayoutPicker.tsx` — escolha do preset
- `src/lib/api/storage.ts` — wrapper pro Supabase Storage
- Refatorar `src/pages/certificados/printCertificado.ts` pra usar arte + layout

### Banco
- Migration `004_print_settings.sql` (tabela de perfis de impressão)
- Migration `005_seminarios_certificate.sql` (colunas em seminarios + bucket storage)

---

## 📋 Dados que o usuário ainda precisa fornecer

### Pra carteirinhas:
- [ ] Tipo de folha que usa (A4 cortável, PVC, outro)
- [ ] Medidas exatas em **mm** de:
  - [ ] Largura e altura de cada carteirinha
  - [ ] Margens (topo, esquerda, direita, baixo)
  - [ ] Gaps (entre cards)
  - [ ] Quantas por página
- [ ] Frente apenas ou frente + verso?
- [ ] Print/foto/PDF do modelo de folha

### Pra certificados:
- [ ] Imagem de exemplo da arte que vai ser usada (mesmo um rascunho)
- [ ] Orientação preferida (paisagem ou retrato)
- [ ] Quais campos vão no certificado e onde aproximadamente:
  - Nome do aluno
  - Nome do seminário
  - Carga horária
  - Data de conclusão
  - Número do certificado
  - Local + data
  - Assinatura(s) — quantas?
- [ ] Tamanho máximo aceitável da imagem (vamos limitar a 5 MB)

---

## 🚀 Fases de implementação sugeridas

### Fase A — Carteirinhas (~3-4h)
- Migration `004_print_settings.sql`
- API `printSettings.ts`
- `PrintConfigPage` + editor
- `CalibrationSheet`
- Refator do `printCarteirinha`/`printCarteirinhasLote` pra aceitar config
- Modal de seleção de perfil antes de imprimir

### Fase B — Certificados (~4-6h)
- Migration `005_seminarios_certificate.sql`
- Bucket `certificate-templates` no Storage
- `CertificateTemplateUploader`
- `CertificateLayoutPicker` com 4 presets
- Refator do `printCertificado`/`printCertificadosLote`
- Aba "Certificado" no `SeminarioModal`

**Total estimado:** 7-10h.

---

## 🧠 Decisões já tomadas

| Pergunta | Resposta |
|---|---|
| Esboço primeiro, dados depois? | Sim — usuário vai entregar dados completos depois |
| Usar Supabase Storage pra arte? | Sim (recomendado) |
| Arte por seminário? | Sim |
| Posições fixas ou ajustáveis? | **Presets** (4 layouts) + opção "Personalizado" pra avançados |

---

## 📝 Histórico de execuções

> Será preenchido conforme cada fase for concluída.

- [ ] Fase A — Carteirinhas (medidas customizáveis)
- [ ] Fase B — Certificados (arte upada por seminário)
