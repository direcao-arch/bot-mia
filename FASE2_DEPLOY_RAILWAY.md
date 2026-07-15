# 🚀 FASE 2 — DEPLOY RAILWAY

**Status:** Ready to Deploy  
**Duração:** ~45 minutos  
**Objetivo:** Bot rodando 24/7 com URL pública

---

## 📋 O que Fazer

### **Opção A: Você tem GitHub (RECOMENDADO)**

**Tempo:** ~20 minutos  
**Resultado:** Deploy automático + atualizações fáceis

### **Opção B: Você não tem GitHub**

**Tempo:** ~30 minutos  
**Resultado:** Deploy manual (mais trabalhoso)

---

# 📌 OPÇÃO A: COM GITHUB (RECOMENDADO)

## Passo 1: Criar Repositório GitHub

1. **Acesse:** https://github.com/new
2. **Preencha:**
   - **Repository name:** `bot-mia` (ou qualquer nome)
   - **Description:** "Bot MIA - Ferramenta Lumen + OFC para vendas ópticas"
   - **Visibility:** Public (Railway precisa acessar)
   - **README:** Deixe desmarcado (vamos adicionar depois)
3. **Clique:** "Create repository"

---

## Passo 2: Fazer Upload dos Arquivos

Você tem 2 formas:

### **Forma 2A: Git CLI (mais elegante)**

```bash
# Na pasta bot-mia-local/
git init
git add .
git commit -m "Initial commit - Bot MIA v2"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/bot-mia.git
git push -u origin main
```

### **Forma 2B: GitHub Web (mais fácil)**

1. No repositório recém-criado, clique **"Add file" → "Upload files"**
2. Arraste ou selecione estes arquivos:
   ```
   ✅ bot-mia-servidor.js
   ✅ package.json
   ✅ .env.example
   ✅ .gitignore
   ✅ README.md
   ✅ README-DEPLOY.md
   ```
3. Deixe branch: **main**
4. Clique: **"Commit changes"**

✅ **Pronto!** Seu repo GitHub está pronto.

---

## Passo 3: Deploy no Railway

### **3.1 — Acesse Railway**

1. Vá para: https://railway.app
2. **Clique:** "Start New Project"
3. Escolha: **"Deploy from GitHub"**

### **3.2 — Conecte GitHub**

1. **Clique:** "Connect GitHub account"
2. Autorize Railway a acessar seus repos
3. Selecione: **bot-mia** (seu repositório)
4. **Clique:** "Deploy"

Railway vai:
- ✅ Detectar que é Node.js
- ✅ Instalar dependências (npm install)
- ✅ Fazer deploy automático
- ⏱️ Leva ~3-5 minutos

### **3.3 — Aguarde Deployment**

No painel Railway, você verá:
```
🟡 Building... (detectando Node.js, instalando packages)
  ↓
🟡 Deploying... (enviando para produção)
  ↓
🟢 Active! (Bot rodando!)
```

---

## Passo 4: Configurar Variáveis de Ambiente

Assim que o deploy ficar "Active":

1. **Railway Dashboard → Seu Projeto**
2. **Clique:** "Variables"
3. **Adicione:**
   ```
   CLAUDE_API_KEY = sk-ant-[sua chave aqui]
   ZAPI_INSTANCE = [seu número]
   ZAPI_TOKEN = [seu token]
   PORT = 3000
   NODE_ENV = production
   ```
4. **Clique:** "Save"

⚠️ **IMPORTANTE:** Depois de adicionar variáveis, Railway **faz redeploy automático**. Aguarde ~1 minuto até ficar "Active" de novo.

---

## Passo 5: Copiar URL Pública

1. **Railway Dashboard**
2. Procure por **"Domains"** ou **"Public URL"**
3. Copie algo tipo:
   ```
   https://bot-mia-xxxxx.railway.app
   ```

✅ **Essa é sua URL do bot!**

---

## Passo 6: Testar Bot Online

No terminal:
```bash
curl -X POST https://bot-mia-xxxxx.railway.app/test/objecao \
  -H "Content-Type: application/json" \
  -d '{"objecao": "Como faço boas-vindas?"}'
```

**Esperado:** MIA responde com Contato 1 ✅

---

# 📌 OPÇÃO B: SEM GITHUB (Manual)

Se você não quer usar GitHub, pode fazer upload direto no Railway.

## Passo 1: Railway App Direct

1. Acesse: https://railway.app
2. **"Start New Project"**
3. Selecione: **"Empty Project"** (ou **"Deploy from Repo"** → **"Public Repo"**)
4. Se for public repo, cole URL do bot-mia

## Passo 2: Configurar Node

1. **Railway → Seu Projeto**
2. **"Add Service"**
3. Escolha: **"GitHub"** ou suba arquivos manualmente
4. **Configure variáveis** (mesmo que Opção A)

⚠️ Essa opção é mais manual e menos elegante. **Recomendo Opção A.**

---

# 🔗 PASSO 7: CONFIGURAR WEBHOOK Z-API

Agora que seu bot está online, falta conectar Z-API.

## Passo 1: Copiar URL do Bot

```
https://seu-projeto-xxxxx.railway.app/webhook/zapi
```

## Passo 2: Ir para Z-API

1. Acesse: https://z-api.io (seu painel)
2. Escolha a **instância** que quer conectar
3. **Configurações → Webhooks** (ou similar, cada painel é diferente)

## Passo 3: Configurar Webhook

- **URL:** `https://seu-projeto-xxxxx.railway.app/webhook/zapi`
- **Eventos:** Marque `messages` ou `incoming-messages`
- **Teste:** Muitas plataformas oferecem "Testar Webhook"

✅ **Pronto!** Z-API agora envia mensagens para seu bot.

---

# 🧪 PASSO 8: TESTE COMPLETO (Fluxo Real)

Agora sim, teste o fluxo completo:

## Teste 1: Health Check

```bash
curl https://seu-projeto-xxxxx.railway.app/
```

**Esperado:**
```json
{
  "status": "🟢 Bot MIA (v2) rodando",
  "endpoints": { ... }
}
```

## Teste 2: Pelo Endpoint de Teste

```bash
curl -X POST https://seu-projeto-xxxxx.railway.app/test/objecao \
  -H "Content-Type: application/json" \
  -d '{"objecao": "Lead parou há 2 dias"}'
```

**Esperado:** MIA responde com Contato 3 ✅

## Teste 3: Pelo WhatsApp Real (Opcional)

Se Z-API estiver configurado:
1. Envie mensagem via WhatsApp (da instância Z-API)
2. Escreva: `"Como faço boas-vindas?"`
3. **Aguarde 3-5 segundos**
4. Bot deve responder automaticamente ✅

---

# ✅ CHECKLIST FASE 2

- [ ] GitHub repo criado (`bot-mia`)
- [ ] Arquivos upados (git ou web)
- [ ] Railway account criado (railway.app)
- [ ] Deploy "Active" (não "Building")
- [ ] Variáveis configuradas (CLAUDE_API_KEY, ZAPI_INSTANCE, ZAPI_TOKEN)
- [ ] URL pública copiada (https://bot-mia-xxxxx.railway.app)
- [ ] Health check testado ✅
- [ ] Z-API webhook configurado
- [ ] Teste pelo WhatsApp funcionando (opcional mas recomendado)

---

# 🎯 PRÓXIMA FASE: FASE 3

Assim que tudo passar:
1. ✅ Bot rodando 24/7
2. ✅ Z-API enviando mensagens
3. ✅ Testes passando

**FASE 3 = Pré-vendas**
- Ofereça beta para óticas
- Primeira venda possível em 48 horas

---

# 🚨 TROUBLESHOOTING

### Problema: Deploy fica "Building" para sempre
**Solução:** Clique em "Logs" e veja o erro. Provavelmente é variável de ambiente faltando.

### Problema: Curl retorna erro 404
**Solução:** Verifique a URL. Deve ser `https://bot-mia-xxxxx.railway.app` (sem /webhook/zapi no health check).

### Problema: Bot não responde no WhatsApp
**Solução:** 
1. Verifique se webhook Z-API está configurado correto
2. Confira se CLAUDE_API_KEY está válida no Railway
3. Veja logs do Railway para erros

### Problema: Railway cobra caro
**Solução:** Railway oferece R$ 5/mês de crédito grátis + tier gratuito. Bot MIA usa poucos recursos, fica bem barato (~R$ 5/mês).

---

# 💬 Você está pronto?

**SIM:**
→ Comece Passo 1 (Criar GitHub) agora!

**NÃO:**
→ Tire dúvidas primeiro antes de começar

---

**Tempo total estimado: 45 minutos de setup.**  
**Resultado: Bot online 24/7 recebendo vendas.**

Bora! 🚀
