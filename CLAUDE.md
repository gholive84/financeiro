# Instruções para o Claude Code

## Fluxo obrigatório após cada alteração

Sempre que finalizar qualquer alteração de código, executar na ordem:

1. **Build do frontend**
   ```bash
   cd /home/user/financeiro/frontend && npm run build
   ```

2. **Commit de tudo** (código-fonte + build gerado em `public/`)
   ```bash
   git add -A
   git commit -m "mensagem descritiva"
   ```

3. **Push para o master**
   ```bash
   git push origin master
   ```

## Branch de produção

- Branch principal/produção: `master`
- Todo trabalho deve ser commitado e enviado para `master`
