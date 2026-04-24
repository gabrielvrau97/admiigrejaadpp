# Plano técnico de melhorias — Site ADM ADP

> Documento gerado a partir da auditoria técnica de 2026-04-23.
> Quando o usuário disser **"vamos começar o Sprint N"**, o Dex executa o bloco correspondente.

## Panorama inicial
- 43 arquivos, ~9.450 linhas TSX/TS
- Stack moderna: React 19, Vite 8, TypeScript 6, Tailwind v4
- Zero crashes conhecidos, zero `any` crítico, zero `@ts-ignore`, zero `dangerouslySetInnerHTML`
- Build limpo, type-check limpo

A base está saudável. Os pontos abaixo são melhorias incrementais, não bugs críticos.

---

## 🚨 Problemas identificados (por prioridade)

### 🔴 Alta — previne crashes e trava da UI

1. **Sem ErrorBoundary global** — erro em qualquer página deixa a app em tela branca
2. **`window.open('', '_blank')` sem fallback** — pop-up bloqueado faz parecer bug (6 lugares)
3. **Imagens sem `onError`** — logo quebrado mostra ícone feio
4. **Perda de dados ao recarregar** — todo estado em memória; quando Supabase entrar resolve

### 🟡 Média — UX e manutenibilidade

5. **`alert()` e `confirm()` nativos em 15+ lugares** — feios, travam a aba, em inglês no mobile
6. **`MembrosPage.tsx` com 1.330 linhas** — precisa ser quebrado em subcomponentes
7. **Bundle sem code-splitting (1.25 MB)** — tudo carrega de uma vez
8. **Filtros sem `useMemo` em alguns pontos** — pode engasgar com 500+ membros
9. **Parse de data inconsistente** — `new Date('YYYY-MM-DD')` sem `T00:00:00` puxa 1 dia em GMT-3
10. **Sem validação de formulário** — zod/react-hook-form instalados mas não usados
11. **Função `fmtDate` duplicada em 7 arquivos**

### 🟢 Baixa — polimento

12. **`member as any` no VisitanteModal** (linha 110-111)
13. **Sem skeleton/loading states** — problema só quando Supabase entrar
14. **Sem testes automáticos**
15. **Acessibilidade básica** — falta `aria-label`, `role="dialog"`, foco automático
16. **Sem PWA** — bom futuro ter, mas só depois do banco

---

## 📅 Sprints planejados

### 🏗️ Sprint 1 — Robustez (evita crash/tela branca) · ~2-3h

**Objetivo:** eliminar 90% dos riscos de tela branca e bugs silenciosos.

- [ ] **1.1** Criar `<ErrorBoundary>` global em `src/components/ErrorBoundary.tsx` e envolver `<Outlet />` no `AppLayout`. Mostrar card "Algo deu errado" + botão "Voltar" + botão "Recarregar".
- [ ] **1.2** Criar helper `openPrintWindow(html, title)` em `src/lib/print.ts` com checagem de pop-up bloqueado (toast/alert amigável). Substituir os 6 `window.open` espalhados.
- [ ] **1.3** Adicionar `onError` nas `<img>`: esconde a tag ou mostra fallback texto. Locais: `Sidebar.tsx`, `MembrosPage.tsx` (3 prints), `printCarteirinha.ts`, `printCertificado.ts`.
- [ ] **1.4** Criar `src/lib/format.ts` com `parseISODate(s)` e `fmtDate(s, pattern?)`. Substituir as 7 implementações duplicadas. Centraliza o bug de GMT-3.
- [ ] Validar: type-check + build + testar fluxo de impressão + forçar erro em uma página pra ver ErrorBoundary

**Gatilho:** "vamos começar o Sprint 1"

---

### 🎨 Sprint 2 — UX consistente · ~3-4h

**Objetivo:** tirar os `alert/confirm` feios e dar um toast de feedback visual.

- [ ] **2.1** Criar `<ConfirmDialog>` + hook `useConfirm()` em `src/components/ui/ConfirmDialog.tsx`. API: `const confirm = useConfirm(); const ok = await confirm({ title, message, danger? })`.
- [ ] **2.2** Criar `<Toaster>` + hook `useToast()` em `src/components/ui/Toast.tsx`. Toasts auto-dismiss de sucesso/erro/warning. Provider no `App.tsx`.
- [ ] **2.3** Substituir todos os `alert()` (15+) por `toast.error/success`.
- [ ] **2.4** Substituir todos os `confirm()` (12+) por `await confirm({...})`.
- [ ] **2.5** Foco automático no primeiro input dos modais. Fechar com tecla `Esc`.

**Gatilho:** "vamos começar o Sprint 2"

---

### ⚡ Sprint 3 — Performance e organização · ~4-5h

**Objetivo:** reduzir bundle inicial pela metade e quebrar o arquivão.

- [ ] **3.1** `React.lazy()` + `<Suspense>` nas rotas: `GraficosPage`, `SeminariosPage`, `SeminarioDetailPage`, `CarteirinhasPage`, `CertificadosPage`. Criar `<PageLoader />` genérico.
- [ ] **3.2** Quebrar `MembrosPage.tsx` (1.330 linhas) em:
  - `pages/secretaria/membros/MembrosPage.tsx` (orquestrador)
  - `MembrosToolbar.tsx`, `MembrosTable.tsx`, `MembrosCards.tsx`, `ColConfigPanel.tsx`
  - `hooks/useMembersFilter.ts`
  - `lib/print/printMembrosList.ts`, `printMembroIndividual.ts`, `printFichaFisica.ts`
- [ ] **3.3** Mover funções de impressão pra `src/lib/print/` (consolidar com `openPrintWindow` do Sprint 1).
- [ ] **3.4** Revisar `useMemo`/`useCallback` nas tabelas de Seminário/Carteirinha/Certificado.
- [ ] **3.5** Validar bundle size com `npm run build` — meta: inicial < 700 KB.

**Gatilho:** "vamos começar o Sprint 3"

---

### ✅ Sprint 4 — Qualidade de código · ~4-6h

**Objetivo:** preparar o terreno pro Supabase e pegar dívida de qualidade.

- [ ] **4.1** Criar schemas zod: `Member`, `Seminario`, `Matricula`, `Carteirinha`, `Certificado` em `src/schemas/`. Migrar `TabPerfil`, `TabContatos`, `SeminarioModal`, `MatriculaModal`, `CarteirinhaGerarModal` pra `react-hook-form` + `zodResolver`.
- [ ] **4.2** Adicionar Vitest + @testing-library/react. Testes unitários das funções puras: `applySelectionFilters`, `applySimilarityFilters`, `validateCPF`, cálculo de validade de carteirinha, geração de numeração sequencial.
- [ ] **4.3** Skeletons de loading em `components/ui/Skeleton.tsx`. Aplicar nas tabelas de Membros, Seminários, Carteirinhas, Certificados (preparando pro Supabase).
- [ ] **4.4** Auditoria `@axe-core/react` em dev. Corrigir críticos: `aria-label` em botões-ícone, `role="dialog"`, foco automático (Sprint 2 já iniciou), contraste onde falhar.
- [ ] **4.5** Remover `member as any` no `VisitanteModal` (adicionar `notes?: string` no tipo ou criar interface separada).

**Gatilho:** "vamos começar o Sprint 4"

---

## 🔮 Backlog (depois dos sprints)

- Integração Supabase real (aguardando URL + Anon Key do usuário)
- Persistência do ConfigContext no banco
- Páginas `/controle/acessos` e `/controle/configuracoes`
- PWA com vite-plugin-pwa (só depois de banco real)
- Offline mode com IndexedDB
- Dark mode
- i18n (o botão PT/EN na Topbar hoje é decorativo)

---

## 📝 Histórico de execução

<!-- O Dex registra aqui quando cada sprint for concluído -->

- [x] **2026-04-23** — Auditoria técnica inicial realizada. Plano criado.
