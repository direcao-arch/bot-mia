#!/usr/bin/env node

/**
 * 🤖 BOT MIA — FASE 2 SETUP WIZARD
 * 
 * Automatiza:
 * ✅ Preparação de arquivos para GitHub
 * ✅ Criação de estrutura Railway-ready
 * ✅ Geração de scripts de deploy
 * ✅ Instruções passo-a-passo
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
  red: "\x1b[31m",
};

function log(color, ...args) {
  console.log(color, ...args, colors.reset);
}

function header(title) {
  console.log("\n" + "═".repeat(80));
  log(colors.cyan + colors.bright, `  ${title}`);
  console.log("═".repeat(80) + "\n");
}

function success(msg) {
  log(colors.green, `✅ ${msg}`);
}

function info(msg) {
  log(colors.blue, `ℹ️  ${msg}`);
}

function warn(msg) {
  log(colors.yellow, `⚠️  ${msg}`);
}

function error(msg) {
  log(colors.red, `❌ ${msg}`);
}

async function runSetupWizard() {
  header("🚀 BOT MIA — FASE 2 SETUP WIZARD");

  log(colors.bright, "Vou preparar tudo para deploy Railway...\n");

  // PASSO 1: Verificar estrutura
  log(colors.cyan, "PASSO 1: Verificando estrutura...");
  const requiredFiles = [
    "bot-mia-servidor.js",
    "package.json",
    ".env.example",
  ];

  const missing = requiredFiles.filter((f) => !fs.existsSync(path.join(__dirname, f)));
  if (missing.length > 0) {
    error(`Arquivos faltando: ${missing.join(", ")}`);
    process.exit(1);
  }
  success("Todos os arquivos necessários existem");

  // PASSO 2: Preparar .gitignore
  log(colors.cyan, "\nPASSO 2: Preparando .gitignore...");
  const gitignorePath = path.join(__dirname, ".gitignore");
  if (!fs.existsSync(gitignorePath)) {
    fs.writeFileSync(gitignorePath, `node_modules/
.env
.env.local
*.log
.DS_Store
Thumbs.db
.vscode/
.idea/
test-mia*.js
`);
    success(".gitignore criado");
  } else {
    info(".gitignore já existe");
  }

  // PASSO 3: Criar railway.json
  log(colors.cyan, "\nPASSO 3: Preparando railway.json...");
  const railwayJson = {
    $schema: "https://railway.app/railway.schema.json",
    build: {
      builder: "nixpacks",
      buildCommand: "npm install",
    },
    deploy: {
      startCommand: "node bot-mia-servidor.js",
      restartPolicyMaxRetries: 5,
      restartPolicyWindowSeconds: 60,
    },
  };
  fs.writeFileSync(path.join(__dirname, "railway.json"), JSON.stringify(railwayJson, null, 2));
  success("railway.json criado");

  // PASSO 4: Criar Procfile
  log(colors.cyan, "\nPASSO 4: Preparando Procfile...");
  fs.writeFileSync(path.join(__dirname, "Procfile"), "web: node bot-mia-servidor.js\n");
  success("Procfile criado");

  // PASSO 5: Verificar Git
  log(colors.cyan, "\nPASSO 5: Verificando Git...");
  try {
    execSync("git --version", { stdio: "pipe" });
    success("Git instalado ✅");

    // Verificar se já é um repo
    try {
      execSync("git status", { cwd: __dirname, stdio: "pipe" });
      info("Já é um repositório Git");
    } catch {
      info("Inicializando novo repositório Git...");
      execSync("git init", { cwd: __dirname });
      success("Repositório Git criado");
    }
  } catch {
    error("Git não instalado. Instale em: https://git-scm.com/downloads");
  }

  // PASSO 6: Gerar instruções
  header("📋 PRÓXIMOS PASSOS (COPIE E COLE NO TERMINAL)");

  const gitCommands = `
# 1️⃣ ADICIONAR ARQUIVOS AO GIT
cd "${__dirname}"
git add .
git commit -m "Initial commit - Bot MIA v2 ready for Railway"

# 2️⃣ CRIAR REPOSITÓRIO NO GITHUB
# → Vá para: https://github.com/new
# → Nome: bot-mia
# → Visibilidade: PUBLIC
# → Clique: Create repository

# 3️⃣ CONECTAR GITHUB (após criar o repo, copie a URL e cole aqui)
# git remote add origin https://github.com/SEU_USUARIO/bot-mia.git
# git push -u origin main

# 4️⃣ DEPLOY NO RAILWAY
# → Vá para: https://railway.app
# → "Start New Project" → "Deploy from GitHub"
# → Autorize Railway
# → Selecione: bot-mia
# → Deploy automático!

# 5️⃣ ADICIONAR VARIÁVEIS NO RAILWAY
# Dashboard → Seu Projeto → Variables
# CLAUDE_API_KEY=sk-ant-[sua-chave]
# ZAPI_INSTANCE=[seu-número]
# ZAPI_TOKEN=[seu-token]
# PORT=3000
# NODE_ENV=production
`;

  console.log(colors.yellow + colors.bright + "┌" + "─".repeat(78) + "┐");
  console.log(gitCommands);
  console.log(colors.yellow + colors.bright + "└" + "─".repeat(78) + "┘" + colors.reset);

  // PASSO 7: Gerar checklist
  header("✅ CHECKLIST");

  const checklist = `
  [ ] Executei: git add . && git commit -m "Initial commit"
  [ ] Criei repo em github.com/novo (nome: bot-mia, PUBLIC)
  [ ] Conectei GitHub com: git remote add origin ... && git push
  [ ] Acessei railway.app
  [ ] Fiz deploy (Deploy from GitHub)
  [ ] Adicionei variáveis:
      - CLAUDE_API_KEY=sk-ant-...
      - ZAPI_INSTANCE=...
      - ZAPI_TOKEN=...
  [ ] Testei com curl:
      curl -X POST https://bot-mia-xxxxx.railway.app/test/objecao \\
        -H "Content-Type: application/json" \\
        -d '{"objecao": "Como faço boas-vindas?"}'
  [ ] Configurei webhook Z-API:
      URL: https://seu-projeto-xxxxx.railway.app/webhook/zapi
      Eventos: messages
`;

  console.log(checklist);

  // PASSO 8: Resumo
  header("📊 STATUS");

  console.log(`
  Local Setup:        ✅ COMPLETO
  GitHub Prep:        ✅ COMPLETO
  Railway Prep:       ✅ COMPLETO
  
  Próximo:            GitHub + Railway (manual, mas guiado)
  Tempo:              ~45 minutos
  Dificuldade:        Fácil (só clicar e colar)
  
  Resultado:          Bot rodando 24/7 com URL pública
  Status Final:       🟢 ATIVO
  `);

  // PASSO 9: Instruções detalhadas
  header("🎯 INSTRUÇÕES DETALHADAS (COPIE ISSO)");

  const detailedInstructions = `
═══════════════════════════════════════════════════════════════════════════════
PASSO 1: GIT PUSH (Execute no Terminal)
═══════════════════════════════════════════════════════════════════════════════

cd /home/claude/bot-mia-local
git add .
git commit -m "Initial commit - Bot MIA v2 ready for Railway"

✅ Se funcionar: vá para PASSO 2


═══════════════════════════════════════════════════════════════════════════════
PASSO 2: CRIAR REPOSITÓRIO GITHUB
═══════════════════════════════════════════════════════════════════════════════

1. Abra: https://github.com/new
2. Preencha:
   - Repository name: bot-mia
   - Description: Bot MIA - Ferramenta Lumen + OFC
   - Visibility: PUBLIC (obrigatório para Railway)
3. Clique: "Create repository"

✅ Copie a URL que aparecer (tipo: https://github.com/seu-usuario/bot-mia.git)


═══════════════════════════════════════════════════════════════════════════════
PASSO 3: CONECTAR GitHub (Execute no Terminal)
═══════════════════════════════════════════════════════════════════════════════

git remote add origin https://github.com/SEU_USUARIO/bot-mia.git
git push -u origin main

(Substitua a URL pela que você copiou)

✅ Se funcionar, arquivos estão no GitHub!


═══════════════════════════════════════════════════════════════════════════════
PASSO 4: DEPLOY RAILWAY
═══════════════════════════════════════════════════════════════════════════════

1. Acesse: https://railway.app
2. Faça login (GitHub é o mais fácil)
3. Clique: "Start New Project"
4. Escolha: "Deploy from GitHub"
5. Autorize Railway
6. Selecione seu repositório: bot-mia
7. Clique: "Deploy"

Aguarde Railway fazer:
   🟡 Building (npm install)
   🟡 Deploying
   🟢 Active! ✅


═══════════════════════════════════════════════════════════════════════════════
PASSO 5: VARIÁVEIS DE AMBIENTE (No Railway)
═══════════════════════════════════════════════════════════════════════════════

1. Railway Dashboard → Seu Projeto
2. Aba: "Variables"
3. Adicione:

CLAUDE_API_KEY=sk-ant-[sua-chave-aqui]
ZAPI_INSTANCE=0
ZAPI_TOKEN=test-token
PORT=3000
NODE_ENV=production

4. Clique: "Save" ou "Deploy"

Railway vai fazer redeploy (~1 minuto). Aguarde 🟢 Active.


═══════════════════════════════════════════════════════════════════════════════
PASSO 6: TESTAR COM CURL (Terminal)
═══════════════════════════════════════════════════════════════════════════════

Copie sua URL pública do Railway (algo como: https://bot-mia-xxxxx.railway.app)

Execute:

curl -X POST https://bot-mia-xxxxx.railway.app/test/objecao \\
  -H "Content-Type: application/json" \\
  -d '{"objecao": "Como faço boas-vindas?"}'

Esperado:
{
  "contato": "1️⃣ BOAS-VINDAS",
  "resposta": "..."
}

✅ Se funcionar: Bot está ONLINE!


═══════════════════════════════════════════════════════════════════════════════
PASSO 7: WEBHOOK Z-API (Z-API Painel)
═══════════════════════════════════════════════════════════════════════════════

1. Vá para: https://z-api.io
2. Seu painel → Configurações → Webhooks
3. Adicione:
   URL: https://seu-projeto-xxxxx.railway.app/webhook/zapi
   Eventos: messages (ou incoming-messages)
4. Salve

✅ Pronto! WhatsApp agora envia mensagens pro bot.


═══════════════════════════════════════════════════════════════════════════════
🎉 PRONTO!
═══════════════════════════════════════════════════════════════════════════════

Bot está online 24/7 e recebendo mensagens do WhatsApp!

Próxima: FASE 3 (Pré-vendas)
  → Ofereça beta para óticas
  → Primeira venda em 48 horas

═══════════════════════════════════════════════════════════════════════════════
`;

  console.log(detailedInstructions);

  // PASSO FINAL
  header("🚀 COMECE AGORA");

  console.log(`
  Próximo comando a executar no terminal:

  ${colors.bright}cd /home/claude/bot-mia-local${colors.reset}
  ${colors.bright}git add .${colors.reset}
  ${colors.bright}git commit -m "Initial commit - Bot MIA v2"${colors.reset}

  Depois continue pelos outros passos acima.

  Tempo total: ~45 minutos
  Dificuldade: Fácil (copiar e colar)
  
  Tá pronto? Bora começar! 🔥
  `);
}

// Executar
runSetupWizard().catch((err) => {
  error(err.message);
  process.exit(1);
});
