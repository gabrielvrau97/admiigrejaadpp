# Imports — arquivos do sistema antigo

Esta pasta guarda arquivos `.xlsx` / `.csv` com dados de membros pra serem importados.

## ⚠️ Confidencialidade

Tudo que está aqui (exceto este README e `.gitkeep`) está no `.gitignore` e **NUNCA vai pro GitHub**.
- Os arquivos contêm CPF, telefone, endereço de pessoas reais
- Após a importação concluída, considere arquivar ou deletar o arquivo original
- Nunca compartilhe esses arquivos por canais inseguros (email, Slack público, etc)

## Como usar

1. Coloque o arquivo aqui (ex: `imports/membros-sistema-antigo-2026.xlsx`)
2. No terminal: `node scripts/import-legacy.mjs --dry-run imports/seu-arquivo.xlsx`
3. Revise o relatório
4. Quando confirmado: `node scripts/import-legacy.mjs imports/seu-arquivo.xlsx`

Plano completo: [docs/PLANO-MIGRACAO-MEMBROS.md](../docs/PLANO-MIGRACAO-MEMBROS.md)
