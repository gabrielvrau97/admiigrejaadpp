# Plano de migração de membros (sistema antigo → Supabase)

> **Status:** Aguardando arquivo do sistema antigo
> **Gatilho:** quando o usuário disser **"vamos começar a migração de membros"**, o Dex executa este plano
> **Criado em:** 2026-04-25

---

## 🎯 Objetivo

Importar dados de membros de um sistema externo (provavelmente Excel/CSV) preservando **TUDO** do arquivo original — inclusive campos que o sistema atual não usa — pra consulta futura, sem precisar exibir no frontend.

## 🧱 Arquitetura — 2 camadas de armazenamento

### Camada 1 — `members_legacy_raw` (espelho cru do arquivo)
Tabela "estacionamento" onde cada linha do Excel/CSV vira uma linha. Guarda **todas** as colunas originais em JSONB. Nada se perde.

### Camada 2 — Tabelas existentes (`members`, `member_contacts`, etc)
Pra cada linha de `members_legacy_raw`, criamos registros nas tabelas reais que o frontend usa, mapeando só os campos que existem no modelo atual.

---

## 📦 Schema da tabela `members_legacy_raw`

```sql
create table members_legacy_raw (
  id uuid primary key default uuid_generate_v4(),
  member_id uuid references members(id) on delete set null,
  -- ↑ vincula ao membro real depois de migrado (null = ainda não migrou)

  source text,              -- ex: 'sistema_antigo_2026_04'
  source_file text,         -- nome do arquivo original
  source_row integer,       -- número da linha no arquivo
  imported_at timestamptz default now(),
  imported_by uuid references app_users(id),

  raw_data jsonb not null,  -- ← Excel inteiro convertido pra JSON

  status text default 'pendente'
    check (status in ('pendente','migrado','duplicado','ignorado','erro')),
  match_method text,        -- 'cpf', 'nome+nascimento', 'manual'
  notes text
);

create index idx_legacy_status on members_legacy_raw(status);
create index idx_legacy_member on members_legacy_raw(member_id);
create index idx_legacy_source on members_legacy_raw(source);
```

Isso vai virar `supabase/migrations/003_members_legacy_raw.sql` quando ativarmos o plano.

### Consultas úteis depois

```sql
-- Ver todos os campos extras de um membro específico
select raw_data
from members_legacy_raw
where member_id = '<uuid>';

-- Buscar quem tinha um campo X no sistema antigo
select member_id, raw_data->>'CarteiraSocial' as carteira
from members_legacy_raw
where raw_data ? 'CarteiraSocial';

-- Auditoria: quantas linhas vieram de cada arquivo
select source, count(*), count(member_id) as migrados
from members_legacy_raw
group by source;
```

---

## 🔄 Fluxo completo (10 etapas)

### 1. Receber arquivo
Usuário coloca em `imports/` (pasta criada e adicionada ao `.gitignore`).

### 2. Análise do arquivo (Dex)
Relatório com:
- Total de linhas e colunas
- Colunas que mapeiam direto pro nosso schema
- Colunas que precisam transformação (códigos numéricos, formatos de data)
- Colunas que ficam só no `legacy_raw` (sem equivalente no nosso modelo)
- Problemas detectados (CPF duplicado, datas inválidas, nomes vazios)

### 3. Decisões do usuário
Pra cada problema, o usuário define a ação:
- CPF duplicado → manter o mais recente / ignorar / criar separado?
- Sem CPF → importa mesmo / ignora?
- Sem nome → ignora?
- Estado civil em código (1/2/3) → mapeamento fornecido pelo usuário
- Endereço único → quebrar em address/number/neighborhood?

### 4. Criar script de importação
`scripts/import-legacy.mjs` (similar ao `smoke-test.mjs`):
1. Lê Excel/CSV (lib `xlsx` ou `csv-parse`)
2. Insere TUDO em `members_legacy_raw` primeiro
3. Tenta criar membro real em `members` (com vínculo via FK)
4. Atualiza `members_legacy_raw.member_id` apontando pro membro criado
5. Tudo dentro de transações pra rollback fácil

### 5. Dry-run (simulação sem inserir)
`node scripts/import-legacy.mjs --dry-run arquivo.xlsx`

Mostra:
- "1.180 membros novos seriam criados"
- "47 vinculados a existentes (match por CPF)"
- "20 linhas seriam puladas (motivo: ...)"

### 6. Backup do banco
Supabase Dashboard → **Database → Backups** → snapshot manual antes de rodar pra valer.

### 7. Rodar importação real
`node scripts/import-legacy.mjs arquivo.xlsx`

Em transação. Se der erro no meio, nada é commitado.

### 8. Validação pós-importação
Queries de auditoria:
```sql
select count(*) total, count(member_id) migrados,
       count(*) filter (where status='duplicado') dups,
       count(*) filter (where status='erro') erros
from members_legacy_raw where source='sistema_antigo_2026_04';

-- distribuição por igreja
select c.name, count(*)
from members m join churches c on c.id = m.church_id
where m.created_at > now() - interval '1 hour'
group by c.name;
```

### 9. Teste manual no sistema
Usuário abre o site, busca 5-10 membros conhecidos, confere campos.

### 10. Rollback (se necessário)
```sql
delete from members where id in (
  select member_id from members_legacy_raw where source = 'sistema_antigo_2026_04'
);
delete from members_legacy_raw where source = 'sistema_antigo_2026_04';
```

---

## 🧠 Decisões a tomar (precisa de input do usuário antes)

### A. Critério de duplicado
Em ordem de prioridade sugerida:
1. Mesmo CPF (mais confiável)
2. Mesmo nome + mesma data de nascimento
3. Mesmo nome + mesma igreja + telefone

**Default sugerido:** só CPF (estrito). Resto vira novo membro.

### B. Em duplicado, o que fazer com os dados
- (A) Ignora linha do Excel — mantém o que tem no banco
- (B) Sobrescreve com dados do Excel
- (C) **Mescla — só preenche campos que estavam vazios** ← recomendado

### C. Tipo de membro
Default: todos vão como `member_type='membro'`. Se o arquivo tiver coluna distinguindo (visitante, seminarista), mapear.

### D. Vínculo com igreja
- Se o arquivo NÃO tem coluna de igreja → todos pra Sede (`00000000-0000-0000-0000-000000000010`)
- Se TEM → mapeamento manual (usuário fornece "nome no Excel" → "igreja no banco")

### E. Status de auditoria
A trigger genérica `audit_trigger_func` vai logar TODAS as inserções em `activity_log`. Se a importação for grande (>500 membros), considerar:
- Desativar trigger temporariamente durante a importação
- Ou aceitar o volume no log (aumenta DB ~30%)

---

## 📋 Perguntas pendentes pro usuário

Antes de iniciar, o Dex precisa saber:
1. **Excel (.xlsx) ou CSV?**
2. **Tamanho aproximado** (100? 1.000? 5.000?)
3. **Tem coluna de igreja/filial?**
4. **Em duplicados, mesclar ou sobrescrever?** (recomendado: mesclar)
5. **Tem coluna de tipo (membro/visitante/seminarista)?**
6. **Foto:** o arquivo tem URL/caminho de foto? (se sim, decidir se vira `members_legacy_raw.raw_data.foto_path` ou se baixamos pro Supabase Storage)

---

## ⚠️ Confidencialidade

O arquivo vai conter CPFs, telefones, endereços de pessoas reais.

- ✅ Pasta `imports/` adicionada ao `.gitignore` (não vai pro GitHub)
- ✅ Nunca compartilhar por canais inseguros
- ✅ Após migração concluída, arquivar o original em local seguro ou deletar
- ✅ Backup do banco vai ficar no Supabase (criptografado pelo provider)

---

## 🚦 Como ativar este plano

Usuário diz: **"vamos começar a migração de membros"**

Dex então:
1. Lê este arquivo
2. Lê `memory/migration-plan.md` pra contexto da memória
3. Pede o arquivo se ainda não tiver sido entregue
4. Cria pasta `imports/` se não existir + adiciona ao `.gitignore`
5. Faz a análise (etapa 2)
6. Apresenta perguntas pendentes
7. Aguarda decisões do usuário
8. Executa as etapas 4-10

---

## 📝 Histórico de execuções

> Será preenchido conforme cada migração for concluída.

- [ ] **Migração inicial** — sistema antigo → ADP Piracanjuba — Sede
