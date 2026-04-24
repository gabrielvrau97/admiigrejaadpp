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

- [x] **1.1** Criar `<ErrorBoundary>` global em `src/components/ErrorBoundary.tsx` e envolver `<Outlet />` no `AppLayout`. Mostrar card "Algo deu errado" + botão "Voltar" + botão "Recarregar".
- [x] **1.2** Criar helper `openPrintWindow(html, title)` em `src/lib/print.ts` com checagem de pop-up bloqueado (toast/alert amigável). Substituir os 6 `window.open` espalhados.
- [x] **1.3** Adicionar `onError` nas `<img>`: esconde a tag ou mostra fallback texto. Locais: `Sidebar.tsx`, `MembrosPage.tsx` (3 prints), `printCarteirinha.ts`, `printCertificado.ts`.
- [x] **1.4** Criar `src/lib/format.ts` com `parseISODate(s)` e `fmtDate(s, pattern?)`. Substituir as 7 implementações duplicadas. Centraliza o bug de GMT-3.
- [x] Validar: type-check + build + testar fluxo de impressão + forçar erro em uma página pra ver ErrorBoundary

**Gatilho:** "vamos começar o Sprint 1"

---

### 🎨 Sprint 2 — UX consistente · ~3-4h

**Objetivo:** tirar os `alert/confirm` feios e dar um toast de feedback visual.

- [x] **2.1** Criar `<ConfirmDialog>` + hook `useConfirm()` em `src/components/ui/UIProvider.tsx`. API: `const confirm = useConfirm(); const ok = await confirm({ title, message, danger? })`.
- [x] **2.2** Criar `<Toaster>` + hook `useToast()` no mesmo `UIProvider.tsx`. Toasts auto-dismiss (4s) de success/error/warning/info. Provider no `App.tsx`.
- [x] **2.3** Substituir todos os `alert()` (15+) por `toast.warning/error/success`.
- [x] **2.4** Substituir todos os `confirm()` (12+) por `await confirm({...})`.
- [x] **2.5** Foco automático no primeiro input dos modais. Fechar com tecla `Esc`. Implementado via hook `useModalUX()` em `src/hooks/useModalUX.ts`.

**Gatilho:** "vamos começar o Sprint 2"

---

### ⚡ Sprint 3 — Performance e organização · ~4-5h

**Objetivo:** reduzir bundle inicial pela metade e quebrar o arquivão.

- [x] **3.1** `React.lazy()` + `<Suspense>` nas rotas: `GraficosPage`, `SeminariosPage`, `SeminarioDetailPage`, `CarteirinhasPage`, `CertificadosPage`, `ConfiguracoesPage`, `IgrejasPage`, `UsuariosPage`, `BackupPage`, `MeuPerfilPage`. Criado `<PageLoader />` genérico em `components/ui/PageLoader.tsx`. Rotas principais (Login, Dashboard, MembrosPage) ficam eager pra não ter loading no primeiro acesso.
- [x] **3.2** `MembrosPage.tsx` reduzido de **1.330 → 839 linhas** (-37%). Extrações feitas:
  - `pages/secretaria/membros-columns.ts` (`ColKey`, `ColDef`, `ALL_COLUMNS`, `DEFAULT_COLS`, `MAX_COLS`)
  - `pages/secretaria/ColConfigPanel.tsx` (modal separado)
  - `lib/print/membros/printMembrosList.ts` + `buildFilterSummary`
  - `lib/print/membros/printFichaFisica.ts`
  - `lib/print/membros/printMembroIndividual.ts`
  - **Não extraí** `MembrosTable`/`MembrosCards`/`useMembersFilter` porque exigiria passar 15+ props state (risco > benefício). Fica pra quando houver necessidade real.
- [x] **3.3** Funções de impressão do MembrosPage movidas pra `src/lib/print/membros/`. Já reutilizam o `openPrintWindow` do Sprint 1.
- [x] **3.4** `useMemo` nas tabelas de Seminário/Carteirinha/Certificado revisado. Os `counts` faziam 3-4 `.filter()` separados — agora passada única com loop. `SeminariosPage` ganhou `matCountByseminario` em `Map` (evita filter N² nos cards).
- [x] **3.5** Bundle final inicial: **699.88 KB / gzip 212 KB** (antes: 1256 KB / gzip 357 KB). **Redução de 44% em JS, 41% em gzip.** Meta batida.

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
- [x] **2026-04-24** — **Sprint 1 concluído.** ErrorBoundary global, `lib/print.ts` com fallback de pop-up, `onError` em todas as imagens, `lib/format.ts` centralizando `parseISODate`/`fmtDate`/`fmtDateLongo`/`getAge`/`fmtIdade`. Removidas 7 implementações duplicadas de `fmtDate`. Type-check e build limpos.
- [x] **2026-04-24** — **Sprint 2 concluído.** `UIProvider` com `useToast()` e `useConfirm()` centralizados. Toasts animados auto-dismiss em 4s (success/error/warning/info). ConfirmDialog com variante `danger`, `Esc` cancela e `Enter` confirma. Substituídos 15 `alert()` e 12 `confirm()` em 11 arquivos. Hook `useModalUX()` adiciona foco automático + fechar com Esc a 10 modais.
- [x] **2026-04-24** — **Sprint 3 concluído.** Lazy loading em 10 rotas, `PageLoader` genérico. Bundle inicial de 1256 KB → 699.88 KB (-44%). GraficosPage (Recharts, 441 KB) isolada em chunk próprio. `MembrosPage.tsx` reduzido de 1.330 → 839 linhas (-37%) com extração de `ColConfigPanel`, `membros-columns.ts` e 3 módulos de print em `lib/print/membros/`. Counts das tabelas otimizados pra passada única.
